import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  loadUserDataFromSupabase,
  saveProfileToSupabase,
  saveStatsToSupabase,
} from '../lib/supabaseDb'
import { getLevelFromXp } from '../lib/animalRanks'
import { syncProgressFromSupabase } from '../progressStorage'
import { emitProgressEvent } from '../lib/achievementEvents'

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export type Goal = 'cut' | 'bulk' | 'fitness' | 'health' | 'endurance' | 'flexibility' | 'consistency'
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type WorkoutType = 'gym' | 'home' | 'outdoor'
export type NutritionPref = 'none' | 'vegetarian' | 'vegan' | 'gluten-free'
export type DietType = 'vegetarian' | 'vegan' | 'kosher' | 'gluten-free' | 'dairy-free' | 'nut-free'
export type PainIntensity = 'mild' | 'moderate' | 'severe'
export type WorkoutTimePreference = 'morning' | 'noon' | 'evening'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not'
export type EquipmentOption = 'none' | 'dumbbells' | 'bands' | 'gym' | 'pullup_bar'
export type EnergyLevel = 'low' | 'medium' | 'high'
export type DailyActivityLevel = 'low' | 'medium' | 'high'
export type HabitChallenge = 'start' | 'consistency' | 'time' | 'motivation'
export type SensitiveArea = 'back' | 'knees' | 'shoulders' | 'neck' | 'elbows' | 'hips' | 'ankles'
export type WeekDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type ScheduleFocus = 'goal' | 'abs' | 'arms' | 'legs' | 'back' | 'aerobic' | 'rest' | 'chest' | 'glutes'
export type AgeGroup = 'teen' | 'adult' | 'senior'
export type DevicePreferences = {
  cardioLocation?: boolean
  smartScale?: boolean
  smartWatch?: boolean
}

export type WeeklyPlan = Record<WeekDay, ScheduleFocus>

export interface UserProfile {
  name?: string
  age?: number
  gender?: Gender
  heightCm?: number
  weightKg?: number
  goal: Goal
  goals?: Goal[]
  level?: FitnessLevel
  fitnessLevel: FitnessLevel
  workout_days?: number
  workout_time?: 10 | 15 | 20 | 30 | 45 | 60 | 75 | 90
  workoutDuration: 10 | 15 | 20 | 30 | 45 | 60 | 75 | 90
  homeWorkoutDuration?: 10 | 20 | 30 | 45 | 60 | 75 | 90
  gymWorkoutDuration?: 10 | 20 | 30 | 45 | 60 | 75 | 90
  workoutType: WorkoutType
  workoutTypes?: WorkoutType[]
  gymDays?: WeekDay[]
  equipment?: EquipmentOption[]
  nutritionPref: NutritionPref
  nutrition?: {
    avoidedFoods?: string
    dietTypes?: DietType[]
    eatsRegularly?: boolean
    likedFoods?: string
    mealsPerDay?: number
    sensitivities?: string
  }
  health?: {
    energyLevel?: EnergyLevel
    hasPainOrInjuries?: boolean
    painIntensity?: Partial<Record<SensitiveArea, PainIntensity>>
    sensitiveAreas?: SensitiveArea[]
    sleepHours?: number
  }
  habits?: {
    dailyActivity?: DailyActivityLevel
    fixedWorkoutTime?: boolean
    hardestPart?: HabitChallenge
    workoutTimePreference?: WorkoutTimePreference
  }
  useMetric?: boolean
  devices?: DevicePreferences
  weeklyPlan?: WeeklyPlan
  notificationsEnabled: boolean
  reminderSound: boolean
  reminderTime: string
  onboardingComplete: boolean
}

export interface UserStats {
  xp: number
  level: number
  streak: number
  streakFreezes: number     // starts at 1; auto-consumed when streak would break
  totalWorkouts: number
  lastWorkoutDate?: string  // ISO date string "YYYY-MM-DD"
}

