import type { FitnessLevel, UserProfile, UserStats } from './context/UserContext'
import { formatWeeklyNutritionPlan, generateWeeklyNutritionPlan } from './mealPlanEngine'

type CoachLanguage = 'en' | 'he'

type Intent =
  | 'workout'
  | 'nutrition'
  | 'recipe'
  | 'goal'
  | 'progress'
  | 'motivation'
  | 'recovery'
  | 'general'

type BodyFocus =
  | 'full'
  | 'abs'
  | 'legs'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'mobility'

type Equipment = 'bodyweight' | 'dumbbells' | 'band' | 'mat' | 'bar'
type WorkoutMode = 'home' | 'gym' | 'cardio'

type ProgressEntry = {
  completed?: boolean
  date?: string
  difficulty?: string
  duration?: number
  feeling?: string
  type?: string
}

type ProgressInput = {
  entries?: ProgressEntry[]
  stats?: UserStats
}

type WorkoutOptions = {
  duration?: number
  equipment?: Equipment
  focus?: BodyFocus
  level?: FitnessLevel
  lowEnergy?: boolean
  goal?: string
}

const DISCLAIMER = 'המידע כללי בלבד ואינו מחליף ייעוץ מקצועי.'
const EN_DISCLAIMER = 'This information is general only and does not replace professional advice.'
const DEFAULT_DURATION = 15
const DEFAULT_LEVEL: FitnessLevel = 'beginner'
const KNOWN_DURATIONS = [5, 10, 15, 20, 30, 45, 60, 75, 90]

const ingredientMap: Array<{ name: string; aliases: string[] }> = [
  { name: 'ביצים', aliases: ['ביצה', 'ביצים', 'egg', 'eggs'] },
  { name: 'טונה', aliases: ['טונה', 'tuna'] },
  { name: 'עוף', aliases: ['עוף', 'חזה עוף', 'chicken'] },
  { name: 'אורז', aliases: ['אורז', 'rice'] },
  { name: 'פסטה', aliases: ['פסטה', 'pasta'] },
  { name: 'ירקות', aliases: ['ירקות', 'ירק', 'vegetables', 'veggies'] },
  { name: 'עגבניה', aliases: ['עגבניה', 'עגבניות', 'tomato', 'tomatoes'] },
  { name: 'מלפפון', aliases: ['מלפפון', 'מלפפונים', 'cucumber'] },
  { name: 'גבינה', aliases: ['גבינה', 'cheese'] },
  { name: 'יוגורט', aliases: ['יוגורט', 'yogurt', 'yoghurt'] },
  { name: 'שיבולת שועל', aliases: ['שיבולת שועל', 'קוואקר', 'oats', 'oatmeal'] },
  { name: 'לחם', aliases: ['לחם', 'bread'] },
  { name: 'טורטיה', aliases: ['טורטיה', 'tortilla', 'wrap'] },
  { name: 'תפוח אדמה', aliases: ['תפוח אדמה', 'תפוחי אדמה', 'potato'] },
  { name: 'עדשים', aliases: ['עדשים', 'lentils'] },
  { name: 'חומוס', aliases: ['חומוס', 'chickpeas', 'chickpea'] },
  { name: 'שעועית', aliases: ['שעועית', 'beans', 'bean'] },
  { name: 'בננה', aliases: ['בננה', 'banana'] },
  { name: 'תפוח', aliases: ['תפוח', 'apple'] },
]

function normalize(message: string) {
  return message.toLowerCase().trim()
}

function includesAny(message: string, words: string[]) {
  const lower = normalize(message)
  return words.some(word => lower.includes(word.toLowerCase()))
}

function matchesAny(message: string, patterns: RegExp[]) {
  const lower = normalize(message)
  return patterns.some(pattern => pattern.test(lower))
}

function unique<T>(items: T[]) {
  return [...new Set(items)]
}

function getProfileLevel(profile?: Partial<UserProfile>): FitnessLevel {
  return profile?.fitnessLevel ?? DEFAULT_LEVEL
}

function getProfileDuration(profile?: Partial<UserProfile>) {
  return profile?.workoutDuration ?? DEFAULT_DURATION
}

