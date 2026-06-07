import { useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'

export default function NotFoundPage() {
  const { language } = useI18n()
  const navigate = useNavigate()
  const isHe = language === 'he'

  return (
    <div
      className="app-layout"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: 16, padding: 24, textAlign: 'center' }}
    >
      <span style={{ fontSize: 64 }}>🏋️</span>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>404</h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: 0 }}>
        {isHe ? 'העמוד שחיפשת לא קיים.' : "This page doesn't exist."}
      </p>
      <button
        className="btn-primary"
        style={{ marginTop: 8 }}
        onClick={() => navigate('/dashboard', { replace: true })}
      >
        {isHe ? '← חזור לדשבורד' : '← Back to Dashboard'}
      </button>
    </div>
  )
}
