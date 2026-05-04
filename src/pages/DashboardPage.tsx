import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: '🏋️', title: 'Workouts', desc: 'AI-personalized training plans' },
  { icon: '🥗', title: 'Nutrition', desc: 'Meal suggestions & tracking' },
  { icon: '🤖', title: 'AI Coach', desc: 'Chat about fitness & diet' },
  { icon: '🏆', title: 'Achievements', desc: 'XP, streaks & milestones' },
  { icon: '📊', title: 'Progress', desc: 'Track your results over time' },
  { icon: '🍽️', title: 'Meal Creator', desc: 'Recipes from your ingredients' },
]

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="dashboard-layout">
      <nav className="dashboard-nav">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">Smart<span>Fit</span></span>
        </div>
        <button className="btn-signout" onClick={handleSignOut}>
          Sign Out
        </button>
      </nav>

      <div className="dashboard-content">
        <h1 className="dashboard-welcome">
          Welcome, <span>{user?.email?.split('@')[0]}</span> 👋
        </h1>
        <p className="dashboard-sub">
          Your AI fitness dashboard is being built. Features coming soon:
        </p>

        <div className="placeholder-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="placeholder-card">
              <span className="placeholder-card-icon">{f.icon}</span>
              <span className="placeholder-card-title">{f.title}</span>
              <span className="placeholder-card-desc">{f.desc}</span>
              <span className="badge-coming-soon">Coming soon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
