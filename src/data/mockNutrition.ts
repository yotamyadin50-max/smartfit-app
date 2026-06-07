export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealOption {
  id: string
  name: string
  nameEn: string
  description: string
  macros: Macros
  ingredients: string[]
  prepSteps: string[]
}

export interface MealCategory {
  id: 'breakfast' | 'lunch' | 'dinner'
  label: string
  labelEn: string
  emoji: string
  options: MealOption[]
}

export const mockMeals: MealCategory[] = [
  {
    id: 'breakfast',
    label: 'בוקר',
    labelEn: 'Breakfast',
    emoji: '🌅',
    options: [
      {
        id: 'b1',
        name: 'שיבולת שועל עם חלבון',
        nameEn: 'Protein Oats',
        description: 'שיבולת שועל קרמית עם אבקת חלבון ובננה',
        macros: { calories: 420, protein: 32, carbs: 55, fat: 8 },
        ingredients: ['80 גרם שיבולת שועל', 'כף אבקת חלבון', 'בננה אחת', '250 מ"ל חלב', 'כף חמאת שקדים'],
        prepSteps: [
          'מחממים חלב בסיר על אש בינונית.',
          'מוסיפים שיבולת שועל ומערבבים 5 דקות עד לקבלת מרקם קרמי.',
          'מורידים מהאש ומערבבים פנימה את אבקת החלבון.',
          'מגישים עם פרוסות בננה וחמאת שקדים מעל.',
        ],
      },
      {
        id: 'b2',
        name: 'ביצים עם ירקות',
        nameEn: 'Egg & Veggie Scramble',
        description: 'חביתה מקושקשת עם תרד ופלפלים',
        macros: { calories: 320, protein: 26, carbs: 10, fat: 18 },
        ingredients: ['3 ביצים', 'כוס תרד', 'חצי פלפל', 'רבע בצל', 'כף שמן זית', 'מלח ופלפל'],
        prepSteps: [
          'מחממים שמן זית במחבת.',
          'מטגנים בצל ופלפל קצוצים 3 דקות.',
          'מוסיפים תרד ומבשלים דקה.',
          'יוצקים ביצים טרופות ומקשקשים עד לקבלת קרישה.',
          'מתבלים במלח ופלפל.',
        ],
      },
      {
        id: 'b3',
        name: 'קערת יוגורט יווני',
        nameEn: 'Greek Yogurt Bowl',
        description: 'יוגורט עשיר בחלבון עם גרנולה ופירות יער',
        macros: { calories: 370, protein: 22, carbs: 48, fat: 9 },
        ingredients: ['200 גרם יוגורט יווני 0%', '40 גרם גרנולה', 'חצי כוס פירות יער מעורבים', 'כפית דבש', 'כף זרעי צ\'יה'],
        prepSteps: [
          'מניחים יוגורט בקערה.',
          'מפזרים גרנולה, פירות יער וזרעי צ\'יה מעל.',
          'מזלפים דבש ומגישים מיד.',
        ],
      },
    ],
  },
  {
    id: 'lunch',
    label: 'צהריים',
    labelEn: 'Lunch',
    emoji: '☀️',
    options: [
      {
        id: 'l1',
        name: 'קערת עוף ואורז',
        nameEn: 'Chicken Rice Bowl',
        description: 'חזה עוף על הגריל עם אורז מלא וברוקולי',
        macros: { calories: 520, protein: 45, carbs: 52, fat: 11 },
        ingredients: ['150 גרם חזה עוף', '100 גרם אורז מלא (יבש)', 'כוס ברוקולי', 'כף שמן זית', 'שום, מלח, פלפל'],
        prepSteps: [
          'מבשלים אורז מלא לפי הוראות האריזה.',
          'מתבלים עוף בשום, מלח ופלפל.',
          'צולים עוף 6 דקות מכל צד עד לבישול מלא.',
          'מאדים ברוקולי 4 דקות.',
          'מרכיבים קערה ומזלפים שמן זית.',
        ],
      },
      {
        id: 'l2',
        name: 'רול טונה',
        nameEn: 'Tuna Wrap',
        description: 'לאפה מחיטה מלאה עם טונה, ירק ואבוקדו',
        macros: { calories: 440, protein: 38, carbs: 36, fat: 14 },
        ingredients: ['לאפה מחיטה מלאה', 'פחית טונה במים', 'רבע אבוקדו', 'חסה', 'כף יוגורט יווני', 'מיץ לימון'],
        prepSteps: [
          'מסננים טונה ומערבבים עם יוגורט ומיץ לימון.',
          'מועכים אבוקדו ומתבלים.',
          'פורסים לאפה ומניחים חסה, תערובת טונה ואבוקדו.',
          'מגלגלים היטב ומגישים.',
        ],
      },
      {
        id: 'l3',
        name: 'סלט עדשים',
        nameEn: 'Lentil Salad',
        description: 'עדשים עתירות סיבים עם ירקות צלויים',
        macros: { calories: 390, protein: 22, carbs: 58, fat: 9 },
        ingredients: ['150 גרם עדשים מבושלות', 'קישוא אחד', 'עגבנייה', 'חצי מלפפון', '2 כפות שמן זית', 'לימון, עשבי תיבול'],
        prepSteps: [
          'חותכים קישוא לקוביות וצולים ב-200° למשך 20 דקות.',
          'מערבבים עדשים, עגבנייה וחצי מלפפון קצוצים.',
          'מוסיפים קישוא צלוי.',
          'מתבלים בשמן זית, מיץ לימון ועשבי תיבול טריים.',
        ],
      },
    ],
  },
  {
    id: 'dinner',
    label: 'ערב',
    labelEn: 'Dinner',
    emoji: '🌙',
    options: [
      {
        id: 'd1',
        name: 'סלמון וקינואה',
        nameEn: 'Salmon & Quinoa',
        description: 'פילה סלמון אפוי עם קינואה ואספרגוס',
        macros: { calories: 550, protein: 48, carbs: 38, fat: 22 },
        ingredients: ['180 גרם פילה סלמון', '80 גרם קינואה (יבש)', '150 גרם אספרגוס', 'לימון אחד', 'כף שמן זית', 'שמיר, מלח, פלפל'],
        prepSteps: [
          'מחממים תנור ל-200°.',
          'מתבלים סלמון במיץ לימון, שמיר, מלח ופלפל.',
          'אופים סלמון 15-18 דקות.',
          'מבשלים קינואה לפי הוראות האריזה.',
          'צולים אספרגוס בשמן זית 12 דקות.',
          'מגישים יחד.',
        ],
      },
      {
        id: 'd2',
        name: 'כדורי בשר הודו',
        nameEn: 'Turkey Meatballs',
        description: 'כדורי הודו רזים ברוטב עגבניות עם פסטה',
        macros: { calories: 490, protein: 40, carbs: 48, fat: 13 },
        ingredients: ['200 גרם הודו טחון', '80 גרם פסטה מחיטה מלאה', 'חצי כוס רוטב עגבניות', 'ביצה אחת', 'שום, עשבי תיבול איטלקיים'],
        prepSteps: [
          'מערבבים הודו עם ביצה, שום ועשבי תיבול. מגלגלים לכדורים.',
          'מטגנים כדורים 3 דקות מכל צד.',
          'מוסיפים רוטב עגבניות, מכסים ומבשלים 10 דקות.',
          'מבשלים פסטה אל-דנטה.',
          'מגישים כדורים ורוטב מעל הפסטה.',
        ],
      },
      {
        id: 'd3',
        name: 'מוקפץ טופו',
        nameEn: 'Stir-Fry Tofu',
        description: 'טופו פריך עם ירקות ורוטב סויה-ג\'ינג\'ר',
        macros: { calories: 380, protein: 24, carbs: 34, fat: 16 },
        ingredients: ['200 גרם טופו קשה', 'כוס ירקות מעורבים', '2 כפות רוטב סויה', 'כפית ג\'ינג\'ר', 'כפית שמן שומשום', '80 גרם אורז מלא'],
        prepSteps: [
          'מייבשים טופו וחותכים לקוביות.',
          'מטגנים טופו עד להזהבה מכל הצדדים.',
          'מקפיצים ירקות בשמן שומשום עם ג\'ינג\'ר.',
          'מוסיפים רוטב סויה וטופו, מערבבים.',
          'מגישים מעל אורז מבושל.',
        ],
      },
    ],
  },
]

export interface MockMealFromIngredients {
  name: string
  ingredients: string[]
  macros: Macros
  prepSteps: string[]
}

export const mockMealFromIngredients: MockMealFromIngredients = {
  name: 'אורז מוקפץ עם ביצה וירקות',
  ingredients: ['2 ביצים', '100 גרם אורז מבושל', 'חצי כוס אפונה קפואה', 'גזר אחד', '2 כפות רוטב סויה', 'כפית שמן שומשום'],
  macros: { calories: 410, protein: 20, carbs: 52, fat: 12 },
  prepSteps: [
    'טורפים ביצים ומקשקשים בווק חם. מניחים בצד.',
    'מקפיצים גזר קצוץ ואפונה 3 דקות.',
    'מוסיפים אורז קר ומקפיצים על אש גבוהה 2 דקות.',
    'דוחפים אורז לצד ומחזירים ביצים.',
    'מערבבים הכל, מוסיפים רוטב סויה ושמן שומשום.',
    'מגישים מיד.',
  ],
}
