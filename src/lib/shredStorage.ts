/**
 * shredStorage.ts
 * Local-first storage for the Shredding (חיטוב) feature.
 * All data lives in localStorage — no Supabase required.
 */

import type { UserProfile } from '../context/UserContext'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FoodEntry {
  id: string
  date: string      // YYYY-MM-DD
  meal: number      // meal index (0 = breakfast, 1 = lunch, etc.)
  name: string
  grams: number
  kcal: number
  protein: number   // grams
  carbs: number     // grams
  fat: number       // grams
}

export interface WeightEntry {
  date: string      // YYYY-MM-DD
  weightKg: number
}

export interface SavedMeal {
  id: string
  label: string
  totalKcal: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  items: Array<{
    name: string
    grams: number
    kcal: number
    protein: number
    carbs: number
    fat: number
  }>
}

export interface ShredGoal {
  targetWeightKg: number
  targetDate: string   // YYYY-MM-DD
  startWeightKg: number
  startDate: string    // YYYY-MM-DD
}

export interface DailyNeeds {
  targetKcal: number   // calories to CONSUME
  burnGoalKcal: number // calories to BURN from exercise
  tdee: number
  protein: number  // grams
  carbs: number    // grams
  fat: number      // grams
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const FOOD_LOG_KEY    = 'smartfit_shred_food'
const WEIGHT_LOG_KEY  = 'smartfit_shred_weight'
const MEALS_KEY       = 'smartfit_shred_saved_meals'
const GOAL_KEY        = 'smartfit_shred_goal'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function readArr<T>(key: string): T[] {
  try {
    const v = localStorage.getItem(key)
    if (!v) return []
    const p = JSON.parse(v)
    return Array.isArray(p) ? p : []
  } catch { return [] }
}

function writeArr<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota */ }
}

// ── Food log ──────────────────────────────────────────────────────────────────

export function getFoodLog(date?: string): FoodEntry[] {
  const all = readArr<FoodEntry>(FOOD_LOG_KEY)
  const d = date ?? todayStr()
  return all.filter(e => e.date === d)
}

export function addFoodEntry(entry: Omit<FoodEntry, 'id' | 'date'> & { date?: string }): FoodEntry {
  const all = readArr<FoodEntry>(FOOD_LOG_KEY)
  const newEntry: FoodEntry = { ...entry, id: uid(), date: entry.date ?? todayStr() }
  // Keep last 90 days only
  const cutoff = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
  writeArr(FOOD_LOG_KEY, [...all.filter(e => e.date >= cutoff), newEntry])
  return newEntry
}

export function removeFoodEntry(id: string): void {
  writeArr(FOOD_LOG_KEY, readArr<FoodEntry>(FOOD_LOG_KEY).filter(e => e.id !== id))
}

// ── Weight log ────────────────────────────────────────────────────────────────

