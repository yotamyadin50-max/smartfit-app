import PageHeader from '../components/layout/PageHeader'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'

import { ALL_BADGES, TIER_COLORS } from '../data/badges'
import { getAchievementEvents } from '../lib/achievementEvents'

export default function BadgesPage() {
  const { stats } = useUser()
  const { isHebrew } = useI18n()
  const [searchParams] = useSearchParams()
  const highlighted = searchParams.get('highlight')
  const achievementEvents = getAchievementEvents()
  const [freezeUsed, setFreezeUsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('smartfit_streak_freeze_used') === '1') {
        setFreezeUsed(true)
        localStorage.removeItem('smartfit_streak_freeze_used')
      }
    } catch {}
  }, [])

  const earned = ALL_BADGES.filter(b => b.condition(stats))
  const locked = ALL_BADGES.filter(b => !b.condition(stats))

  const t = (en: string, he: string) => isHebrew ? he : en

  return (
    <div className="app-layout">
      <PageHeader title={t('Badges & Achievements', 'תגים והישגים')} />
      <div className="page-content" style={{ paddingTop: 0 }}>

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
          <div className="stat-chip">
            <span className="stat-value">🧊{stats.streakFreezes ?? 0}</span>
            <span className="stat-label">{t('Freezes', 'הקפאות')}</span>
          </div>
        </div>

        {freezeUsed && (
          <div style={{ background: 'rgba(99,102,241,0.18)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, border: '1px solid #6366f1', fontSize: 13, color: '#a5b4fc', textAlign: 'center' }}>
            🧊 {isHebrew ? 'השתמשת ב-Streak Freeze שלך — הרצף שלך נשמר!' : 'Your Streak Freeze was used — streak preserved!'}
          </div>
        )}

        {achievementEvents.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#a855f7', marginBottom: 12 }}>
              {t('Recent achievements', 'הישגים אחרונים')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 24 }}>
              {achievementEvents.slice(0, 8).map(event => (
                <div
                  key={event.id}
                  style={{
                    background: highlighted === event.id ? 'rgba(168,85,247,0.16)' : 'rgba(255,255,255,0.06)',
                    border: highlighted === event.id ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: highlighted === event.id ? '0 0 24px rgba(168,85,247,0.22)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{event.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: '#fff' }}>
                      {isHebrew ? event.titleHe : event.titleEn}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.58)' }}>
                      {isHebrew ? event.descriptionHe : event.descriptionEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
                    background: highlighted === `badge-${badge.id}` ? 'rgba(168,85,247,0.16)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${highlighted === `badge-${badge.id}` ? '#a855f7' : TIER_COLORS[badge.tier]}`,
                    borderRadius: 14,
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'center',
                    boxShadow: highlighted === `badge-${badge.id}` ? '0 0 24px rgba(168,85,247,0.22)' : 'none',
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
                  {badge.progress && (() => {
                    const { current, target } = badge.progress(stats)
                    const pct = Math.min(100, Math.round((current / target) * 100))
                    const remaining = target - current
                    return (
                      <>
                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: '#6366f1', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                          {remaining > 0
                            ? (isHebrew ? `עוד ${remaining}` : `${remaining} more`)
                            : (isHebrew ? 'כמעט!' : 'Almost!')}
                        </span>
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
