import type { Goal, UserProfile } from '../context/UserContext'

export type PlanLanguage = 'en' | 'he'

export type WeeklyMeal = {
  description: string
  goalFit: string
  ingredients: string[]
  name: string
  slot: string
}

export type WeeklyNutritionDay = {
  alternatives: string[]
  day: string
  meals: WeeklyMeal[]
}

export type WeeklyNutritionPlan = {
  dailyHydration: string
  days: WeeklyNutritionDay[]
  generatedAt: string
  goalLabel: string
  healthySnacks: string[]
  language?: PlanLanguage
  notes: string[]
}

type MealTemplate = [string, string[], string, string]

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const slotNames = ['ארוחת בוקר', 'ארוחת ביניים', 'ארוחת צהריים', 'ארוחת ביניים', 'ארוחת ערב']

const goalLabels: Record<Goal, string> = {
  bulk: 'כוח וחיזוק שרירים',
  consistency: 'התמדה באימונים',
  cut: 'חיטוב כללי ומאוזן',
  endurance: 'סיבולת',
  fitness: 'כושר כללי',
  flexibility: 'גמישות ואורח חיים פעיל',
  health: 'אורח חיים בריא',
}

const strengthMeals: MealTemplate[] = [
  ['יוגורט עשיר בחלבון עם שיבולת שועל', ['יוגורט', 'שיבולת שועל', 'בננה', 'אגוזים'], 'ארוחה מהירה עם חלבון ופחמימה נוחה לפתיחת היום.', 'מתאים לכוח כי הוא נותן חלבון לשיקום שריר ואנרגיה לאימון.'],
  ['חביתה עם ירקות וטוסט', ['ביצים', 'עגבניה', 'מלפפון', 'לחם מלא'], 'ארוחה פשוטה ומשביעה שאפשר להכין מהר.', 'מתאים לכוח כי הביצים מוסיפות חלבון איכותי.'],
  ['קערת עוף ואורז', ['עוף', 'אורז', 'ירקות', 'שמן זית'], 'צלחת בסיסית, ברורה וקלה להכנה מראש.', 'מתאים לכוח כי היא משלבת חלבון ופחמימה לשיקום אחרי אימון.'],
  ['כריך טונה וירקות', ['טונה', 'לחם מלא', 'מלפפון', 'עגבניה'], 'פתרון מהיר ליום עמוס.', 'מתאים לכוח כי הטונה מספקת חלבון בלי הכנה מורכבת.'],
]

const enduranceMeals: MealTemplate[] = [
  ['דייסת שיבולת שועל ופירות', ['שיבולת שועל', 'בננה', 'תפוח', 'קינמון'], 'ארוחה עדינה עם אנרגיה מתמשכת.', 'מתאים לסיבולת בזכות פחמימות מורכבות לפני יום פעיל.'],
  ['קערת אורז וקטניות', ['אורז', 'עדשים', 'ירקות', 'טחינה'], 'ארוחה משביעה שמחזיקה לאורך זמן.', 'מתאים לסיבולת כי היא משלבת פחמימה מורכבת וחלבון צמחי.'],
  ['פסטה ירקות וטונה', ['פסטה', 'טונה', 'ירקות', 'שמן זית'], 'ארוחה נוחה לפני או אחרי פעילות ממושכת.', 'מתאים לסיבולת כי יש בה דלק זמין לצד חלבון.'],
  ['תפוח אדמה עם גבינה וירקות', ['תפוח אדמה', 'גבינה', 'ירקות'], 'ארוחה פשוטה וחמה ללא עומס.', 'מתאים לסיבולת כי תפוח האדמה נותן אנרגיה הדרגתית.'],
]

