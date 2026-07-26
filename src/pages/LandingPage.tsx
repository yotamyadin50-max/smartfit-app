import { useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'

const FEATURES = [
  { icon: '🏋️', key: 'landingWorkouts' },
  { icon: '🥗', key: 'landingNutrition' },
  { icon: '📊', key: 'landingProgress' },
  { icon: '🏆', key: 'landingAchievements' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <div className="landing-layout">
      <div className="landing-hero">
        <div className="brand landing-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">Smart<span>Fit</span></span>
        </div>

        <h1 className="landing-title">{t('landingTitle')}</h1>
        <p className="landing-subtitle">{t('landingSubtitle')}</p>

        <ul className="landing-features">
          {FEATURES.map(feature => (
            <li key={feature.key} className="landing-feature-item">
              <span>{feature.icon}</span>
              <span>{t(feature.key)}</span>
            </li>
          ))}
        </ul>

        <div className="landing-cta">
          <button className="btn-primary" onClick={() => navigate('/signup')}>
            {t('landingGetStarted')}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/login')}>
            {t('landingSignIn')}
          </button>
        </div>

        <p className="landing-note">{t('landingNote')}</p>
      </div>
    </div>
  )
}
