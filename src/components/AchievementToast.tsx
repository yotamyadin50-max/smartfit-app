import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { useUser, type UserProfile, type UserStats } from '../context/UserContext'
import { ALL_BADGES } from '../data/badges'
import { getProgressData } from '../progressStorage'
import {
  calculateDailyNeeds,
  getFoodLog,
  getLatestWeight,
  getShredGoal,
} from '../lib/shredStorage'
import {
  ACHIEVEMENT_PROGRESS_EVENT,
  addAchievementEvents,
  type StoredAchievementEvent,
} from '../lib/achievementEvents'

const SEEN_KEY = 'smartfit_seen_achievement_events'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function weekKey() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - date.getDay())
  return date.toISOString().slice(0, 10)
}

function readSeenIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as unknown
    return new Set(Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function writeSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-300)))
  } catch {
    // Local-only notification history can be skipped if storage is full.
  }
}

function createBadgeEvents(stats: UserStats): StoredAchievementEvent[] {
  return ALL_BADGES
    .filter(badge => badge.condition(stats))
    .map(badge => ({
      date: new Date().toISOString(),
      descriptionEn: badge.descEn,
      descriptionHe: badge.descHe,
      icon: badge.icon,
      id: `badge-${badge.id}`,
      kind: 'badge',
      path: `/badges?highlight=badge-${badge.id}`,
      titleEn: badge.nameEn,
      titleHe: badge.nameHe,
    }))
}

function createGoalEvents(profile: UserProfile): StoredAchievementEvent[] {
  const events: StoredAchievementEvent[] = []
  const now = new Date().toISOString()
  const progress = getProgressData()
  const weekStart = new Date(weekKey())
  const weeklyCount = [...progress.workouts, ...progress.cardio]
    .filter(entry => new Date(entry.date) >= weekStart)
    .length
  const weeklyTarget = Math.max(1, profile.workout_days ?? 3)

  if (weeklyCount >= weeklyTarget) {
    events.push({
      date: now,
      descriptionEn: `You completed ${weeklyCount}/${weeklyTarget} workouts this week.`,
      descriptionHe: `השלמת ${weeklyCount}/${weeklyTarget} אימונים השבוע.`,
      icon: '🎯',
      id: `goal-weekly-workouts-${weekKey()}`,
      kind: 'goal',
      path: `/badges?highlight=goal-weekly-workouts-${weekKey()}`,
      titleEn: 'Weekly goal reached',
      titleHe: 'הגעת ליעד השבועי',
    })
  }

  const foodLog = getFoodLog()
  if (foodLog.length > 0) {
    const needs = calculateDailyNeeds(profile)
    const totals = foodLog.reduce(
      (sum, entry) => ({
        kcal: sum.kcal + entry.kcal,
        protein: sum.protein + entry.protein,
      }),
      { kcal: 0, protein: 0 },
    )
    const today = todayKey()

    if (totals.protein >= needs.protein) {
      events.push({
        date: now,
        descriptionEn: `You reached ${totals.protein}g protein today.`,
        descriptionHe: `הגעת היום ל-${totals.protein} גרם חלבון.`,
        icon: '🥗',
        id: `goal-protein-${today}`,
        kind: 'goal',
        path: `/badges?highlight=goal-protein-${today}`,
        titleEn: 'Protein goal reached',
        titleHe: 'הגעת ליעד החלבון',
      })
    }

    if (totals.kcal >= needs.targetKcal * 0.9 && totals.kcal <= needs.targetKcal * 1.1) {
      events.push({
        date: now,
        descriptionEn: `You stayed close to today's nutrition target.`,
        descriptionHe: 'עמדת בטווח יעד התזונה היומי.',
        icon: '⚡',
        id: `goal-calories-${today}`,
        kind: 'goal',
        path: `/badges?highlight=goal-calories-${today}`,
        titleEn: 'Daily nutrition target',
        titleHe: 'יעד תזונה יומי',
      })
    }
  }

  const shredGoal = getShredGoal()
  const latestWeight = getLatestWeight()
  if (shredGoal && latestWeight && latestWeight.weightKg <= shredGoal.targetWeightKg) {
    events.push({
      date: now,
      descriptionEn: `You reached your saved weight goal.`,
      descriptionHe: 'הגעת ליעד המשקל ששמרת.',
      icon: '🏆',
      id: `goal-weight-${shredGoal.targetWeightKg}`,
      kind: 'goal',
      path: `/badges?highlight=goal-weight-${shredGoal.targetWeightKg}`,
      titleEn: 'Goal reached',
      titleHe: 'יעד הושלם',
    })
  }

  return events
}

function getCurrentEvents(stats: UserStats, profile: UserProfile) {
  return [...createBadgeEvents(stats), ...createGoalEvents(profile)]
}

export default function AchievementToast() {
  const { profile, stats } = useUser()
  const { isHebrew } = useI18n()
  const navigate = useNavigate()
  const [queue, setQueue] = useState<StoredAchievementEvent[]>([])
  const [active, setActive] = useState<StoredAchievementEvent | null>(null)
  const queuedIds = useRef(new Set<string>())

  useEffect(() => {
    function checkAchievements() {
      const events = getCurrentEvents(stats, profile)
      const currentIds = new Set(events.map(event => event.id))
      const hasBaseline = localStorage.getItem(SEEN_KEY) !== null
      const seen = readSeenIds()

      if (!hasBaseline) {
        writeSeenIds(currentIds)
        addAchievementEvents(events)
        return
      }

      const fresh = events.filter(event => !seen.has(event.id) && !queuedIds.current.has(event.id))
      if (fresh.length === 0) return

      fresh.forEach(event => {
        seen.add(event.id)
        queuedIds.current.add(event.id)
      })
      writeSeenIds(seen)
      addAchievementEvents(fresh)
      setQueue(prev => [...prev, ...fresh])
    }

    checkAchievements()
    window.addEventListener(ACHIEVEMENT_PROGRESS_EVENT, checkAchievements)
    window.addEventListener('storage', checkAchievements)
    return () => {
      window.removeEventListener(ACHIEVEMENT_PROGRESS_EVENT, checkAchievements)
      window.removeEventListener('storage', checkAchievements)
    }
  }, [profile, stats])

  useEffect(() => {
    if (active || queue.length === 0) return
    const [next, ...rest] = queue
    setActive(next)
    setQueue(rest)
  }, [active, queue])

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => {
      setActive(null)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [active])

  if (!active) return null

  const title = isHebrew ? active.titleHe : active.titleEn
  const description = isHebrew ? active.descriptionHe : active.descriptionEn

  return (
    <button
      type="button"
      onClick={() => {
        setActive(null)
        navigate(active.path)
      }}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(92vw, 420px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        border: '1px solid rgba(168,85,247,0.55)',
        borderRadius: 16,
        background: 'rgba(12,12,20,0.96)',
        boxShadow: '0 18px 45px rgba(0,0,0,0.45), 0 0 24px rgba(168,85,247,0.22)',
        color: '#fff',
        textAlign: isHebrew ? 'right' : 'left',
        direction: isHebrew ? 'rtl' : 'ltr',
        cursor: 'pointer',
      }}
      aria-label={title}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>{active.icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <strong style={{ fontSize: 14 }}>{isHebrew ? 'כל הכבוד!' : 'Great job!'}</strong>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>{description}</span>
      </span>
    </button>
  )
}