export const WEEK_DAYS: WeekDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const SCHEDULE_FOCUSES: ScheduleFocus[] = ['goal', 'abs', 'arms', 'legs', 'back', 'aerobic', 'rest', 'chest', 'glutes']
export const MIN_PROFILE_AGE = 13
export const MAX_PROFILE_AGE = 90
export const DEFAULT_PROFILE_AGE = 28

export const DEFAULT_WEEKLY_PLAN: WeeklyPlan = {
  sun: 'goal',
  mon: 'arms',
  tue: 'aerobic',
  wed: 'rest',
  thu: 'legs',
  fri: 'abs',
  sat: 'rest',
}

const DEFAULT_PROFILE: UserProfile = {
  age: DEFAULT_PROFILE_AGE,
  goal: 'fitness',
  goals: ['fitness'],
  level: 'beginner',
  fitnessLevel: 'beginner',
  workout_days: 3,
  workout_time: 20,
  workoutDuration: 20,
  workoutType: 'gym',
  workoutTypes: ['gym'],
  equipment: ['none'],
  nutritionPref: 'none',
  nutrition: {
    eatsRegularly: true,
    mealsPerDay: 3,
    likedFoods: '',
    avoidedFoods: '',
    sensitivities: '',
  },
  health: {
    energyLevel: 'medium',
    hasPainOrInjuries: false,
    sensitiveAreas: [],
    sleepHours: 7,
  },
  habits: {
    dailyActivity: 'medium',
    fixedWorkoutTime: false,
    hardestPart: 'consistency',
  },
  devices: {
    cardioLocation: false,
    smartScale: false,
    smartWatch: false,
  },
  weeklyPlan: DEFAULT_WEEKLY_PLAN,
  notificationsEnabled: false,
  reminderSound: true,
  reminderTime: '08:00',
  onboardingComplete: false,
}

const DEFAULT_STATS: UserStats = {
  xp: 0,
  level: 1,
  streak: 0,
  streakFreezes: 1,
  totalWorkouts: 0,
}

const NEW_ACCOUNT_STATS: UserStats = {
  xp: 0,
  level: 1,
  streak: 0,
  streakFreezes: 1,
  totalWorkouts: 0,
}

