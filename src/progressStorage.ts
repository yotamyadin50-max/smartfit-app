import { readJson, removeJson, writeJson } from './lib/storage'
import type { WeeklyNutritionPlan } from './lib/nutritionPlanner'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { loadProgressFromSupabase, saveProgressEntryToSupabase } from './lib/supabaseDb'

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

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
  // Sync to Supabase (fire-and-forget)
  getCurrentUserId().then(uid => {
    if (uid) saveProgressEntryToSupabase(uid, {
      date: nextEntry.date,
      duration: nextEntry.duration,
      type: nextEntry.type,
      feeling: nextEntry.feeling,
      calories: nextEntry.calories,
    })
  })
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
  // Sync to Supabase (fire-and-forget)
  getCurrentUserId().then(uid => {
    if (uid) saveProgressEntryToSupabase(uid, {
      date: nextEntry.date,
      duration: nextEntry.duration,
      type: 'cardio',
      cardio_type: nextEntry.type,
      distance_km: nextEntry.distanceKm,
      calories: nextEntry.calories,
      feeling: nextEntry.feeling,
    })
  })
  return nextEntry
}

/**
 * Load progress history from Supabase and write it to localStorage.
 * Called once on user login to restore cloud data.
 */
export async function syncProgressFromSupabase(userId: string): Promise<void> {
  const rows = await loadProgressFromSupabase(userId)
  if (!rows.length) return

  const workouts: WorkoutProgressEntry[] = rows
    .filter(r => r.type !== 'cardio')
    .map((r, i) => ({
      id: `cloud-${r.date}-${i}`,
      completed: true,
      date: r.date,
      duration: r.duration,
      feeling: r.feeling,
      calories: r.calories,
      type: r.type,
    }))

  const cardio: WorkoutProgressEntry[] = rows
    .filter(r => r.type === 'cardio')
    .map((r, i) => ({
      id: `cloud-cardio-${r.date}-${i}`,
      completed: true,
      date: r.date,
      duration: r.duration,
      feeling: r.feeling,
      calories: r.calories,
      distanceKm: r.distance_km,
      type: r.cardio_type ?? 'cardio',
    }))

  if (workouts.length) writeJson(WORKOUT_PROGRESS_KEY, workouts.slice(0, MAX_ENTRIES))
  if (cardio.length) writeJson(CARDIO_PROGRESS_KEY, cardio.slice(0, MAX_ENTRIES))
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
