export type WorkoutCategory = 'goal' | 'abs' | 'arms' | 'legs' | 'gym'
export type AerobicType = 'run' | 'walk' | 'bike' | 'stairs'

export interface ExerciseCoachingDetails {
  aiTip: string
  aiTipHe: string
  commonMistakes: string[]
  commonMistakesHe: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  executionSteps: string[]
  executionStepsHe: string[]
  goal: string
  goalHe: string
  machineUse?: string[]
  machineUseHe?: string[]
  primaryMuscle: string
  primaryMuscleHe: string
  secondaryMuscles: string[]
  secondaryMusclesHe: string[]
  tempo: string
  tempoHe: string
  tips: string[]
  tipsHe: string[]
}

export interface Exercise {
  id: string
  name: string
  nameHe: string
  sets: number
  reps: number
  durationSeconds?: number
  restSeconds: number
  instruction: string
  instructionHe: string
  coaching?: ExerciseCoachingDetails
}

export interface Workout {
  id: string
  category: WorkoutCategory
  name: string
  nameHe: string
  durationMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  type: 'strength' | 'cardio' | 'hiit' | 'flexibility'
  targetMuscles: string[]
  summary: string
  summaryHe: string
  exercises: Exercise[]
}

export interface AerobicWorkout {
  id: string
  type: AerobicType
  name: string
  nameHe: string
  durationMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  baseDistanceKm: number
  baseCalories: number
  avgPace: string
  avgHeartRate: number
  summary: string
  summaryHe: string
}

export const mockWorkouts: Workout[] = [
  {
    id: 'goal-strength',
    category: 'goal',
    name: 'Goal-Based Full Body',
    nameHe: 'אימון לפי מטרה לכל הגוף',
    durationMinutes: 40,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['chest', 'back', 'legs', 'core'],
    summary: 'Balanced strength session matched to your current profile goal.',
    summaryHe: 'אימון כוח מאוזן שמתאים למטרה שבחרת בפרופיל.',
    exercises: [
      { id: 'goal-1', name: 'Squats', nameHe: 'סקוואטים', sets: 3, reps: 12, restSeconds: 60, instruction: 'Stand with feet shoulder-width apart. Lower until thighs are parallel, then push back up.', instructionHe: 'עמדו ברוחב כתפיים, רדו עד שהירכיים מקבילות לרצפה ועלו חזרה בשליטה.' },
      { id: 'goal-2', name: 'Push-Ups', nameHe: 'שכיבות סמיכה', sets: 3, reps: 10, restSeconds: 45, instruction: 'Keep a straight plank line and lower your chest with elbows around 45 degrees.', instructionHe: 'שמרו על קו גוף ישר, רדו עם החזה כשהמרפקים בזווית נוחה ועלו חזרה.' },
      { id: 'goal-3', name: 'Dumbbell Rows', nameHe: 'חתירה עם משקולות', sets: 3, reps: 12, restSeconds: 60, instruction: 'Hinge at the hips, pull toward your hip, and keep your back flat.', instructionHe: 'הטו את הגוף מהירך, משכו את המשקולת לכיוון האגן ושמרו על גב ישר.' },
      { id: 'goal-4', name: 'Plank', nameHe: 'פלאנק', sets: 3, reps: 30, durationSeconds: 30, restSeconds: 30, instruction: 'Hold a straight line from head to heels and breathe steadily.', instructionHe: 'שמרו על קו ישר מהראש עד העקבים ונשמו בקצב יציב.' },
    ],
  },
  {
    id: 'abs-core',
    category: 'abs',
    name: 'Core & Abs Focus',
    nameHe: 'אימון בטן וליבה',
    durationMinutes: 22,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['abs', 'core'],
    summary: 'Core stability, lower abs, and controlled trunk work.',
    summaryHe: 'עבודה על יציבות ליבה, בטן תחתונה ושליטה בגוף.',
    exercises: [
      { id: 'abs-1', name: 'Dead Bug', nameHe: 'דד באג', sets: 3, reps: 12, restSeconds: 30, instruction: 'Keep your lower back down while alternating opposite arm and leg.', instructionHe: 'הצמידו גב תחתון לרצפה והחליפו יד ורגל נגדית בשליטה.' },
      { id: 'abs-2', name: 'Reverse Crunch', nameHe: 'כפיפות בטן הפוכות', sets: 3, reps: 14, restSeconds: 35, instruction: 'Curl hips toward your ribs without swinging your legs.', instructionHe: 'קרבו את האגן לכיוון הצלעות בלי תנופה מהרגליים.' },
      { id: 'abs-3', name: 'Side Plank', nameHe: 'פלאנק צד', sets: 2, reps: 30, durationSeconds: 30, restSeconds: 30, instruction: 'Stack shoulders and hips, then hold each side with a tight core.', instructionHe: 'יישרו כתפיים ואגן והחזיקו כל צד עם ליבה אסופה.' },
      { id: 'abs-4', name: 'Mountain Climbers', nameHe: 'מטפס הרים', sets: 3, reps: 20, restSeconds: 30, instruction: 'Drive knees forward from plank while keeping hips low.', instructionHe: 'מתנוחת פלאנק הביאו ברכיים קדימה בקצב, ושמרו אגן נמוך.' },
    ],
  },
  {
    id: 'arms-upper',
    category: 'arms',
    name: 'Arms Strength',
    nameHe: 'אימון ידיים',
    durationMinutes: 28,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['biceps', 'triceps', 'shoulders'],
    summary: 'Simple upper-body strength session for arms and shoulders.',
    summaryHe: 'אימון כוח פשוט לפלג גוף עליון, ידיים וכתפיים.',
    exercises: [
      { id: 'arms-1', name: 'Biceps Curl', nameHe: 'כפיפת מרפקים', sets: 3, reps: 12, restSeconds: 45, instruction: 'Keep elbows close to your body and curl without swinging.', instructionHe: 'שמרו מרפקים קרובים לגוף והרימו בלי תנופה.' },
      { id: 'arms-2', name: 'Triceps Dips', nameHe: 'דיפס ליד אחורית', sets: 3, reps: 10, restSeconds: 45, instruction: 'Lower with control, then press through your palms.', instructionHe: 'רדו בשליטה ודחפו דרך כפות הידיים לעלייה.' },
      { id: 'arms-3', name: 'Shoulder Press', nameHe: 'לחיצת כתפיים', sets: 3, reps: 10, restSeconds: 60, instruction: 'Press weights overhead while keeping ribs down.', instructionHe: 'לחצו מעל הראש ושמרו צלעות אסופות.' },
      { id: 'arms-4', name: 'Close-Grip Push-Up', nameHe: 'שכיבת סמיכה צרה', sets: 2, reps: 8, restSeconds: 45, instruction: 'Place hands under shoulders and keep elbows close.', instructionHe: 'מקמו ידיים מתחת לכתפיים ושמרו מרפקים קרובים.' },
    ],
  },
  {
    id: 'legs-lower',
    category: 'legs',
    name: 'Leg Day',
    nameHe: 'אימון רגליים',
    durationMinutes: 32,
    difficulty: 'hard',
    type: 'strength',
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    summary: 'Lower-body strength with squats, lunges, and glute work.',
    summaryHe: 'אימון כוח לרגליים עם סקוואטים, לאנג׳ים ועבודה על ישבן.',
    exercises: [
      { id: 'legs-1', name: 'Goblet Squat', nameHe: 'סקוואט גביע', sets: 4, reps: 10, restSeconds: 60, instruction: 'Hold weight close to your chest and sit between your knees.', instructionHe: 'החזיקו משקל קרוב לחזה ורדו בין הברכיים.' },
      { id: 'legs-2', name: 'Reverse Lunge', nameHe: 'לאנג׳ לאחור', sets: 3, reps: 10, restSeconds: 45, instruction: 'Step back, lower softly, and drive through the front heel.', instructionHe: 'צעדו לאחור, רדו ברכות ודחפו דרך העקב הקדמי.' },
      { id: 'legs-3', name: 'Glute Bridge', nameHe: 'גשר ישבן', sets: 3, reps: 14, restSeconds: 35, instruction: 'Press hips up and squeeze glutes at the top.', instructionHe: 'הרימו אגן וסחטו ישבן בחלק העליון.' },
      { id: 'legs-4', name: 'Calf Raises', nameHe: 'עליות תאומים', sets: 3, reps: 18, restSeconds: 30, instruction: 'Rise onto your toes, pause, then lower slowly.', instructionHe: 'עלו לקצות האצבעות, עצרו רגע ורדו לאט.' },
    ],
  },
]

