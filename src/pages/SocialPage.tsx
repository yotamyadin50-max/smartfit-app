import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ExerciseAnimation } from '../components/ExerciseAnimation'
import PageHeader from '../components/layout/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { mockAerobicWorkouts, mockWorkouts, type AerobicWorkout, type Exercise, type Workout } from '../data/mockWorkouts'
import {
  createInviteLink,
  loadFriends,
  loadUnreadNotifications,
  markAllRead,
  removeFriend,
  type Friend,
  type FriendNotification,
} from '../lib/friendsService'
import { getAnimalName, getAnimalProgress, getAnimalRankForLevel } from '../lib/animalRanks'
import {
  commentOnWorkoutPost,
  completeJointWorkoutSession,
  createJointWorkoutSession,
  createWorkoutPost,
  joinWorkoutPost,
  loadWorkoutFeed,
  reactToWorkoutPost,
  saveWorkoutPostForMe,
  setJointParticipantPresent,
  startJointWorkoutSession,
  type JointWorkoutPlan,
  type JointWorkoutPlanExercise,
  type JointWorkoutReward,
  type JointWorkoutSession,
  type WorkoutPost,
  type WorkoutPostStatus,
  type WorkoutPostType,
  type WorkoutVisibility,
} from '../lib/socialWorkoutService'
import { getCardioProgress, getWorkoutProgress, type WorkoutProgressEntry } from '../progressStorage'

type Tab = 'feed' | 'friends' | 'joint' | 'notifications' | 'leaderboard'
type ShareMode = 'completed' | 'planned'
type JointBuildMode = 'existing' | 'custom' | 'gym'
type GymSubMode = 'existing' | 'build'
type JointFocus = 'full' | 'abs' | 'arms' | 'legs' | 'chest' | 'back' | 'shoulders' | 'cardio'
type JointDifficulty = 'easy' | 'medium' | 'hard'
type ShareWorkoutForm = {
  caloriesEstimate: number
  durationMin: number
  scheduledAt: string
  status: WorkoutPostStatus
  title: string
  type: WorkoutPostType
  visibility: WorkoutVisibility
  xp: number
}

type SocialWorkoutOption = {
  caloriesEstimate: number
  difficulty: JointDifficulty
  durationMin: number
  id: string
  plan: JointWorkoutPlan
  source: 'completed' | 'planned' | 'existing' | 'custom'
  summary: string
  summaryHe: string
  title: string
  titleHe: string
  type: WorkoutPostType
  workoutId?: string
  xp: number
}

const WORKOUT_TYPES: WorkoutPostType[] = ['gym', 'home', 'cardio', 'strength', 'mobility', 'custom']
const STATUS_OPTIONS: WorkoutPostStatus[] = ['planned', 'live']
const JOINT_DURATIONS = [15, 20, 30, 45, 60, 75, 90] as const
const JOINT_FOCUS_OPTIONS: { key: JointFocus; label: string; labelHe: string }[] = [
  { key: 'full', label: 'Full body', labelHe: 'כל הגוף' },
  { key: 'abs', label: 'Abs', labelHe: 'בטן' },
  { key: 'arms', label: 'Arms', labelHe: 'ידיים' },
  { key: 'legs', label: 'Legs', labelHe: 'רגליים' },
  { key: 'chest', label: 'Chest', labelHe: 'חזה' },
  { key: 'back', label: 'Back', labelHe: 'גב' },
  { key: 'shoulders', label: 'Shoulders', labelHe: 'כתפיים' },
  { key: 'cardio', label: 'Cardio', labelHe: 'אירובי' },
]
const JOINT_DIFFICULTY_OPTIONS: { key: JointDifficulty; label: string; labelHe: string }[] = [
  { key: 'easy', label: 'Beginner', labelHe: 'מתחיל' },
  { key: 'medium', label: 'Intermediate', labelHe: 'בינוני' },
  { key: 'hard', label: 'Advanced', labelHe: 'מתקדם' },
]

/**
 * Plays the OS system notification sound by creating a silent Web Notification
 * (the browser fires the sound automatically) and closing it immediately so only
 * the audio plays with no persistent visual popup.
 * Falls back to an AudioContext beep when Notification is unavailable.
 */
function playNotificationSound() {
  const beep = () => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 960
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    } catch { /* ignore if AudioContext is blocked */ }
  }

  if (!('Notification' in window)) { beep(); return }

  const fire = () => {
    try {
      const n = new Notification('Ascend AI', { silent: false, tag: 'smartfit-alert', body: '' })
      window.setTimeout(() => n.close(), 150)
    } catch { beep() }
  }

  if (Notification.permission === 'granted') {
    fire()
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => { if (perm === 'granted') fire(); else beep() })
  } else {
    beep()
  }
}

function mapWorkoutType(type: Workout['type']): WorkoutPostType {
  if (type === 'cardio') return 'cardio'
  if (type === 'flexibility') return 'mobility'
  return 'strength'
}

function exerciseToPlanExercise(exercise: Exercise): JointWorkoutPlanExercise {
  const work = exercise.durationSeconds
    ? `${exercise.sets} x ${exercise.durationSeconds}s`
    : `${exercise.sets} x ${exercise.reps} reps`
  const workHe = exercise.durationSeconds
    ? `${exercise.sets} x ${exercise.durationSeconds} שנ׳`
    : `${exercise.sets} x ${exercise.reps} חזרות`
  return {
    detail: `${work} · ${exercise.restSeconds}s rest`,
    detailHe: `${workHe} · ${exercise.restSeconds} שנ׳ מנוחה`,
    name: exercise.name,
    nameHe: exercise.nameHe,
  }
}

function workoutToOption(workout: Workout, source: SocialWorkoutOption['source'] = 'existing'): SocialWorkoutOption {
  return {
    caloriesEstimate: Math.round(workout.durationMinutes * 6.5),
    difficulty: workout.difficulty,
    durationMin: workout.durationMinutes,
    id: `${source}-${workout.id}`,
    plan: {
      difficulty: workout.difficulty,
      exercises: workout.exercises.map(exerciseToPlanExercise),
      source: source === 'custom' ? 'custom' : 'existing',
      summary: workout.summary,
      summaryHe: workout.summaryHe,
    },
    source,
    summary: workout.summary,
    summaryHe: workout.summaryHe,
    title: workout.name,
    titleHe: workout.nameHe,
    type: mapWorkoutType(workout.type),
    workoutId: workout.id,
    xp: Math.max(80, Math.round(workout.durationMinutes * 6)),
  }
}

function aerobicToOption(workout: AerobicWorkout, source: SocialWorkoutOption['source'] = 'existing'): SocialWorkoutOption {
  return {
    caloriesEstimate: workout.baseCalories,
    difficulty: workout.difficulty,
    durationMin: workout.durationMinutes,
    id: `${source}-${workout.id}`,
    plan: {
      difficulty: workout.difficulty,
      exercises: [
        {
          detail: `${workout.durationMinutes} min · avg pace ${workout.avgPace}`,
          detailHe: `${workout.durationMinutes} דקות · קצב ממוצע ${workout.avgPace}`,
          name: workout.name,
          nameHe: workout.nameHe,
        },
      ],
      source: 'existing',
      summary: workout.summary,
      summaryHe: workout.summaryHe,
    },
    source,
    summary: workout.summary,
    summaryHe: workout.summaryHe,
    title: workout.name,
    titleHe: workout.nameHe,
    type: 'cardio',
    workoutId: workout.id,
    xp: Math.max(70, Math.round(workout.durationMinutes * 5.5)),
  }
}

