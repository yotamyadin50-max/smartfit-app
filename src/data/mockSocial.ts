export interface Friend {
  id: string
  nameEn: string
  nameHe: string
  avatar: string
  streak: number
  xp: number
  level: number
  lastActivityEn: string
  lastActivityHe: string
  isOnline: boolean
}

export interface ActivityFeedItem {
  id: string
  friendId: string
  type: 'workout' | 'badge' | 'streak' | 'milestone'
  contentEn: string
  contentHe: string
  icon: string
  minutesAgo: number
}

export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'f1',
    nameEn: 'Yarden',
    nameHe: 'ירדן',
    avatar: '🧑‍🦱',
    streak: 12,
    xp: 3400,
    level: 8,
    lastActivityEn: 'Upper Body Workout',
    lastActivityHe: 'אימון פלג גוף עליון',
    isOnline: true,
  },
  {
    id: 'f2',
    nameEn: 'Tal',
    nameHe: 'טל',
    avatar: '👩',
    streak: 7,
    xp: 2100,
    level: 6,
    lastActivityEn: 'Morning Run 5km',
    lastActivityHe: 'ריצת בוקר 5 ק"מ',
    isOnline: false,
  },
  {
    id: 'f3',
    nameEn: 'Noa',
    nameHe: 'נועה',
    avatar: '🧑',
    streak: 21,
    xp: 5800,
    level: 11,
    lastActivityEn: 'Yoga & Flexibility',
    lastActivityHe: 'יוגה וגמישות',
    isOnline: true,
  },
  {
    id: 'f4',
    nameEn: 'Omer',
    nameHe: 'עומר',
    avatar: '👦',
    streak: 3,
    xp: 980,
    level: 3,
    lastActivityEn: 'Home HIIT',
    lastActivityHe: 'HIIT בבית',
    isOnline: false,
  },
]

export const MOCK_FEED: ActivityFeedItem[] = [
  {
    id: 'a1',
    friendId: 'f3',
    type: 'streak',
    contentEn: 'Noa hit a 21-day streak! 🔥',
    contentHe: 'נועה הגיעה לרצף של 21 יום! 🔥',
    icon: '🔥',
    minutesAgo: 12,
  },
  {
    id: 'a2',
    friendId: 'f1',
    type: 'workout',
    contentEn: 'Yarden completed Upper Body Workout',
    contentHe: 'ירדן השלים אימון פלג גוף עליון',
    icon: '💪',
    minutesAgo: 45,
  },
  {
    id: 'a3',
    friendId: 'f2',
    type: 'badge',
    contentEn: 'Tal earned the Week Warrior badge',
    contentHe: 'טל קיבלה את התג "לוחמת השבוע"',
    icon: '⚡',
    minutesAgo: 120,
  },
  {
    id: 'a4',
    friendId: 'f3',
    type: 'milestone',
    contentEn: 'Noa reached Level 11!',
    contentHe: 'נועה הגיעה לרמה 11!',
    icon: '👑',
    minutesAgo: 210,
  },
  {
    id: 'a5',
    friendId: 'f4',
    type: 'workout',
    contentEn: 'Omer finished Home HIIT',
    contentHe: 'עומר סיים HIIT בבית',
    icon: '🏃',
    minutesAgo: 300,
  },
]

function formatAgo(minutes: number, isHebrew: boolean): string {
  if (minutes < 60) return isHebrew ? `לפני ${minutes} דקות` : `${minutes}m ago`
  const h = Math.floor(minutes / 60)
  return isHebrew ? `לפני ${h} שעות` : `${h}h ago`
}

export { formatAgo }