export const mockAerobicWorkouts: AerobicWorkout[] = [
  {
    id: 'aero-run',
    type: 'run',
    name: 'Outdoor Run',
    nameHe: 'ריצה בחוץ',
    durationMinutes: 20,
    difficulty: 'medium',
    baseDistanceKm: 3.1,
    baseCalories: 260,
    avgPace: '6:25 / km',
    avgHeartRate: 148,
    summary: 'Mock running tracker with distance, pace, calories, and heart-rate stats.',
    summaryHe: 'מד ריצה מדומה עם מרחק, קצב, קלוריות ודופק.',
  },
  {
    id: 'aero-walk',
    type: 'walk',
    name: 'Power Walk',
    nameHe: 'הליכת כוח',
    durationMinutes: 25,
    difficulty: 'easy',
    baseDistanceKm: 2.2,
    baseCalories: 150,
    avgPace: '11:20 / km',
    avgHeartRate: 112,
    summary: 'Lower-intensity aerobic session for recovery and consistency.',
    summaryHe: 'אירובי בעצימות נמוכה להתאוששות ושמירה על רצף.',
  },
  {
    id: 'aero-bike',
    type: 'bike',
    name: 'Bike Ride',
    nameHe: 'רכיבה',
    durationMinutes: 30,
    difficulty: 'medium',
    baseDistanceKm: 8.4,
    baseCalories: 280,
    avgPace: '3:35 / km',
    avgHeartRate: 136,
    summary: 'Steady cycling tracker with distance and effort stats.',
    summaryHe: 'מד רכיבה מדומה עם מרחק, מאמץ וקלוריות.',
  },
  {
    id: 'aero-stairs',
    type: 'stairs',
    name: 'Stair Climb',
    nameHe: 'מדרגות',
    durationMinutes: 15,
    difficulty: 'hard',
    baseDistanceKm: 1.1,
    baseCalories: 210,
    avgPace: '13 floors',
    avgHeartRate: 156,
    summary: 'Short high-effort aerobic climb with floors and heart-rate stats.',
    summaryHe: 'אימון מדרגות קצר ועצים עם קומות ודופק.',
  },
]

export const todayWorkout = mockWorkouts[0]