export function getWeightLog(): WeightEntry[] {
  return readArr<WeightEntry>(WEIGHT_LOG_KEY)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function addWeightEntry(weightKg: number, date?: string): void {
  const all = readArr<WeightEntry>(WEIGHT_LOG_KEY)
  const d = date ?? todayStr()
  const filtered = all.filter(e => e.date !== d)
  writeArr(WEIGHT_LOG_KEY, [...filtered, { date: d, weightKg }]
    .sort((a, b) => a.date.localeCompare(b.date)))
}

export function getLatestWeight(): WeightEntry | null {
  const log = getWeightLog()
  return log.length ? log[log.length - 1] : null
}

// ── Saved meals ───────────────────────────────────────────────────────────────

export function getSavedMeals(): SavedMeal[] {
  return readArr<SavedMeal>(MEALS_KEY).slice(0, 3)
}

export function saveMeal(meal: Omit<SavedMeal, 'id'>): { saved: boolean; replaced: string | null } {
  const all = readArr<SavedMeal>(MEALS_KEY)
  let replaced: string | null = null
  if (all.length >= 3) {
    replaced = all[0].label
    all.shift()
  }
  writeArr(MEALS_KEY, [...all, { ...meal, id: uid() }])
  return { saved: true, replaced }
}

export function deleteSavedMeal(id: string): void {
  writeArr(MEALS_KEY, readArr<SavedMeal>(MEALS_KEY).filter(m => m.id !== id))
}

// ── Shred goal ────────────────────────────────────────────────────────────────

export function getShredGoal(): ShredGoal | null {
  try {
    const v = localStorage.getItem(GOAL_KEY)
    return v ? (JSON.parse(v) as ShredGoal) : null
  } catch { return null }
}

export function saveShredGoal(goal: ShredGoal): void {
  try { localStorage.setItem(GOAL_KEY, JSON.stringify(goal)) } catch { /* quota */ }
}

// ── Daily needs (TDEE + cutting deficit) ─────────────────────────────────────

export function calculateDailyNeeds(profile: UserProfile): DailyNeeds {
  const age       = profile.age ?? 25
  const weightKg  = profile.weightKg ?? 70
  const heightCm  = profile.heightCm ?? 170
  const isFemale  = profile.gender === 'female'
  const workoutDays = profile.workout_days ?? 3
  const goals = profile.goals?.length ? profile.goals : [profile.goal]
  const hasCutGoal = goals.includes('cut')
  const hasBulkGoal = goals.includes('bulk')
  const hasEnduranceGoal = goals.includes('endurance')

  // Mifflin-St Jeor BMR
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (isFemale ? -161 : 5)

  // Activity multiplier
  const actMul = workoutDays <= 1 ? 1.2
    : workoutDays <= 3 ? 1.375
    : workoutDays <= 5 ? 1.55
    : 1.725

  const tdee = Math.round(bmr * actMul)
  const minKcal = isFemale ? 1200 : 1500

  // Goal-aware target. Cutting gets a gentle deficit; other goals keep nutrition available
  // without silently applying a cutting diet to everyone.
  let targetKcal: number
  if (age < 18) {
    targetKcal = hasBulkGoal ? tdee + 150 : tdee + 50
  } else if (hasCutGoal && age < 25) {
    targetKcal = Math.max(minKcal, tdee - 200)
  } else if (hasCutGoal) {
    targetKcal = Math.max(minKcal, tdee - 400)
  } else if (hasBulkGoal) {
    targetKcal = tdee + 250
  } else if (hasEnduranceGoal) {
    targetKcal = tdee + 100
  } else {
    targetKcal = tdee
  }

  const proteinMultiplier = hasCutGoal ? 2.2 : hasBulkGoal ? 2.0 : hasEnduranceGoal ? 1.5 : 1.7
  let protein = Math.round(weightKg * proteinMultiplier)
  // Cap protein so at least a minimal fat allocation (15% of target kcal) still
  // fits — a heavy user near the calorie floor could otherwise have protein
  // alone exceed the whole budget, forcing fat to 0 and carbs to 0 below.
  const minFatKcal = targetKcal * 0.15
  const maxProteinKcal = Math.max(0, targetKcal - minFatKcal)
  if (protein * 4 > maxProteinKcal) {
    protein = Math.round(maxProteinKcal / 4)
  }
  let fat = Math.round(Math.max(weightKg * 0.8, targetKcal * 0.25 / 9))
  // Overflow guard: protein + fat must not exceed the calorie budget
  if (protein * 4 + fat * 9 > targetKcal) {
    fat = Math.round((targetKcal - protein * 4) / 9 * 0.8)
  }
  fat = Math.max(0, fat)
  const carbsKcal = Math.max(0, targetKcal - protein * 4 - fat * 9)
  const carbs   = Math.round(carbsKcal / 4)

  // Exercise burn goal = calories to burn in a single workout session
  // Use at least 45 min so the goal is always meaningful (min ~200 kcal)
  const sessionMin    = Math.max(45, profile.workoutDuration ?? 45)
  const burnFloor = hasCutGoal ? 200 : 120
  const burnGoalKcal  = Math.max(burnFloor, Math.round(5.5 * weightKg * (sessionMin / 60)))

  return { targetKcal, burnGoalKcal, tdee, protein, carbs, fat }
}

// ── Manual burn log ───────────────────────────────────────────────────────────

export interface ManualBurnEntry {
  id: string
  date: string
  type: string       // 'gym' | 'cardio' | 'hiit' | 'home'
  durationMin: number
  kcal: number
  watchBpm?: number  // set when calorie estimate came from smartwatch HR
}

const MANUAL_BURN_KEY = 'smartfit_shred_manual_burn'

export function getManualBurnLog(date?: string): ManualBurnEntry[] {
  const all = readArr<ManualBurnEntry>(MANUAL_BURN_KEY)
  const d = date ?? todayStr()
  return all.filter(e => e.date === d)
}

export function addManualBurnEntry(
  type: string,
  durationMin: number,
  weightKg: number,
  kcalOverride?: number,
  watchBpm?: number,
): ManualBurnEntry {
  const all  = readArr<ManualBurnEntry>(MANUAL_BURN_KEY)
  const kcal = kcalOverride ?? estimateWorkoutCalories(type, durationMin, weightKg)
  const entry: ManualBurnEntry = { id: uid(), date: todayStr(), type, durationMin, kcal, ...(watchBpm ? { watchBpm } : {}) }
  const cutoff = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
  writeArr(MANUAL_BURN_KEY, [...all.filter(e => e.date >= cutoff), entry])
  return entry
}

export function removeManualBurnEntry(id: string): void {
  writeArr(MANUAL_BURN_KEY, readArr<ManualBurnEntry>(MANUAL_BURN_KEY).filter(e => e.id !== id))
}

// ── Workout calorie burn estimate ─────────────────────────────────────────────

export function estimateWorkoutCalories(type: string, durationMin: number, weightKg: number): number {
  const met = type === 'cardio' ? 9
    : type === 'hiit' ? 8
    : type === 'gym' ? 5.5
    : 5   // home / default
  return Math.round(met * weightKg * (durationMin / 60))
}

/**
 * Heart-rate–based calorie estimation (Keytel et al., 2005).
 * More accurate than MET when smartwatch HR is available.
 */
export function estimateCaloriesFromHR(
  avgBpm: number,
  durationMin: number,
  weightKg: number,
  age: number,
  isFemale: boolean,
): number {
  const calPerMin = isFemale
    ? (-20.4022 + 0.4472 * avgBpm + 0.1263 * weightKg + 0.074  * age) / 4.184
    : (-55.0969 + 0.6309 * avgBpm + 0.1988 * weightKg + 0.2017 * age) / 4.184
  return Math.max(0, Math.round(calPerMin * durationMin))
}

// ── Motivational message ──────────────────────────────────────────────────────

export function getMotivationalMessage(
  goal: ShredGoal,
  latestWeightKg: number,
): { msg: string; color: string } {
  const totalToLose = goal.startWeightKg - goal.targetWeightKg
  const lost        = goal.startWeightKg - latestWeightKg

  if (lost >= totalToLose) {
    return { msg: '🎉 הגעת ליעד! מדהים!', color: '#22c55e' }
  }

  const targetDate = new Date(goal.targetDate).getTime()
  const startDate  = new Date(goal.startDate).getTime()
  const now        = Date.now()
  const totalDays  = Math.max(1, (targetDate - startDate) / 86400_000)
  const daysPassed = (now - startDate) / 86400_000
  const expected   = (daysPassed / totalDays) * totalToLose

  if (lost >= expected * 1.1) return { msg: '🔥 אתה מקדים את הקצב, מעולה!',         color: '#22c55e' }
  if (lost >= expected * 0.8) return { msg: '💪 אתה בקצב מושלם, המשך כך!',           color: '#6366f1' }
  return                              { msg: '⚡ יאללה, אנחנו מפגרים — בוא נדביק!', color: '#f97316' }
}
