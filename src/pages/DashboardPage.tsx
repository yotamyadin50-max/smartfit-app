import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { todayWorkout } from '../data/mockWorkouts'
import { getWorkoutProgress } from '../progressStorage'
import BottomNav from '../components/layout/BottomNav'

function getGreeting(isHebrew: boolean) {
  const h = new Date().getHours()
  if (h < 12) return isHebrew ? 'בוקר טוב' : 'Good morning'
  if (h < 18) return isHebrew ? 'צהריים טובים' : 'Good afternoon'
  return isHebrew ? 'ערב טוב' : 'Good evening'
}

const DAY_LABELS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const DAY_LABELS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DashboardPage() {
  const { user } = useAuth()
  const { stats } = useUser()
  const { isHebrew } = useI18n()
  const navigate = useNavigate()

  const displayName = user?.email?.split('@')[0] ?? (isHebrew ? 'ספורטאי' : 'Athlete')
  const workoutName = isHebrew ? todayWorkout.nameHe : todayWorkout.name

  // XP progress to next level
  const xpForThisLevel = Math.max(stats.level * 200, 200)
  const xpIntoLevel = stats.xp % xpForThisLevel
  const xpPct = Math.min(xpIntoLevel / xpForThisLevel, 1)
  const xpLeft = xpForThisLevel - xpIntoLevel

  // Last 7 days — which had a completed workout?
  const last7 = useMemo(() => {
    const workouts = getWorkoutProgress()
    // Build a Set of date-strings like "2026-05-12"
    const doneSet = new Set(
      workouts.filter(w => w.completed).map(w => w.date.slice(0, 10))
    )
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (6 - i))          // oldest → newest
      const key = d.toISOString().slice(0, 10)
      const isToday = i === 6
      return { dayIndex: d.getDay(), done: doneSet.has(key), isToday }
    })
  }, [])

  return (
    <div className="app-layout">
      <div className="dash-page">

        {/* ── Header ── */}
        <header className="dash-header">
          <div>
            <p className="dash-greeting">{getGreeting(isHebrew)},</p>
            <h1 className="dash-name">{displayName}</h1>
          </div>
          <button
            className="dash-settings-btn"
            onClick={() => navigate('/settings')}
            aria-label={isHebrew ? 'הגדרות' : 'Settings'}
          >
            ⚙️
          </button>
        </header>

        {/* ── Stat tiles row ── */}
        <div className="dash-stat-row">
          <div className="dash-stat-tile dash-stat-tile-fire">
            <span className="dash-stat-tile-icon">🔥</span>
            <span className="dash-stat-tile-value">{stats.streak}</span>
            <span className="dash-stat-tile-label">{isHebrew ? 'ימי רצף' : 'Day Streak'}</span>
          </div>
          <div className="dash-stat-tile dash-stat-tile-star">
            <span className="dash-stat-tile-icon">⭐</span>
            <span className="dash-stat-tile-value">{isHebrew ? `רמה ${stats.level}` : `Lv ${stats.level}`}</span>
            <span className="dash-stat-tile-label">{stats.xp} XP</span>
          </div>
        </div>

        {/* ── 7-day streak dots ── */}
        <div className="dash-streak-week">
          {last7.map((day, i) => (
            <div key={i} className="dash-streak-day">
              <div
                className={[
                  'dash-streak-dot',
                  day.done ? 'done' : '',
                  day.isToday ? 'today' : '',
                ].filter(Boolean).join(' ')}
              >
                {day.done ? '✓' : day.isToday ? '●' : ''}
              </div>
              <span className="dash-streak-day-label">
                {isHebrew ? DAY_LABELS_HE[day.dayIndex] : DAY_LABELS_EN[day.dayIndex]}
              </span>
            </div>
          ))}
        </div>

        {/* ── XP progress bar ── */}
        <div className="dash-xp-wrap">
          <div className="dash-xp-labels">
            <span className="dash-xp-label-left">
              {isHebrew ? `רמה ${stats.level}` : `Level ${stats.level}`}
            </span>
            <span className="dash-xp-label-right">
              {isHebrew
                ? `עוד ${xpLeft} XP לרמה ${stats.level + 1}`
                : `${xpLeft} XP to Level ${stats.level + 1}`}
            </span>
          </div>
          <div className="dash-xp-track">
            <div className="dash-xp-fill" style={{ width: `${xpPct * 100}%` }} />
          </div>
        </div>

        {/* ── Today's workout (big card) ── */}
        <div className="dash-today-card">
          <p className="dash-today-label">
            📅 {isHebrew ? 'אימון היום' : "Today's Workout"}
          </p>
          <h2 className="dash-today-name">{workoutName}</h2>
          <div className="dash-today-meta">
            <span>⏱ {todayWorkout.durationMinutes} {isHebrew ? 'דקות' : 'min'}</span>
            <span>•</span>
            <span>💪 {todayWorkout.exercises.length} {isHebrew ? 'תרגילים' : 'exercises'}</span>
            <span className={`difficulty-badge ${todayWorkout.difficulty}`}>
              {todayWorkout.difficulty}
            </span>
          </div>
          <button
            className="dash-start-btn"
            onClick={() => navigate('/workout')}
          >
            {isHebrew ? '▶ התחל אימון' : '▶ Start Workout'}
          </button>
        </div>

        {/* ── Action tiles (2×2 grid) ── */}
        <div className="dash-tiles-grid">
          <button className="dash-tile" onClick={() => navigate('/workout?mode=gym')}>
            <span className="dash-tile-icon">🏋️</span>
            <span className="dash-tile-title">{isHebrew ? 'יצירת אימון' : 'Build Workout'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'בנה אימון חדר כושר' : 'Custom gym session'}</span>
          </button>

          <button className="dash-tile" onClick={() => navigate('/training-plan')}>
            <span className="dash-tile-icon">✏️</span>
            <span className="dash-tile-title">{isHebrew ? 'עריכת תוכנית' : 'Edit Plan'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'שנה ימים ומטרות' : 'Adjust days & goals'}</span>
          </button>

          <button className="dash-tile" onClick={() => navigate('/progress')}>
            <span className="dash-tile-icon">📊</span>
            <span className="dash-tile-title">{isHebrew ? 'התקדמות' : 'Progress'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'גרפים וסטטיסטיקות' : 'Stats & graphs'}</span>
          </button>

          <button className="dash-tile" onClick={() => navigate('/wearable')}>
            <span className="dash-tile-icon">⌚</span>
            <span className="dash-tile-title">{isHebrew ? 'מכשירים' : 'Devices'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'שעון וחיישנים' : 'Watch & sensors'}</span>
          </button>
        </div>

        {/* ── Weekly plan (big button) ── */}
        <button className="dash-weekly-btn" onClick={() => navigate('/training-plan')}>
          <span className="dash-weekly-icon">📅</span>
          <span className="dash-weekly-text">
            <strong>{isHebrew ? 'תוכנית שבועית' : 'Weekly Plan'}</strong>
            <small>{isHebrew ? 'ראה וערוך את לוח האימונים השבועי' : 'View & edit your full weekly schedule'}</small>
          </span>
          <span className="dash-weekly-arrow">{isHebrew ? '←' : '→'}</span>
        </button>

        {/* ── Secondary row ── */}
        <div className="dash-secondary-row">
          <button className="dash-secondary-btn" onClick={() => navigate('/nutrition')}>
            🍽 {isHebrew ? 'תזונה' : 'Nutrition'}
          </button>
          <button className="dash-secondary-btn" onClick={() => navigate('/badges')}>
            🏆 {isHebrew ? 'הישגים' : 'Badges'}
          </button>
          <button className="dash-secondary-btn" onClick={() => navigate('/ai-tools')}>
            🤖 {isHebrew ? 'AI כלים' : 'AI Tools'}
          </button>
        </div>

      </div>
      <BottomNav />
    </div>
  )
}