const GOALS: Goal[] = ['cut', 'bulk', 'fitness', 'health', 'endurance', 'flexibility', 'consistency']
const FITNESS_LEVELS: FitnessLevel[] = ['beginner', 'intermediate', 'advanced']
const WORKOUT_TYPES: WorkoutType[] = ['gym', 'home', 'outdoor']
const NUTRITION_PREFS: NutritionPref[] = ['none', 'vegetarian', 'vegan', 'gluten-free']
const WORKOUT_DURATIONS: UserProfile['workoutDuration'][] = [10, 15, 20, 30, 45, 60, 75, 90]
const GENDERS: Gender[] = ['male', 'female', 'other', 'prefer_not']
const EQUIPMENT_OPTIONS: EquipmentOption[] = ['none', 'dumbbells', 'bands', 'gym', 'pullup_bar']
const ENERGY_LEVELS: EnergyLevel[] = ['low', 'medium', 'high']
const DAILY_ACTIVITY_LEVELS: DailyActivityLevel[] = ['low', 'medium', 'high']
const HABIT_CHALLENGES: HabitChallenge[] = ['start', 'consistency', 'time', 'motivation']
const SENSITIVE_AREAS: SensitiveArea[] = ['back', 'knees', 'shoulders', 'neck', 'elbows', 'hips', 'ankles']
const PAIN_INTENSITIES: PainIntensity[] = ['mild', 'moderate', 'severe']
const WORKOUT_TIME_PREFS: WorkoutTimePreference[] = ['morning', 'noon', 'evening']
const DIET_TYPES: DietType[] = ['vegetarian', 'vegan', 'kosher', 'gluten-free', 'dairy-free', 'nut-free']

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isProfile(value: unknown): value is UserProfile {
  if (!isObject(value)) return false
  const goals = value.goals
  const workoutTypes = value.workoutTypes
  const weeklyPlan = value.weeklyPlan
  const age = value.age
  const equipment = value.equipment
  const health = value.health
  const nutrition = value.nutrition
  const habits = value.habits
  const devices = value.devices

  return (
    (value.name === undefined || typeof value.name === 'string') &&
    (age === undefined || isValidAge(age)) &&
    (value.gender === undefined || GENDERS.includes(value.gender as Gender)) &&
    (value.heightCm === undefined || isValidHeight(value.heightCm)) &&
    (value.weightKg === undefined || isValidWeight(value.weightKg)) &&
    GOALS.includes(value.goal as Goal) &&
    (goals === undefined || (Array.isArray(goals) && goals.length > 0 && goals.every(goal => GOALS.includes(goal as Goal)))) &&
    (value.level === undefined || FITNESS_LEVELS.includes(value.level as FitnessLevel)) &&
    FITNESS_LEVELS.includes(value.fitnessLevel as FitnessLevel) &&
    (value.workout_days === undefined || isWorkoutDays(value.workout_days)) &&
    (value.workout_time === undefined || WORKOUT_DURATIONS.includes(value.workout_time as UserProfile['workoutDuration'])) &&
    WORKOUT_DURATIONS.includes(value.workoutDuration as UserProfile['workoutDuration']) &&
    WORKOUT_TYPES.includes(value.workoutType as WorkoutType) &&
    (workoutTypes === undefined || (Array.isArray(workoutTypes) && workoutTypes.length > 0 && workoutTypes.length <= 2 && workoutTypes.every(type => WORKOUT_TYPES.includes(type as WorkoutType)))) &&
    (equipment === undefined || (Array.isArray(equipment) && equipment.length > 0 && equipment.every(item => EQUIPMENT_OPTIONS.includes(item as EquipmentOption)))) &&
    NUTRITION_PREFS.includes(value.nutritionPref as NutritionPref) &&
    (nutrition === undefined || isNutritionProfile(nutrition)) &&
    (health === undefined || isHealthProfile(health)) &&
    (habits === undefined || isHabitsProfile(habits)) &&
    (devices === undefined || isDevicePreferences(devices)) &&
    (weeklyPlan === undefined || isWeeklyPlan(weeklyPlan)) &&
    typeof value.notificationsEnabled === 'boolean' &&
    typeof value.reminderTime === 'string' &&
    typeof value.onboardingComplete === 'boolean' &&
    (value.reminderSound === undefined || typeof value.reminderSound === 'boolean')
  )
}

function isWeeklyPlan(value: unknown): value is WeeklyPlan {
  if (!isObject(value)) return false
  return WEEK_DAYS.every(day => SCHEDULE_FOCUSES.includes(value[day] as ScheduleFocus))
}

function isValidAge(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_PROFILE_AGE &&
    value <= MAX_PROFILE_AGE
  )
}

function isValidHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 90 && value <= 230
}

function isValidWeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 25 && value <= 250
}

function isWorkoutDays(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 7
}

function isNutritionProfile(value: unknown) {
  if (!isObject(value)) return false
  const dietTypes = value.dietTypes
  return (
    (value.eatsRegularly === undefined || typeof value.eatsRegularly === 'boolean') &&
    (value.mealsPerDay === undefined || (typeof value.mealsPerDay === 'number' && Number.isFinite(value.mealsPerDay) && value.mealsPerDay >= 1 && value.mealsPerDay <= 8)) &&
    (value.likedFoods === undefined || typeof value.likedFoods === 'string') &&
    (value.avoidedFoods === undefined || typeof value.avoidedFoods === 'string') &&
    (value.sensitivities === undefined || typeof value.sensitivities === 'string') &&
    (dietTypes === undefined || (Array.isArray(dietTypes) && dietTypes.every(d => DIET_TYPES.includes(d as DietType))))
  )
}