function historyToOption(entry: WorkoutProgressEntry, index: number, isCardio: boolean): SocialWorkoutOption {
  const date = new Date(entry.date)
  const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
  const type = isCardio ? 'cardio' : entry.type === 'gym' ? 'gym' : entry.type === 'home' ? 'home' : 'strength'
  const baseTitle = isCardio ? 'Cardio workout' : entry.type === 'gym' ? 'Gym workout' : 'Completed workout'
  const baseTitleHe = isCardio ? 'אימון אירובי' : entry.type === 'gym' ? 'אימון חדר כושר' : 'אימון שבוצע'
  return {
    caloriesEstimate: Math.round(entry.calories ?? entry.duration * (isCardio ? 7 : 6)),
    difficulty: entry.feeling === 'hard' ? 'hard' : entry.feeling === 'easy' ? 'easy' : 'medium',
    durationMin: entry.duration,
    id: `completed-${entry.id}-${index}`,
    plan: {
      difficulty: entry.feeling === 'hard' ? 'hard' : entry.feeling === 'easy' ? 'easy' : 'medium',
      exercises: [],
      source: 'existing',
      summary: `${baseTitle} from your progress history.`,
      summaryHe: `${baseTitleHe} מתוך היסטוריית ההתקדמות שלך.`,
    },
    source: 'completed',
    summary: `${entry.duration} minutes completed${entry.distanceKm ? ` · ${entry.distanceKm.toFixed(1)} km` : ''}.`,
    summaryHe: `${entry.duration} דקות שבוצעו${entry.distanceKm ? ` · ${entry.distanceKm.toFixed(1)} ק״מ` : ''}.`,
    title: `${baseTitle}${dateLabel ? ` · ${dateLabel}` : ''}`,
    titleHe: `${baseTitleHe}${dateLabel ? ` · ${dateLabel}` : ''}`,
    type,
    workoutId: entry.id,
    xp: Math.max(60, Math.round(entry.duration * 6)),
  }
}

const CUSTOM_EXERCISES: Record<JointFocus, JointWorkoutPlanExercise[]> = {
  abs: [
    { name: 'Plank', nameHe: 'פלאנק', detail: '3 x 30s · 30s rest', detailHe: '3 x 30 שנ׳ · 30 שנ׳ מנוחה' },
    { name: 'Dead Bug', nameHe: 'דד באג', detail: '3 x 12 reps · 30s rest', detailHe: '3 x 12 חזרות · 30 שנ׳ מנוחה' },
    { name: 'Mountain Climbers', nameHe: 'מטפס הרים', detail: '3 x 30s · 30s rest', detailHe: '3 x 30 שנ׳ · 30 שנ׳ מנוחה' },
  ],
  arms: [
    { name: 'Biceps Curl', nameHe: 'כפיפת מרפקים', detail: '3 x 12 reps · 45s rest', detailHe: '3 x 12 חזרות · 45 שנ׳ מנוחה' },
    { name: 'Triceps Pushdown', nameHe: 'פשיטת מרפקים בכבל', detail: '3 x 12 reps · 45s rest', detailHe: '3 x 12 חזרות · 45 שנ׳ מנוחה' },
    { name: 'Hammer Curl', nameHe: 'כפיפת פטיש', detail: '3 x 10 reps · 45s rest', detailHe: '3 x 10 חזרות · 45 שנ׳ מנוחה' },
  ],
  back: [
    { name: 'Lat Pulldown', nameHe: 'פולי עליון', detail: '3 x 10 reps · 60s rest', detailHe: '3 x 10 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Seated Cable Row', nameHe: 'חתירה בכבל', detail: '3 x 12 reps · 60s rest', detailHe: '3 x 12 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Back Extension', nameHe: 'פשיטת גב', detail: '2 x 12 reps · 45s rest', detailHe: '2 x 12 חזרות · 45 שנ׳ מנוחה' },
  ],
  cardio: [
    { name: 'Easy Run / Walk', nameHe: 'ריצה או הליכה קלה', detail: '10-30 min steady pace', detailHe: '10-30 דקות בקצב יציב' },
    { name: 'Bike Intervals', nameHe: 'אינטרוולים באופניים', detail: '6 rounds · 45s work / 45s easy', detailHe: '6 סבבים · 45 שנ׳ עבודה / 45 שנ׳ קל' },
    { name: 'Stairs', nameHe: 'מדרגות', detail: '8 rounds · controlled pace', detailHe: '8 סבבים · קצב בשליטה' },
  ],
  chest: [
    { name: 'Chest Press Machine', nameHe: 'מכונת לחיצת חזה', detail: '3 x 10 reps · 60s rest', detailHe: '3 x 10 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Incline Dumbbell Press', nameHe: 'לחיצת חזה בשיפוע', detail: '3 x 10 reps · 60s rest', detailHe: '3 x 10 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Cable Fly', nameHe: 'פרפר בכבלים', detail: '2 x 12 reps · 45s rest', detailHe: '2 x 12 חזרות · 45 שנ׳ מנוחה' },
  ],
  full: [
    { name: 'Leg Press', nameHe: 'לחיצת רגליים', detail: '3 x 10 reps · 60s rest', detailHe: '3 x 10 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Chest Press Machine', nameHe: 'מכונת לחיצת חזה', detail: '3 x 10 reps · 60s rest', detailHe: '3 x 10 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Lat Pulldown', nameHe: 'פולי עליון', detail: '3 x 10 reps · 60s rest', detailHe: '3 x 10 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Plank', nameHe: 'פלאנק', detail: '3 x 30s · 30s rest', detailHe: '3 x 30 שנ׳ · 30 שנ׳ מנוחה' },
  ],
  legs: [
    { name: 'Leg Press', nameHe: 'לחיצת רגליים', detail: '4 x 10 reps · 75s rest', detailHe: '4 x 10 חזרות · 75 שנ׳ מנוחה' },
    { name: 'Leg Curl', nameHe: 'כפיפת ברך במכונה', detail: '3 x 12 reps · 60s rest', detailHe: '3 x 12 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Calf Raise', nameHe: 'עליות תאומים', detail: '3 x 15 reps · 45s rest', detailHe: '3 x 15 חזרות · 45 שנ׳ מנוחה' },
  ],
  shoulders: [
    { name: 'Shoulder Press Machine', nameHe: 'מכונת לחיצת כתפיים', detail: '3 x 10 reps · 60s rest', detailHe: '3 x 10 חזרות · 60 שנ׳ מנוחה' },
    { name: 'Cable Lateral Raise', nameHe: 'הרחקת כתף בכבל', detail: '3 x 12 reps · 45s rest', detailHe: '3 x 12 חזרות · 45 שנ׳ מנוחה' },
    { name: 'Face Pull', nameHe: 'משיכת פנים', detail: '3 x 12 reps · 45s rest', detailHe: '3 x 12 חזרות · 45 שנ׳ מנוחה' },
  ],
}