function readJsonArray(key: string): ProgressEntry[] {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getStoredProgressEntries(progress?: ProgressInput) {
  if (progress?.entries?.length) return progress.entries
  return [
    ...readJsonArray('smartfit_ai_tools_progress'),
    ...readJsonArray('smartfit_workout_progress'),
    ...readJsonArray('smartfit_cardio_progress'),
  ]
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function isDateInCurrentWeek(value?: string) {
  if (!value) return false
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time >= startOfWeek(new Date()).getTime()
}

function isDateInCurrentMonth(value?: string) {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function getProgressDayStreak(entries: ProgressEntry[]) {
  const completedDays = new Set(
    entries
      .filter(entry => entry.completed !== false && entry.date)
      .map(entry => startOfDay(new Date(entry.date as string)).getTime())
      .filter(Number.isFinite),
  )
  let cursor = startOfDay(new Date())
  let streak = 0

  if (!completedDays.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1)

  while (completedDays.has(cursor.getTime())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function getWeeklyTarget(profile?: Partial<UserProfile>) {
  const raw = (profile as { weeklyTarget?: unknown } | undefined)?.weeklyTarget
  if (typeof profile?.workout_days === 'number' && Number.isFinite(profile.workout_days)) {
    return Math.min(7, Math.max(1, profile.workout_days))
  }
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.min(7, Math.max(1, raw)) : 3
}

function hasSafetySignal(message: string) {
  return includesAny(message, [
    'כאב חד',
    'פציעה',
    'סחרחורת',
    'התעלפות',
    'בעיה רפואית',
    'נפצעתי',
    'sharp pain',
    'injury',
    'dizzy',
  ])
}

function getSafetyLine(message: string) {
  if (!hasSafetySignal(message)) return ''
  return '\n\nזהירות: אם יש כאב חד, פציעה, סחרחורת או בעיה רפואית — עצור והתייעץ עם איש מקצוע.'
}

export function detectIntent(message: string): Intent {
  if (hasSafetySignal(message) || includesAny(message, ['שינה', 'התאוששות', 'כאבי שרירים', 'שרירים תפוסים', 'מתי לנוח', 'לנוח', 'sleep', 'recovery', 'sore']) || matchesAny(message, [/כאבים?\s+אחרי\s+אימון/, /צריך\s+מנוחה/, /rest\s+day/])) {
    return 'recovery'
  }

  if (extractIngredients(message).length > 0 || includesAny(message, ['מתכון', 'יש לי', 'מה להכין', 'recipe', 'ingredients']) || matchesAny(message, [/מה\s+(אפשר|כדאי)\s+להכין/, /cook\s+with/, /make\s+with/])) {
    return 'recipe'
  }

  if (includesAny(message, ['אימון', 'תרגיל', 'כושר', 'חדר כושר', 'מכונות', 'כבלים', 'אירובי', 'ריצה', 'הליכה', 'בטן', 'רגליים', 'חזה', 'גב', 'כתפיים', 'ידיים', 'גמישות', 'סיבולת', 'workout', 'exercise', 'training']) || matchesAny(message, [/תוכנית\s*אימונים?/, /\b\d{1,2}\s*(דקות|דקה|min)/, /בלי\s+ציוד/, /עם\s+משקולות/])) {
    return 'workout'
  }

  if (includesAny(message, ['חלבון', 'פחמימות', 'שומנים', 'מים', 'תפריט', 'תוכנית אוכל', 'תוכנית תזונה', 'תפריט שבועי', 'ארוחה', 'נשנוש', 'לאכול', 'nutrition', 'protein', 'meal', 'water']) || matchesAny(message, [/מה\s+לאכול/, /לפני\s+אימון/, /אחרי\s+אימון/, /כמה\s+חלבון/])) {
    return 'nutrition'
  }

  if (includesAny(message, ['מטרה', 'כוח', 'התמדה', 'חיטוב', 'הרגלים', 'עלייה בכוח', 'goal', 'habit'])) {
    return 'goal'
  }

  if (includesAny(message, ['מתקדם', 'התקדמות', 'היסטוריה', 'הולך לי', 'השבוע', 'החודש', 'progress', 'history']) || matchesAny(message, [/איך\s+אני\s+מתקדם/, /כמה\s+אימונים/, /מה\s+עשיתי\s+השבוע/])) {
    return 'progress'
  }

  if (includesAny(message, ['אין לי כוח', 'עייף', 'פספסתי', 'להתמיד', 'להתחיל', 'אין לי זמן', 'מתייאש', 'שגרה', 'מוטיבציה', 'motivation', 'stuck']) || matchesAny(message, [/קשה\s+לי\s+לשמור/, /איך\s+מתחילים/, /אין\s+זמן/])) {
    return 'motivation'
  }

  return 'general'
}

export function extractIngredients(message: string) {
  const found = ingredientMap
    .filter(item => item.aliases.some(alias => normalize(message).includes(alias.toLowerCase())))
    .map(item => item.name)

  return unique(found)
}

export function extractDuration(message: string) {
  const lower = normalize(message)
  const directNumber = lower.match(/(\d{1,2})\s*(דקות|דקה|דק׳|min|mins|minutes)?/)
  if (directNumber) {
    const value = Number(directNumber[1])
    if (KNOWN_DURATIONS.includes(value)) return value
    if (value < 8) return 5
    if (value < 15) return 10
    if (value < 25) return 20
    if (value < 38) return 30
    if (value < 53) return 45
    if (value < 68) return 60
    if (value < 83) return 75
    return 90
  }

  if (includesAny(lower, ['קצר', 'מהיר', 'אין לי זמן', 'לפני בית ספר', 'לפני עבודה'])) return 10
  if (includesAny(lower, ['ארוך', 'מלא'])) return 30
  return undefined
}

export function extractLevel(message: string): FitnessLevel | undefined {
  if (includesAny(message, ['מתחיל', 'מתחילים', 'קל', 'בסיסי', 'beginner', 'easy'])) return 'beginner'
  if (includesAny(message, ['בינוני', 'רגיל', 'intermediate', 'medium'])) return 'intermediate'
  if (includesAny(message, ['מתקדם', 'קשה', 'עצים', 'advanced', 'hard'])) return 'advanced'
  return undefined
}

export function extractBodyFocus(message: string): BodyFocus {
  if (includesAny(message, ['בטן', 'ליבה', 'abs', 'core'])) return 'abs'
  if (includesAny(message, ['רגליים', 'ירכיים', 'legs'])) return 'legs'
  if (includesAny(message, ['חזה', 'chest'])) return 'chest'
  if (includesAny(message, ['גב', 'back'])) return 'back'
  if (includesAny(message, ['כתפיים', 'shoulders'])) return 'shoulders'
  if (includesAny(message, ['ידיים', 'יד קדמית', 'יד אחורית', 'arms'])) return 'arms'
  if (includesAny(message, ['גמישות', 'מוביליטי', 'מתיחות', 'mobility', 'flexibility'])) return 'mobility'
  return 'full'
}

export function extractEquipment(message: string): Equipment {
  if (includesAny(message, ['משקולות', 'דאמבלים', 'דמבלים', 'dumbbell', 'weights'])) return 'dumbbells'
  if (includesAny(message, ['גומייה', 'גומיה', 'רצועת התנגדות', 'band'])) return 'band'
  if (includesAny(message, ['מזרן', 'יוגה', 'mat'])) return 'mat'
  if (includesAny(message, ['מתח', 'pull up', 'pull-up', 'bar'])) return 'bar'
  return 'bodyweight'
}

function getRounds(level: FitnessLevel, duration: number, lowEnergy: boolean) {
  if (lowEnergy) return 2
  if (duration <= 5) return 1
  if (duration <= 10) return level === 'advanced' ? 3 : 2
  if (duration <= 20) return level === 'advanced' ? 4 : 3
  if (duration <= 30) return level === 'beginner' ? 3 : 4
  return level === 'advanced' ? 5 : 4
}

function getRest(level: FitnessLevel, goal?: string, lowEnergy?: boolean) {
  if (lowEnergy) return '75-120 שניות'
  if (goal === 'endurance') return '30-45 שניות'
  if (goal === 'strength') return '90-120 שניות'
  if (level === 'advanced') return '45-75 שניות'
  return '60-90 שניות'
}

function getWorkoutName(focus: BodyFocus, duration: number, lowEnergy: boolean) {
  if (lowEnergy) return `אימון התאוששות עדין ${duration} דקות`
  const names: Record<BodyFocus, string> = {
    full: `אימון גוף מלא ${duration} דקות`,
    abs: `אימון בטן וליבה ${duration} דקות`,
    legs: `אימון רגליים ${duration} דקות`,
    chest: `אימון חזה ${duration} דקות`,
    back: `אימון גב ${duration} דקות`,
    shoulders: `אימון כתפיים ${duration} דקות`,
    arms: `אימון ידיים ${duration} דקות`,
    mobility: `אימון גמישות ומוביליטי ${duration} דקות`,
  }
  return names[focus]
}

function getExerciseList(focus: BodyFocus, equipment: Equipment, goal?: string) {
  if (focus === 'mobility') {
    return [
      'נשימות עמוקות עם פתיחת בית חזה — 5 נשימות',
      'סיבובי כתפיים ואגן — 30 שניות',
      'מתיחת ירך קדמית ואחורית — 30 שניות לכל צד',
      'חתול-פרה — 8-10 חזרות',
      'ישיבה עמוקה נתמכת או מתיחת קרסול — 30 שניות',
    ]
  }

  if (equipment === 'dumbbells') {
    return [
      focus === 'legs' ? 'סקוואט גביע — 8-12 חזרות' : 'סקוואט גביע — 10 חזרות',
      focus === 'back' ? 'חתירה עם משקולות — 10-12 חזרות' : 'דדליפט רומני קל — 8-10 חזרות',
      focus === 'shoulders' ? 'לחיצת כתפיים — 8-10 חזרות' : 'לחיצת כתפיים קלה — 8 חזרות',
      focus === 'arms' ? 'כפיפת מרפקים + פשיטת מרפקים — 10 חזרות' : 'נשיאת משקולות במקום — 30 שניות',
    ]
  }

  if (equipment === 'band') {
    return [
      'חתירה עם גומייה — 12 חזרות',
      'סקוואט עם גומייה — 10-12 חזרות',
      'הרחקות כתפיים — 10 חזרות',
      'לחיצת חזה עם גומייה — 10 חזרות',
    ]
  }

  if (equipment === 'bar') {
    return [
      'תלייה אקטיבית קצרה — 10-20 שניות',
      'משיכות שכמות — 6-8 חזרות',
      'מתח שלילי או משיכה מותאמת — 3-5 חזרות',
      'פלאנק — 20-30 שניות',
    ]
  }

  const bodyweightByFocus: Record<BodyFocus, string[]> = {
    full: ['סקוואט — 10-12 חזרות', 'שכיבות סמיכה מותאמות — 8-10 חזרות', 'לאנג׳ אחורי — 8 לכל צד', 'פלאנק — 20-30 שניות'],
    abs: ['פלאנק — 20-40 שניות', 'דד באג — 10 לכל צד', 'הרמות ברכיים איטיות — 10-12 חזרות', 'מטפס הרים איטי — 20 שניות'],
    legs: ['סקוואט — 12 חזרות', 'לאנג׳ אחורי — 8 לכל צד', 'גשר ישבן — 12-15 חזרות', 'עליות עקבים — 15 חזרות'],
    chest: ['שכיבות סמיכה על ברכיים או על שולחן — 8-12 חזרות', 'החזקת פלאנק גבוה — 20 שניות', 'לחיצת כפות ידיים — 20 שניות', 'שכיבות סמיכה איטיות — 5-8 חזרות'],
    back: ['סופרמן עדין — 10 חזרות', 'Y-T-W על הרצפה — 6 מכל צורה', 'חתירה עם מגבת יציבה — 10 חזרות', 'פלאנק צד — 15 שניות לכל צד'],
    shoulders: ['פייק פוש-אפ מותאם — 6-8 חזרות', 'סיבובי כתפיים — 30 שניות', 'הרמות ידיים לצדדים ללא משקל — 12 חזרות', 'פלאנק גבוה — 20 שניות'],
    arms: ['שכיבות סמיכה צרות מותאמות — 6-10 חזרות', 'דיפס על כיסא יציב — 6-8 חזרות', 'החזקת פלאנק גבוה — 20 שניות', 'כיווץ ידיים איזומטרי — 20 שניות'],
    mobility: [],
  }

  if (goal === 'endurance') {
    return [...bodyweightByFocus[focus], 'צעדי צד מהירים — 30 שניות'].slice(0, 5)
  }

  return bodyweightByFocus[focus]
}

function getGoalFromMessage(message: string) {
  if (includesAny(message, ['כוח', 'חזק', 'strength'])) return 'strength'
  if (includesAny(message, ['סיבולת', 'אירובי', 'endurance', 'cardio'])) return 'endurance'
  if (includesAny(message, ['גמישות', 'מוביליטי', 'flexibility'])) return 'mobility'
  return 'general'
}

export function generateWorkoutPlan(options: WorkoutOptions = {}, language: CoachLanguage = 'he') {
  const duration = options.duration ?? DEFAULT_DURATION
  const level = options.level ?? DEFAULT_LEVEL
  const focus = options.focus ?? 'full'
  const equipment = options.equipment ?? 'bodyweight'
  const lowEnergy = Boolean(options.lowEnergy)
  const goal = options.goal ?? 'general'
  const rounds = getRounds(level, duration, lowEnergy)
  const rest = getRest(level, goal, lowEnergy)
  const exercises = getExerciseList(focus, equipment, goal)

  const englishFocusNames: Record<BodyFocus, string> = {
    abs: `Abs and Core Workout ${duration} minutes`,
    arms: `Arms Workout ${duration} minutes`,
    back: `Back Workout ${duration} minutes`,
    chest: `Chest Workout ${duration} minutes`,
    full: `Full Body Workout ${duration} minutes`,
    legs: `Legs Workout ${duration} minutes`,
    mobility: `Mobility and Flexibility Workout ${duration} minutes`,
    shoulders: `Shoulders Workout ${duration} minutes`,
  }

  return {
    duration,
    exercises,
    focus,
    level,
    name: language === 'en'
      ? lowEnergy ? `Gentle Recovery Workout ${duration} minutes` : englishFocusNames[focus]
      : getWorkoutName(focus, duration, lowEnergy),
    rest: language === 'en' ? rest.replace('שניות', 'seconds') : rest,
    rounds,
  }
}

type SmartWorkoutOptions = WorkoutOptions & {
  message?: string
  profile?: Partial<UserProfile>
  progress?: ProgressInput
}

type ExactStrengthExercise = {
  name: string
  restSeconds: number
  sets: number
  workSeconds: number
}

function getProfileEquipment(profile?: Partial<UserProfile>): Equipment {
  const equipment = profile?.equipment ?? []
  if (equipment.includes('dumbbells')) return 'dumbbells'
  if (equipment.includes('bands')) return 'band'
  if (equipment.includes('pullup_bar')) return 'bar'
  if (equipment.includes('gym')) return 'dumbbells'
  return 'bodyweight'
}

function getExactDuration(options: SmartWorkoutOptions) {
  const duration = options.duration ?? extractDuration(options.message ?? '') ?? getProfileDuration(options.profile)
  if (KNOWN_DURATIONS.includes(duration)) return duration
  if (duration < 15) return 10
  if (duration < 25) return 20
  if (duration < 38) return 30
  if (duration < 53) return 45
  if (duration < 68) return 60
  if (duration < 83) return 75
  return 90
}

function getStrengthSetCount(level: FitnessLevel, duration: number) {
  if (duration <= 15) return 2
  if (duration <= 20) return level === 'advanced' ? 3 : 2
  if (duration <= 30) return level === 'beginner' ? 3 : 4
  return level === 'advanced' ? 5 : 4
}

function getStrengthRestSeconds(level: FitnessLevel, duration: number) {
  if (duration <= 15) return 45
  if (level === 'advanced') return 75
  if (level === 'intermediate') return 60
  return 60
}

function getExactExerciseCount(duration: number) {
  if (duration <= 15) return 3
  if (duration <= 20) return 4
  if (duration <= 30) return 5
  if (duration <= 45) return 6
  if (duration <= 60) return 8
  if (duration <= 75) return 10
  return 12
}

function pickGymExercises(focus: BodyFocus) {
  const byFocus: Record<BodyFocus, string[]> = {
    abs: ['Cable crunch', 'Hanging knee raise', 'Machine torso rotation', 'Weighted plank'],
    arms: ['Dumbbell curl', 'Cable triceps pushdown', 'Hammer curl', 'Bench dip machine'],
    back: ['Lat pulldown', 'Seated cable row', 'Chest-supported row', 'Back extension'],
    chest: ['Chest press machine', 'Incline dumbbell press', 'Cable fly', 'Bench push-up warm set'],
    full: ['Leg press', 'Chest press machine', 'Lat pulldown', 'Dumbbell Romanian deadlift', 'Cable row', 'Shoulder press machine'],
    legs: ['Leg press', 'Goblet squat', 'Seated leg curl', 'Dumbbell Romanian deadlift', 'Calf raise machine'],
    mobility: ['Cable face pull', 'Light goblet squat', 'Back extension', 'Farmer carry'],
    shoulders: ['Shoulder press machine', 'Cable lateral raise', 'Face pull', 'Dumbbell front raise'],
  }
  return byFocus[focus]
}

function pickHomeExercises(focus: BodyFocus, equipment: Equipment) {
  if (equipment !== 'bodyweight') return getExerciseList(focus, equipment, 'strength')

  const byFocus: Record<BodyFocus, string[]> = {
    abs: ['פלאנק', 'Dead bug', 'הרמות ברכיים איטיות', 'Side plank'],
    arms: ['שכיבות סמיכה מותאמות', 'Dips על כיסא יציב', 'Plank shoulder taps', 'כיווץ ידיים איזומטרי'],
    back: ['Superman עדין', 'Y-T-W על הרצפה', 'חתירה עם מגבת יציבה', 'Bird dog'],
    chest: ['שכיבות סמיכה מותאמות', 'Incline push-up', 'Plank hold', 'Slow push-up negative'],
    full: ['סקוואט', 'שכיבות סמיכה מותאמות', 'לאנג׳ אחורי', 'גשר ישבן', 'פלאנק'],
    legs: ['סקוואט', 'לאנג׳ אחורי', 'גשר ישבן', 'עליות עקבים', 'Wall sit'],
    mobility: ['Cat-cow', 'Hip hinge drill', 'Deep squat hold', 'Shoulder circles'],
    shoulders: ['Pike push-up מותאם', 'הרמות ידיים לצדדים ללא משקל', 'Plank shoulder taps', 'Wall angels'],
  }

  return byFocus[focus]
}

function pickEnglishExercises(mode: WorkoutMode, focus: BodyFocus) {
  const gym: Record<BodyFocus, string[]> = {
    abs: ['Cable crunch', 'Hanging knee raise', 'Machine torso rotation', 'Weighted plank'],
    arms: ['Dumbbell curl', 'Cable triceps pushdown', 'Hammer curl', 'Bench dip machine'],
    back: ['Lat pulldown', 'Seated cable row', 'Chest-supported row', 'Back extension'],
    chest: ['Chest press machine', 'Incline dumbbell press', 'Cable fly', 'Machine push press'],
    full: ['Leg press', 'Chest press machine', 'Lat pulldown', 'Dumbbell Romanian deadlift', 'Cable row', 'Shoulder press machine'],
    legs: ['Leg press', 'Goblet squat', 'Seated leg curl', 'Dumbbell Romanian deadlift', 'Calf raise machine'],
    mobility: ['Cable face pull', 'Light goblet squat', 'Back extension', 'Farmer carry'],
    shoulders: ['Shoulder press machine', 'Cable lateral raise', 'Face pull', 'Dumbbell front raise'],
  }
  const home: Record<BodyFocus, string[]> = {
    abs: ['Plank', 'Dead bug', 'Slow knee raises', 'Side plank'],
    arms: ['Modified push-up', 'Chair dip on a stable chair', 'Plank shoulder taps', 'Isometric arm squeeze'],
    back: ['Gentle Superman', 'Y-T-W floor raises', 'Towel row with a stable anchor', 'Bird dog'],
    chest: ['Modified push-up', 'Incline push-up', 'High plank hold', 'Slow push-up negative'],
    full: ['Squat', 'Modified push-up', 'Reverse lunge', 'Glute bridge', 'Plank'],
    legs: ['Squat', 'Reverse lunge', 'Glute bridge', 'Calf raise', 'Wall sit'],
    mobility: ['Cat-cow', 'Hip hinge drill', 'Deep squat hold', 'Shoulder circles'],
    shoulders: ['Modified pike push-up', 'Lateral arm raises without weight', 'Plank shoulder taps', 'Wall angels'],
  }

  return mode === 'gym' ? gym[focus] : home[focus]
}

function buildExactStrengthExercises(names: string[], duration: number, level: FitnessLevel): ExactStrengthExercise[] {
  const exerciseCount = getExactExerciseCount(duration)
  const selectedNames = names.slice(0, exerciseCount)
  const totalSeconds = duration * 60
  const blockBase = Math.floor(totalSeconds / selectedNames.length)
  let remainingSeconds = totalSeconds - blockBase * selectedNames.length
  const sets = getStrengthSetCount(level, duration)
  const preferredRest = getStrengthRestSeconds(level, duration)

  return selectedNames.map(name => {
    const blockSeconds = blockBase + (remainingSeconds > 0 ? 1 : 0)
    if (remainingSeconds > 0) remainingSeconds -= 1
    const restSeconds = sets > 1
      ? Math.max(20, Math.min(preferredRest, Math.floor((blockSeconds - sets * 25) / (sets - 1))))
      : 0
    const baseWorkSeconds = Math.max(20, Math.floor((blockSeconds - restSeconds * (sets - 1)) / sets))
    const usedSeconds = baseWorkSeconds * sets + restSeconds * (sets - 1)
    const workSeconds = baseWorkSeconds + Math.max(0, blockSeconds - usedSeconds)

    return {
      name,
      restSeconds,
      sets,
      workSeconds,
    }
  })
}

function isMachineExerciseName(name: string, mode: WorkoutMode) {
  return mode === 'gym' && /machine|cable|pulldown|press|row|extension|curl|smith|deck|raise|פולי|כבל|מכונה/i.test(name)
}

function getShortExerciseHowText(name: string, language: CoachLanguage) {
  const lower = name.toLowerCase()

  if (/leg press|לחיצת רגל/.test(lower)) {
    return language === 'en'
      ? 'Sit firmly, place feet on the platform, press up smoothly and return with control.'
      : 'שב יציב, מקם כפות רגליים על הפלטפורמה, דחוף למעלה וחזור בשליטה.'
  }
  if (/pulldown|פולי/.test(lower)) {
    return language === 'en'
      ? 'Sit tall, pull the bar toward the upper chest, then let it rise slowly.'
      : 'שב זקוף, משוך את המוט לחזה העליון ותן לו לעלות לאט.'
  }
  if (/row|חתירה/.test(lower)) {
    return language === 'en'
      ? 'Pull the handle toward the ribs while keeping the chest lifted and return slowly.'
      : 'משוך את הידית לכיוון הצלעות כשהחזה פתוח וחזור לאט.'
  }
  if (/chest press|press machine|לחיצת חזה/.test(lower)) {
    return language === 'en'
      ? 'Sit with your back on the pad and press the handles forward without rushing.'
      : 'שב עם גב צמוד למשענת ודחוף את הידיות קדימה בלי למהר.'
  }
  if (/shoulder press|לחיצת כתפ/.test(lower)) {
    return language === 'en'
      ? 'Press the handles or weights overhead, then lower to shoulder height with control.'
      : 'לחץ ידיות או משקולות מעל הראש והורד לגובה הכתפיים בשליטה.'
  }
  if (/fly|deck|פרפר/.test(lower)) {
    return language === 'en'
      ? 'Bring the handles together in front of the chest and open back slowly.'
      : 'קרב את הידיות מול החזה ופתח חזרה לאט.'
  }
  if (/squat|סקוואט/.test(lower)) {
    return language === 'en'
      ? 'Stand stable, sit the hips back and down, then push through the heels to rise.'
      : 'עמוד יציב, שלח אגן אחורה ולמטה ודחוף דרך העקבים לעלייה.'
  }
  if (/lunge|לאנג/.test(lower)) {
    return language === 'en'
      ? 'Step into the lunge, lower softly, then push through the front foot to stand.'
      : 'צעד ללאנג׳, רד ברכות ודחוף דרך הרגל הקדמית לחזרה לעמידה.'
  }
  if (/curl/.test(lower)) {
    return language === 'en'
      ? 'Curl the weight by bending the elbow, then lower it without swinging.'
      : 'כופף מרפק והרם את המשקל, ואז הורד בלי תנופה.'
  }
  if (/triceps|dip|pushdown/.test(lower)) {
    return language === 'en'
      ? 'Keep elbows close and straighten the arms until the triceps do the work.'
      : 'שמור מרפקים קרובים ויישר ידיים עד שהיד האחורית עובדת.'
  }
  if (/plank/.test(lower)) {
    return language === 'en'
      ? 'Hold a straight line from head to heels and breathe steadily.'
      : 'החזק קו ישר מהראש עד העקבים ונשום רגוע.'
  }
  if (/crunch|knee raise|בטן/.test(lower)) {
    return language === 'en'
      ? 'Brace the abs, move slowly, and avoid pulling from the neck or hips.'
      : 'כווץ בטן, זוז לאט והימנע ממשיכה מהצוואר או מהאגן.'
  }
  if (/calf/.test(lower)) {
    return language === 'en'
      ? 'Rise high onto the toes, pause briefly, then lower slowly.'
      : 'עלה גבוה על קצות האצבעות, עצור רגע ורד לאט.'
  }
  if (/deadlift|hinge/.test(lower)) {
    return language === 'en'
      ? 'Hinge from the hips with a flat back, then stand by squeezing the glutes.'
      : 'כופף מהאגן עם גב ישר ועלה דרך כיווץ ישבן.'
  }

  return language === 'en'
    ? 'Move slowly through a comfortable range and keep the body stable.'
    : 'בצע לאט בטווח נוח ושמור גוף יציב.'
}

function getShortTechniqueText(name: string, level: FitnessLevel, goal: string | undefined, language: CoachLanguage) {
  const lower = name.toLowerCase()
  const levelCue = level === 'beginner'
    ? language === 'en'
      ? 'Start light and learn the movement before adding load.'
      : 'התחל קל ולמד את התנועה לפני שמעלים עומס.'
    : level === 'advanced'
      ? language === 'en'
        ? 'Keep full range and control every lowering phase.'
        : 'שמור טווח מלא ושליטה בכל ירידה.'
      : language === 'en'
        ? 'Choose a load that keeps every rep clean.'
        : 'בחר עומס שמאפשר חזרות נקיות.'
  const goalCue = goal === 'strength'
    ? language === 'en'
      ? 'Rest enough so the next set stays strong.'
      : 'נוח מספיק כדי שהסט הבא יישאר חזק.'
    : goal === 'endurance'
      ? language === 'en'
        ? 'Do not trade clean form for speed.'
        : 'אל תחליף טכניקה נקייה במהירות.'
      : ''
  const focusCue = /leg|squat|lunge|calf|רגל|סקוואט|לאנג/.test(lower)
    ? language === 'en'
      ? 'Keep knees tracking with the toes.'
      : 'שמור ברכיים בכיוון האצבעות.'
    : /row|pulldown|back|חתירה|גב/.test(lower)
      ? language === 'en'
        ? 'Keep shoulders down and pull from the back, not only the arms.'
        : 'שמור כתפיים נמוכות ומשוך מהגב, לא רק מהידיים.'
      : /press|fly|push|deck|chest|חזה|שכיבות/.test(lower)
        ? language === 'en'
          ? 'Keep the chest open and avoid locking the elbows hard.'
          : 'שמור חזה פתוח ואל תנעל מרפקים חזק.'
        : /shoulder|raise|כתף/.test(lower)
          ? language === 'en'
            ? 'Keep ribs down so the lower back does not arch.'
            : 'שמור צלעות אסופות כדי שהגב התחתון לא יתקמר.'
          : /plank|crunch|knee|בטן|ליבה/.test(lower)
            ? language === 'en'
              ? 'Keep the abs braced and breathe.'
              : 'שמור בטן אסופה והמשך לנשום.'
            : language === 'en'
              ? 'Stay controlled and avoid momentum.'
              : 'שמור שליטה והימנע מתנופה.'

  return [focusCue, levelCue, goalCue].filter(Boolean).join(' ')
}

function getShortMachineText(name: string, language: CoachLanguage) {
  const lower = name.toLowerCase()
  if (/pulldown/.test(lower)) {
    return language === 'en'
      ? 'Machine: seat with thigh pad and overhead cable; lock the pad before pulling.'
      : 'מכונה: מושב עם כרית ירכיים וכבל עליון; נעל את הכרית לפני המשיכה.'
  }
  if (/leg press/.test(lower)) {
    return language === 'en'
      ? 'Machine: angled seat with a foot platform; set the seat so the knees bend comfortably.'
      : 'מכונה: מושב משופע עם פלטפורמה לרגליים; כוון מושב לכיפוף ברך נוח.'
  }
  if (/chest press/.test(lower)) {
    return language === 'en'
      ? 'Machine: back pad with handles in front of the chest; set handles around mid-chest.'
      : 'מכונה: משענת עם ידיות מול החזה; כוון ידיות לגובה מרכז החזה.'
  }
  if (/shoulder press/.test(lower)) {
    return language === 'en'
      ? 'Machine: upright seat with handles near the shoulders; keep the back on the pad.'
      : 'מכונה: מושב זקוף עם ידיות ליד הכתפיים; שמור גב על המשענת.'
  }
  if (/cable|pushdown|fly|face pull/.test(lower)) {
    return language === 'en'
      ? 'Machine: cable tower with handle or rope; check the clip and weight pin first.'
      : 'מכונה: עמדת כבלים עם ידית או חבל; בדוק קליפס ופין משקולות לפני הסט.'
  }
  if (/row/.test(lower)) {
    return language === 'en'
      ? 'Machine: seated row station with handle path toward the ribs.'
      : 'מכונה: עמדת חתירה בישיבה עם ידית שנמשכת לכיוון הצלעות.'
  }
  if (/curl|extension/.test(lower)) {
    return language === 'en'
      ? 'Machine: padded lever machine; line the joint up with the pivot before starting.'
      : 'מכונה: מנוף עם כריות; יישר את המפרק מול הציר לפני שמתחילים.'
  }
  if (/smith/.test(lower)) {
    return language === 'en'
      ? 'Machine: guided bar on rails; rotate the bar to lock it safely.'
      : 'מכונה: מוט מודרך על מסילות; סובב את המוט לנעילה בטוחה.'
  }

  return language === 'en'
    ? 'Machine: adjust seat or pad first and choose a weight you can control.'
    : 'מכונה: כוון מושב או ריפוד קודם ובחר משקל שאתה שולט בו.'
}

function formatExerciseCoachingBlock(
  exercise: ExactStrengthExercise,
  index: number,
  mode: WorkoutMode,
  level: FitnessLevel,
  duration: number,
  goal: string | undefined,
  language: CoachLanguage,
) {
  void duration
  const how = getShortExerciseHowText(exercise.name, language)
  const technique = getShortTechniqueText(exercise.name, level, goal, language)
  const isMachine = isMachineExerciseName(exercise.name, mode)
  const machine = isMachine ? getShortMachineText(exercise.name, language) : ''

  if (language === 'en') {
    return [
      `#### 🏋️ ${index + 1}. ${exercise.name}`,
      `- How: ${how}`,
      `- Technique: ${technique}${machine ? ` ${machine}` : ''}`,
    ]
  }

  return [
    `#### 🏋️ ${index + 1}. ${exercise.name}`,
    `- ביצוע: ${how}`,
    `- דגש: ${technique}${machine ? ` ${machine}` : ''}`,
  ]
}

function formatExactStrengthWorkout(title: string, options: SmartWorkoutOptions, mode: WorkoutMode, language: CoachLanguage = 'he') {
  const message = options.message ?? ''
  const duration = getExactDuration(options)
  const level = options.level ?? extractLevel(message) ?? getProfileLevel(options.profile)
  const focus = options.focus ?? extractBodyFocus(message)
  const goal = options.goal ?? getGoalFromMessage(message) ?? options.profile?.goal
  let equipment = options.equipment ?? (message.trim() ? extractEquipment(message) : getProfileEquipment(options.profile))
  if (!options.equipment && mode === 'home' && focus === 'back' && options.profile?.equipment?.includes('pullup_bar')) {
    equipment = 'bar'
  }
  const names = language === 'en'
    ? pickEnglishExercises(mode, focus)
    : mode === 'gym'
    ? pickGymExercises(focus)
    : pickHomeExercises(focus, mode === 'home' ? equipment : 'bodyweight')
  const exercises = buildExactStrengthExercises(names, duration, level)
  const locationText = mode === 'gym'
    ? 'חדר כושר: מכונות, משקולות חופשיות, כבלים וספסל לפי זמינות.'
    : equipment === 'bodyweight'
      ? 'בית: משקל גוף בלבד, בלי ציוד.'
      : 'בית: שימוש בציוד הזמין שסימנת.'

  if (language === 'en') {
    const englishTitle = mode === 'gym' ? 'Gym Strength Workout' : 'Home Strength Workout'
    const locationTextEn = mode === 'gym'
      ? 'Gym: machines, free weights, cables and bench if available.'
      : equipment === 'bodyweight'
        ? 'Home: bodyweight only, no equipment.'
        : 'Home: use the equipment available in your profile.'

    return [
      `## ${englishTitle} — ${duration} minutes`,
      `Best for: ${level === 'beginner' ? 'beginners' : level === 'intermediate' ? 'intermediate trainees' : 'advanced trainees with stable technique'}.`,
      `Location/equipment: ${locationTextEn}`,
      '',
      '### Strength Exercises Only',
      ...exercises.map((exercise, index) =>
        `- ${index + 1}. ${exercise.name}: ${exercise.sets} sets, ${exercise.workSeconds} seconds of work per set, ${exercise.restSeconds} seconds rest between sets.`,
      ),
      '',
      '### Quick Exercise Cues',
      ...exercises.flatMap((exercise, index) =>
        formatExerciseCoachingBlock(exercise, index, mode, level, duration, goal, language),
      ),
      '',
      '### Easier Version',
      '- Remove one set from each exercise or shorten each set by 10 seconds and use that time as extra rest.',
      '',
      '### Harder Version',
      '- Keep the same total time, but slow the tempo or add more control on each lowering phase.',
      '',
      '### Safety Tip',
      '- Stop if you feel sharp pain, dizziness or anything unusual. Technique comes before pace.',
      '',
      `Total time: ${duration} minutes ✔️`,
      EN_DISCLAIMER,
    ].join('\n')
  }

  return [
    `## ${title} — ${duration} דקות`,
    `למי מתאים: ${level === 'beginner' ? 'מתחילים' : level === 'intermediate' ? 'רמה בינונית' : 'מתקדמים עם טכניקה יציבה'}.`,
    `מיקום/ציוד: ${locationText}`,
    '',
    '### תרגילי כוח בלבד',
    ...exercises.map((exercise, index) =>
      `- ${index + 1}. ${exercise.name}: ${exercise.sets} סטים, ${exercise.workSeconds} שניות עבודה לכל סט, ${exercise.restSeconds} שניות מנוחה בין סטים.`,
    ),
    '',
    '### הסבר קצר לכל תרגיל',
    ...exercises.flatMap((exercise, index) =>
      formatExerciseCoachingBlock(exercise, index, mode, level, duration, goal, language),
    ),
    '',
    '### גרסה קלה',
    '- הורד סט אחד מכל תרגיל או קצר כל סט ב-10 שניות, ושמור את אותו זמן כולל כמנוחה נוספת.',
    '',
    '### גרסה קשה',
    '- שמור על אותו זמן כולל, אבל האט את הקצב או הוסף שליטה בירידה בכל חזרה.',
    '',
    '### טיפ בטיחות',
    '- עצור אם יש כאב חד, סחרחורת או תחושה לא רגילה. שמור על טכניקה לפני קצב.',
    '',
    `זמן כולל: ${duration} דקות ✔️`,
    DISCLAIMER,
  ].join('\n')
}

export function detectWorkoutType(profile?: Partial<UserProfile>, message = ''): WorkoutMode {
  if (includesAny(message, ['אירובי', 'ריצה', 'הליכה', 'אופניים', 'cardio', 'run', 'bike', 'walk'])) return 'cardio'
  if (includesAny(message, ['חדר כושר', 'מכונה', 'מכונות', 'כבלים', 'ספסל', 'gym', 'machine', 'cable', 'bench'])) return 'gym'
  if (includesAny(message, ['בית', 'בלי ציוד', 'משקל גוף', 'home', 'bodyweight'])) return 'home'

  const workoutTypes = profile?.workoutTypes ?? (profile?.workoutType ? [profile.workoutType] : [])
  if (workoutTypes.includes('outdoor')) return 'cardio'
  if (workoutTypes.includes('gym') || profile?.equipment?.includes('gym')) return 'gym'
  return 'home'
}

export function generateGymWorkout(options: SmartWorkoutOptions = {}, language: CoachLanguage = 'he') {
  return formatExactStrengthWorkout('אימון כוח בחדר כושר', options, 'gym', language)
}

export function generateHomeWorkout(options: SmartWorkoutOptions = {}, language: CoachLanguage = 'he') {
  return formatExactStrengthWorkout('אימון כוח ביתי', options, 'home', language)
}

export function generateCardioWorkout(options: SmartWorkoutOptions = {}, language: CoachLanguage = 'he') {
  const message = options.message ?? ''
  const duration = getExactDuration(options)
  const level = options.level ?? extractLevel(message) ?? getProfileLevel(options.profile)
  const activity = includesAny(message, ['אופניים', 'bike']) ? 'אופניים' : includesAny(message, ['ריצה', 'run']) ? 'ריצה' : 'הליכה מהירה'
  const effort = level === 'beginner' ? 'קצב שיחה נוח' : level === 'intermediate' ? 'קצב בינוני עם נשימה מוגברת' : 'קצב מאתגר אך נשלט'

  if (language === 'en') {
    const englishActivity = includesAny(message, ['bike', 'אופניים']) ? 'cycling' : includesAny(message, ['run', 'ריצה']) ? 'running' : 'brisk walking'
    const englishEffort = level === 'beginner' ? 'comfortable conversation pace' : level === 'intermediate' ? 'moderate pace with stronger breathing' : 'challenging but controlled pace'

    return [
      `## Cardio Workout — ${duration} minutes`,
      `Activity: ${englishActivity}.`,
      `Intensity: ${englishEffort}.`,
      '',
      '### How to Measure',
      '- In the app, press start and allow location to measure real distance from location changes.',
      '- If location is not allowed, enter distance manually during or after the session.',
      '- Heart rate appears only when a smart watch is connected and data is available.',
      '',
      '### Time Split',
      `- ${Math.max(2, Math.round(duration * 0.15))} minutes easy start.`,
      `- ${Math.max(5, Math.round(duration * 0.7))} minutes steady work pace.`,
      `- ${Math.max(2, duration - Math.max(2, Math.round(duration * 0.15)) - Math.max(5, Math.round(duration * 0.7)))} minutes gradual slowdown.`,
      '',
      '### Safety',
      '- If you feel unusual shortness of breath, sharp pain or dizziness, stop and consult a professional.',
      '- Calories are an estimate only.',
      '',
      `Total time: ${duration} minutes ✔️`,
      EN_DISCLAIMER,
    ].join('\n')
  }

  return [
    `## אימון אירובי — ${duration} דקות`,
    `סוג פעילות: ${activity}.`,
    `עצימות: ${effort}.`,
    '',
    '### איך למדוד',
    '- באפליקציה לחץ התחלה ואשר מיקום כדי למדוד מרחק אמיתי לפי שינויי מיקום.',
    '- אם לא מאשרים מיקום, הזן מרחק ידנית בסיום או תוך כדי האימון.',
    '- דופק יוצג רק אם חובר שעון חכם עם נתונים זמינים.',
    '',
    '### חלוקת זמן',
    `- ${Math.max(2, Math.round(duration * 0.15))} דקות פתיחה בקצב קל.`,
    `- ${Math.max(5, Math.round(duration * 0.7))} דקות קצב עבודה יציב.`,
    `- ${Math.max(2, duration - Math.max(2, Math.round(duration * 0.15)) - Math.max(5, Math.round(duration * 0.7)))} דקות האטה הדרגתית.`,
    '',
    '### בטיחות',
    '- אם יש קוצר נשימה חריג, כאב חד או סחרחורת — עצור והתייעץ עם איש מקצוע.',
    '- הקלוריות הן הערכה בלבד.',
    '',
    `זמן כולל: ${duration} דקות ✔️`,
    DISCLAIMER,
  ].join('\n')
}

export function generateWorkoutReply(
  message: string,
  profile?: Partial<UserProfile>,
  progress?: ProgressInput,
) {
  const duration = extractDuration(message) ?? getProfileDuration(profile)
  const level = extractLevel(message) ?? getProfileLevel(profile)
  const focus = extractBodyFocus(message)
  const equipment = extractEquipment(message)
  const lowEnergy = includesAny(message, ['עייף', 'אין לי כוח', 'יום עייף', 'קליל', 'tired'])
  const goal = getGoalFromMessage(message)
  const progressEntries = getStoredProgressEntries(progress).filter(entry => entry.completed !== false)
  const weeklyEntries = progressEntries.filter(entry => isDateInCurrentWeek(entry.date))
  const hardCount = progressEntries.filter(entry => includesAny(String(entry.feeling ?? entry.difficulty ?? ''), ['קשה', 'hard'])).length
  const easyCount = progressEntries.filter(entry => includesAny(String(entry.feeling ?? entry.difficulty ?? ''), ['קל', 'easy'])).length
  const plan = generateWorkoutPlan({ duration, equipment, focus, goal, level, lowEnergy })
  const progressHint = hardCount > easyCount
    ? 'לפי ההיסטוריה, כדאי לשמור על מנוחות מלאות ולא להעלות עצימות היום.'
    : weeklyEntries.length >= getWeeklyTarget(profile)
      ? 'נראה שיש עקביות השבוע; אפשר להוסיף סט אחד רק אם הטכניקה נשארת נקייה.'
      : 'המטרה היום היא לבנות רצף, לכן עדיף אימון קצר ובר ביצוע.'

  return [
    `## ${plan.name}`,
    `מתאים ל: ${level === 'beginner' ? 'מתחילים או יום עמוס' : level === 'intermediate' ? 'מתאמנים ברמה בינונית' : 'מתאמנים מתקדמים שמכירים טכניקה בסיסית'}.`,
    `ציוד: ${equipment === 'bodyweight' ? 'בלי ציוד' : equipment === 'dumbbells' ? 'משקולות' : equipment === 'band' ? 'גומייה' : equipment === 'bar' ? 'מתח' : 'מזרן'}.`,
    '',
    '### חימום',
    '- 2-5 דקות הליכה במקום, סיבובי כתפיים, סיבובי אגן ופתיחת מפרקים.',
    lowEnergy ? '- שמור על קצב נוח במיוחד. המטרה היום היא תנועה, לא שיא אישי.' : '- העלה דופק בהדרגה בלי קפיצות חדות.',
    '',
    '### תרגילים',
    ...plan.exercises.map(exercise => `- ${exercise}`),
    '',
    '### סטים / חזרות / זמנים',
    `- בצע ${plan.rounds} סבבים.`,
    `- אם תרגיל מרגיש קשה מדי, קצר את הזמן או הורד חזרות ב-20%-30%.`,
    '',
    '### מנוחות',
    `- מנוחה בין תרגילים או סבבים: ${plan.rest}.`,
    '- עדיף לנוח עוד קצת מאשר לאבד טכניקה.',
    '',
    '### התאמה לפי התקדמות',
    `- ${progressHint}`,
    '',
    '### גרסה קלה',
    '- בצע סבב אחד פחות, עבוד לאט יותר, והשתמש בטווח תנועה קטן יותר.',
    '',
    '### גרסה קשה',
    '- הוסף סבב אחד, עוד 5 דקות, או האט את הירידה בכל חזרה.',
    '',
    '### מתיחות',
    '- 3-5 דקות: ירך אחורית, ירך קדמית, חזה, גב וכתפיים לפי האזור שעבד.',
    '',
    '### טיפ בטיחות',
    `- שמור על נשימה וטכניקה. עצור אם משהו מרגיש לא רגיל.${getSafetyLine(message)}`,
    DISCLAIMER,
  ].join('\n')
}

export function generateNutritionReply(message: string, profile?: Partial<UserProfile>) {
  if (includesAny(message, ['תוכנית תזונה שבועית', 'תפריט שבועי', 'תוכנית אוכל שבועית', 'weekly meal plan', 'weekly menu'])) {
    return generateWeeklyMealPlan(profile)
  }

  let title = 'תזונה מסודרת בפשטות'
  let explanation = 'תזונה טובה לא צריכה להיות קיצונית. המטרה היא לבנות ארוחות פשוטות שאפשר לחזור עליהן.'
  let examples = ['חלבון: ביצים, טונה, עוף, יוגורט, טופו או קטניות.', 'פחמימה: אורז, תפוח אדמה, לחם, פסטה או שיבולת שועל.', 'ירקות או פרי לפי מה שיש בבית.']
  let practical = 'בחר ארוחה אחת ביום שאתה מסדר מראש, למשל ארוחת בוקר קבועה או קופסה לצהריים.'
  let commonMistake = 'טעות נפוצה: לנסות לשנות הכל ביום אחד ואז להתייאש.'
  let tip = 'טיפ קטן: הכנה של 10 דקות מראש חוסכת הרבה החלטות בזמן אמת.'

  if (includesAny(message, ['חלבון', 'protein'])) {
    title = 'חלבון — למה הוא חשוב'
    explanation = 'חלבון עוזר לשיקום השרירים, לתחושת שובע ולבניית בסיס טוב לאימונים.'
    examples = ['ביצים או יוגורט בבוקר.', 'טונה, עוף, קטניות או טופו בצהריים.', 'גבינה, יוגורט או חומוס כנשנוש אם זה מתאים לך.']
    practical = 'נסה להוסיף מקור חלבון אחד לכל ארוחה מרכזית.'
    commonMistake = 'טעות נפוצה: לחשוב שחייבים אבקות. אפשר להגיע להרבה דרך אוכל רגיל.'
    tip = 'טיפ קטן: אם אין זמן, טונה/יוגורט/ביצים הם פתרונות מהירים.'
  } else if (includesAny(message, ['פחמימות', 'carbs'])) {
    title = 'פחמימות — דלק לאימון'
    explanation = 'פחמימות נותנות אנרגיה, במיוחד לפני אימון או ביום פעיל.'
    examples = ['אורז, תפוח אדמה, לחם, פסטה, שיבולת שועל, פירות.']
    practical = 'לפני אימון קצר, פרי או פרוסת לחם יכולים להספיק.'
    commonMistake = 'טעות נפוצה: להוריד פחמימות לגמרי ואז להרגיש עייפות באימונים.'
    tip = 'טיפ קטן: בחר כמות שמתאימה לרעב ולאופי היום.'
  } else if (includesAny(message, ['שומן', 'שומנים', 'fats'])) {
    title = 'שומנים טובים — חלק מארוחה מאוזנת'
    explanation = 'שומנים איכותיים עוזרים לשובע ולתפקוד כללי, אבל כדאי לשמור על כמות סבירה.'
    examples = ['טחינה, אבוקדו, אגוזים, שמן זית, זיתים.']
    practical = 'הוסף כף טחינה או מעט אגוזים במקום להפוך את כל הארוחה לשומנית.'
    commonMistake = 'טעות נפוצה: לחשוב ש״בריא״ אומר שאפשר בלי גבול.'
    tip = 'טיפ קטן: מנה קטנה של שומן טוב יכולה לשפר שובע.'
  } else if (includesAny(message, ['מים', 'שתייה', 'water'])) {
    title = 'מים — בסיס לביצועים'
    explanation = 'שתייה מספקת עוזרת לריכוז, אנרגיה והתאוששות.'
    examples = ['כוס מים בבוקר.', 'בקבוק לידך בזמן לימודים/עבודה.', 'מים לפני ואחרי אימון.']
    practical = 'התחל עם בקבוק אחד קבוע שאתה מסיים עד הצהריים.'
    commonMistake = 'טעות נפוצה: לחכות לצמא חזק ורק אז לשתות.'
    tip = 'טיפ קטן: צבע שתן בהיר יחסית הוא סימן כללי טוב, אבל לא מדד רפואי.'
  } else if (includesAny(message, ['לפני אימון', 'pre workout'])) {
    title = 'מה לאכול לפני אימון'
    explanation = 'לפני אימון עדיף משהו קל לעיכול שנותן אנרגיה בלי כבדות.'
    examples = ['בננה.', 'פרוסת לחם עם גבינה/חומוס.', 'יוגורט עם מעט שיבולת שועל.']
    practical = 'אם האימון קרוב, בחר נשנוש קטן. אם יש שעה-שעתיים, אפשר ארוחה רגילה קלה.'
    commonMistake = 'טעות נפוצה: לאכול כבד מדי ממש לפני אימון.'
    tip = 'טיפ קטן: בדוק מה מרגיש לך טוב, כי עיכול משתנה מאדם לאדם.'
  } else if (includesAny(message, ['אחרי אימון', 'post workout'])) {
    title = 'מה לאכול אחרי אימון'
    explanation = 'אחרי אימון כדאי לשלב חלבון עם פחמימה כדי לעזור להתאוששות.'
    examples = ['אורז עם עוף/טונה.', 'יוגורט עם פרי ושיבולת שועל.', 'חביתה עם לחם וירקות.']
    practical = 'אין חובה לאכול בדקה שסיימת; ארוחה מסודרת בשעות שאחרי האימון מספיקה לרוב האנשים.'
    commonMistake = 'טעות נפוצה: לחשוב שאם לא אוכלים מיד האימון “הלך”.'
    tip = 'טיפ קטן: תכנן מראש משהו פשוט כדי לא להגיע רעב מדי.'
  } else if (includesAny(message, ['נשנוש', 'snack'])) {
    title = 'נשנוש בריא ומהיר'
    explanation = 'נשנוש טוב סוגר פינה בלי להפוך לארוחה כבדה.'
    examples = ['פרי ויוגורט.', 'לחם עם חומוס.', 'ביצה קשה וירקות.', 'בננה עם מעט אגוזים.']
    practical = 'בחר נשנוש שיש בו לפחות רכיב משביע אחד: חלבון, סיבים או שומן טוב.'
    commonMistake = 'טעות נפוצה: לנשנש בלי לשים לב ואז לא להיות רעב לארוחה מסודרת.'
    tip = 'טיפ קטן: שים נשנושים פשוטים במקום גלוי ונגיש.'
  }

  return [
    `## ${title}`,
    `### הסבר פשוט`,
    explanation,
    '',
    '### דוגמאות',
    ...examples.map(example => `- ${example}`),
    '',
    '### רעיון מעשי',
    `- ${practical}`,
    '',
    '### טעות נפוצה',
    `- ${commonMistake}`,
    '',
    '### טיפ קטן',
    `- ${tip}`,
    DISCLAIMER,
  ].join('\n')
}

export function generateRecipeReply(message: string, _profile?: Partial<UserProfile>) {
  const ingredients = extractIngredients(message)
  const list = ingredients.length ? ingredients : ['מצרכים בסיסיים שציינת']
  let name = 'קערה מהירה ממה שיש בבית'
  let steps = ['חתוך או הכן את המצרכים.', 'שלב בקערה או במחבת.', 'תבל בעדינות והגש.']
  let time = '10-15 דקות'
  let alternatives = 'אפשר להחליף בין ירקות דומים או בין לחם/טורטיה אם הם כבר קיימים אצלך.'
  let suitable = 'מתאים לארוחה מהירה כשאין הרבה זמן.'

  const has = (nameToFind: string) => ingredients.includes(nameToFind)

  if (has('ביצים') && has('טונה')) {
    name = 'סלט טונה וביצה מהיר'
    steps = ['בשל ביצה או השתמש בביצה מוכנה.', 'ערבב טונה עם ביצה חתוכה.', 'הוסף מלפפון/עגבניה אם ציינת שיש.', 'הגש עם לחם או טורטיה רק אם הם ברשימה שלך.']
    time = '8-12 דקות'
    suitable = 'מתאים לארוחה עשירה יחסית בחלבון.'
  } else if (has('שיבולת שועל') && (has('בננה') || has('תפוח') || has('יוגורט'))) {
    name = 'קערת שיבולת שועל מהירה'
    steps = ['ערבב שיבולת שועל עם יוגורט או מים.', 'הוסף בננה או תפוח חתוך אם יש.', 'המתן כמה דקות לריכוך או חמם בעדינות.']
    time = '5-10 דקות'
    alternatives = 'אפשר להחליף בננה בתפוח או יוגורט במים אם זה מה שיש.'
    suitable = 'מתאים לבוקר או לפני יום עמוס.'
  } else if (has('עוף') && has('אורז')) {
    name = 'קערת עוף ואורז'
    steps = ['חמם או בשל אורז.', 'בשל/חמם עוף עד שהוא מוכן היטב.', 'הוסף ירקות אם ציינת שיש.', 'שלב בקערה ותבל בעדינות.']
    time = '20-30 דקות'
    suitable = 'מתאים לצהריים או אחרי אימון.'
  } else if (has('פסטה') && (has('טונה') || has('גבינה') || has('ירקות'))) {
    name = 'פסטה פשוטה מהמצרכים שלך'
    steps = ['בשל פסטה.', 'הוסף טונה/גבינה/ירקות לפי מה שציינת.', 'ערבב עם מעט תיבול והגש.']
    time = '15-20 דקות'
  } else if (has('לחם') || has('טורטיה')) {
    name = has('טורטיה') ? 'ראפ מהיר' : 'כריך מאוזן'
    steps = ['פתח טורטיה או לחם.', 'הוסף מקור חלבון מהרשימה שלך כמו ביצים/טונה/גבינה/חומוס.', 'הוסף ירקות אם יש.', 'סגור והגש.']
    time = '5-8 דקות'
  } else if (has('עדשים') || has('חומוס') || has('שעועית')) {
    name = 'קערת קטניות פשוטה'
    steps = ['שטוף או חמם את הקטניות.', 'הוסף ירקות אם יש.', 'שלב עם אורז/לחם אם ציינת שיש.', 'תבל בעדינות.']
    time = '10-20 דקות'
    suitable = 'מתאים לארוחה משביעה וצמחונית.'
  }

  return [
    `## ${name}`,
    '### מצרכים',
    ...list.map(item => `- ${item}`),
    '',
    '### שלבי הכנה',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `### זמן הכנה`,
    `- ${time}`,
    '',
    '### חלופות',
    `- ${alternatives}`,
    '',
    '### למי מתאים',
    `- ${suitable}`,
    '',
    '### טיפ בריאות כללי',
    '- שמור על מנה פשוטה, שלב ירק אם יש, ואל תוסיף מצרכים שלא ציינת.',
    DISCLAIMER,
  ].join('\n')
}

export function generateRecipe(ingredients: string[] | string, profile?: Partial<UserProfile>) {
  const message = Array.isArray(ingredients) ? `יש לי ${ingredients.join(', ')}` : ingredients
  return generateRecipeReply(message, profile)
}

export function generateProgressReply(profile?: Partial<UserProfile>, progress?: ProgressInput) {
  const entries = getStoredProgressEntries(progress).filter(entry => entry.completed !== false)
  const weekEntries = entries.filter(entry => isDateInCurrentWeek(entry.date))
  const monthEntries = entries.filter(entry => isDateInCurrentMonth(entry.date))
  const totalMinutes = entries.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0)
  const weeklyTarget = getWeeklyTarget(profile)
  const hardCount = entries.filter(entry => includesAny(String(entry.feeling ?? entry.difficulty ?? ''), ['קשה', 'hard'])).length
  const easyCount = entries.filter(entry => includesAny(String(entry.feeling ?? entry.difficulty ?? ''), ['קל', 'easy'])).length
  const targetRate = Math.min(100, Math.round((weekEntries.length / weeklyTarget) * 100))
  const dayStreak = getProgressDayStreak(entries)
  const difficultySummary = hardCount > easyCount
    ? 'רוב התחושות שנשמרו נוטות לקשה, לכן כדאי להעדיף התאוששות ומנוחות ארוכות יותר.'
    : easyCount > hardCount
      ? 'רוב התחושות שנשמרו נוטות לקל, אז אפשר להתקדם בעדינות עם עוד סט או עוד כמה דקות.'
      : 'רמת הקושי נראית מאוזנת או שאין עדיין מספיק נתונים.'

  const good = weekEntries.length > 0
    ? 'כבר יש פעילות השבוע, וזה סימן טוב לעקביות.'
    : 'עוד לא נרשם אימון השבוע, אז כדאי להתחיל ממש קטן.'
  const improve = hardCount > easyCount
    ? 'נראה שחלק מהאימונים מרגישים קשים — אפשר להאריך מנוחות או לבחור אימון קצר יותר.'
    : 'אפשר לשמור על קצב קבוע, ואם קל מדי להוסיף סבב אחד בהדרגה.'

  return [
    '## סיכום התקדמות מקומי',
    `- אימונים השבוע: ${weekEntries.length}/${weeklyTarget}`,
    `- אימונים החודש: ${monthEntries.length}`,
    `- זמן כולל שנשמר: ${totalMinutes} דקות`,
    `- רצף אימונים: ${dayStreak} ימים`,
    `- עמידה ביעד השבועי: ${targetRate}%`,
    hardCount || easyCount ? `- תחושה אחרי אימונים: ${hardCount} קשים, ${easyCount} קלים/נוחים.` : '- תחושה אחרי אימונים: עדיין אין מספיק נתונים.',
    `- רמת קושי: ${difficultySummary}`,
    '',
    '### מה הולך טוב',
    `- ${good}`,
    '',
    '### מה לשפר',
    `- ${improve}`,
    '',
    '### המלצה לשבוע הקרוב',
    weekEntries.length >= weeklyTarget
      ? '- עמדת ביעד. שמור על הקצב או הוסף 5 דקות לאימון אחד בלבד.'
      : '- בחר 1-2 אימונים קצרים של 10-15 דקות כדי לבנות רצף בלי עומס.',
    '',
    '### עידוד קצר',
    '- התקדמות נבנית מהחלטות קטנות שחוזרות על עצמן, לא משלמות.',
    DISCLAIMER,
  ].join('\n')
}

export function generateProgressSummary(profile?: Partial<UserProfile>, progress?: ProgressInput) {
  return generateProgressReply(profile, progress)
}

export function generateWeeklyMealPlan(profile?: Partial<UserProfile>, language: CoachLanguage = 'he') {
  return formatWeeklyNutritionPlan(generateWeeklyNutritionPlan(profile ?? {}, language), language)
}

export function generateMotivationReply(message: string) {
  let title = 'להתחיל קטן, בלי לחץ'
  let encouragement = 'זה בסדר שלא תמיד יש כוח. המטרה היא לא להיות מושלם, אלא לחזור למסלול בצעד קטן.'
  let action = 'הפעל טיימר ל-5 דקות ועשה הליכה במקום, סקוואטים קלים או מתיחות.'

  if (includesAny(message, ['פספסתי'])) {
    title = 'פספסת אימון? ממשיכים רגיל'
    encouragement = 'אימון שפספסת לא מוחק התקדמות. זה פשוט יום אחד בתוך תהליך.'
    action = 'בחר עכשיו פעולה אחת: 10 דקות הליכה, 2 סבבים קלים או תכנון האימון הבא ביומן.'
  } else if (includesAny(message, ['אין לי זמן'])) {
    title = 'כשאין זמן'
    encouragement = 'גם 5-10 דקות יכולות לשמור על רצף ולחזק הרגל.'
    action = 'עשה סבב אחד: 10 סקוואטים, 8 שכיבות סמיכה מותאמות, 20 שניות פלאנק.'
  } else if (includesAny(message, ['מתייאש', 'קשה לי'])) {
    title = 'כשקשה לשמור שגרה'
    encouragement = 'קושי לא אומר שנכשלת. הוא סימן שצריך להקטין את הצעד, לא לוותר.'
    action = 'בחר אימון קצר מדי כדי להיכשל בו: 3 דקות תנועה בלבד.'
  }

  return [
    `## ${title}`,
    `- ${encouragement}`,
    '',
    '### פעולה קטנה עכשיו',
    `- ${action}`,
    '',
    '### כלל פשוט להמשך',
    '- ביום עמוס עושים פחות, אבל לא נעלמים לגמרי.',
    DISCLAIMER,
  ].join('\n')
}

export function generateRecoveryReply(message: string) {
  const safety = getSafetyLine(message)

  return [
    '## שינה והתאוששות',
    '### למה זה חשוב',
    '- שינה והתאוששות הן הזמן שבו הגוף מסתגל לאימון. בלי התאוששות, קשה להתמיד ולהשתפר.',
    '',
    '### אחרי אימון',
    '- שתה מים, אכול ארוחה פשוטה ומאוזנת, ובצע 3-5 דקות מתיחות קלות.',
    '',
    '### כאבי שרירים רגילים',
    '- תחושת שרירים תפוסים יכולה להיות רגילה אחרי עומס חדש. בחר תנועה קלה, הליכה או מוביליטי עדין.',
    '',
    '### מתי לנוח',
    '- אם אתה עייף מאוד, יש ירידה חדה בביצועים, או הגוף מרגיש כבד — עדיף אימון קל או יום מנוחה.',
    safety || '',
    DISCLAIMER,
  ].filter(Boolean).join('\n')
}

function generateGoalReply(message: string) {
  let goal = 'כושר כללי'
  let focus = 'שלב כוח, סיבולת, מוביליטי ותזונה מסודרת בצורה פשוטה.'
  let action = 'בחר 3 אימונים בשבוע: גוף מלא, אירובי קל, וליבה/גמישות.'

  if (includesAny(message, ['כוח', 'עלייה בכוח'])) {
    goal = 'עלייה בכוח'
    focus = 'התמקד בטכניקה טובה, תרגילים בסיסיים, ומנוחות קצת ארוכות יותר.'
    action = 'מדוד התקדמות לפי עוד חזרה, עוד סט, או שליטה טובה יותר בתנועה.'
  } else if (includesAny(message, ['סיבולת'])) {
    goal = 'סיבולת'
    focus = 'עבוד בזמנים קצובים, מנוחות קצרות, ועלייה הדרגתית במשך האימון.'
    action = 'התחל מ-10-20 דקות והוסף 5 דקות רק כשזה מרגיש יציב.'
  } else if (includesAny(message, ['גמישות'])) {
    goal = 'גמישות'
    focus = 'התקדמות מגיעה מתרגול עדין וקבוע, לא מכאב.'
    action = 'עשה 5-8 דקות מתיחות אחרי אימון או לפני שינה.'
  } else if (includesAny(message, ['התמדה', 'הרגלים'])) {
    goal = 'התמדה ושיפור הרגלים'
    focus = 'המפתח הוא להקטין את הפעולה עד שהיא קלה לביצוע גם ביום עמוס.'
    action = 'קבע מינימום יומי: 5 דקות תנועה או הכנת ארוחה אחת מסודרת.'
  } else if (includesAny(message, ['חיטוב'])) {
    goal = 'חיטוב כללי'
    focus = 'אפשר לעבוד על כוח, תנועה ותזונה מאוזנת בלי הבטחות ובלי קיצוניות.'
    action = 'שלב 2-3 אימוני כוח בשבוע, הליכות, וחלבון בכל ארוחה מרכזית.'
  }

  return [
    `## מטרה: ${goal}`,
    '### כיוון עבודה',
    `- ${focus}`,
    '',
    '### פעולה מעשית',
    `- ${action}`,
    '',
    '### טעות נפוצה',
    '- לבחור תוכנית קשה מדי במקום תוכנית שאפשר להתמיד בה.',
    '',
    '### טיפ קטן',
    '- בדוק התקדמות פעם בשבוע, לא כל שעה.',
    DISCLAIMER,
  ].join('\n')
}

function generateGeneralReply() {
  return [
    '## איך אפשר לעזור?',
    'אני יכול לעזור עם אימונים, תזונה, מתכונים, התקדמות, מוטיבציה והרגלים.',
    '',
    'נסה לשאול למשל:',
    '- תן לי אימון 10 דקות',
    '- יש לי ביצים וטונה',
    '- כמה חלבון צריך?',
    '- איך אני מתקדם?',
    '- אין לי כוח להתאמן היום',
    DISCLAIMER,
  ].join('\n')
}

function generateEnglishNutritionReply(message: string, profile?: Partial<UserProfile>) {
  if (includesAny(message, ['weekly meal plan', 'weekly menu', 'nutrition plan', 'meal plan'])) {
    return generateWeeklyMealPlan(profile, 'en')
  }

  if (includesAny(message, ['protein'])) {
    return [
      '## Protein in Simple Terms',
      'Protein helps muscle recovery, fullness and building a steady base for training.',
      '',
      '### Examples',
      '- Eggs, tuna, chicken, yogurt, tofu, lentils or chickpeas.',
      '- Add one protein source to each main meal when possible.',
      '',
      '### Practical Step',
      '- Pick one easy protein you can repeat this week, such as yogurt, eggs or hummus.',
      '',
      '### Common Mistake',
      '- Thinking protein must come from powders. Regular food can be enough for many people.',
      EN_DISCLAIMER,
    ].join('\n')
  }

  return [
    '## Balanced Nutrition',
    'Good nutrition does not need to be extreme. Build simple meals you can repeat.',
    '',
    '### Simple Plate Idea',
    '- Protein: eggs, tuna, chicken, yogurt, tofu or legumes.',
    '- Carbohydrate: rice, potato, bread, pasta or oats.',
    '- Add vegetables or fruit based on what you have.',
    '',
    '### Small Tip',
    '- Prepare one reliable meal ahead of time so busy days are easier.',
    EN_DISCLAIMER,
  ].join('\n')
}

function generateEnglishRecipeReply(message: string, profile?: Partial<UserProfile>) {
  const ingredients = extractIngredients(message)
  const fallback = ingredients.length ? ingredients : ['the ingredients you listed']
  const avoids = profile?.nutrition?.avoidedFoods ? ` Avoid: ${profile.nutrition.avoidedFoods}.` : ''

  return [
    '## Recipe from Your Ingredients',
    '### Recipe Name',
    `- Simple bowl with ${fallback.slice(0, 3).join(', ')}`,
    '',
    '### Ingredients to Use',
    ...fallback.map(item => `- ${item}`),
    '',
    '### Steps',
    '1. Prepare only the ingredients you listed.',
    '2. Cook or combine them in a pan, bowl or wrap depending on texture.',
    '3. Season gently with pantry basics if you already use them.',
    '4. Serve when the protein and grains are fully ready.',
    '',
    '### Prep Time',
    '- 10-20 minutes, depending on the ingredients.',
    '',
    '### Fits Best For',
    `- A quick balanced meal using only what you said you have.${avoids}`,
    EN_DISCLAIMER,
  ].join('\n')
}

function generateEnglishProgressReply(profile?: Partial<UserProfile>, progress?: ProgressInput) {
  const entries = getStoredProgressEntries(progress).filter(entry => entry.completed !== false)
  const weekEntries = entries.filter(entry => isDateInCurrentWeek(entry.date))
  const monthEntries = entries.filter(entry => isDateInCurrentMonth(entry.date))
  const totalMinutes = entries.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0)
  const weeklyTarget = getWeeklyTarget(profile)

  return [
    '## Local Progress Summary',
    `- Workouts this week: ${weekEntries.length}/${weeklyTarget}`,
    `- Workouts this month: ${monthEntries.length}`,
    `- Total saved training time: ${totalMinutes} minutes`,
    '',
    '### What Is Going Well',
    weekEntries.length > 0
      ? '- You already have activity logged this week. That is a good sign of consistency.'
      : '- No workout is logged this week yet, so start very small.',
    '',
    '### Recommendation for the Week',
    weekEntries.length >= weeklyTarget
      ? '- You reached your weekly target. Keep the pace or add only a small challenge.'
      : '- Choose 1-2 short workouts of 10-15 minutes to build consistency without pressure.',
    EN_DISCLAIMER,
  ].join('\n')
}

function generateEnglishMotivationReply(message: string) {
  const tired = includesAny(message, ['tired', 'no energy', 'exhausted'])

  return [
    tired ? '## Low-Energy Day' : '## Start Small',
    tired
      ? 'It is okay to lower the intensity. A small action keeps the habit alive.'
      : 'You do not need a perfect session. You need one small action you can start now.',
    '',
    '### One Action Now',
    tired
      ? '- Do 5 minutes of easy walking or gentle mobility.'
      : '- Set a 5-minute timer and do squats, modified push-ups or a short walk.',
    '',
    '### Rule for Today',
    '- On a busy or hard day, do less, but do not disappear completely.',
    EN_DISCLAIMER,
  ].join('\n')
}

function generateEnglishRecoveryReply(message: string) {
  const safety = hasSafetySignal(message)
    ? '\n\nSafety: If you have sharp pain, injury, dizziness or a medical issue, stop and consult a professional.'
    : ''

  return [
    '## Sleep and Recovery',
    '### Why It Matters',
    '- Sleep and recovery are when the body adapts to training. Without recovery, consistency becomes harder.',
    '',
    '### After Training',
    '- Drink water, eat a simple balanced meal, and use light movement if your muscles feel stiff.',
    '',
    '### When to Rest',
    '- If performance drops sharply, fatigue is high, or something feels unusual, choose rest or a lighter session.',
    safety,
    EN_DISCLAIMER,
  ].filter(Boolean).join('\n')
}

function generateEnglishGoalReply() {
  return [
    '## Goal Direction',
    '### Good General Plan',
    '- Combine strength, endurance, mobility and simple nutrition habits.',
    '',
    '### Practical Step',
    '- Start with 3 workouts per week: one full-body strength session, one cardio session and one core or mobility session.',
    '',
    '### Common Mistake',
    '- Choosing a plan that is too hard instead of one you can repeat.',
    EN_DISCLAIMER,
  ].join('\n')
}

function generateEnglishGeneralReply() {
  return [
    '## How Can I Help?',
    'I can help with workouts, nutrition, recipes, progress, motivation and habits.',
    '',
    'Try asking:',
    '- Give me a 10-minute workout',
    '- I have eggs and tuna',
    '- How much protein do I need?',
    '- How am I progressing?',
    EN_DISCLAIMER,
  ].join('\n')
}

function generateEnglishLocalReply(message: string, profile?: Partial<UserProfile>, progress?: ProgressInput) {
  const intent = detectIntent(message)

  if (intent === 'workout') {
    const workoutType = detectWorkoutType(profile, message)
    if (workoutType === 'gym') return generateGymWorkout({ message, profile, progress }, 'en')
    if (workoutType === 'cardio') return generateCardioWorkout({ message, profile, progress }, 'en')
    return generateHomeWorkout({ message, profile, progress }, 'en')
  }
  if (intent === 'nutrition') return generateEnglishNutritionReply(message, profile)
  if (intent === 'recipe') return generateEnglishRecipeReply(message, profile)
  if (intent === 'progress') return generateEnglishProgressReply(profile, progress)
  if (intent === 'motivation') return generateEnglishMotivationReply(message)
  if (intent === 'recovery') return generateEnglishRecoveryReply(message)
  if (intent === 'goal') return generateEnglishGoalReply()
  return generateEnglishGeneralReply()
}

function resolveLocalReplyArgs(progressOrLanguage?: ProgressInput | CoachLanguage, maybeProgress?: ProgressInput) {
  if (progressOrLanguage === 'en' || progressOrLanguage === 'he') {
    return { language: progressOrLanguage, progress: maybeProgress }
  }

  return { language: 'he' as CoachLanguage, progress: progressOrLanguage }
}

export function generateLocalReply(
  message: string,
  profile?: Partial<UserProfile>,
  progressOrLanguage?: ProgressInput | CoachLanguage,
  maybeProgress?: ProgressInput,
) {
  const { language, progress } = resolveLocalReplyArgs(progressOrLanguage, maybeProgress)
  if (language === 'en') return generateEnglishLocalReply(message, profile, progress)

  const intent = detectIntent(message)

  if (intent === 'workout') {
    const workoutType = detectWorkoutType(profile, message)
    if (workoutType === 'gym') return generateGymWorkout({ message, profile, progress })
    if (workoutType === 'cardio') return generateCardioWorkout({ message, profile, progress })
    return generateHomeWorkout({ message, profile, progress })
  }
  if (intent === 'nutrition') return generateNutritionReply(message, profile)
  if (intent === 'recipe') return generateRecipeReply(message, profile)
  if (intent === 'progress') return generateProgressReply(profile, progress)
  if (intent === 'motivation') return generateMotivationReply(message)
  if (intent === 'recovery') return generateRecoveryReply(message)
  if (intent === 'goal') return generateGoalReply(message)
  return generateGeneralReply()
}