const cutMeals: MealTemplate[] = [
  ['קערת עוף וירקות עם אורז', ['עוף', 'אורז', 'ירקות', 'שמן זית'], 'צלחת מאוזנת עם חלבון ברור, ירקות ופחמימה מדודה.', 'מתאים לחיטוב כי הוא משביע, מסודר ולא קיצוני.'],
  ['סלט טונה וביצה', ['טונה', 'ביצים', 'מלפפון', 'עגבניה'], 'ארוחה קלה להכנה עם הרבה שובע ונפח מירקות.', 'מתאים לחיטוב כי היא שומרת על חלבון גבוה בלי להכביד.'],
  ['יוגורט עם שיבולת שועל ופירות', ['יוגורט', 'שיבולת שועל', 'בננה', 'תפוח'], 'אפשרות מהירה לבוקר או לנשנוש מסודר.', 'מתאים לחיטוב כי הוא נותן שובע ומתיקות טבעית בלי דיאטה קיצונית.'],
  ['קערת עדשים וירקות', ['עדשים', 'ירקות', 'טחינה', 'אורז'], 'ארוחה צמחית משביעה עם סיבים וחלבון.', 'מתאים לחיטוב כי היא עוזרת לשמור על סדר ושובע לאורך היום.'],
]

const balancedMeals: MealTemplate[] = [
  ['קערת יוגורט ופירות', ['יוגורט', 'בננה', 'תפוח', 'שיבולת שועל'], 'ארוחה קלה, מהירה ומאוזנת.', 'מתאים לכושר כללי כי היא משלבת שובע, אנרגיה וחלבון.'],
  ['סלט טונה וביצה', ['טונה', 'ביצים', 'מלפפון', 'עגבניה'], 'ארוחה קרה שאפשר להכין מראש.', 'מתאים למטרה כי היא משביעה בלי להיות כבדה.'],
  ['מוקפץ עוף וירקות', ['עוף', 'ירקות', 'אורז'], 'ארוחה ביתית פשוטה עם בסיס ברור.', 'מתאים למטרה כי הוא משלב חלבון, ירקות ופחמימה זמינה.'],
  ['ראפ חומוס וירקות', ['טורטיה', 'חומוס', 'מלפפון', 'עגבניה'], 'פתרון מהיר ונוח לנשיאה.', 'מתאים להתמדה כי קל לחזור עליו ביום עמוס.'],
]

const quickMeals: MealTemplate[] = [
  ['כריך ביצה מהיר', ['לחם מלא', 'ביצים', 'ירקות'], 'נכין מראש או תוך כמה דקות.', 'מתאים כשאין זמן כי הוא קצר, ברור ומשביע.'],
  ['יוגורט עם בננה ושיבולת שועל', ['יוגורט', 'בננה', 'שיבולת שועל'], 'לערבב ולהגיש.', 'מתאים כשאין זמן כי אין כמעט הכנה.'],
  ['טורטיה טונה', ['טורטיה', 'טונה', 'מלפפון'], 'למלא, לגלגל ולאכול.', 'מתאים כשאין זמן ועדיין שומר על חלבון.'],
]

const snackIdeas = ['פרי עם יוגורט', 'ירקות חתוכים עם חומוס', 'טוסט קטן עם גבינה', 'בננה לפני אימון', 'תפוח עם מעט אגוזים']

const englishDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const englishSlotNames = ['Breakfast', 'Snack', 'Lunch', 'Snack', 'Dinner']

const englishGoalLabels: Record<Goal, string> = {
  bulk: 'strength and muscle support',
  consistency: 'training consistency',
  cut: 'balanced body-composition support',
  endurance: 'endurance',
  fitness: 'general fitness',
  flexibility: 'flexibility and active lifestyle',
  health: 'healthy lifestyle',
}