function isHealthProfile(value: unknown) {
  if (!isObject(value)) return false
  const sensitiveAreas = value.sensitiveAreas
  const painIntensity = value.painIntensity
  return (
    (value.hasPainOrInjuries === undefined || typeof value.hasPainOrInjuries === 'boolean') &&
    (sensitiveAreas === undefined || (Array.isArray(sensitiveAreas) && sensitiveAreas.every(area => SENSITIVE_AREAS.includes(area as SensitiveArea)))) &&
    (painIntensity === undefined || (isObject(painIntensity) && Object.entries(painIntensity).every(
      ([k, v]) => SENSITIVE_AREAS.includes(k as SensitiveArea) && PAIN_INTENSITIES.includes(v as PainIntensity)
    ))) &&
    (value.energyLevel === undefined || ENERGY_LEVELS.includes(value.energyLevel as EnergyLevel)) &&
    (value.sleepHours === undefined || (typeof value.sleepHours === 'number' && Number.isFinite(value.sleepHours) && value.sleepHours >= 0 && value.sleepHours <= 14))
  )
}

function isHabitsProfile(value: unknown) {
  if (!isObject(value)) return false
  return (
    (value.dailyActivity === undefined || DAILY_ACTIVITY_LEVELS.includes(value.dailyActivity as DailyActivityLevel)) &&
    (value.fixedWorkoutTime === undefined || typeof value.fixedWorkoutTime === 'boolean') &&
    (value.hardestPart === undefined || HABIT_CHALLENGES.includes(value.hardestPart as HabitChallenge)) &&
    (value.workoutTimePreference === undefined || WORKOUT_TIME_PREFS.includes(value.workoutTimePreference as WorkoutTimePreference))
  )
}

function isDevicePreferences(value: unknown): value is DevicePreferences {
  if (!isObject(value)) return false
  return (
    (value.smartWatch === undefined || typeof value.smartWatch === 'boolean') &&
    (value.smartScale === undefined || typeof value.smartScale === 'boolean') &&
    (value.cardioLocation === undefined || typeof value.cardioLocation === 'boolean')
  )
}

function isStats(value: unknown): value is UserStats {
  if (!isObject(value)) return false
  return (
    typeof value.xp === 'number' &&
    Number.isFinite(value.xp) &&
    typeof value.level === 'number' &&
    Number.isFinite(value.level) &&
    typeof value.streak === 'number' &&
    Number.isFinite(value.streak) &&
    typeof value.totalWorkouts === 'number' &&
    Number.isFinite(value.totalWorkouts)
  )
}

