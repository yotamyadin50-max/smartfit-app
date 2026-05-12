import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { getAnimalProgress } from '../lib/animalRanks'

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
  const animalProgress = getAnimalProgress(stats)
  const xpLeft = animalProgress.xpToNextLevel

  return (
    <div className="dash-fullscreen">

      {/* ── Header ── */}
      <header className="dash-top">
        <div className="dash-top-text">
          <p className="dash-greeting">{getGreeting(isHebrew)},</p>
          <h1 className="dash-name">{displayName} 👋</h1>
        </div>
        <button className="dash-settings-btn" onClick={() => navigate('/settings')} aria-label="settings">
          ⚙️
        </button>
      </header>

      {/* ── Stats row: עד הרמה הבאה | XP | סטריק ── */}
      <div className="dash-stats">
        <div className="dash-stat">
          <span className="dash-stat-val" style={{ color: 'var(--accent)' }}>
            {xpLeft} <small>XP</small>
          </span>
          <span className="dash-stat-lbl">{isHebrew ? 'עד הרמה הבאה' : 'To next level'}</span>
        </div>
        <div className="dash-stat dash-stat-mid">
          <span className="dash-stat-val" style={{ color: 'var(--accent-yellow)' }}>{stats.xp}</span>
          <span className="dash-stat-lbl">XP</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-val" style={{ color: '#f97316' }}>{stats.streak} 🔥</span>
          <span className="dash-stat-lbl">{isHebrew ? 'ימי רצף' : 'Streak'}</span>
        </div>
      </div>

      {/* ── Buttons grid ── */}
      <div className="dash-grid">

        {/* Row 1: 2 buttons */}
        <div className="dash-row dash-row-2">
          <button className="dash-btn" onClick={() => navigate('/workout')}>
            <span className="dash-btn-icon">🏋️</span>
            <span className="dash-btn-name">{isHebrew ? 'אימון היום' : "Today's Workout"}</span>
          </button>
          <button className="dash-btn" onClick={() => navigate('/training-plan')}>
            <span className="dash-btn-icon">📅</span>
            <span className="dash-btn-name">{isHebrew ? 'תוכנית שבועית' : 'Weekly Plan'}</span>
          </button>
        </div>

        {/* Row 2: 1 big button */}
        <div className="dash-row dash-row-1">
          <button className="dash-btn dash-btn-wide" onClick={() => navigate('/nutrition')}>
            <span className="dash-btn-icon">🥗</span>
            <span className="dash-btn-name">{isHebrew ? 'תזונה ותפריט' : 'Nutrition & Menu'}</span>
          </button>
        </div>

        {/* Row 3: 1 big button */}
        <div className="dash-row dash-row-1">
          <button className="dash-btn dash-btn-wide" onClick={() => navigate('/workout?mode=custom')}>
            <span className="dash-btn-icon">⚡</span>
            <span className="dash-btn-name">{isHebrew ? 'צור אימון חד-פעמי' : 'Create One-Time Workout'}</span>
          </button>
        </div>

        {/* Row 4: 2 buttons */}
        <div className="dash-row dash-row-2">
          <button className="dash-btn" onClick={() => navigate('/wearable')}>
            <span className="dash-btn-icon">⌚</span>
            <span className="dash-btn-name">{isHebrew ? 'חיבור מכשירים' : 'Connect Devices'}</span>
          </button>
          <button className="dash-btn" onClick={() => navigate('/progress')}>
            <span className="dash-btn-icon">📈</span>
            <span className="dash-btn-name">{isHebrew ? 'ההתקדמות שלי' : 'My Progress'}</span>
          </button>
        </div>

      </div>

      {/* ── Floating AI chat button ── */}
      <button className="dash-ai-fab" onClick={() => navigate('/chat')} aria-label="AI Chat">
        <span>🤖</span>
        <span className="dash-ai-fab-label">{isHebrew ? 'AI' : 'AI'}</span>
      </button>

    </div>
  )
}
