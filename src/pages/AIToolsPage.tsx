import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/layout/BottomNav'
import { useI18n } from '../context/I18nContext'

export default function AIToolsPage() {
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    void import('../aiTools.js')
  }, [])

  return (
    <div className="app-layout">
      <div className="page-content sf-ai-tools-page">
        <header className="dashboard-header">
          <div>
            <p className="greeting-sub">{t('aiInsightDemo')}</p>
            <h1 className="page-title training-plan-title">{t('aiTools')}</h1>
          </div>
          <button className="settings-icon-btn" onClick={() => navigate('/dashboard')}>
            {t('back')}
          </button>
        </header>

        <section id="sf-ai-tools-area" className="sf-ai-tools-root" aria-label={t('aiTools')} />
      </div>
      <BottomNav />
    </div>
  )
}
