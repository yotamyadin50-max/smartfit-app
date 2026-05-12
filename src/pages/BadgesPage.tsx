import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import BottomNav from '../components/layout/BottomNav'
import { ALL_BADGES, TIER_COLORS } from '../data/badges'

export default function BadgesPage() {
  const { stats } = useUser()
  const { isHebrew } = useI18n()
  const navigate = useNavigate()

  const earned = ALL_BADGES.filter(b => b.condition(stats))
  const locked = ALL_BADGES.filter(b => !b.condition(stats))

  const t = (en: string, he: string) => isHebrew ? he : en

  return (
    <div className="app-layout">
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-secondary" style={{ padding: '6px 14px' }} onClick={() => navigate(-1)}>
            ← {t('Back', 'חזור')}
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            {t('Badges & Achievements', 'תגים והישגים')}
          </h1>
        </div>

        <div className="stats-row" style={{ marginBottom: 20 }}>
          <div className="stat-chip">
            <span className="stat-value">{earned.length}</span>
            <span className="stat-label">{t('Earned', 'הושגו')}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">{locked.length}</span>
            <span className="stat-label">{t('Locked', 'נעולים')}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">{stats.streak}</span>
            <span className="stat-label">{t('Streak', 'רצף')}</span>
          </div>
        </div>

        {earned.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ffd700', marginBottom: 12 }}>
              🏆 {t('Earned', 'הושגו')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {earned.map(badge => (
                <div
                  key={badge.id}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${TIER_COLORS[badge.tier]}`,
                    borderRadius: 14,
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: 32 }}>{badge.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: TIER_COLORS[badge.tier] }}>
                    {isHebrew ? badge.nameHe : badge.nameEn}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {isHebrew ? badge.descHe : badge.descEn}
                  </span>
                  <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 600 }}>
                    +{badge.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {locked.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
              🔒 {t('Locked', 'נעולים')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {locked.map(badge => (
                <div
                  key={badge.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'center',
                    opacity: 0.5,
                  }}
                >
                  <span style={{ fontSize: 32, filter: 'grayscale(1)' }}>{badge.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {isHebrew ? badge.nameHe : badge.nameEn}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {isHebrew ? badge.descHe : badge.descEn}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(168,85,247,0.5)', fontWeight: 600 }}>
                    +{badge.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