interface UserContextValue {
  profile: UserProfile
  stats: UserStats
  cloudSynced: boolean   // true once Supabase data has been loaded for the current session
  updateProfile: (updates: Partial<UserProfile>) => void
  resetUserData: () => void
  addXP: (amount: number) => void
  incrementStreak: () => void
  completeOnboarding: (profileData: Partial<UserProfile>) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function getProfileGoals(profile: UserProfile): Goal[] {
  return profile.goals && profile.goals.length > 0 ? profile.goals : [profile.goal]
}

export function getProfileWorkoutTypes(profile: UserProfile): WorkoutType[] {
  return profile.workoutTypes && profile.workoutTypes.length > 0 ? profile.workoutTypes : [profile.workoutType]
}

export function getProfileWeeklyPlan(profile: UserProfile): WeeklyPlan {
  return profile.weeklyPlan ?? DEFAULT_WEEKLY_PLAN
}

export function sanitizeProfileAge(age: number): number {
  if (!Number.isFinite(age)) return DEFAULT_PROFILE_AGE
  return Math.min(MAX_PROFILE_AGE, Math.max(MIN_PROFILE_AGE, Math.round(age)))
}

export function getProfileAge(profile: UserProfile): number {
  return sanitizeProfileAge(profile.age ?? DEFAULT_PROFILE_AGE)
}

export function getAgeGroup(age: number): AgeGroup {
  const safeAge = sanitizeProfileAge(age)
  if (safeAge < 18) return 'teen'
  if (safeAge >= 60) return 'senior'
  return 'adult'
}

export function getAgeGuidance(profile: UserProfile) {
  const age = getProfileAge(profile)
  const group = getAgeGroup(age)

  if (group === 'teen') {
    return {
      age,
      group,
      workoutMultiplier: 0.85,
      aerobicMultiplier: 0.9,
      nutritionMultiplier: 0.95,
      restBonusSeconds: 10,
      heartRateAdjustment: -6,
    }
  }

  if (group === 'senior') {
    return {
      age,
      group,
      workoutMultiplier: 0.75,
      aerobicMultiplier: 0.8,
      nutritionMultiplier: 0.9,
      restBonusSeconds: 15,
      heartRateAdjustment: -14,
    }
  }

  return {
    age,
    group,
    workoutMultiplier: 1,
    aerobicMultiplier: 1,
    nutritionMultiplier: 1,
    restBonusSeconds: 0,
    heartRateAdjustment: 0,
  }
}

export function ensureRestDays(plan: WeeklyPlan): WeeklyPlan {
  const next = { ...plan }
  const restDays = WEEK_DAYS.filter(day => next[day] === 'rest')
  const preferredRestDays: WeekDay[] = ['wed', 'sat', 'sun', 'fri', 'mon', 'tue', 'thu']

  for (const day of preferredRestDays) {
    if (restDays.length >= 2) break
    if (next[day] !== 'rest') {
      next[day] = 'rest'
      restDays.push(day)
    }
  }

  return next
}

function getFreshDefaultProfile(): UserProfile {
  return {
    ...DEFAULT_PROFILE,
    goals: [...(DEFAULT_PROFILE.goals ?? [DEFAULT_PROFILE.goal])],
    workoutTypes: [...(DEFAULT_PROFILE.workoutTypes ?? [DEFAULT_PROFILE.workoutType])],
    equipment: [...(DEFAULT_PROFILE.equipment ?? ['none'])],
    devices: { ...DEFAULT_PROFILE.devices },
    habits: { ...DEFAULT_PROFILE.habits },
    health: { ...DEFAULT_PROFILE.health, sensitiveAreas: [...(DEFAULT_PROFILE.health?.sensitiveAreas ?? [])] },
    nutrition: { ...DEFAULT_PROFILE.nutrition },
    weeklyPlan: { ...DEFAULT_WEEKLY_PLAN },
  }
}

function getWorkoutDuration(value?: number): UserProfile['workoutDuration'] | undefined {
  if (!value) return undefined
  if (value <= 10) return 10
  if (value <= 20) return 20
  if (value <= 30) return 30
  if (value <= 45) return 45
  if (value <= 60) return 60
  if (value <= 75) return 75
  return 90
}

function getWorkoutTypeFromEquipment(equipment?: EquipmentOption[]): WorkoutType | undefined {
  if (!equipment?.length) return undefined
  return equipment.includes('gym') ? 'gym' : 'home'
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useLocalStorage<UserProfile>('smartfit_profile', DEFAULT_PROFILE, isProfile)
  const [stats, setStats] = useLocalStorage<UserStats>('smartfit_stats', DEFAULT_STATS, isStats)
  // true once we've finished loading from Supabase for the current session
  const [cloudSynced, setCloudSynced] = useState(!isSupabaseConfigured)

  // ── Streak integrity check on mount ───────────────────────────────────────
  // Resets the streak only if the user missed a workout day (not a rest day)
  // since their last workout.
  useEffect(() => {
    setStats(prev => {
      if (!prev.lastWorkoutDate || prev.streak === 0) return prev
      const lastDate = new Date(prev.lastWorkoutDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dayMs = 86400_000
      const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / dayMs)
      if (daysDiff <= 1) return prev // worked out today or yesterday — streak intact

      // Check if any of the days between lastWorkoutDate and today were workout days
      const plan = profile.weeklyPlan ?? DEFAULT_WEEKLY_PLAN
      let missedWorkoutDay = false
      for (let d = 1; d < daysDiff; d++) {
        const checkDate = new Date(lastDate.getTime() + d * dayMs)
        const dayKey = WEEK_DAYS[checkDate.getDay()]
        if (plan[dayKey] !== 'rest') { missedWorkoutDay = true; break }
      }

      if (missedWorkoutDay) {
        const freezes = prev.streakFreezes ?? 0
        if (freezes > 0) {
          // Auto-consume a freeze — streak survives
          try { localStorage.setItem('smartfit_streak_freeze_used', '1') } catch {}
          return { ...prev, streakFreezes: freezes - 1 }
        }
        return { ...prev, streak: 0 }
      }
      return prev
    })
  }, []) // intentionally run only once on mount

  // ── Sync from Supabase on login ────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return

    // Safety timeout — never block routing for more than 4 seconds.
    // Important: do NOT cancel this timer early (e.g. after getSession resolves)
    // because the subsequent DB call (loadUserDataFromSupabase) can also hang
    // when Supabase is paused/unreachable. The timer must stay alive until we
    // actually call setCloudSynced(true) ourselves.
    let settled = false
    const safetyTimer = setTimeout(() => {
      if (!settled) { settled = true; setCloudSynced(true) }
    }, 4000)

    // Restore cloud data for an already-logged-in user on mount
    supabase.auth.getSession().then(async ({ data }) => {
      if (settled) return   // safety timer already fired
      if (!data.session?.user) {
        settled = true
        clearTimeout(safetyTimer)
        setCloudSynced(true)   // no session → nothing to load
        return
      }
      const uid = data.session.user.id
      const cloudData = await loadUserDataFromSupabase(uid)
      if (settled) return   // safety timer fired while DB was loading
      settled = true
      clearTimeout(safetyTimer)
      if (cloudData?.profile) setProfile(cloudData.profile)
      if (cloudData?.stats) setStats(cloudData.stats)
      syncProgressFromSupabase(uid)
      setCloudSynced(true)
    }).catch(() => {
      if (!settled) { settled = true; clearTimeout(safetyTimer); setCloudSynced(true) }
    })

    // Also listen for future sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setCloudSynced(false)   // loading started — pause routing decisions
        const uid = session.user.id
        const cloudData = await loadUserDataFromSupabase(uid)
        if (cloudData?.profile) setProfile(cloudData.profile)
        if (cloudData?.stats) setStats(cloudData.stats)
        syncProgressFromSupabase(uid)
        setCloudSynced(true)    // done
      }
      if (event === 'SIGNED_OUT') {
        // Clear local state so the next user starts clean
        setProfile(getFreshDefaultProfile())
        setStats({ ...NEW_ACCOUNT_STATS })
        setCloudSynced(true)    // no cloud data needed for a logged-out state
      }
    })

    return () => subscription.unsubscribe()
  }, [setProfile, setStats])

  const updateProfile = useCallback((updates: Partial<UserProfile>) =>
    setProfile(prev => {
      const goals = updates.goals ?? prev.goals
      const fitnessLevel = updates.fitnessLevel ?? updates.level ?? prev.fitnessLevel
      const workoutDuration = updates.workoutDuration ?? getWorkoutDuration(updates.workout_time) ?? prev.workoutDuration
      const workoutTypes = updates.workoutTypes ?? prev.workoutTypes
      const workoutType = updates.workoutType ?? getWorkoutTypeFromEquipment(updates.equipment) ?? workoutTypes?.[0] ?? prev.workoutType
      const next: UserProfile = {
        ...prev,
        ...updates,
        age: updates.age === undefined ? prev.age : sanitizeProfileAge(updates.age),
        goal: updates.goal ?? goals?.[0] ?? prev.goal,
        fitnessLevel,
        level: fitnessLevel,
        workoutDuration,
        workout_time: updates.workout_time ?? workoutDuration,
        workout_days: updates.workout_days ?? prev.workout_days,
        workoutType,
        weeklyPlan: updates.weeklyPlan ? ensureRestDays(updates.weeklyPlan) : prev.weeklyPlan,
      }
      getCurrentUserId().then(uid => { if (uid) saveProfileToSupabase(uid, next) })
      return next
    })
  , [setProfile])

  const addXP = useCallback((amount: number) => {
    setStats(prev => {
      const safeAmount = Math.max(0, amount)
      const newXP = prev.xp + safeAmount
      const newLevel = getLevelFromXp(newXP)
      // Earn a streak freeze every 500 XP milestone
      const prevMilestone = Math.floor(prev.xp / 500)
      const newMilestone  = Math.floor(newXP / 500)
      const newFreezes = (prev.streakFreezes ?? 0) + (newMilestone - prevMilestone)
      const next: UserStats = {
        ...prev,
        xp: newXP,
        level: Math.max(prev.level, newLevel),
        streakFreezes: newFreezes,
        totalWorkouts: prev.totalWorkouts,
      }
      getCurrentUserId().then(uid => { if (uid) saveStatsToSupabase(uid, next) })
      emitProgressEvent()
      return next
    })
  }, [setStats])

  const incrementStreak = useCallback(() => {
    setStats(prev => {
      const today = new Date().toISOString().slice(0, 10)
      // Don't double-count if already logged today
      const alreadyToday = prev.lastWorkoutDate === today
      const next: UserStats = {
        ...prev,
        streak: alreadyToday ? prev.streak : prev.streak + 1,
        totalWorkouts: alreadyToday ? prev.totalWorkouts : prev.totalWorkouts + 1,
        lastWorkoutDate: today,
      }
      getCurrentUserId().then(uid => { if (uid) saveStatsToSupabase(uid, next) })
      emitProgressEvent()
      return next
    })
  }, [setStats])

  // resetUserData: clears LOCAL state only — does NOT write to Supabase.
  // Calling this before signOut is safe; the cloud data stays intact so the
  // user gets their progress back when they sign in again.
  const resetUserData = useCallback(() => {
    setProfile(getFreshDefaultProfile())
    setStats({ ...NEW_ACCOUNT_STATS })
  }, [setProfile, setStats])

  const completeOnboarding = useCallback((profileData: Partial<UserProfile>) => {
    setProfile(prev => {
      const goals = profileData.goals ?? prev.goals
      const fitnessLevel = profileData.fitnessLevel ?? profileData.level ?? prev.fitnessLevel
      const workoutDuration = profileData.workoutDuration ?? getWorkoutDuration(profileData.workout_time) ?? prev.workoutDuration
      const workoutTypes = profileData.workoutTypes ?? prev.workoutTypes
      const workoutType = profileData.workoutType ?? getWorkoutTypeFromEquipment(profileData.equipment) ?? workoutTypes?.[0] ?? prev.workoutType
      const next: UserProfile = {
        ...prev,
        ...profileData,
        age: profileData.age === undefined ? prev.age : sanitizeProfileAge(profileData.age),
        goal: profileData.goal ?? goals?.[0] ?? prev.goal,
        fitnessLevel,
        level: fitnessLevel,
        workoutDuration,
        workout_time: profileData.workout_time ?? workoutDuration,
        workout_days: profileData.workout_days ?? prev.workout_days,
        workoutType,
        weeklyPlan: profileData.weeklyPlan ? ensureRestDays(profileData.weeklyPlan) : prev.weeklyPlan ?? DEFAULT_WEEKLY_PLAN,
        onboardingComplete: true,
      }
      getCurrentUserId().then(uid => { if (uid) saveProfileToSupabase(uid, next) })
      return next
    })
  }, [setProfile])

  return (
    <UserContext.Provider value={{ profile, stats, cloudSynced, updateProfile, resetUserData, addXP, incrementStreak, completeOnboarding }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
