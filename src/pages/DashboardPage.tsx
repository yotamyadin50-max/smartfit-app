import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { todayWorkout } from '../data/mockWorkouts'
import { mockMeals } from '../data/mockNutrition'
import BottomNav from '../components/layout/BottomNav'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const DEMO_AI_INSIGHT =
  "You've trained 3 days in a row — great streak! Today's session focuses on full body. Hit those squats hard 💪"

const nextMeal = mockMeals[1].options[0]

export default function DashboardPage() {
  const { user } = useAuth()
  const { stats, profile } = useUser()
  const navigate = useNavigate()

  const displayName = user?.email?.split('@')[0] ?? 'Athlete'
  const xpToNextLevel = stats.level * 200
  const xpProgress = Math.min((stats.xp % xpToNextLevel) / xpToNextLevel, 1)

  return (
    <div className="app-layout">
      <div className="page-content">

        <header className="dashboard-header">
          <div>
            <p className="greeting-sub">{getGreeting()},</p>
            <h1 className="greeting-name">{displayName} 👋</h1>
          </div>
          <button className="settings-icon-btn" onClick={() => navigate('/settings')}>⚙️</button>
        </header>

        <div className="insight-card">
          <div className="insight-tag">🤖 AI Insight · Demo</div>
          <p className="insight-text">{DEMO_AI_INSIGHT}</p>
        </div>

        <div className="stats-row">
          <div className="stat-chip">
            <span className="stat-value">🔥 {stats.streak}</span>
            <span className="stat-label">Day Streak</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">⚡ {stats.xp}</span>
            <span className="stat-label">Total XP</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">🏆 Lvl {stats.level}</span>
            <span className="stat-label">Level</span>
          </div>
        </div>

        <div className="xp-bar-wrap">
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${xpProgress * 100}%` }} />
          </div>
          <span className="xp-bar-label">{stats.xp % xpToNextLevel} / {xpToNextLevel} XP to Level {stats.level + 1}</span>
        </div>

        <div className="workout-card-big">
          <div className="workout-card-top">
            <div>
              <p className="workout-card-label">Today's Workout</p>
              <h2 className="workout-card-name">{todayWorkout.name}</h2>
            </div>
            <span className={`difficulty-badge ${todayWorkout.difficulty}`}>
              {todayWorkout.difficulty}
            </span>
          </div>
          <div className="workout-card-meta">
            <span>⏱ {todayWorkout.durationMinutes} min</span>
            <span>💪 {todayWorkout.type}</span>
            <span>📋 {todayWorkout.exercises.length} exercises</span>
          </div>
          <button className="btn-primary btn-start" onClick={() => navigate('/workout')}>
            Start Workout
          </button>
        </div>

        <div className="next-meal-card" onClick={() => navigate('/nutrition')} role="button" tabIndex={0}>
          <div className="next-meal-left">
            <span className="next-meal-emoji">☀️</span>
            <div>
              <p className="next-meal-label">Next Meal · Lunch</p>
              <p className="next-meal-name">{nextMeal.name}</p>
            </div>
          </div>
          <div className="next-meal-right">
            <span className="next-meal-cal">{nextMeal.macros.calories} kcal</span>
            <span className="next-meal-protein">{nextMeal.macros.protein}g protein</span>
          </div>
        </div>

        <div className="goal-banner">
          <span>🎯 Goal: <strong>{profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1)}</strong></span>
          <span> · Level: <strong>{profile.fitnessLevel}</strong></span>
        </div>

      </div>
      <BottomNav />
    </div>
  )
}
