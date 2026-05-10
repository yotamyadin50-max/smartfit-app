import type { UserProfile } from './context/UserContext'
import {
  formatWeeklyNutritionPlan as formatBaseWeeklyNutritionPlan,
  generateWeeklyNutritionPlan as generateHebrewWeeklyNutritionPlan,
  isWeeklyNutritionPlan,
  type PlanLanguage,
  type WeeklyMeal,
  type WeeklyNutritionDay,
  type WeeklyNutritionPlan,
} from './lib/nutritionPlanner'

export {
  isWeeklyNutritionPlan,
  type PlanLanguage,
  type WeeklyMeal,
  type WeeklyNutritionDay,
  type WeeklyNutritionPlan,
}

const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const englishSlots = ['Breakfast', 'Snack', 'Lunch', 'Snack', 'Dinner']

const englishMeals = [
  ['High-protein yogurt bowl', ['yogurt', 'oats', 'banana'], 'A quick balanced meal with protein and steady energy.', 'Useful for training because it combines protein with easy carbohydrates.'],
  ['Egg and vegetable toast', ['eggs', 'whole-grain bread', 'tomato'], 'A simple filling option that is easy to repeat.', 'Good for strength because it adds a clear protein source.'],
  ['Chicken rice bowl', ['chicken', 'rice', 'vegetables'], 'A practical lunch that can be prepared ahead.', 'Supports recovery with protein and complex carbohydrates.'],
  ['Hummus vegetable wrap', ['tortilla', 'hummus', 'cucumber'], 'A fast portable meal for busy days.', 'Helps consistency because it is easy to prepare.'],
  ['Tuna potato plate', ['tuna', 'potato', 'vegetables'], 'A simple plate with protein and steady energy.', 'Works well around endurance or general fitness days.'],
] as const

function getEnglishGoalLabel(profile: Partial<UserProfile>) {
  const goals = profile.goals?.length ? profile.goals : [profile.goal ?? 'fitness']
  if (goals.includes('bulk')) return 'strength and muscle support'
  if (goals.includes('endurance')) return 'endurance'
  if (goals.includes('health')) return 'healthy lifestyle'
  if (goals.includes('flexibility')) return 'flexibility and active lifestyle'
  if (goals.includes('consistency')) return 'training consistency'
  if (goals.includes('cut')) return 'balanced body-composition support'
  return 'general fitness'
}

function splitBlocked(profile: Partial<UserProfile>) {
  return [
    ...(profile.nutrition?.avoidedFoods ?? '').split(/[,\n]+/),
    ...(profile.nutrition?.sensitivities ?? '').split(/[,\n]+/),
  ]
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
}

function removeBlocked(ingredients: readonly string[], blocked: string[]) {
  const filtered = ingredients.filter(ingredient => {
    const lower = ingredient.toLowerCase()
    return !blocked.some(item => lower.includes(item) || item.includes(lower))
  })

  return filtered.length ? filtered : ['rice', 'vegetables', 'hummus']
}

function generateEnglishWeeklyNutritionPlan(profile: Partial<UserProfile>): WeeklyNutritionPlan {
  const blocked = splitBlocked(profile)
  const mealsPerDay = profile.nutrition?.mealsPerDay ?? 3
  const goalLabel = getEnglishGoalLabel(profile)

  return {
    dailyHydration: profile.age && profile.age < 18
      ? 'About 6-8 cups of water per day, more on hot or active days.'
      : 'About 8-10 cups of water per day, more on hot days or around training.',
    days: englishDays.map((day, dayIndex) => ({
      alternatives: [
        'Swap protein sources: eggs / tuna / chicken / hummus according to preference and availability.',
        'Swap carbohydrates: rice / potato / whole-grain bread / oats.',
        profile.habits?.hardestPart === 'time'
          ? 'On busy days, use a sandwich, yogurt bowl or wrap instead of full cooking.'
          : 'Preparing rice, vegetables or protein ahead can make the day easier.',
      ],
      day,
      meals: englishSlots.map((slot, slotIndex) => {
        const meal = englishMeals[(dayIndex + slotIndex) % englishMeals.length]
        return {
          description: meal[2],
          goalFit: meal[3],
          ingredients: removeBlocked(meal[1], blocked),
          name: meal[0],
          slot,
        }
      }),
    })),
    generatedAt: new Date().toISOString(),
    goalLabel,
    healthySnacks: ['Fruit with yogurt', 'Cut vegetables with hummus', 'Small cheese toast', 'Banana before training', 'Apple with a few nuts']
      .filter(snack => !blocked.some(item => snack.toLowerCase().includes(item))),
    language: 'en',
    notes: [
      `The plan is adapted to your goal: ${goalLabel}.`,
      mealsPerDay < 5
        ? `You selected ${mealsPerDay} meals per day, so the snack meals can be optional.`
        : 'The plan is built around five eating points per day.',
      'This is not an extreme diet and does not promise weight loss.',
      'This information is general only and does not replace professional advice.',
    ],
  }
}

export function generateWeeklyNutritionPlan(profile: Partial<UserProfile>, language: PlanLanguage = 'he') {
  if (language === 'en') return generateEnglishWeeklyNutritionPlan(profile)
  return { ...generateHebrewWeeklyNutritionPlan(profile), language: 'he' as const }
}

export function formatWeeklyNutritionPlan(plan: WeeklyNutritionPlan, language: PlanLanguage = plan.language ?? 'he') {
  if (language === 'he') return formatBaseWeeklyNutritionPlan(plan)

  return [
    `## Weekly Nutrition Plan — ${plan.goalLabel}`,
    '',
    '### Daily Hydration Recommendation',
    `- ${plan.dailyHydration}`,
    '',
    ...plan.days.flatMap(day => [
      `### ${day.day}`,
      ...day.meals.flatMap(meal => [
        `- ${meal.slot}: ${meal.name}`,
        `  Ingredients: ${meal.ingredients.join(', ')}`,
        `  Explanation: ${meal.description}`,
        `  Why it fits: ${meal.goalFit}`,
      ]),
      'Alternatives:',
      ...day.alternatives.map(alternative => `- ${alternative}`),
      '',
    ]),
    '### Healthy Snack Ideas',
    ...plan.healthySnacks.map(snack => `- ${snack}`),
    '',
    '### Notes',
    ...plan.notes.map(note => `- ${note}`),
  ].join('\n')
}