function buildCustomJointWorkout(params: {
  difficulty: JointDifficulty
  duration: number
  focuses: JointFocus[]
  type: WorkoutPostType
}): SocialWorkoutOption {
  const focusList: JointFocus[] = params.focuses.length ? params.focuses : ['full']
  const pooled = focusList.flatMap(focus => CUSTOM_EXERCISES[focus])
  const uniqueExercises = pooled.filter((exercise, index, array) =>
    array.findIndex(item => item.name === exercise.name) === index
  )
  const targetCount = params.duration <= 20 ? 4 : params.duration <= 30 ? 5 : params.duration <= 45 ? 6 : params.duration <= 60 ? 8 : 10
  const exercises = uniqueExercises.slice(0, Math.min(targetCount, uniqueExercises.length))
  const focusNames = focusList.map(focus => JOINT_FOCUS_OPTIONS.find(option => option.key === focus)?.label ?? focus).join(', ')
  const focusNamesHe = focusList.map(focus => JOINT_FOCUS_OPTIONS.find(option => option.key === focus)?.labelHe ?? focus).join(', ')
  return {
    caloriesEstimate: Math.round(params.duration * (params.type === 'cardio' ? 8 : 6.5)),
    difficulty: params.difficulty,
    durationMin: params.duration,
    id: `custom-${params.type}-${params.duration}-${params.difficulty}-${focusList.join('-')}`,
    plan: {
      difficulty: params.difficulty,
      exercises,
      source: 'custom',
      summary: `Custom ${params.duration} minute workout for ${focusNames}.`,
      summaryHe: `אימון מותאם של ${params.duration} דקות עבור ${focusNamesHe}.`,
    },
    source: 'custom',
    summary: `Built from selected focus areas: ${focusNames}.`,
    summaryHe: `נבנה לפי אזורי המיקוד שבחרת: ${focusNamesHe}.`,
    title: `Custom ${params.duration} min workout`,
    titleHe: `אימון מותאם ${params.duration} דקות`,
    type: params.type,
    xp: Math.max(80, Math.round(params.duration * 6)),
  }
}

