import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import BottomNav from '../components/layout/BottomNav'
import { readJson, writeJson } from '../lib/storage'

interface WearableState {
  watchConnected: boolean
  watchName: string
  scaleConnected: boolean
  scaleName: string
  locationEnabled: boolean
  lastSyncedAt: string | null
}

const WEARABLE_KEY = 'smartfit_wearable_state'

function loadState(): WearableState {
  return readJson<WearableState>(WEARABLE_KEY, {
    watchConnected: false,
    watchName: '',
    scaleConnected: false,
    scaleName: '',
    locationEnabled: false,
    lastSyncedAt: null,
  })
}

function saveState(s: WearableState) {
  writeJson(WEARABLE_KEY, s)
}

const WATCH_OPTIONS = ['Apple Watch', 'Garmin', 'Fitbit', 'Samsung Galaxy Watch', 'Polar']
const SCALE_OPTIONS = ['Withings Body+', 'Garmin Index', 'Xiaomi Mi Scale', 'Renpho Smart Scale']

interface MockMetric {
  labelEn: string
  labelHe: string
  value: string
  icon: string
}

const MOCK_METRICS: MockMetric[] = [
  { labelEn: 'Resting HR', labelHe: 'דופק מנוחה', value: '62 bpm', icon: '❤️' },
  { labelEn: 'Steps Today', labelHe: 'צעדים היום', value: '7,432', icon: '🦶' },
  { labelEn: 'Active Cal', labelHe: 'קלוריות פעילות', value: '380 kcal', icon: '🔥' },
  { labelEn: 'Sleep', labelHe: 'שינה', value: '7h 12m', icon: '😴' },
  { labelEn: 'Body Weight', labelHe: 'משקל גוף', value: '74.2 kg', icon: '⚖️' },
  { labelEn: 'Body Fat', labelHe: '% שומן גוף', value: '17.4%', icon: '📊' },
]

export default function WearablePage() {
  const { updateProfile } = useUser()
  const { isHebrew } = useI18n()
  const navigate = useNavigate()
  const [state, setState] = useState<WearableState>(loadState)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const t = (en: string, he: string) => isHebrew ? he : en

  function persist(next: WearableState) {
    setState(next)
    saveState(next)
    updateProfile({
      devices: {
        smartWatch: next.watchConnected,
        smartScale: next.scaleConnected,
        cardioLocation: next.locationEnabled,
      },
    })
  }

  async function connectWatch(name: string) {
    setConnecting(name)
    await new Promise(r => setTimeout(r, 1200))
    setConnecting(null)
    persist({ ...state, watchConnected: true, watchName: name })
  }

  async function connectScale(name: string) {
    setConnecting(name)
    await new Promise(r => setTimeout(r, 1200))
    setConnecting(null)
    persist({ ...state, scaleConnected: true, scaleName: name })
  }

  function disconnect(device: 'watch' | 'scale') {
    if (device === 'watch') persist({ ...state, watchConnected: false, watchName: '' })
    else persist({ ...state, scaleConnected: false, scaleName: '' })
  }

  async function syncNow() {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1800))
    setSyncing(false)
    persist({ ...state, lastSyncedAt: new Date().toLocaleTimeString() })
  }

  const anyConnected = state.watchConnected || state.scaleConnected

  return (
    <div className="app-layout">
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-secondary" style={{ padding: '6px 14px' }} onClick={() => navigate(-1)}>
            ← {t('Back', 'חזור')}
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            ⌚ {t('Wearable Sync', 'סנכרון מכשירים')}
          </h1>
        </div>

        {/* Live metrics (shown when anything connected) */}
        {anyConnected && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                {t('Live Data', 'נתונים חיים')}
              </h2>
              <button
                onClick={syncing ? undefined : syncNow}
                style={{
                  background: syncing ? 'rgba(168,85,247,0.3)' : '#a855f7',
                  border: 'none', borderRadius: 8, color: '#fff',
                  padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {syncing ? t('Syncing…', 'מסנכרן…') : t('Sync Now', 'סנכרן')}
              </button>
            </div>
            {state.lastSyncedAt && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
                {t('Last synced:', 'סונכרן לאחרונה:')} {state.lastSyncedAt}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MOCK_METRICS.filter((_, i) => {
                if (i < 4) return state.watchConnected
                return state.scaleConnected
              }).map(metric => (
                <div
                  key={metric.labelEn}
                  style={{
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px solid rgba(168,85,247,0.25)',
                    borderRadius: 12, padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{metric.icon}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    {isHebrew ? metric.labelHe : metric.labelEn}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{metric.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Smartwatch */}
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
            ⌚ {t('Smartwatch', 'שעון חכם')}
          </h2>
          {state.watchConnected ? (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{state.watchName}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#22c55e' }}>● {t('Connected', 'מחובר')}</p>
              </div>
              <button
                onClick={() => disconnect('watch')}
                style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 8, color: '#ef4444', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                {t('Disconnect', 'נתק')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {WATCH_OPTIONS.map(name => (
                <button
                  key={name}
                  onClick={() => connectWatch(name)}
                  disabled={connecting === name}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '10px 14px',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <span>{name}</span>
                  <span style={{ fontSize: 12, color: '#a855f7' }}>
                    {connecting === name ? t('Connecting…', 'מתחבר…') : t('Connect', 'חבר')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Smart Scale */}
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
            ⚖️ {t('Smart Scale', 'מאזניים חכמות')}
          </h2>
          {state.scaleConnected ? (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{state.scaleName}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#22c55e' }}>● {t('Connected', 'מחובר')}</p>
              </div>
              <button
                onClick={() => disconnect('scale')}
                style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 8, color: '#ef4444', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                {t('Disconnect', 'נתק')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SCALE_OPTIONS.map(name => (
                <button
                  key={name}
                  onClick={() => connectScale(name)}
                  disabled={connecting === name}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '10px 14px',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <span>{name}</span>
                  <span style={{ fontSize: 12, color: '#a855f7' }}>
                    {connecting === name ? t('Connecting…', 'מתחבר…') : t('Connect', 'חבר')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
              📍 {t('Outdoor Tracking', 'מעקב חוץ')}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              {t('GPS for runs & cycling', 'GPS לריצות ורכיבות')}
            </p>
          </div>
          <button
            onClick={() => persist({ ...state, locationEnabled: !state.locationEnabled })}
            style={{
              background: state.locationEnabled ? '#a855f7' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: 20, padding: '6px 16px',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {state.locationEnabled ? t('On', 'פועל') : t('Off', 'כבוי')}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
