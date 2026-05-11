import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ensureRestDays,
  getAgeGuidance,
  getProfileGoals,
  getProfileWeeklyPlan,
  getProfileWorkoutTypes,
  type Goal,
  type ScheduleFocus,
  type WeekDay,
  type WorkoutType,
  useUser,
} from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { todayWorkout } from '../data/mockWorkouts'
import BottomNav from '../components/layout/BottomNav'

function getGreeting(t: (key: string) => string) {
  const h = new Date().getHours()
  if (h < 12) return t('greetingMorning')
  if (h < 18) return t('greetingAfternoon')
  return t('greetingEvening')
}

const goalLabelKeys: Record<Goal, string> = {
  cut: 'toneUp',
  bulk: 'buildMuscle',
  endurance: 'enduranceGoal',
  flexibility: 'flexibilityGoal',
  fitness: 'generalFitness',
  health: 'health',
  consistency: 'consistencyGoal',
}

const locationLabelKeys: Record<WorkoutType, string> = {
  gym: 'gym',
  home: 'home',
  outdoor: 'outdoor',
}

const dayLabelKeys: Record<WeekDay, string> = {
  sun: 'sunday',
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
}

const focusLabelKeys: Record<ScheduleFocus, string> = {
  goal: 'goalWorkout',
  abs: 'absWorkout',
  arms: 'armsWorkout',
  legs: 'legsWorkout',
  aerobic: 'aerobicWorkout',
  rest: 'restDay',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { stats, profile } = useUser()
  const { t, isHebrew } = useI18n()
  const navigate = useNavigate()

  const displayName = user?.email?.split('@')[0] ?? 'Athlete'
  const xpToNextLevel = Math.max(stats.level * 200, 200)
  const xpProgress = Math.min((stats.xp % xpToNextLevel) / xpToNextLevel, 1)
  const workoutName = isHebrew ? todayWorkout.nameHe : todayWorkout.name
  const goals = getProfileGoals(profile)
  const locations = getProfileWorkoutTypes(profile)
  const ageGuidance = getAgeGuidance(profile)
  const weeklyPlan = ensureRestDays(getProfileWeeklyPlan(profile))
  const today = new Date().getDay()
  const todayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as WeekDay[])[today]
  const restDays = Object.entries(weeklyPlan)
    .filter(([, focus]) => focus === 'rest')
    .map(([day]) => t(dayLabelKeys[day as WeekDay]))

  return (
    <div className="app-layout">
      <div className="page-content">
        <header className="dashboard-header">
          <div>
            <p className="greeting-sub">{getGreeting(t)},</p>
            <h1 className="greeting-name">{displayName}</h1>
          </div>
          <button className="settings-icon-btn" onClick={() => navigate('/settings')} aria-label={t('settings')}>
            {t('settings')}
          </button>
        </header>

        <div className="insight-card">
          <div className="insight-tag">{t('aiInsight')}</div>
          <p className="insight-text">
            {stats.streak > 0
              ? isHebrew
                ? `התאמנת ${stats.streak} ימים ברצף — כל הכבוד! המשך כך.`
                : `${stats.streak}-day streak — great consistency! Keep it up.`
              : isHebrew
                ? 'ברוך הבא! הגיע הזמן להתחיל את המסע הכושר שלך.'
                : "Welcome! Let's get your fitness journey started."}
          </p>
        </div>

        <div className="stats-row">
          <div className="stat-chip">
            <span className="stat-value">{stats.streak}</span>
            <span className="stat-label">{t('dayStreak')}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">{stats.xp}</span>
            <span className="stat-label">{t('totalXp')}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">{stats.level}</span>
            <span className="stat-label">{t('level')}</span>
          </div>
        </div>

        <div className="xp-bar-wrap">
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${xpProgress * 100}%` }} />
          </div>
          <span className="xp-bar-label">{stats.xp % xpToNextLevel} / {xpToNextLevel} XP</span>
        </div>

        <div className="workout-card-big">
          <div className="workout-card-top">
            <div>
              <p className="workout-card-label">{t('todaysWorkout')}</p>
              <h2 className="workout-card-name">{workoutName}</h2>
            </div>
            <span className={`difficulty-badge ${todayWorkout.difficulty}`}>
              {todayWorkout.difficulty}
            </span>
          </div>
          <div className="workout-card-meta">
            <span>{todayWorkout.durationMinutes} min</span>
            <span>{todayWorkout.exercises.length} {t('exercises')}</span>
          </div>
          <button className="btn-primary btn-start" onClick={() => navigate('/workout')}>
            {t('startWorkout')}
          </button>
        </div>

        <div className="training-system-card compact">
          <div>
            <p className="workout-card-label">{t('mockAiPlanner')}</p>
            <h2 className="workout-card-name">{t('trainingSystem')}</h2>
            <p className="training-card-copy">{t('trainingSystemDashboardSub')}</p>
          </div>
          <button className="btn-secondary btn-start" onClick={() => navigate('/training-plan')}>
            {t('openTrainingSystem')}
          </button>
        </div>

        <div className="training-system-card compact">
          <div>
            <p className="workout-card-label">{t('gymWorkout')}</p>
            <h2 className="workout-card-name">{t('gymBuilderDashboardTitle')}</h2>
            <p className="training-card-copy">{t('gymBuilderDashboardSub')}</p>
          </div>
          <button className="btn-secondary btn-start" onClick={() => navigate('/workout?mode=gym')}>
            {t('openGymBuilder')}
          </button>
        </div>

        <div className="training-system-card compact">
          <div>
            <p className="workout-card-label">{t('aiToolsBadge')}</p>
            <h2 className="workout-card-name">{t('aiTools')}</h2>
            <p className="training-card-copy">{t('aiToolsDashboardSub')}</p>
          </div>
          <button className="btn-secondary btn-start" onClick={() => navigate('/ai-tools')}>
            {t('openAiTools')}
          </button>
        </div>

        <div
          className="next-meal-card"
          onClick={() => navigate('/nutrition')}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/nutrition')
          }}
          role="button"
          tabIndex={0}
        >
          <div className="next-meal-left">
            <div>
              <p className="next-meal-label">🍽 {isHebrew ? 'תזונה' : 'Nutrition'}</p>
              <p className="next-meal-name">{isHebrew ? 'תכנן את הארוחה הבאה שלך' : 'Plan your next meal'}</p>
            </div>
          </div>
          <div className="next-meal-right">
            <span className="next-meal-cal">{isHebrew ? 'פתח →' : 'Open →'}</span>
          </div>
        </div>

        <div className="training-system-card compact">
          <div>
            <p className="workout-card-label">🏆 {isHebrew ? 'הישגים' : 'Achievements'}</p>
            <h2 className="workout-card-name">{isHebrew ? 'תגים ורצפים' : 'Badges & Streaks'}</h2>
            <p className="training-card-copy">{isHebrew ? `רצף: ${stats.streak} ימים · רמה ${stats.level}` : `Streak: ${stats.streak} days · Level ${stats.level}`}</p>
          </div>
          <button className="btn-secondary btn-start" onClick={() => navigate('/badges')}>
            {isHebrew ? 'צפה בתגים' : 'View Badges'}
          </button>
        </div>

        <div className="training-system-card compact">
          <div>
            <p className="workout-card-label">🍽 {isHebrew ? 'תזונה' : 'Nutrition'}</p>
            <h2 className="workout-card-name">{isHebrew ? 'ספר מתכונים' : 'Recipe Book'}</h2>
            <p className="training-card-copy">{isHebrew ? 'מתכונים מותאמים לתוכנית שלך' : 'Recipes tailored to your plan'}</p>
          </div>
          <button className="btn-secondary btn-start" onClick={() => navigate('/recipes')}>
            {isHebrew ? 'פתח מתכונים' : 'Open Recipes'}
          </button>
        </div>

        <div className="training-system-card compact">
          <div>
            <p className="workout-card-label">👥 {isHebrew ? 'קהילה' : 'Community'}</p>
            <h2 className="workout-card-name">{isHebrew ? 'חברים וליגה' : 'Friends & Leaderboard'}</h2>
            <p className="training-card-copy">{isHebrew ? 'תתחרה עם חברים ועקוב אחר ההתקדמות' : 'Compete with friends and track progress'}</p>
          </div>
          <button className="btn-secondary btn-start" onClick={() => navigate('/social')}>
            {isHebrew ? 'פתח חברתי' : 'Open Social'}
          </button>
        </div>

        <div className="training-system-card compact">
          <div>
            <p className="workout-card-label">⌚ {isHebrew ? 'מכשירים' : 'Devices'}</p>
            <h2 className="workout-card-name">{isHebrew ? 'סנכרון מכשירים' : 'Wearable Sync'}</h2>
            <p className="training-card-copy">{isHebrew ? 'חבר שעון, מאזניים ו-GPS' : 'Connect watch, scale & GPS'}</p>
          </div>
          <button className="btn-secondary btn-start" onClick={() => navigate('/wearable')}>
            {isHebrew ? 'חבר מכשיר' : 'Connect Device'}
          </button>
        </div>

        <div className="goal-banner">
          <span>{t('goals')}: <strong>{goals.map(goal => t(goalLabelKeys[goal])).join(', ')}</strong></span>
          <span> - {t('locations')}: <strong>{locations.map(location => t(locationLabelKeys[location])).join(', ')}</strong></span>
        </div>

        <div className="goal-banner">
          <span>{t('weeklyPlan')}: <strong>{t(dayLabelKeys[todayKey])} - {t(focusLabelKeys[weeklyPlan[todayKey]])}</strong></span>
          <span> - {t('restDays')}: <strong>{restDays.join(', ')}</strong></span>
        </div>

        <div className="goal-banner">
          <span>{t('ageAdaptation')}: <strong>{ageGuidance.age} - {t(ageGuidance.group)}</strong></span>
          <span> - {t('ageWorkoutNote')}</span>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
