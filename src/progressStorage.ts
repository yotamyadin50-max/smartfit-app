import { readJson, removeJson, writeJson } from './lib/storage'
import type { WeeklyNutritionPlan } from './lib/nutritionPlanner'

export type WorkoutProgressEntry = {
  calories?: number
  completed: boolean
  date: string
  distanceKm?: number
  duration: number
  feeling?: string
  id: string
  type: string
}

export type ProgressData = {
  cardio: WorkoutProgressEntry[]
  mealPlans: WeeklyNutritionPlan[]
  workouts: WorkoutProgressEntry[]
}

const WORKOUT_PROGRESS_KEY = 'smartfit_workout_progress'
const CARDIO_PROGRESS_KEY = 'smartfit_cardio_progress'
const MEAL_PLAN_KEY = 'smartfit_weekly_meal_plans'
const MAX_ENTRIES = 160

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isWorkoutEntry(value: unknown): value is WorkoutProgressEntry {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    typeof value.duration === 'number' &&
    typeof value.type === 'string' &&
    typeof value.completed === 'boolean'
  )
}

function isWorkoutEntries(value: unknown): value is WorkoutProgressEntry[] {
  return Array.isArray(value) && value.every(isWorkoutEntry)
}

function isMealPlans(value: unknown): value is WeeklyNutritionPlan[] {
  return Array.isArray(value)
}

export function getWorkoutProgress() {
  return readJson<WorkoutProgressEntry[]>(WORKOUT_PROGRESS_KEY, [], isWorkoutEntries)
}

export function getCardioProgress() {
  return readJson<WorkoutProgressEntry[]>(CARDIO_PROGRESS_KEY, [], isWorkoutEntries)
}

export function saveCompletedWorkout(entry: Omit<WorkoutProgressEntry, 'completed' | 'date' | 'id'> & Partial<Pick<WorkoutProgressEntry, 'date' | 'id'>>) {
  const nextEntry: WorkoutProgressEntry = {
    completed: true,
    date: entry.date ?? new Date().toISOString(),
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...entry,
  }
  writeJson(WORKOUT_PROGRESS_KEY, [nextEntry, ...getWorkoutProgress()].slice(0, MAX_ENTRIES))
  return nextEntry
}

export function saveCardioSession(entry: Omit<WorkoutProgressEntry, 'completed' | 'date' | 'id'> & Partial<Pick<WorkoutProgressEntry, 'date' | 'id'>>) {
  const nextEntry: WorkoutProgressEntry = {
    completed: true,
    date: entry.date ?? new Date().toISOString(),
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...entry,
  }
  writeJson(CARDIO_PROGRESS_KEY, [nextEntry, ...getCardioProgress()].slice(0, MAX_ENTRIES))
  return nextEntry
}

export function getSavedMealPlans() {
  return readJson<WeeklyNutritionPlan[]>(MEAL_PLAN_KEY, [], isMealPlans)
}

export function saveWeeklyMealPlan(plan: WeeklyNutritionPlan) {
  writeJson(MEAL_PLAN_KEY, [plan, ...getSavedMealPlans()].slice(0, 12))
}

export function getProgressData(): ProgressData {
  return {
    cardio: getCardioProgress(),
    mealPlans: getSavedMealPlans(),
    workouts: getWorkoutProgress(),
  }
}

export function clearProgressData() {
  removeJson(WORKOUT_PROGRESS_KEY)
  removeJson(CARDIO_PROGRESS_KEY)
  removeJson(MEAL_PLAN_KEY)
}
