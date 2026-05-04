import { createContext, useContext, ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

export type Goal = 'cut' | 'bulk' | 'fitness' | 'health'
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type WorkoutType = 'gym' | 'home' | 'outdoor'
export type NutritionPref = 'none' | 'vegetarian' | 'vegan' | 'gluten-free'

export interface UserProfile {
  goal: Goal
  fitnessLevel: FitnessLevel
  workoutDuration: 15 | 30 | 45 | 60
  workoutType: WorkoutType
  nutritionPref: NutritionPref
  notificationsEnabled: boolean
  reminderTime: string
  onboardingComplete: boolean
}

export interface UserStats {
  xp: number
  level: number
  streak: number
  totalWorkouts: number
}

const DEFAULT_PROFILE: UserProfile = {
  goal: 'fitness',
  fitnessLevel: 'beginner',
  workoutDuration: 30,
  workoutType: 'gym',
  nutritionPref: 'none',
  notificationsEnabled: false,
  reminderTime: '08:00',
  onboardingComplete: false,
}

const DEFAULT_STATS: UserStats = {
  xp: 780,
  level: 4,
  streak: 3,
  totalWorkouts: 7,
}

interface UserContextValue {
  profile: UserProfile
  stats: UserStats
  updateProfile: (updates: Partial<UserProfile>) => void
  addXP: (amount: number) => void
  incrementStreak: () => void
  completeOnboarding: (profileData: Partial<UserProfile>) => void
}

const UserContext = createContext<UserContextValue | null>(null)

function xpForLevel(level: number) {
  return level * 200
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useLocalStorage<UserProfile>('smartfit_profile', DEFAULT_PROFILE)
  const [stats, setStats] = useLocalStorage<UserStats>('smartfit_stats', DEFAULT_STATS)

  const updateProfile = (updates: Partial<UserProfile>) =>
    setProfile(prev => ({ ...prev, ...updates }))

  const addXP = (amount: number) => {
    setStats(prev => {
      const newXP = prev.xp + amount
      const newLevel = Math.floor(newXP / xpForLevel(1)) + 1
      return { ...prev, xp: newXP, level: Math.max(prev.level, newLevel), totalWorkouts: prev.totalWorkouts }
    })
  }

  const incrementStreak = () => {
    setStats(prev => ({
      ...prev,
      streak: prev.streak + 1,
      totalWorkouts: prev.totalWorkouts + 1,
    }))
  }

  const completeOnboarding = (profileData: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...profileData, onboardingComplete: true }))
  }

  return (
    <UserContext.Provider value={{ profile, stats, updateProfile, addXP, incrementStreak, completeOnboarding }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