const englishStrengthMeals: MealTemplate[] = [
  ['High-protein yogurt bowl with oats', ['yogurt', 'oats', 'banana', 'nuts'], 'A quick meal with protein and comfortable carbohydrates for the start of the day.', 'Fits strength goals because it supports muscle recovery and training energy.'],
  ['Egg omelet with vegetables and toast', ['eggs', 'tomato', 'cucumber', 'whole-grain bread'], 'A simple filling meal that is quick to prepare.', 'Fits strength goals because eggs add a practical protein source.'],
  ['Chicken and rice bowl', ['chicken', 'rice', 'vegetables', 'olive oil'], 'A clear balanced plate that can be prepared ahead of time.', 'Fits strength goals because it combines protein with carbohydrates after training.'],
  ['Tuna and vegetable sandwich', ['tuna', 'whole-grain bread', 'cucumber', 'tomato'], 'A fast option for a busy day.', 'Fits strength goals because tuna provides protein with little preparation.'],
]

const englishEnduranceMeals: MealTemplate[] = [
  ['Oatmeal with fruit', ['oats', 'banana', 'apple', 'cinnamon'], 'A gentle meal with steady energy.', 'Fits endurance because complex carbohydrates support an active day.'],
  ['Rice and legume bowl', ['rice', 'lentils', 'vegetables', 'tahini'], 'A satisfying meal that lasts well.', 'Fits endurance because it combines complex carbohydrates and plant protein.'],
  ['Pasta with vegetables and tuna', ['pasta', 'tuna', 'vegetables', 'olive oil'], 'A convenient meal around longer activity.', 'Fits endurance because it provides accessible fuel with protein.'],
  ['Potato with cheese and vegetables', ['potato', 'cheese', 'vegetables'], 'A warm simple meal without much fuss.', 'Fits endurance because potato provides gradual energy.'],
]

const englishCutMeals: MealTemplate[] = [
  ['Chicken and vegetable rice bowl', ['chicken', 'rice', 'vegetables', 'olive oil'], 'A balanced plate with clear protein, vegetables and measured carbohydrates.', 'Fits body-composition goals because it is filling, structured and not extreme.'],
  ['Tuna and egg salad', ['tuna', 'eggs', 'cucumber', 'tomato'], 'A quick meal with protein and volume from vegetables.', 'Fits body-composition goals because it supports fullness without feeling heavy.'],
  ['Yogurt with oats and fruit', ['yogurt', 'oats', 'banana', 'apple'], 'A fast option for breakfast or a planned snack.', 'Fits body-composition goals because it adds fullness and natural sweetness without extreme dieting.'],
  ['Lentil and vegetable bowl', ['lentils', 'vegetables', 'tahini', 'rice'], 'A plant-based meal with fiber and protein.', 'Fits body-composition goals because it supports consistency and fullness through the day.'],
]

const englishBalancedMeals: MealTemplate[] = [
  ['Yogurt and fruit bowl', ['yogurt', 'banana', 'apple', 'oats'], 'A light, quick and balanced meal.', 'Fits general fitness because it combines fullness, energy and protein.'],
  ['Tuna and egg salad', ['tuna', 'eggs', 'cucumber', 'tomato'], 'A cold meal that can be prepared ahead.', 'Fits the goal because it is filling without being heavy.'],
  ['Chicken and vegetable stir-fry', ['chicken', 'vegetables', 'rice'], 'A simple home meal with a clear base.', 'Fits the goal because it combines protein, vegetables and available carbohydrates.'],
  ['Hummus and vegetable wrap', ['tortilla', 'hummus', 'cucumber', 'tomato'], 'A fast portable option.', 'Fits consistency because it is easy to repeat on busy days.'],
]

const englishQuickMeals: MealTemplate[] = [
  ['Quick egg sandwich', ['whole-grain bread', 'eggs', 'vegetables'], 'Prepare ahead or make in a few minutes.', 'Fits busy days because it is short, clear and filling.'],
  ['Yogurt with banana and oats', ['yogurt', 'banana', 'oats'], 'Mix and serve.', 'Fits busy days because it needs almost no prep.'],
  ['Tuna tortilla', ['tortilla', 'tuna', 'cucumber'], 'Fill, roll and eat.', 'Fits busy days while still keeping protein in the meal.'],
]

