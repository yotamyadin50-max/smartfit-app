import { useNavigate } from 'react-router-dom'

const FEATURES = [
  { icon: '🏋️', text: 'AI-personalized workouts' },
  { icon: '🥗', text: 'Smart nutrition planning' },
  { icon: '📊', text: 'Progress tracking & insights' },
  { icon: '🏆', text: 'XP, streaks & achievements' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-layout">
      <div className="landing-hero">
        <div className="brand landing-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">Smart<span>Fit</span></span>
        </div>

        <h1 className="landing-title">
          Your AI Fitness<br />Coach, Always Ready
        </h1>
        <p className="landing-subtitle">
          Personalized workouts, nutrition guidance, and real-time coaching — all powered by AI.
        </p>

        <ul className="landing-features">
          {FEATURES.map(f => (
            <li key={f.text} className="landing-feature-item">
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <div className="landing-cta">
          <button className="btn-primary" onClick={() => navigate('/signup')}>
            Get Started Free
          </button>
          <button className="btn-secondary" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>

        <p className="landing-note">No credit card required · Works offline</p>
      </div>
    </div>
  )
}
