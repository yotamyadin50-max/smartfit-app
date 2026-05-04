export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

const responses: Record<string, string> = {
  protein: "Great question! For muscle building, aim for 1.6–2.2g of protein per kg of bodyweight per day. Good sources include chicken breast, eggs, Greek yogurt, lentils, and tuna.",
  workout: "For best results, train each muscle group 2–3 times per week with 48h of rest between sessions. Mix strength and cardio for balanced fitness.",
  calories: "Your calorie needs depend on your goal. A 200–300 kcal deficit works well for fat loss, while a 200–300 kcal surplus supports muscle gain. Focus on whole foods.",
  sleep: "Sleep is when your body actually builds muscle. Aim for 7–9 hours per night. Poor sleep increases cortisol and reduces workout performance significantly.",
  rest: "Rest days are not optional — they're when adaptation happens. At least 1–2 rest days per week. Active recovery like walking or stretching is great on those days.",
  water: "Hydration is key for performance. Aim for at least 35ml per kg of bodyweight daily, and drink extra before and after workouts.",
  cardio: "Cardio improves heart health and burns extra calories. 2–3 sessions of 20–30 minutes per week is enough alongside strength training.",
  stretch: "Stretching after workouts improves flexibility and reduces soreness. Hold each stretch 20–30 seconds without bouncing.",
  diet: "Focus on whole foods: lean proteins, complex carbohydrates, healthy fats, and plenty of vegetables. Consistency over 80% of meals matters more than perfection.",
  supplement: "The only supplements with strong evidence are: creatine monohydrate (3–5g/day), protein powder if you struggle to hit targets, and vitamin D if you're deficient.",
}

const defaultResponses = [
  "That's a great fitness question! While I'm still in training mode, I'll be able to give you personalized advice soon. The short answer: stay consistent, prioritize sleep, and eat enough protein.",
  "SmartFit AI will answer this in detail when fully connected. For now: the basics always win — train consistently, sleep 8 hours, eat whole foods.",
  "Noted! Once my AI engine is live, I'll give you a personalized response. Keep up the great work!",
]

export function getMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase()
  for (const [keyword, response] of Object.entries(responses)) {
    if (lower.includes(keyword)) return response
  }
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}

export const suggestedQuestions = [
  'How much protein do I need?',
  'How many rest days per week?',
  'What should I eat before a workout?',
  'How do I build muscle faster?',
  'Is cardio necessary for fat loss?',
]
