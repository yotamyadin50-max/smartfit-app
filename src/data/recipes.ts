export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post-workout'
export type DietTag = 'vegan' | 'vegetarian' | 'gluten-free' | 'high-protein' | 'low-carb'

export interface Recipe {
  id: string
  nameEn: string
  nameHe: string
  descEn: string
  descHe: string
  category: RecipeCategory
  tags: DietTag[]
  prepMinutes: number
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredientsEn: string[]
  ingredientsHe: string[]
  stepsEn: string[]
  stepsHe: string[]
}

export const RECIPES: Recipe[] = [
  {
    id: 'oat-protein-bowl',
    nameEn: 'Protein Oat Bowl',
    nameHe: 'קערת שיבולת שועל עם חלבון',
    descEn: 'High-protein breakfast to fuel your morning',
    descHe: 'ארוחת בוקר עשירה בחלבון לאנרגיה בבוקר',
    category: 'breakfast',
    tags: ['high-protein', 'vegetarian'],
    prepMinutes: 5,
    calories: 420,
    protein: 32,
    carbs: 48,
    fat: 9,
    ingredientsEn: ['80g oats', '1 scoop protein powder', '200ml almond milk', '1 banana', '1 tbsp peanut butter', 'handful of blueberries'],
    ingredientsHe: ['80 גרם שיבולת שועל', 'כף אבקת חלבון', '200 מ"ל חלב שקדים', 'בננה 1', 'כף חמאת בוטנים', 'חופן אוכמניות'],
    stepsEn: ['Cook oats with almond milk for 3 minutes', 'Stir in protein powder', 'Top with banana slices, peanut butter, and blueberries'],
    stepsHe: ['בשל שיבולת שועל עם חלב שקדים 3 דקות', 'ערבב פנימה אבקת חלבון', 'הוסף פרוסות בננה, חמאת בוטנים ואוכמניות'],
  },
  {
    id: 'chicken-rice-bowl',
    nameEn: 'Chicken & Rice Bowl',
    nameHe: 'קערת עוף ואורז',
    descEn: 'Classic lean bulk meal — simple and effective',
    descHe: 'ארוחת בנייה קלאסית — פשוטה ויעילה',
    category: 'lunch',
    tags: ['high-protein', 'gluten-free'],
    prepMinutes: 20,
    calories: 520,
    protein: 45,
    carbs: 55,
    fat: 8,
    ingredientsEn: ['180g chicken breast', '150g jasmine rice', '1 cup broccoli', '1 tbsp olive oil', 'salt, pepper, garlic powder'],
    ingredientsHe: ['180 גרם חזה עוף', '150 גרם אורז יסמין', 'כוס ברוקולי', 'כף שמן זית', 'מלח, פלפל, אבקת שום'],
    stepsEn: ['Cook rice', 'Season chicken and pan-fry 6 min per side', 'Steam broccoli', 'Assemble bowl with olive oil drizzle'],
    stepsHe: ['בשל אורז', 'תבל עוף וטגן 6 דקות מכל צד', 'אדה ברוקולי', 'הרכב קערה עם ניטוף שמן זית'],
  },
  {
    id: 'greek-salad-tuna',
    nameEn: 'Tuna Greek Salad',
    nameHe: 'סלט יווני עם טונה',
    descEn: 'Light, protein-packed lunch in under 10 minutes',
    descHe: 'ארוחת צהריים קלה ועשירת חלבון תוך 10 דקות',
    category: 'lunch',
    tags: ['high-protein', 'gluten-free', 'low-carb'],
    prepMinutes: 8,
    calories: 340,
    protein: 35,
    carbs: 14,
    fat: 16,
    ingredientsEn: ['1 can tuna in water', 'cucumber', 'tomatoes', 'olives', 'feta cheese', 'olive oil', 'lemon juice'],
    ingredientsHe: ['פחית טונה במים', 'מלפפון', 'עגבניות', 'זיתים', 'גבינת פטה', 'שמן זית', 'מיץ לימון'],
    stepsEn: ['Drain tuna', 'Chop vegetables', 'Mix everything', 'Drizzle olive oil and lemon'],
    stepsHe: ['סנן טונה', 'קצץ ירקות', 'ערבב הכל', 'נטף שמן זית ולימון'],
  },
  {
    id: 'salmon-sweet-potato',
    nameEn: 'Salmon & Sweet Potato',
    nameHe: 'סלמון ובטטה',
    descEn: 'Omega-3 packed dinner for recovery',
    descHe: 'ארוחת ערב עשירה באומגה 3 לשיקום',
    category: 'dinner',
    tags: ['high-protein', 'gluten-free'],
    prepMinutes: 25,
    calories: 480,
    protein: 38,
    carbs: 42,
    fat: 14,
    ingredientsEn: ['150g salmon fillet', '1 medium sweet potato', '1 cup spinach', '1 tbsp olive oil', 'lemon, dill, garlic'],
    ingredientsHe: ['150 גרם פילה סלמון', 'בטטה בינונית 1', 'כוס תרד', 'כף שמן זית', 'לימון, שמיר, שום'],
    stepsEn: ['Bake sweet potato at 200°C for 20 min', 'Season salmon, pan-sear 4 min per side', 'Wilt spinach in pan', 'Serve together with lemon'],
    stepsHe: ['אפה בטטה ב-200°C 20 דקות', 'תבל סלמון, צרוב 4 דקות מכל צד', 'בשל תרד במחבת', 'הגש עם לימון'],
  },
  {
    id: 'post-workout-shake',
    nameEn: 'Post-Workout Recovery Shake',
    nameHe: 'שייק שיקום אחרי אימון',
    descEn: 'Fast-absorbing shake to rebuild muscles',
    descHe: 'שייק ספיגה מהירה לבנייה מחדש של שרירים',
    category: 'post-workout',
    tags: ['high-protein', 'vegan'],
    prepMinutes: 3,
    calories: 310,
    protein: 35,
    carbs: 38,
    fat: 4,
    ingredientsEn: ['1 scoop whey protein', '1 banana', '200ml water', 'handful of spinach', '1 tsp honey'],
    ingredientsHe: ['כף אבקת חלבון', 'בננה 1', '200 מ"ל מים', 'חופן תרד', 'כפית דבש'],
    stepsEn: ['Add all ingredients to blender', 'Blend 30 seconds', 'Drink immediately after workout'],
    stepsHe: ['הכנס כל המרכיבים לבלנדר', 'ערבב 30 שניות', 'שתה מיד לאחר האימון'],
  },
  {
    id: 'cottage-rice-cakes',
    nameEn: 'Cottage & Rice Cakes',
    nameHe: 'קוטג׳ עם עוגות אורז',
    descEn: 'Easy high-protein snack, anytime',
    descHe: 'חטיף עשיר בחלבון וקל להכנה',
    category: 'snack',
    tags: ['high-protein', 'vegetarian', 'low-carb'],
    prepMinutes: 2,
    calories: 220,
    protein: 22,
    carbs: 22,
    fat: 4,
    ingredientsEn: ['200g low-fat cottage cheese', '4 rice cakes', 'cucumber slices', 'salt & pepper'],
    ingredientsHe: ['200 גרם קוטג׳ דל שומן', '4 עוגות אורז', 'פרוסות מלפפון', 'מלח ופלפל'],
    stepsEn: ['Spread cottage cheese on rice cakes', 'Top with cucumber', 'Season and serve'],
    stepsHe: ['מרח קוטג׳ על עוגות האורז', 'הוסף מלפפון', 'תבל והגש'],
  },
  {
    id: 'veggie-stir-fry-tofu',
    nameEn: 'Tofu Veggie Stir Fry',
    nameHe: 'מוקפץ ירקות עם טופו',
    descEn: 'Vegan protein dinner, ready in 15 min',
    descHe: 'ארוחת ערב טבעונית עשירת חלבון ב-15 דקות',
    category: 'dinner',
    tags: ['vegan', 'vegetarian', 'high-protein'],
    prepMinutes: 15,
    calories: 390,
    protein: 28,
    carbs: 38,
    fat: 12,
    ingredientsEn: ['200g firm tofu', 'bell pepper', 'broccoli', 'soy sauce', 'ginger', 'garlic', '100g brown rice'],
    ingredientsHe: ['200 גרם טופו קשה', 'פלפל אדום', 'ברוקולי', 'רוטב סויה', 'ג׳ינג׳ר', 'שום', '100 גרם אורז מלא'],
    stepsEn: ['Press and cube tofu', 'Fry tofu until golden', 'Add vegetables and sauce', 'Serve over rice'],
    stepsHe: ['סחט וחתוך טופו לקוביות', 'טגן טופו עד זהוב', 'הוסף ירקות ורוטב', 'הגש על אורז'],
  },
  {
    id: 'egg-avocado-toast',
    nameEn: 'Egg & Avocado Toast',
    nameHe: 'טוסט אבוקדו וביצה',
    descEn: 'Balanced breakfast with healthy fats',
    descHe: 'ארוחת בוקר מאוזנת עם שומנים בריאים',
    category: 'breakfast',
    tags: ['vegetarian', 'high-protein'],
    prepMinutes: 8,
    calories: 380,
    protein: 22,
    carbs: 30,
    fat: 18,
    ingredientsEn: ['2 eggs', '1 avocado', '2 slices sourdough', 'lemon juice', 'salt, chili flakes'],
    ingredientsHe: ['2 ביצים', 'אבוקדו 1', '2 פרוסות לחם מחמצת', 'מיץ לימון', 'מלח, פלפל חריף'],
    stepsEn: ['Toast bread', 'Mash avocado with lemon and salt', 'Fry or poach eggs', 'Top toast with avocado then egg'],
    stepsHe: ['הכנס לחם לטוסטר', 'מגוס אבוקדו עם לימון ומלח', 'טגן או פוש ביצים', 'הרכב טוסט עם אבוקדו וביצה'],
  },
]

export const CATEGORY_LABELS: Record<RecipeCategory, { en: string; he: string }> = {
  breakfast:      { en: 'Breakfast',     he: 'ארוחת בוקר' },
  lunch:          { en: 'Lunch',         he: 'ארוחת צהריים' },
  dinner:         { en: 'Dinner',        he: 'ארוחת ערב' },
  snack:          { en: 'Snack',         he: 'חטיף' },
  'post-workout': { en: 'Post-Workout',  he: 'אחרי אימון' },
}
