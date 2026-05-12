import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { todayWorkout } from '../data/mockWorkouts'
import BottomNav from '../components/layout/BottomNav'

function getGreeting(isHebrew: boolean) {
  const h = new Date().getHours()
  if (h < 12) return isHebrew ? 'בוקר טוב' : 'Good morning'
  if (h < 18) return isHebrew ? 'צהריים טובים' : 'Good afternoon'
  return isHebrew ? 'ערב טוב' : 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { stats } = useUser()
  const { isHebrew } = useI18n()
  const navigate = useNavigate()

  const displayName = user?.email?.split('@')[0] ?? (isHebrew ? 'ספורטאי' : 'Athlete')
  const workoutName = isHebrew ? todayWorkout.nameHe : todayWorkout.name

  // XP progress to next level
  const xpForThisLevel = stats.level * 200
  const xpIntoLevel = stats.xp % xpForThisLevel
  const xpPct = Math.min(xpIntoLevel / xpForThisLevel, 1)
  const xpLeft = xpForThisLevel - xpIntoLevel

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

        {/* ── Streak + XP strip ── */}
        <div className="dash-streak-strip">
          <span className="dash-streak-item">
            🔥 <strong>{stats.streak}</strong>
            <span>{isHebrew ? 'ימי רצף' : 'day streak'}</span>
          </span>
          <span className="dash-streak-sep" />
          <span className="dash-streak-item">
            ⭐ <strong>{isHebrew ? `רמה ${stats.level}` : `Level ${stats.level}`}</strong>
            <span>{stats.xp} XP</span>
          </span>
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
          <p className="dash-xp-sub">
            {xpIntoLevel} / {xpForThisLevel} XP
          </p>
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

        {/* ── Action tiles (2 columns) ── */}
        <div className="dash-tiles-grid">
          <button
            className="dash-tile"
            onClick={() => navigate('/workout?mode=gym')}
          >
            <span className="dash-tile-icon">🏋️</span>
            <span className="dash-tile-title">{isHebrew ? 'יצירת אימון' : 'Build Workout'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'בנה אימון חדר כושר' : 'Custom gym session'}</span>
          </button>

          <button
            className="dash-tile"
            onClick={() => navigate('/training-plan')}
          >
            <span className="dash-tile-icon">✏️</span>
            <span className="dash-tile-title">{isHebrew ? 'עריכת תוכנית' : 'Edit Plan'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'שנה ימים ומטרות' : 'Adjust days & goals'}</span>
          </button>

          <button
            className="dash-tile"
            onClick={() => navigate('/progress')}
          >
            <span className="dash-tile-icon">📊</span>
            <span className="dash-tile-title">{isHebrew ? 'התקדמות' : 'Progress'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'גרפים וסטטיסטיקות' : 'Stats & graphs'}</span>
          </button>

          <button
            className="dash-tile"
            onClick={() => navigate('/wearable')}
          >
            <span className="dash-tile-icon">⌚</span>
            <span className="dash-tile-title">{isHebrew ? 'מכשירים' : 'Devices'}</span>
            <span className="dash-tile-sub">{isHebrew ? 'שעון וחיישנים' : 'Watch & sensors'}</span>
          </button>
        </div>

        {/* ── Weekly plan (big button) ── */}
        <button
          className="dash-weekly-btn"
          onClick={() => navigate('/training-plan')}
        >
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
