export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type BadgeStats = { streak: number; totalWorkouts: number; xp: number; level: number }

export interface Badge {
  id: string
  icon: string
  nameEn: string
  nameHe: string
  descEn: string
  descHe: string
  tier: BadgeTier
  xpReward: number
  condition: (stats: BadgeStats) => boolean
  progress?: (stats: BadgeStats) => { current: number; target: number }
}

export const ALL_BADGES: Badge[] = [
  {
    id: 'first_step',
    icon: '👟',
    nameEn: 'First Step',
    nameHe: 'צעד ראשון',
    descEn: 'Complete your first workout',
    descHe: 'השלם את האימון הראשון שלך',
    tier: 'bronze',
    xpReward: 50,
    condition: s => s.totalWorkouts >= 1,
    progress: s => ({ current: Math.min(s.totalWorkouts, 1), target: 1 }),
  },
  {
    id: 'streak_3',
    icon: '🔥',
    nameEn: '3-Day Streak',
    nameHe: 'רצף 3 ימים',
    descEn: 'Work out 3 days in a row',
    descHe: 'התאמן 3 ימים ברצף',
    tier: 'bronze',
    xpReward: 75,
    condition: s => s.streak >= 3,
    progress: s => ({ current: Math.min(s.streak, 3), target: 3 }),
  },
  {
    id: 'streak_7',
    icon: '⚡',
    nameEn: 'Week Warrior',
    nameHe: 'לוחם השבוע',
    descEn: 'Maintain a 7-day streak',
    descHe: 'שמור על רצף של 7 ימים',
    tier: 'silver',
    xpReward: 150,
    condition: s => s.streak >= 7,
    progress: s => ({ current: Math.min(s.streak, 7), target: 7 }),
  },
  {
    id: 'streak_30',
    icon: '🌟',
    nameEn: 'Month Legend',
    nameHe: 'אגדת החודש',
    descEn: '30-day streak — unstoppable!',
    descHe: 'רצף 30 יום — בלתי ניתן לעצירה!',
    tier: 'gold',
    xpReward: 500,
    condition: s => s.streak >= 30,
    progress: s => ({ current: Math.min(s.streak, 30), target: 30 }),
  },
  {
    id: 'workouts_5',
    icon: '💪',
    nameEn: 'Getting Strong',
    nameHe: 'מתחזק',
    descEn: 'Complete 5 workouts',
    descHe: 'השלם 5 אימונים',
    tier: 'bronze',
    xpReward: 100,
    condition: s => s.totalWorkouts >= 5,
    progress: s => ({ current: Math.min(s.totalWorkouts, 5), target: 5 }),
  },
  {
    id: 'workouts_25',
    icon: '🏋️',
    nameEn: 'Iron Will',
    nameHe: 'רצון ברזל',
    descEn: 'Complete 25 workouts',
    descHe: 'השלם 25 אימונים',
    tier: 'silver',
    xpReward: 250,
    condition: s => s.totalWorkouts >= 25,
    progress: s => ({ current: Math.min(s.totalWorkouts, 25), target: 25 }),
  },
  {
    id: 'workouts_100',
    icon: '🏆',
    nameEn: 'Century Club',
    nameHe: 'מועדון המאה',
    descEn: '100 workouts completed',
    descHe: '100 אימונים הושלמו',
    tier: 'gold',
    xpReward: 1000,
    condition: s => s.totalWorkouts >= 100,
    progress: s => ({ current: Math.min(s.totalWorkouts, 100), target: 100 }),
  },
  {
    id: 'level_5',
    icon: '🎯',
    nameEn: 'Level Up!',
    nameHe: 'עלייה ברמה!',
    descEn: 'Reach Level 5',
    descHe: 'הגע לרמה 5',
    tier: 'silver',
    xpReward: 200,
    condition: s => s.level >= 5,
    progress: s => ({ current: Math.min(s.level, 5), target: 5 }),
  },
  {
    id: 'level_10',
    icon: '👑',
    nameEn: 'Elite Athlete',
    nameHe: 'ספורטאי עלית',
    descEn: 'Reach Level 10',
    descHe: 'הגע לרמה 10',
    tier: 'gold',
    xpReward: 500,
    condition: s => s.level >= 10,
    progress: s => ({ current: Math.min(s.level, 10), target: 10 }),
  },
  {
    id: 'xp_1000',
    icon: '✨',
    nameEn: 'XP Hunter',
    nameHe: 'צייד XP',
    descEn: 'Earn 1,000 XP',
    descHe: 'צבור 1,000 XP',
    tier: 'bronze',
    xpReward: 100,
    condition: s => s.xp >= 1000,
    progress: s => ({ current: Math.min(s.xp, 1000), target: 1000 }),
  },
  {
    id: 'xp_5000',
    icon: '💎',
    nameEn: 'Diamond Grinder',
    nameHe: 'טוחן היהלומים',
    descEn: 'Earn 5,000 XP',
    descHe: 'צבור 5,000 XP',
    tier: 'platinum',
    xpReward: 1000,
    condition: s => s.xp >= 5000,
    progress: s => ({ current: Math.min(s.xp, 5000), target: 5000 }),
  },
]

export const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: '#cd7f32',
  silver: '#aaa9ad',
  gold: '#ffd700',
  platinum: '#a0e0ff',
}