const englishSnackIdeas = ['Fruit with yogurt', 'Cut vegetables with hummus', 'Small cheese toast', 'Banana before training', 'Apple with a few nuts']

function getLanguageData(language: PlanLanguage) {
  if (language === 'en') {
    return {
      balancedMeals: englishBalancedMeals,
      cutMeals: englishCutMeals,
      dayNames: englishDayNames,
      enduranceMeals: englishEnduranceMeals,
      goalLabels: englishGoalLabels,
      quickMeals: englishQuickMeals,
      snackIdeas: englishSnackIdeas,
      slotNames: englishSlotNames,
      strengthMeals: englishStrengthMeals,
    }
  }

  return {
    balancedMeals,
    cutMeals,
    dayNames,
    enduranceMeals,
    goalLabels,
    quickMeals,
    snackIdeas,
    slotNames,
    strengthMeals,
  }
}

function splitList(value?: string) {
  return (value ?? '')
    .split(/[,\n]+/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
}

function includesForbidden(ingredients: string[], blocked: string[]) {
  return ingredients.some(ingredient => {
    const lower = ingredient.toLowerCase()
    return blocked.some(item => lower.includes(item) || item.includes(lower))
  })
}

function getPrimaryGoal(profile: Partial<UserProfile>) {
  const goals = profile.goals?.length ? profile.goals : [profile.goal ?? 'fitness']
  if (goals.includes('cut')) return 'cut'
  if (goals.includes('bulk')) return 'bulk'
  if (goals.includes('endurance')) return 'endurance'
  if (goals.includes('health')) return 'health'
  if (goals.includes('consistency')) return 'consistency'
  if (goals.includes('flexibility')) return 'flexibility'
  return 'fitness'
}

function getMealPool(profile: Partial<UserProfile>, language: PlanLanguage) {
  const data = getLanguageData(language)
  const goal = getPrimaryGoal(profile)
  const hardWithTime = profile.habits?.hardestPart === 'time'
  const base = goal === 'cut'
    ? data.cutMeals
    : goal === 'bulk'
    ? data.strengthMeals
    : goal === 'endurance'
      ? data.enduranceMeals
      : data.balancedMeals

  return hardWithTime ? [...data.quickMeals, ...base] : base
}

function adaptMeal(rawMeal: MealTemplate, blocked: string[], likedFoods: string[], language: PlanLanguage = 'he'): WeeklyMeal {
  const [name, ingredientsValue, description, goalFit] = rawMeal
  let ingredients = ingredientsValue.filter(ingredient => !includesForbidden([ingredient], blocked))

  if (ingredients.length < 2) {
    const fallback = language === 'en'
      ? ['rice', 'vegetables', 'hummus']
      : ['אורז', 'ירקות', 'חומוס']
    ingredients = fallback.filter(ingredient => !includesForbidden([ingredient], blocked))
  }

  const likedAddition = likedFoods.find(food => !includesForbidden([food], blocked) && !ingredients.some(ingredient => ingredient.toLowerCase() === food))
  if (likedAddition && ingredients.length < 5) ingredients = [...ingredients, likedAddition]

  return {
    description,
    goalFit,
    ingredients,
    name,
    slot: '',
  }
}

function buildDay(profile: Partial<UserProfile>, day: string, dayIndex: number, language: PlanLanguage): WeeklyNutritionDay {
  const data = getLanguageData(language)
  const nutrition = profile.nutrition
  const blocked = [...splitList(nutrition?.avoidedFoods), ...splitList(nutrition?.sensitivities)]
  const likedFoods = splitList(nutrition?.likedFoods)
  const pool = getMealPool(profile, language).filter(meal => !includesForbidden(meal[1] as string[], blocked))
  const safePool = pool.length ? pool : data.balancedMeals
  const meals = data.slotNames.map((slot, slotIndex) => ({
    ...adaptMeal(safePool[(dayIndex + slotIndex) % safePool.length], blocked, likedFoods, language),
    slot,
  }))

  return {
    alternatives: [
      'אפשר להחליף מקור חלבון: ביצים / טונה / עוף / חומוס לפי מה שמתאים לך.',
      'אפשר להחליף פחמימה: אורז / תפוח אדמה / לחם מלא / שיבולת שועל.',
      profile.habits?.hardestPart === 'time' ? 'ביום עמוס בחר כריך, יוגורט או טורטיה במקום בישול מלא.' : 'אם יש זמן, הכנה מראש של אורז/ירקות תחסוך החלטות במהלך היום.',
    ],
    ...(language === 'en' ? {
      alternatives: [
        'You can swap protein sources: eggs / tuna / chicken / hummus according to what works for you.',
        'You can swap carbohydrates: rice / potato / whole-grain bread / oats.',
        profile.habits?.hardestPart === 'time' ? 'On a busy day, choose a sandwich, yogurt or tortilla instead of full cooking.' : 'If you have time, preparing rice or vegetables ahead can reduce decisions during the day.',
      ],
    } : {}),
    day,
    meals,
  }
}

export function generateWeeklyNutritionPlan(profile: Partial<UserProfile>): WeeklyNutritionPlan {
  const goal = getPrimaryGoal(profile)
  const mealsPerDay = profile.nutrition?.mealsPerDay ?? 3
  const hydrationBase = profile.age && profile.age < 18 ? 'בערך 6-8 כוסות מים ביום, יותר ביום חם או פעיל.' : 'בערך 8-10 כוסות מים ביום, יותר ביום חם או סביב אימון.'

  return {
    dailyHydration: hydrationBase,
    days: dayNames.map((day, index) => buildDay(profile, day, index, 'he')),
    generatedAt: new Date().toISOString(),
    goalLabel: goalLabels[goal],
    healthySnacks: snackIdeas.filter(snack => !includesForbidden([snack], splitList(profile.nutrition?.avoidedFoods))).slice(0, 5),
    notes: [
      `התוכנית מותאמת למטרה: ${goalLabels[goal]}.`,
      mealsPerDay < 5 ? `סימנת ${mealsPerDay} ארוחות ביום, לכן אפשר להשתמש בארוחות הביניים כאופציה קלה ולא חובה.` : 'התוכנית בנויה ל-5 נקודות אכילה ביום.',
      'אין כאן דיאטה קיצונית או הבטחות ירידה במשקל.',
      'המידע כללי בלבד ואינו מחליף ייעוץ מקצועי.',
    ],
  }
}

export function formatWeeklyNutritionPlan(plan: WeeklyNutritionPlan) {
  return [
    `## תוכנית תזונה שבועית — ${plan.goalLabel}`,
    '',
    '### המלצת שתייה יומית',
    `- ${plan.dailyHydration}`,
    '',
    ...plan.days.flatMap(day => [
      `### יום ${day.day}`,
      ...day.meals.flatMap(meal => [
        `- ${meal.slot}: ${meal.name}`,
        `  מצרכים: ${meal.ingredients.join(', ')}`,
        `  הסבר: ${meal.description}`,
        `  למה מתאים: ${meal.goalFit}`,
      ]),
      'חלופות:',
      ...day.alternatives.map(alternative => `- ${alternative}`),
      '',
    ]),
    '### רעיונות לנשנושים בריאים',
    ...plan.healthySnacks.map(snack => `- ${snack}`),
    '',
    '### הערות',
    ...plan.notes.map(note => `- ${note}`),
  ].join('\n')
}

export function isWeeklyNutritionPlan(value: unknown): value is WeeklyNutritionPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as WeeklyNutritionPlan
  return (
    typeof plan.generatedAt === 'string' &&
    typeof plan.goalLabel === 'string' &&
    Array.isArray(plan.days) &&
    Array.isArray(plan.notes) &&
    Array.isArray(plan.healthySnacks) &&
    typeof plan.dailyHydration === 'string'
  )
}