export default function SocialPage() {
  const { user } = useAuth()
  const { addXP, incrementStreak, profile, stats } = useUser()
  const { isHebrew } = useI18n()
  const [searchParams] = useSearchParams()

  const initialTab = searchParams.get('tab') === 'joint' ? 'joint' : 'feed'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [friends, setFriends] = useState<Friend[]>([])
  const [notifications, setNotifications] = useState<FriendNotification[]>([])
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showShare, setShowShare] = useState(searchParams.get('share') === '1')
  const [shareFriendIds, setShareFriendIds] = useState<string[]>([])
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [removingId, setRemovingId] = useState<string | null>(null)
  const prevNotifCountRef = useRef(0)

  const [shareForm, setShareForm] = useState<ShareWorkoutForm>({
    caloriesEstimate: 160,
    durationMin: profile.workoutDuration ?? 20,
    scheduledAt: '',
    status: 'planned' as WorkoutPostStatus,
    title: '',
    type: 'gym' as WorkoutPostType,
    visibility: 'friends' as WorkoutVisibility,
    xp: 120,
  })

  const defaultJointDifficulty: JointDifficulty = profile.fitnessLevel === 'advanced'
    ? 'hard'
    : profile.fitnessLevel === 'intermediate'
    ? 'medium'
    : 'easy'
  const [shareMode, setShareMode] = useState<ShareMode>('completed')
  const [selectedShareWorkoutId, setSelectedShareWorkoutId] = useState('')
  const [jointBuildMode, setJointBuildMode] = useState<JointBuildMode>('existing')
  const [gymSubMode, setGymSubMode] = useState<GymSubMode>('existing')
  const [gymExistingWorkoutId, setGymExistingWorkoutId] = useState('')
  const [jointExistingWorkoutId, setJointExistingWorkoutId] = useState('')
  const [jointDifficulty, setJointDifficulty] = useState<JointDifficulty>(defaultJointDifficulty)
  const [jointFocuses, setJointFocuses] = useState<JointFocus[]>(['full'])
  const [jointFriendIds, setJointFriendIds] = useState<string[]>([])
  const [jointTitle, setJointTitle] = useState(isHebrew ? 'אימון משותף' : 'Group workout')
  const [jointDuration, setJointDuration] = useState<number>(profile.workoutDuration ?? 20)
  const [jointType, setJointType] = useState<WorkoutPostType>('gym')
  const [jointSession, setJointSession] = useState<JointWorkoutSession | null>(null)
  const [jointSeconds, setJointSeconds] = useState(0)
  const [jointRewards, setJointRewards] = useState<JointWorkoutReward[]>([])

  const t = (en: string, he: string) => isHebrew ? he : en
  const userName = profile.name || user?.email?.split('@')[0] || t('Me', 'אני')
  const myAnimalProgress = getAnimalProgress(stats)

  const statusText: Record<WorkoutPostStatus, string> = {
    completed: t('Completed', 'הושלם'),
    live: t('Working out now', 'מתאמן עכשיו'),
    planned: t('Planned', 'מתוכנן'),
  }

  const typeText: Record<WorkoutPostType, string> = {
    cardio: t('Cardio', 'אירובי'),
    custom: t('Custom', 'מותאם'),
    gym: t('Gym', 'חדר כושר'),
    home: t('Home', 'בית'),
    mobility: t('Mobility', 'מוביליטי'),
    strength: t('Strength', 'כוח'),
  }

  const card = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: '14px 16px',
  } as const

  const leaderboardRows = useMemo(() => [
    {
      animal: myAnimalProgress.current,
      friend: null,
      id: 'me',
      isMe: true,
      level: myAnimalProgress.level,
      name: userName,
      streak: stats.streak,
      xp: stats.xp,
    },
    ...friends.map(friend => ({
      animal: getAnimalRankForLevel(friend.level),
      friend,
      id: friend.id,
      isMe: false,
      level: friend.level,
      name: friend.name,
      streak: friend.streak,
      xp: friend.xp,
    })),
  ].sort((a, b) => b.level - a.level || b.xp - a.xp || b.streak - a.streak), [friends, myAnimalProgress.current, myAnimalProgress.level, stats.streak, stats.xp, userName])

  const completedWorkoutOptions = useMemo(() => [
    ...getWorkoutProgress().slice(0, 12).map((entry, index) => historyToOption(entry, index, false)),
    ...getCardioProgress().slice(0, 8).map((entry, index) => historyToOption(entry, index, true)),
  ], [stats.totalWorkouts])

  const existingWorkoutOptions = useMemo(() => [
    ...mockWorkouts.map(workout => workoutToOption(workout, 'existing')),
    ...mockAerobicWorkouts.map(workout => aerobicToOption(workout, 'existing')),
  ], [])

  const gymExistingOptions = useMemo(() =>
    mockWorkouts
      .filter(workout => workout.category === 'gym')
      .map(workout => ({ ...workoutToOption(workout, 'existing'), type: 'gym' as const }))
  , [])

  const shareWorkoutOptions = shareMode === 'completed'
    ? completedWorkoutOptions
    : existingWorkoutOptions.map(option => ({ ...option, id: option.id.replace('existing-', 'planned-'), source: 'planned' as const }))
  const selectedShareWorkout = shareWorkoutOptions.find(option => option.id === selectedShareWorkoutId) ?? shareWorkoutOptions[0]

  const selectedExistingJointWorkout = existingWorkoutOptions.find(option => option.id === jointExistingWorkoutId) ?? existingWorkoutOptions[0]
  const selectedGymExistingWorkout = gymExistingOptions.find(option => option.id === gymExistingWorkoutId) ?? gymExistingOptions[0]
  const customJointWorkout = useMemo(() => buildCustomJointWorkout({
    difficulty: jointDifficulty,
    duration: jointDuration,
    focuses: jointFocuses,
    type: jointType,
  }), [jointDifficulty, jointDuration, jointFocuses, jointType])
  const gymJointWorkout = useMemo(() => buildCustomJointWorkout({
    difficulty: jointDifficulty,
    duration: jointDuration,
    focuses: jointFocuses.filter(f => f !== 'cardio').length ? jointFocuses.filter(f => f !== 'cardio') : ['full'],
    type: 'gym',
  }), [jointDifficulty, jointDuration, jointFocuses])
  const selectedJointWorkout = jointBuildMode === 'existing'
    ? selectedExistingJointWorkout
    : jointBuildMode === 'gym'
    ? (gymSubMode === 'existing' ? selectedGymExistingWorkout : gymJointWorkout)
    : customJointWorkout

  const refresh = useCallback(async () => {
    if (!user) return
    setPostsError(false)
    try {
      const [nextFriends, nextNotifications, nextPosts] = await Promise.all([
        loadFriends(user.id),
        loadUnreadNotifications(user.id),
        loadWorkoutFeed(user.id),
      ])
      // Play OS notification sound when NEW unread notifications arrive
      if (nextNotifications.length > prevNotifCountRef.current) {
        playNotificationSound()
      }
      prevNotifCountRef.current = nextNotifications.length
      setFriends(nextFriends)
      setNotifications(nextNotifications)
      setPosts(nextPosts)
    } catch (err) {
      console.warn('[SocialPage] feed load failed', err)
      setPostsError(true)
    } finally {
      setPostsLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (jointSession?.status !== 'live') return
    const timer = window.setInterval(() => setJointSeconds(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [jointSession?.status])

  const showToast = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2600)
  }

  const handleGetInviteLink = async () => {
    if (!user) return
    setLoading(true)
    try {
      setInviteLink(await createInviteLink(user.id))
    } catch {
      showToast(t('Could not create invite link right now.', 'לא ניתן ליצור קישור כרגע.'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => { /* clipboard unavailable */ })
  }

  const handleOpenNotifications = useCallback(async () => {
    setTab('notifications')
    if (!user || notifications.length === 0) return
    await markAllRead(user.id)
    setNotifications([])
  }, [notifications.length, user])

  const toggleId = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]

  const toggleFocus = (focus: JointFocus) => {
    setJointFocuses(prev => {
      if (focus === 'full') return ['full']
      const withoutFull = prev.filter(item => item !== 'full')
      const next = withoutFull.includes(focus)
        ? withoutFull.filter(item => item !== focus)
        : [...withoutFull, focus]
      return next.length ? next : ['full']
    })
  }

  const handleCreatePost = async () => {
    if (!user) return
    const selectedFriends = friends.filter(friend => shareFriendIds.includes(friend.id))
    if (friends.length === 0) {
      showToast(t('Add friends before sharing a workout.', 'הוסף חברים לפני שיתוף אימון.'))
      return
    }
    if (selectedFriends.length === 0) {
      showToast(t('Choose at least one friend to share with.', 'בחר לפחות חבר אחד לשיתוף.'))
      return
    }
    if (!selectedShareWorkout) {
      showToast(shareMode === 'completed'
        ? t('No completed workouts to share yet.', 'אין עדיין אימונים שבוצעו לשיתוף.')
        : t('No workouts found to share.', 'לא נמצאו אימונים לשיתוף.'))
      return
    }
    const status: WorkoutPostStatus = shareMode === 'completed' ? 'completed' : shareForm.status
    const resolvedTitle = isHebrew ? selectedShareWorkout.titleHe : selectedShareWorkout.title
    const title = shareForm.title.trim() || (shareForm.status === 'completed' ? t('Completed workout', 'אימון שהושלם') : t('Planned workout', 'אימון מתוכנן'))

    void title
    setLoading(true)
    try {
      const post = await createWorkoutPost({
        caloriesEstimate: selectedShareWorkout.caloriesEstimate,
        creatorId: user.id,
        creatorName: userName,
        durationMin: selectedShareWorkout.durationMin,
        participants: selectedFriends,
        scheduledAt: status === 'planned' ? shareForm.scheduledAt || undefined : undefined,
        stats: {
          difficulty: selectedShareWorkout.difficulty,
          plan: selectedShareWorkout.plan,
          sharedFrom: shareMode,
          summary: isHebrew ? selectedShareWorkout.summaryHe : selectedShareWorkout.summary,
        },
        status,
        title: resolvedTitle,
        type: selectedShareWorkout.type,
        visibility: 'selected',
        workoutId: selectedShareWorkout.workoutId,
        xp: selectedShareWorkout.xp,
      })
      setPosts(prev => [post, ...prev.filter(item => item.id !== post.id)])
      setShowShare(false)
      setShareFriendIds([])
      showToast(t('Workout shared with friends.', 'האימון שותף עם חברים.'))
    } finally {
      setLoading(false)
    }
  }

  const handleJoinPost = async (post: WorkoutPost) => {
    if (!user) return
    await joinWorkoutPost(post.id, user.id, userName)
    setPosts(prev => prev.map(item =>
      item.id === post.id && !item.participants.some(participant => participant.user_id === user.id)
        ? {
            ...item,
            participants: [...item.participants, {
              joined_at: new Date().toISOString(),
              name: userName,
              role: 'participant',
              state: 'joined',
              user_id: user.id,
            }],
          }
        : item
    ))
    showToast(t('Workout saved to your plan.', 'האימון נשמר לתוכנית שלך.'))
  }

  const handleReaction = async (post: WorkoutPost) => {
    if (!user) return
    await reactToWorkoutPost(post.id, user.id, 'like')
    setPosts(prev => prev.map(item => {
      if (item.id !== post.id) return item
      const liked = item.reactions.some(reaction => reaction.user_id === user.id && reaction.type === 'like')
      return {
        ...item,
        reactions: liked
          ? item.reactions.filter(reaction => !(reaction.user_id === user.id && reaction.type === 'like'))
          : [...item.reactions, { created_at: new Date().toISOString(), type: 'like', user_id: user.id }],
      }
    }))
  }

  const handleComment = async (post: WorkoutPost) => {
    if (!user) return
    const body = commentDrafts[post.id] ?? ''
    const comment = await commentOnWorkoutPost(post.id, user.id, userName, body)
    if (!comment) return
    setCommentDrafts(prev => ({ ...prev, [post.id]: '' }))
    setPosts(prev => prev.map(item =>
      item.id === post.id ? { ...item, comments: [...item.comments, comment] } : item
    ))
  }

  const handleSavePost = (post: WorkoutPost) => {
    saveWorkoutPostForMe(post.id)
    setPosts(prev => prev.map(item =>
      item.id === post.id ? { ...item, saved_by: [...new Set([...item.saved_by, user?.id ?? 'local'])] } : item
    ))
    showToast(t('Workout saved.', 'האימון נשמר.'))
  }

  const handleRemove = async (friend: Friend) => {
    if (!user) return
    if (!confirm(t(`Remove ${friend.name} from friends?`, `להסיר את ${friend.name} מהחברים?`))) return
    setRemovingId(friend.id)
    await removeFriend(user.id, friend.id)
    setFriends(prev => prev.filter(item => item.id !== friend.id))
    setRemovingId(null)
  }

  const handleCreateJointSession = async () => {
    if (!user) return
    const selectedFriends = friends.filter(friend => jointFriendIds.includes(friend.id))
    if (friends.length === 0) {
      showToast(t('Add friends before starting a joint workout.', 'הוסף חברים לפני אימון משותף.'))
      return
    }
    if (!selectedJointWorkout) {
      showToast(t('Choose or build a workout first.', 'בחר או בנה אימון קודם.'))
      return
    }
    if (selectedFriends.length === 0) {
      showToast(t('Choose at least one friend.', 'בחר לפחות חבר אחד.'))
      return
    }
    const title = jointBuildMode === 'custom'
      ? (jointTitle.trim() || (isHebrew ? selectedJointWorkout.titleHe : selectedJointWorkout.title))
      : (isHebrew ? selectedJointWorkout.titleHe : selectedJointWorkout.title)
    const session = await createJointWorkoutSession({
      durationMin: selectedJointWorkout.durationMin,
      friends: selectedFriends,
      hostId: user.id,
      hostName: userName,
      plan: selectedJointWorkout.plan,
      title,
      type: selectedJointWorkout.type,
      workoutId: selectedJointWorkout.workoutId,
    })
    setJointSession(session)
    setJointSeconds(0)
    setJointRewards([])
  }

  const handleSetPresent = async (participantId: string, present: boolean) => {
    if (!jointSession) return
    await setJointParticipantPresent(jointSession.id, participantId, present)
    setJointSession(prev => prev ? {
      ...prev,
      participants: prev.participants.map(participant =>
        participant.user_id === participantId
          ? { ...participant, state: present ? 'present' : 'invited' }
          : participant
      ),
    } : prev)
  }

  const handleStartJoint = async () => {
    if (!jointSession) return
    await startJointWorkoutSession(jointSession.id)
    setJointSeconds(0)
    setJointSession(prev => prev ? { ...prev, started_at: new Date().toISOString(), status: 'live' } : prev)
  }

  const handleCompleteJoint = async () => {
    if (!jointSession || !user || jointSession.status === 'completed') return
    const rewards = await completeJointWorkoutSession(jointSession)
    const myReward = rewards.find(reward => reward.user_id === user.id)
    if (myReward) {
      addXP(myReward.xp_awarded)
      incrementStreak()
    }
    setJointRewards(rewards)
    setJointSession(prev => prev ? {
      ...prev,
      ended_at: new Date().toISOString(),
      participants: prev.participants.map(participant =>
        rewards.some(reward => reward.user_id === participant.user_id)
          ? { ...participant, completed_at: new Date().toISOString(), state: 'completed' }
          : participant
      ),
      status: 'completed',
    } : prev)

    const completedFriendIds = rewards.map(reward => reward.user_id)
    const selectedFriends = friends.filter(friend => completedFriendIds.includes(friend.id))
    const post = await createWorkoutPost({
      caloriesEstimate: Math.round(jointSession.duration_min * 7),
      creatorId: user.id,
      creatorName: userName,
      durationMin: jointSession.duration_min,
      participants: selectedFriends,
      stats: {
        groupSessionId: jointSession.id,
        plan: jointSession.plan,
      },
      status: 'completed',
      title: jointSession.title,
      type: jointSession.type,
      visibility: 'selected',
      workoutId: jointSession.workout_id ?? undefined,
      xp: myReward?.xp_awarded ?? Math.round(jointSession.duration_min * 6),
    })
    setPosts(prev => [post, ...prev])
    showToast(t('Group workout completed.', 'האימון המשותף הושלם.'))
  }

  const formatClock = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
    const rest = (seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${rest}`
  }

  return (
    <div className="app-layout">
      <PageHeader title={t('Social Workouts', 'אימונים חברתיים')} />
      <div className="page-content" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
          {([
            ['feed', t('Feed', 'פיד')],
            ['friends', t('Friends', 'חברים')],
            ['joint', t('Co-Workout', 'אימון משותף')],
            ['leaderboard', t('XP Board', 'טבלת XP')],
            ['notifications', `${t('Alerts', 'התראות')}${notifications.length ? ` (${notifications.length})` : ''}`],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => key === 'notifications' ? handleOpenNotifications() : setTab(key)}
              style={{
                background: tab === key ? '#22c55e' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                cursor: 'pointer',
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 800,
                padding: '8px 13px',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {message && (
          <div style={{ ...card, borderColor: 'rgba(34,197,94,0.4)', marginBottom: 12, textAlign: 'center' }}>
            {message}
          </div>
        )}

        {tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, border: '1.5px solid rgba(34,197,94,0.25)' }}>
              <strong>{t('Friends Workout Feed', 'פיד אימונים של חברים')}</strong>
              <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12, margin: '6px 0 12px' }}>
                {t('Share completed workouts, planned sessions, or workouts you are doing now.', 'שתף אימונים שהושלמו, אימונים מתוכננים או אימון שאתה עושה עכשיו.')}
              </p>
              <button className="btn-primary" onClick={() => setShowShare(true)}>
                {t('Share workout', 'שתף אימון')}
              </button>
            </div>

            {postsLoading ? (
              <div style={{ ...card, textAlign: 'center', padding: 28 }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', margin: 0, fontSize: 13 }}>
                  {t('Loading feed…', 'טוען פיד…')}
                </p>
              </div>
            ) : postsError ? (
              <div style={{ ...card, textAlign: 'center', padding: 28, border: '1px solid rgba(239,68,68,0.3)' }}>
                <p style={{ color: '#ef4444', margin: '0 0 10px', fontSize: 13 }}>
                  {t('Could not load feed. Check your connection.', 'לא ניתן לטעון את הפיד. בדוק את החיבור.')}
                </p>
                <button
                  style={{ fontSize: 12, padding: '6px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'inherit', cursor: 'pointer' }}
                  onClick={() => { setPostsLoading(true); void refresh() }}
                >
                  {t('Retry', 'נסה שוב')}
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 28 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                  {t('No shared workouts yet.', 'עדיין אין אימונים משותפים בפיד.')}
                </p>
              </div>
            ) : posts.map(post => {
              const liked = Boolean(user && post.reactions.some(reaction => reaction.user_id === user.id && reaction.type === 'like'))
              const joined = Boolean(user && post.participants.some(participant => participant.user_id === user.id))
              const participantNames = post.participants.map(participant => participant.name).filter(Boolean).join(', ')

              return (
                <div key={post.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 900 }}>{statusText[post.status]}</span>
                      <h3 style={{ fontSize: 17, margin: '4px 0' }}>{post.title}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>
                        {post.creator_name} · {typeText[post.type]}
                      </p>
                    </div>
                    <div style={{ textAlign: 'end', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                      <strong style={{ color: '#fff', display: 'block' }}>{post.duration_min} {t('min', 'דק׳')}</strong>
                      <span>{post.calories_estimate} kcal</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 9, textAlign: 'center' }}>
                      <strong>{post.xp}</strong><br /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>XP</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 9, textAlign: 'center' }}>
                      <strong>{post.reactions.length}</strong><br /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{t('Likes', 'לייקים')}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 9, textAlign: 'center' }}>
                      <strong>{post.participants.length}</strong><br /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{t('People', 'משתתפים')}</span>
                    </div>
                  </div>

                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '12px 0 0' }}>
                    {t('Participants', 'משתתפים')}: {participantNames || post.creator_name}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                    <button className="btn-secondary" style={{ marginTop: 0, padding: 9, fontSize: 12 }} onClick={() => handleReaction(post)}>
                      {liked ? t('Liked', 'אהבת') : t('Like', 'לייק')}
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, padding: 9, fontSize: 12 }} onClick={() => handleJoinPost(post)} disabled={joined}>
                      {joined ? t('Joined', 'הצטרפת') : t('Join', 'הצטרף')}
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, padding: 9, fontSize: 12 }} onClick={() => handleSavePost(post)}>
                      {t('Save', 'שמור')}
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, padding: 9, fontSize: 12 }} onClick={() => setShowShare(true)}>
                      {t('Invite', 'הזמן')}
                    </button>
                  </div>

                  {post.comments.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {post.comments.slice(-3).map(comment => (
                        <p key={comment.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 9, fontSize: 12, margin: 0, padding: '8px 10px' }}>
                          <strong>{comment.user_name}: </strong>{comment.body}
                        </p>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      className="form-input"
                      maxLength={240}
                      placeholder={t('Write a reaction...', 'כתוב תגובה...')}
                      value={commentDrafts[post.id] ?? ''}
                      onChange={event => setCommentDrafts(prev => ({ ...prev, [post.id]: event.target.value }))}
                    />
                    <button className="btn-primary" style={{ width: 'auto', paddingInline: 14 }} onClick={() => handleComment(post)}>
                      {t('Send', 'שלח')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, border: '1.5px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 800 }}>{t('Add a friend', 'הוסף חבר')}</p>
              {!inviteLink ? (
                <button className="btn-primary" onClick={handleGetInviteLink} disabled={loading}>
                  {loading ? '...' : t('Generate invite link', 'צור קישור הזמנה')}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" readOnly value={inviteLink} style={{ direction: 'ltr', fontSize: 11 }} />
                  <button className="btn-primary" onClick={handleCopy} style={{ width: 'auto', paddingInline: 14 }}>
                    {copied ? '✓' : t('Copy', 'העתק')}
                  </button>
                </div>
              )}
            </div>

            <div style={card}>
              <strong>{t('Animal leaderboard', 'דירוג חיות')}</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {leaderboardRows.map((row, index) => (
                  <div key={`animal-row-${row.id}`} style={{ alignItems: 'center', borderTop: index ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', gap: 12, paddingTop: index ? 10 : 0 }}>
                    <span style={{ color: '#22c55e', fontWeight: 900, width: 24 }}>#{index + 1}</span>
                    <span style={{ fontSize: 34 }}>{row.animal.imageUrl ? <img src={row.animal.imageUrl} alt={getAnimalName(row.animal, isHebrew)} style={{ borderRadius: 12, height: 34, objectFit: 'cover', width: 34 }} /> : row.animal.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}{row.isMe ? ` · ${t('You', 'אתה')}` : ''}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{getAnimalName(row.animal, isHebrew)} · Lv.{row.level}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, textAlign: 'center' }}>
                      <strong style={{ color: '#fff', display: 'block', fontSize: 16 }}>{row.streak}</strong>
                      {t('streak', 'רצף')}
                    </div>
                    {!row.isMe && row.friend && (
                      <button className="btn-secondary" style={{ marginTop: 0, padding: '7px 10px', width: 'auto' }} onClick={() => handleRemove(row.friend!)} disabled={removingId === row.friend.id}>
                        {removingId === row.friend.id ? '...' : t('Remove', 'הסר')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'joint' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, border: '1.5px solid rgba(34,197,94,0.25)' }}>
              <strong>{t('Joint Workout Lobby', 'לובי אימון משותף')}</strong>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '6px 0 12px' }}>
                {t('Choose friends on this phone, mark who is present, and finish together.', 'בחר חברים באותו טלפון, סמן מי נוכח וסיימו יחד.')}
              </p>

              {!jointSession && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <button
                      className={jointBuildMode === 'existing' ? 'btn-primary' : 'btn-secondary'}
                      style={{ marginTop: 0, padding: 10, fontSize: 12 }}
                      onClick={() => setJointBuildMode('existing')}
                    >
                      {t('Choose existing', 'בחר קיים')}
                    </button>
                    <button
                      className={jointBuildMode === 'custom' ? 'btn-primary' : 'btn-secondary'}
                      style={{ marginTop: 0, padding: 10, fontSize: 12 }}
                      onClick={() => setJointBuildMode('custom')}
                    >
                      {t('Build new', 'בנה חדש')}
                    </button>
                    <button
                      className={jointBuildMode === 'gym' ? 'btn-primary' : 'btn-secondary'}
                      style={{ marginTop: 0, padding: 10, fontSize: 12 }}
                      onClick={() => {
                        setJointBuildMode('gym')
                        setJointFocuses(['full'])
                      }}
                    >
                      🏋️ {t('Gym', 'חדר כושר')}
                    </button>
                  </div>

                  {jointBuildMode === 'existing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {existingWorkoutOptions.map(option => (
                        <label
                          key={`joint-${option.id}`}
                          style={{
                            background: selectedJointWorkout?.id === option.id ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)',
                            border: selectedJointWorkout?.id === option.id ? '1px solid rgba(34,197,94,0.55)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            display: 'block',
                            padding: 12,
                          }}
                        >
                          <input
                            type="radio"
                            checked={selectedJointWorkout?.id === option.id}
                            onChange={() => setJointExistingWorkoutId(option.id)}
                            style={{ marginInlineEnd: 8 }}
                          />
                          <strong>{isHebrew ? option.titleHe : option.title}</strong>
                          <small style={{ color: 'rgba(255,255,255,0.56)', display: 'block', marginTop: 4 }}>
                            {typeText[option.type]} · {option.durationMin} {t('min', 'דקות')} · {option.plan.exercises.length} {t('exercises', 'תרגילים')}
                          </small>
                        </label>
                      ))}
                    </div>
                  )}

                  {jointBuildMode === 'gym' && (
                    <>
                      {/* Sub-mode toggle: pick existing gym workout OR build custom */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <button
                          className={gymSubMode === 'existing' ? 'btn-primary' : 'btn-secondary'}
                          style={{ marginTop: 0, padding: 9, fontSize: 12, background: gymSubMode === 'existing' ? '#22c55e' : undefined, borderColor: gymSubMode === 'existing' ? '#22c55e' : undefined }}
                          onClick={() => setGymSubMode('existing')}
                        >
                          {t('Existing workout', 'אימון קיים')}
                        </button>
                        <button
                          className={gymSubMode === 'build' ? 'btn-primary' : 'btn-secondary'}
                          style={{ marginTop: 0, padding: 9, fontSize: 12, background: gymSubMode === 'build' ? '#22c55e' : undefined, borderColor: gymSubMode === 'build' ? '#22c55e' : undefined }}
                          onClick={() => setGymSubMode('build')}
                        >
                          {t('Build new', 'בנה חדש')}
                        </button>
                      </div>

                      {gymSubMode === 'existing' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                          {gymExistingOptions.map(option => (
                            <label
                              key={`gym-exist-${option.id}`}
                              style={{
                                background: selectedGymExistingWorkout?.id === option.id ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)',
                                border: selectedGymExistingWorkout?.id === option.id ? '1px solid rgba(34,197,94,0.55)' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12,
                                cursor: 'pointer',
                                display: 'block',
                                padding: 12,
                              }}
                            >
                              <input
                                type="radio"
                                checked={selectedGymExistingWorkout?.id === option.id}
                                onChange={() => setGymExistingWorkoutId(option.id)}
                                style={{ marginInlineEnd: 8 }}
                              />
                              <strong>{isHebrew ? option.titleHe : option.title}</strong>
                              <small style={{ color: 'rgba(255,255,255,0.56)', display: 'block', marginTop: 4 }}>
                                🏋️ {option.durationMin} {t('min', 'דקות')} · {option.plan.exercises.length} {t('exercises', 'תרגילים')} · {isHebrew ? option.summaryHe : option.summary}
                              </small>
                            </label>
                          ))}
                        </div>
                      )}

                      {gymSubMode === 'build' && (
                        <>
                          <div style={{ background: 'rgba(34,197,94,0.07)', borderRadius: 10, fontSize: 12, marginBottom: 12, padding: '8px 12px', color: 'rgba(255,255,255,0.75)' }}>
                            🏋️ {t('Build a custom gym workout — pick muscle groups and duration.', 'בנה אימון חדר כושר מותאם — בחר קבוצות שרירים ומשך.')}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div className="form-group">
                              <label className="form-label">{t('Duration', 'משך')}</label>
                              <select className="form-input" value={jointDuration} onChange={event => setJointDuration(Number(event.target.value))}>
                                {JOINT_DURATIONS.map(value => <option key={value} value={value}>{value} {t('min', 'דקות')}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">{t('Difficulty', 'רמת קושי')}</label>
                              <select className="form-input" value={jointDifficulty} onChange={event => setJointDifficulty(event.target.value as JointDifficulty)}>
                                {JOINT_DIFFICULTY_OPTIONS.map(option => (
                                  <option key={option.key} value={option.key}>{isHebrew ? option.labelHe : option.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">{t('Muscle group', 'קבוצת שרירים')}</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {JOINT_FOCUS_OPTIONS.filter(option => option.key !== 'cardio').map(option => (
                                <button
                                  key={option.key}
                                  className={jointFocuses.includes(option.key) ? 'btn-primary' : 'btn-secondary'}
                                  style={{ marginTop: 0, padding: '8px 10px', width: 'auto' }}
                                  onClick={() => toggleFocus(option.key)}
                                  type="button"
                                >
                                  {isHebrew ? option.labelHe : option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {jointBuildMode === 'custom' && (
                    <>
                  <div className="form-group">
                    <label className="form-label">{t('Workout name', 'שם האימון')}</label>
                    <input className="form-input" value={jointTitle} onChange={event => setJointTitle(event.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label">{t('Duration', 'משך')}</label>
                      <select className="form-input" value={jointDuration} onChange={event => setJointDuration(Number(event.target.value))}>
                        {JOINT_DURATIONS.map(value => <option key={value} value={value}>{value} {t('min', 'דקות')}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('Type', 'סוג')}</label>
                      <select className="form-input" value={jointType} onChange={event => setJointType(event.target.value as WorkoutPostType)}>
                        {WORKOUT_TYPES.map(type => <option key={type} value={type}>{typeText[type]}</option>)}
                      </select>
                    </div>
                  </div>
                    <div className="form-group">
                      <label className="form-label">{t('Difficulty', 'רמת קושי')}</label>
                      <select className="form-input" value={jointDifficulty} onChange={event => setJointDifficulty(event.target.value as JointDifficulty)}>
                        {JOINT_DIFFICULTY_OPTIONS.map(option => (
                          <option key={option.key} value={option.key}>{isHebrew ? option.labelHe : option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('Focus areas', 'אזורים לעבוד עליהם')}</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {JOINT_FOCUS_OPTIONS.map(option => (
                          <button
                            key={option.key}
                            className={jointFocuses.includes(option.key) ? 'btn-primary' : 'btn-secondary'}
                            style={{ marginTop: 0, padding: '8px 10px', width: 'auto' }}
                            onClick={() => toggleFocus(option.key)}
                            type="button"
                          >
                            {isHebrew ? option.labelHe : option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                  )}

                  {selectedJointWorkout && (
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 12, padding: 12 }}>
                      <strong>{isHebrew ? selectedJointWorkout.titleHe : selectedJointWorkout.title}</strong>
                      <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12, margin: '4px 0 8px' }}>
                        {typeText[selectedJointWorkout.type]} · {selectedJointWorkout.durationMin} {t('min', 'דקות')} · {isHebrew ? selectedJointWorkout.summaryHe : selectedJointWorkout.summary}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedJointWorkout.plan.exercises.slice(0, 6).map((exercise, index) => (
                          <div key={`${selectedJointWorkout.id}-${exercise.name}-${index}`} className="social-exercise-row">
                            <ExerciseAnimation compact hideMuscles exerciseName={exercise.name} />
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                            {index + 1}. {isHebrew ? exercise.nameHe : exercise.name} · {isHebrew ? exercise.detailHe : exercise.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 14px' }}>
                    <span className="form-label">{t('Who is training with you?', 'עם מי אתה עושה את האימון?')}</span>
                    {friends.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{t('No friends yet. Add friends first, then come back to create a joint workout.', 'אין חברים עדיין. קודם הוסף חברים ואז תחזור ליצור אימון משותף.')}</p>
                    ) : friends.map(friend => (
                      <label key={friend.id} style={{ alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 10, display: 'flex', gap: 10, padding: 10 }}>
                        <input type="checkbox" checked={jointFriendIds.includes(friend.id)} onChange={() => setJointFriendIds(prev => toggleId(prev, friend.id))} />
                        <span>{friend.name}</span>
                      </label>
                    ))}
                  </div>
                  <button className="btn-primary" onClick={handleCreateJointSession} disabled={friends.length === 0 || jointFriendIds.length === 0 || !selectedJointWorkout}>
                    {t('Create group session', 'צור אימון משותף')}
                  </button>
                </>
              )}

              {jointSession && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12 }}>
                    <strong>{jointSession.title}</strong>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '4px 0 0' }}>
                      {typeText[jointSession.type]} · {jointSession.duration_min} {t('min', 'דקות')} · {jointSession.status}
                    </p>
                    {jointSession.status === 'live' && (
                      <div style={{ color: '#22c55e', fontSize: 32, fontWeight: 900, marginTop: 10, textAlign: 'center' }}>
                        {formatClock(jointSeconds)}
                      </div>
                    )}
                  </div>

                  {jointSession.plan && jointSession.plan.exercises.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12 }}>
                      <strong>{t('Workout plan', 'תוכנית האימון')}</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {jointSession.plan.exercises.map((exercise, index) => (
                          <div key={`${jointSession.id}-${exercise.name}-${index}`} className="social-exercise-row">
                            <ExerciseAnimation compact hideMuscles exerciseName={exercise.name} />
                            <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
                            {index + 1}. {isHebrew ? exercise.nameHe : exercise.name} · {isHebrew ? exercise.detailHe : exercise.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {jointSession.participants.map(participant => (
                    <label key={participant.user_id} style={{ alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', gap: 10, padding: 10 }}>
                      <span>
                        <strong>{participant.name}</strong>
                        <small style={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
                          {participant.role === 'host' ? t('Main coach', 'מאמן ראשי') : t('Participant', 'משתתף')} · {participant.state}
                        </small>
                      </span>
                      <input
                        disabled={participant.role === 'host' || jointSession.status === 'completed'}
                        type="checkbox"
                        checked={participant.state === 'present' || participant.state === 'completed'}
                        onChange={event => handleSetPresent(participant.user_id, event.target.checked)}
                      />
                    </label>
                  ))}

                  {jointSession.status === 'lobby' && (
                    <button className="btn-primary" onClick={handleStartJoint}>
                      {t('Start together', 'התחל יחד')}
                    </button>
                  )}
                  {jointSession.status === 'live' && (
                    <button className="btn-primary" onClick={handleCompleteJoint}>
                      {t('Finish group workout', 'סיים אימון משותף')}
                    </button>
                  )}
                  {jointSession.status === 'completed' && (
                    <div style={{ ...card, background: 'rgba(34,197,94,0.08)', textAlign: 'center' }}>
                      <strong>{t('Group achievement unlocked!', 'הישג קבוצתי נפתח!')}</strong>
                      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                        {jointSession.participants.filter(participant => participant.state === 'completed').map(participant => participant.name).join(', ')} {t('completed a workout together.', 'השלימו אימון יחד.')}
                      </p>
                      {jointRewards.map(reward => (
                        <p key={`${reward.session_id}-${reward.user_id}`} style={{ margin: 4, fontSize: 12 }}>
                          +{reward.xp_awarded} XP · {reward.achievements.join(', ')}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={card}>
              <strong>🏆 {isHebrew ? 'טבלת XP — חברים' : 'XP Leaderboard — Friends'}</strong>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '4px 0 12px' }}>
                {isHebrew ? 'ממוין לפי סה"כ XP' : 'Sorted by total XP'}
              </p>
              {[...leaderboardRows]
                .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
                .map((row, index) => (
                  <div key={`lb-${row.id}`} style={{ alignItems: 'center', borderTop: index ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', gap: 12, paddingTop: index ? 10 : 0 }}>
                    <span style={{ color: index === 0 ? '#ffd700' : index === 1 ? '#aaa9ad' : index === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)', fontWeight: 900, width: 24 }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontSize: 28 }}>{row.animal.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: 13 }}>
                        {row.name}{row.isMe ? ` · ${t('You', 'אתה')}` : ''}
                      </strong>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                        {getAnimalName(row.animal, isHebrew)} · Lv.{row.level}
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <strong style={{ color: '#a855f7', display: 'block', fontSize: 16 }}>{row.xp ?? '—'}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>XP</span>
                    </div>
                  </div>
                ))}
              {leaderboardRows.length === 1 && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '8px 0 0', textAlign: 'center' }}>
                  {isHebrew ? 'הזמן חברים כדי לראות אותם כאן' : 'Invite friends to see them here'}
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 30 }}>
                {t('No new notifications', 'אין התראות חדשות')}
              </div>
            ) : notifications.map(item => (
              <div key={item.id} style={card}>
                <strong>{item.from_name || t('Friend', 'חבר')}</strong>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '4px 0 0' }}>
                  {item.type === 'share_workout'
                    ? t('shared a workout', 'שיתף אימון')
                    : item.type === 'share_achievement'
                    ? t('shared an achievement', 'שיתף הישג')
                    : item.type === 'friend_added'
                    ? t('added you as a friend', 'הוסיף אותך כחבר')
                    : t('removed friendship', 'הסיר חברות')}
                </p>
              </div>
            ))}
          </div>
        )}

        {showShare && (
          <div style={{ alignItems: 'flex-end', background: 'rgba(0,0,0,0.72)', display: 'flex', inset: 0, position: 'fixed', zIndex: 200 }} onClick={() => setShowShare(false)}>
            <div style={{ background: '#171725', borderRadius: '20px 20px 0 0', margin: '0 auto', maxHeight: '88vh', maxWidth: 500, overflowY: 'auto', padding: 22, width: '100%' }} onClick={event => event.stopPropagation()}>
              <h2 style={{ fontSize: 20, margin: '0 0 14px' }}>{t('Share workout', 'שתף אימון')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {(['completed', 'planned'] as ShareMode[]).map(mode => (
                  <button
                    key={mode}
                    className={shareMode === mode ? 'btn-primary' : 'btn-secondary'}
                    style={{ marginTop: 0, padding: 10 }}
                    onClick={() => {
                      setShareMode(mode)
                      setSelectedShareWorkoutId('')
                    }}
                  >
                    {mode === 'completed' ? t('Completed workout', 'אימון שבוצע') : t('Planned workout', 'אימון מתוכנן')}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {shareWorkoutOptions.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12, margin: 0 }}>
                    {shareMode === 'completed'
                      ? t('Finish a workout first, then you can share it here.', 'סיים אימון קודם, ואז תוכל לשתף אותו כאן.')
                      : t('No planned workouts found.', 'לא נמצאו אימונים מתוכננים.')}
                  </p>
                ) : shareWorkoutOptions.map(option => (
                  <label
                    key={option.id}
                    style={{
                      background: selectedShareWorkout?.id === option.id ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)',
                      border: selectedShareWorkout?.id === option.id ? '1px solid rgba(34,197,94,0.55)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'block',
                      padding: 12,
                    }}
                  >
                    <input
                      type="radio"
                      checked={selectedShareWorkout?.id === option.id}
                      onChange={() => setSelectedShareWorkoutId(option.id)}
                      style={{ marginInlineEnd: 8 }}
                    />
                    <strong>{isHebrew ? option.titleHe : option.title}</strong>
                    <small style={{ color: 'rgba(255,255,255,0.56)', display: 'block', marginTop: 4 }}>
                      {typeText[option.type]} · {option.durationMin} {t('min', 'דק׳')} · {option.caloriesEstimate} kcal · {option.xp} XP
                    </small>
                    <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 12, marginTop: 4 }}>
                      {isHebrew ? option.summaryHe : option.summary}
                    </span>
                  </label>
                ))}
              </div>
              {shareMode === 'planned' && (
                <div className="form-group">
                  <label className="form-label">{t('Scheduled time', 'זמן מתוכנן')}</label>
                  <input className="form-input" type="datetime-local" value={shareForm.scheduledAt} onChange={event => setShareForm(prev => ({ ...prev, scheduledAt: event.target.value }))} />
                </div>
              )}
              <div style={{ display: 'none' }}>
              <div className="form-group">
                <label className="form-label">{t('Workout name', 'שם האימון')}</label>
                <input className="form-input" value={shareForm.title} onChange={event => setShareForm(prev => ({ ...prev, title: event.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">{t('Status', 'סטטוס')}</label>
                  <select className="form-input" value={shareForm.status} onChange={event => setShareForm(prev => ({ ...prev, status: event.target.value as WorkoutPostStatus }))}>
                    {STATUS_OPTIONS.map(status => <option key={status} value={status}>{statusText[status]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Type', 'סוג')}</label>
                  <select className="form-input" value={shareForm.type} onChange={event => setShareForm(prev => ({ ...prev, type: event.target.value as WorkoutPostType }))}>
                    {WORKOUT_TYPES.map(type => <option key={type} value={type}>{typeText[type]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Duration', 'משך')}</label>
                  <input className="form-input" min={1} type="number" value={shareForm.durationMin} onChange={event => setShareForm(prev => ({ ...prev, durationMin: Number(event.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Calories', 'קלוריות')}</label>
                  <input className="form-input" min={0} type="number" value={shareForm.caloriesEstimate} onChange={event => setShareForm(prev => ({ ...prev, caloriesEstimate: Number(event.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">XP</label>
                  <input className="form-input" min={0} type="number" value={shareForm.xp} onChange={event => setShareForm(prev => ({ ...prev, xp: Number(event.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Visibility', 'פרטיות')}</label>
                  <select className="form-input" value={shareForm.visibility} onChange={event => setShareForm(prev => ({ ...prev, visibility: event.target.value as WorkoutVisibility }))}>
                    <option value="friends">{t('All friends', 'כל החברים')}</option>
                    <option value="selected">{t('Selected friends', 'חברים נבחרים')}</option>
                  </select>
                </div>
              </div>
              {shareForm.status === 'planned' && (
                <div className="form-group">
                  <label className="form-label">{t('Scheduled time', 'זמן מתוכנן')}</label>
                  <input className="form-input" type="datetime-local" value={shareForm.scheduledAt} onChange={event => setShareForm(prev => ({ ...prev, scheduledAt: event.target.value }))} />
                </div>
              )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 16px' }}>
                <span className="form-label">{t('Choose who can see this workout', 'בחר מי יראה את האימון')}</span>
                {friends.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>{t('No friends yet. Add a friend before sharing.', 'אין חברים עדיין. הוסף חבר לפני שיתוף.')}</p>
                ) : friends.map(friend => (
                  <label key={friend.id} style={{ alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 10, display: 'flex', gap: 10, padding: 10 }}>
                    <input type="checkbox" checked={shareFriendIds.includes(friend.id)} onChange={() => setShareFriendIds(prev => toggleId(prev, friend.id))} />
                    <span>{friend.name}</span>
                  </label>
                ))}
              </div>
              <button className="btn-primary" onClick={handleCreatePost} disabled={loading || friends.length === 0 || shareFriendIds.length === 0 || !selectedShareWorkout}>
                {loading ? '...' : t('Publish to feed', 'פרסם בפיד')}
              </button>
              <button className="btn-secondary" onClick={() => setShowShare(false)}>
                {t('Cancel', 'ביטול')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
