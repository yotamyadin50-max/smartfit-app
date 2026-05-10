import type { Language } from '../context/I18nContext'
import type { AgeGroup } from '../context/UserContext'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

const responses: Record<Language, Record<string, string>> = {
  en: {
    protein: 'Great question! For muscle building, aim for 1.6-2.2g of protein per kg of bodyweight per day. Good sources include chicken breast, eggs, Greek yogurt, lentils, and tuna.',
    workout: 'For best results, train each muscle group 2-3 times per week with 48h of rest between sessions. Mix strength and cardio for balanced fitness.',
    calories: 'Your calorie needs depend on your goal. A 200-300 kcal deficit works well for fat loss, while a 200-300 kcal surplus supports muscle gain.',
    sleep: 'Sleep is when your body actually builds muscle. Aim for 7-9 hours per night.',
    rest: 'Rest days are part of progress. Take at least 1-2 rest days per week, with walking or stretching as active recovery.',
    water: 'Hydration is key for performance. Aim for at least 35ml per kg of bodyweight daily.',
    cardio: 'Cardio improves heart health and supports calorie burn. 2-3 sessions of 20-30 minutes per week is a solid start.',
    stretch: 'Stretching after workouts improves mobility. Hold each stretch for 20-30 seconds without bouncing.',
    diet: 'Focus on lean proteins, complex carbs, healthy fats, and vegetables. Consistency matters more than perfection.',
  },
  he: {
    protein: 'שאלה מצוינת. לבניית שריר כדאי לכוון בערך ל-1.6-2.2 גרם חלבון לכל ק״ג משקל גוף ביום. מקורות טובים: עוף, ביצים, יוגורט יווני, עדשים וטונה.',
    workout: 'לתוצאות טובות כדאי לאמן כל קבוצת שריר 2-3 פעמים בשבוע, עם לפחות 48 שעות התאוששות בין אימונים דומים.',
    calories: 'צריכת הקלוריות תלויה במטרה. לחיטוב מתאים גרעון קטן של 200-300 קלוריות, ולעלייה במסת שריר עודף קטן של 200-300 קלוריות.',
    sleep: 'שינה היא חלק מהאימון. כדאי לכוון ל-7-9 שעות בלילה כדי לשפר התאוששות וביצועים.',
    rest: 'ימי מנוחה הם חלק מההתקדמות. מומלץ לשלב 1-2 ימי מנוחה בשבוע, ואפשר לעשות הליכה או מתיחות קלות.',
    water: 'שתייה משפיעה על ביצועים. כלל אצבע טוב הוא כ-35 מ״ל מים לכל ק״ג משקל גוף ביום.',
    cardio: 'אירובי מחזק את הלב ועוזר בהוצאה קלורית. התחלה טובה היא 2-3 אימונים של 20-30 דקות בשבוע.',
    stretch: 'מתיחות אחרי אימון יכולות לשפר טווח תנועה. החזק כל מתיחה 20-30 שניות בלי ניעות.',
    diet: 'התמקד בחלבון רזה, פחמימות מורכבות, שומנים טובים וירקות. עקביות חשובה יותר משלמות.',
  },
}

const defaultResponses: Record<Language, string[]> = {
  en: [
    "That's a good fitness question. In demo mode, the safest answer is: train consistently, sleep well, and eat enough protein.",
    'SmartFit AI will answer this in more detail later. For now, keep the basics steady: movement, nutrition, sleep, and recovery.',
    'Noted. This mock coach is limited, but your next best step is usually one small consistent action today.',
  ],
  he: [
    'זו שאלה טובה בכושר. במצב דמו התשובה הבטוחה היא: להתאמן בעקביות, לישון טוב ולאכול מספיק חלבון.',
    'SmartFit AI יענה על זה לעומק בהמשך. כרגע הבסיס הוא תנועה, תזונה, שינה והתאוששות.',
    'נרשם. מאמן הדמו מוגבל, אבל הצעד הכי טוב הוא פעולה קטנה ועקבית כבר היום.',
  ],
}

const keywordAliases: Record<Language, Record<string, string[]>> = {
  en: {
    protein: ['protein'],
    workout: ['workout', 'train', 'training'],
    calories: ['calorie', 'calories'],
    sleep: ['sleep'],
    rest: ['rest', 'recovery'],
    water: ['water', 'hydrate', 'hydration'],
    cardio: ['cardio', 'aerobic', 'run', 'running'],
    stretch: ['stretch', 'mobility'],
    diet: ['diet', 'eat', 'meal', 'nutrition'],
  },
  he: {
    protein: ['חלבון', 'protein'],
    workout: ['אימון', 'אימונים', 'להתאמן', 'workout'],
    calories: ['קלוריה', 'קלוריות', 'calories'],
    sleep: ['שינה', 'לישון', 'sleep'],
    rest: ['מנוחה', 'התאוששות', 'rest'],
    water: ['מים', 'שתייה', 'שתיה', 'water'],
    cardio: ['אירובי', 'ריצה', 'הליכה', 'cardio'],
    stretch: ['מתיחות', 'גמישות', 'stretch'],
    diet: ['תזונה', 'אוכל', 'ארוחה', 'לאכול', 'diet'],
  },
}

const ageNotes: Record<Language, Record<AgeGroup, string>> = {
  en: {
    teen: 'Age note: keep training technique-first, avoid extreme diets, and ask a trusted adult or professional before intense plans.',
    adult: 'Age note: this is balanced for an adult profile, with steady progression and normal recovery.',
    senior: 'Age note: keep impact lower, warm up longer, and choose joint-friendly options if anything feels uncomfortable.',
  },
  he: {
    teen: 'הערת גיל: להתמקד קודם בטכניקה, להימנע מדיאטות קיצוניות, ולהתייעץ עם מבוגר אחראי או איש מקצוע לפני תוכנית אינטנסיבית.',
    adult: 'הערת גיל: התשובה מותאמת לפרופיל בוגר, עם התקדמות הדרגתית והתאוששות רגילה.',
    senior: 'הערת גיל: לשמור על אימפקט נמוך יותר, להתחמם יותר זמן, ולבחור חלופות ידידותיות למפרקים אם משהו מרגיש לא נוח.',
  },
}

function withAgeNote(response: string, language: Language, ageGroup: AgeGroup) {
  return `${response}\n\n${ageNotes[language][ageGroup]}`
}

export function getMockResponse(userMessage: string, language: Language, ageGroup: AgeGroup = 'adult'): string {
  const lower = userMessage.toLowerCase()
  for (const [topic, aliases] of Object.entries(keywordAliases[language])) {
    if (aliases.some(alias => lower.includes(alias.toLowerCase()))) {
      return withAgeNote(responses[language][topic] ?? responses[language].diet, language, ageGroup)
    }
  }
  const fallback = defaultResponses[language]
  return withAgeNote(fallback[Math.floor(Math.random() * fallback.length)], language, ageGroup)
}

export const suggestedQuestions: Record<Language, string[]> = {
  en: [
    'How much protein do I need?',
    'How many rest days per week?',
    'What should I eat before a workout?',
    'How do I build muscle faster?',
    'Is cardio necessary for fat loss?',
  ],
  he: [
    'כמה חלבון אני צריך?',
    'כמה ימי מנוחה צריך בשבוע?',
    'מה כדאי לאכול לפני אימון?',
    'איך בונים שריר מהר יותר?',
    'האם אירובי חשוב לחיטוב?',
  ],
}
