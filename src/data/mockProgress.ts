export interface WorkoutHistoryEntry {
  id: string
  date: string
  workoutName: string
  durationMinutes: number
  xpEarned: number
  difficulty: 'easy' | 'medium' | 'hard'
  feeling: 'strong' | 'normal' | 'tired'
}

export interface Achievement {
  id: string
  title: string
  description: string
  emoji: string
  unlockedAt: string | null
}

export interface BodyMeasurement {
  date: string
  weight: number
  bodyFat?: number
  chest?: number
  waist?: number
  hips?: number
}

function daysAgo(n: number) {
  const d = new Date(Date.now() - n * 86400_000)
  return d.toISOString().slice(0, 10)
}

export const mockWorkoutHistory: WorkoutHistoryEntry[] = [
  { id: 'h1', date: daysAgo(1),  workoutName: 'Full Body Strength',  durationMinutes: 42, xpEarned: 120, difficulty: 'medium', feeling: 'strong' },
  { id: 'h2', date: daysAgo(2),  workoutName: 'HIIT Cardio Blast',   durationMinutes: 27, xpEarned: 150, difficulty: 'hard',   feeling: 'tired'  },
  { id: 'h3', date: daysAgo(3),  workoutName: 'Morning Flexibility', durationMinutes: 20, xpEarned: 60,  difficulty: 'easy',   feeling: 'strong' },
  { id: 'h4', date: daysAgo(4),  workoutName: 'Full Body Strength',  durationMinutes: 45, xpEarned: 120, difficulty: 'medium', feeling: 'normal' },
  { id: 'h5', date: daysAgo(6),  workoutName: 'HIIT Cardio Blast',   durationMinutes: 25, xpEarned: 150, difficulty: 'hard',   feeling: 'strong' },
  { id: 'h6', date: daysAgo(7),  workoutName: 'Morning Flexibility', durationMinutes: 22, xpEarned: 60,  difficulty: 'easy',   feeling: 'normal' },
  { id: 'h7', date: daysAgo(9),  workoutName: 'Full Body Strength',  durationMinutes: 40, xpEarned: 120, difficulty: 'medium', feeling: 'tired'  },
]

export const mockAchievements: Achievement[] = [
  { id: 'a1', emoji: '🔥', title: 'On Fire',       description: 'Complete 3 workouts in a row', unlockedAt: daysAgo(1)  },
  { id: 'a2', emoji: '💪', title: 'First Pump',    description: 'Complete your first workout',   unlockedAt: daysAgo(9)  },
  { id: 'a3', emoji: '🌅', title: 'Early Bird',    description: 'Work out before 8am',           unlockedAt: daysAgo(3)  },
  { id: 'a4', emoji: '⚡', title: 'Speed Demon',   description: 'Complete a HIIT workout',       unlockedAt: daysAgo(6)  },
  { id: 'a5', emoji: '🏆', title: '7-Day Streak', description: 'Work out 7 days in a row', unlockedAt: null },
  { id: 'a6', emoji: '🌙', title: 'Night Owl', description: 'Work out after 9pm', unlockedAt: null },
  { id: 'a7', emoji: '💯', title: 'Perfect Month', description: 'Work out every day for 30 days', unlockedAt: null },
  { id: 'a8', emoji: '🥗', title: 'Nutrition Pro', description: 'Log meals for 7 days straight', unlockedAt: null },
]

export const mockMeasurements: BodyMeasurement[] = [
  { date: daysAgo(56), weight: 82.5, bodyFat: 18,   chest: 98,  waist: 86, hips: 100 },
  { date: daysAgo(49), weight: 82.0, bodyFat: 17.5, chest: 98,  waist: 85, hips: 99  },
  { date: daysAgo(42), weight: 81.5, bodyFat: 17,   chest: 99,  waist: 84, hips: 99  },
  { date: daysAgo(35), weight: 81.0, bodyFat: 16.5, chest: 99,  waist: 83, hips: 98  },
  { date: daysAgo(28), weight: 80.5, bodyFat: 16,   chest: 100, waist: 82, hips: 98  },
]

export const mockMonthlySummary = {
  month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  totalWorkouts: 14,
  totalMinutes: 520,
  totalXP: 1680,
  avgDuration: 37,
  mostFrequentType: 'Strength',
  weightChange: -2.0,
  aiInsight: 'Great month! Your consistency improved by 30% compared to March. Strength sessions are your strongest suit — consider adding one more per week.',
}

export const mockAIProgressInsight =
  "You've been consistent this week — 3 workouts in 4 days. Your strength is trending up based on your logged difficulty. Try increasing weights by 5% on your next session."
