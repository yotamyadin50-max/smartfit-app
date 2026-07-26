import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { getProfileGoals } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { getAnimalProgress } from '../lib/animalRanks'
import { getTodayCheckin, saveTodayCheckin, type FeelingEmoji } from '../lib/dailyCheckin'

const FEELINGS: { emoji: FeelingEmoji; labelHe: string; labelEn: string }[] = [
  { emoji: '😴', labelHe: 'עייף', labelEn: 'Tired' },
  { emoji: '😐', labelHe: 'בסדר', labelEn: 'OK' },
  { emoji: '💪', labelHe: 'מעולה', labelEn: 'Great' },
]

function getGreeting(isHebrew: boolean) {
  const h = new Date().getHours()
  if (h < 12) return isHebrew ? 'בוקר טוב' : 'Good morning'
  if (h < 18) return isHebrew ? 'צהריים טובים' : 'Good afternoon'
  return isHebrew ? 'ערב טוב' : 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile, stats } = useUser()
  const { isHebrew } = useI18n()
  const navigate = useNavigate()
  const [todayFeeling, setTodayFeeling] = useState<FeelingEmoji | null>(() => getTodayCheckin()?.feeling ?? null)

  const displayName =
    profile.name?.trim() ||
    user?.email?.split('@')[0] ||
    (isHebrew ? 'ספורטאי' : 'Athlete')
  const animalProgress  = getAnimalProgress(stats)
  const xpLeft          = animalProgress.xpToNextLevel
  const hasCuttingGoal  = getProfileGoals(profile).includes('cut')

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

      {/* ── Daily check-in ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
          {isHebrew ? 'איך אתה מרגיש היום?' : 'How do you feel today?'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {FEELINGS.map(f => (
            <button
              key={f.emoji}
              onClick={() => { saveTodayCheckin(f.emoji); setTodayFeeling(f.emoji) }}
              title={isHebrew ? f.labelHe : f.labelEn}
              style={{
                fontSize: 22,
                background: todayFeeling === f.emoji ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.07)',
                border: todayFeeling === f.emoji ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '3px 8px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.emoji}
            </button>
          ))}
        </div>
        {todayFeeling && (
          <span style={{ fontSize: 12, color: '#a5b4fc', marginInlineStart: 4 }}>
            {isHebrew ? '✓ נשמר' : '✓ Saved'}
          </span>
        )}
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
          <button className="dash-btn dash-btn-wide" onClick={() => navigate(hasCuttingGoal ? '/shredding' : '/nutrition')}>
            <span className="dash-btn-icon">{hasCuttingGoal ? '🔥' : '🥗'}</span>
            <span className="dash-btn-name">{hasCuttingGoal ? (isHebrew ? 'חיטוב' : 'Shredding') : (isHebrew ? 'תזונה ותפריט' : 'Nutrition & Menu')}</span>
          </button>
        </div>

        {/* Row 3: friends */}
        <div className="dash-row dash-row-1">
          <button className="dash-btn dash-btn-wide" onClick={() => navigate('/social')}>
            <span className="dash-btn-icon">👥</span>
            <span className="dash-btn-name">{isHebrew ? 'חברים ואימון משותף' : 'Friends & Co-Workout'}</span>
          </button>
        </div>

        {/* Row 4: 3 buttons */}
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

        {/* Row 5: cardio */}
        <div className="dash-row dash-row-1">
          <button className="dash-btn dash-btn-wide" onClick={() => navigate('/cardio')}>
            <span className="dash-btn-icon">🏃</span>
            <span className="dash-btn-name">{isHebrew ? 'אימון קרדיו' : 'Cardio Session'}</span>
          </button>
        </div>

      </div>

    </div>
  )
}
