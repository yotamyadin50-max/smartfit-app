import PageHeader from '../components/layout/PageHeader'
import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'

import { readJson, writeJson } from '../lib/storage'
import {
  connectBLEHeartRate,
  disconnectBLE,
  getCurrentHR,
  getConnectedDeviceName,
  getHRZone,
  HR_ZONE_COLOR,
  HR_ZONE_LABEL,
  isBLESupported,
  isHRConnected,
  onHeartRate,
} from '../lib/heartRate'

// ── Platform detection ────────────────────────────────────────────────────────
function detectPlatform() {
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua)
  const isEdge = /Edg/.test(ua)
  const isSafari = /Safari/.test(ua) && !isChrome && !isEdge
  const isMac = /Macintosh/.test(ua)
  return { isIOS, isAndroid, isChrome, isEdge, isSafari, isMac }
}

interface SavedDevice {
  id: string          // 'watch' | 'scale' | 'gps'
  name: string
  connectedAt: string
}

interface WearableState {
  savedDevices: SavedDevice[]
  locationEnabled: boolean
}

const WEARABLE_KEY = 'smartfit_wearable_v2'

function loadState(): WearableState {
  return readJson<WearableState>(WEARABLE_KEY, {
    savedDevices: [],
    locationEnabled: false,
  })
}
function saveState(s: WearableState) { writeJson(WEARABLE_KEY, s) }

export default function WearablePage() {
  const { profile, updateProfile } = useUser()
  const { isHebrew } = useI18n()

  const [wState, setWState] = useState<WearableState>(loadState)
  const [connecting, setConnecting] = useState(false)
  const [bleError, setBleError] = useState<string | null>(null)
  const [showSteps, setShowSteps] = useState(false)

  // Live BLE heart rate
  const [liveBPM, setLiveBPM] = useState(() => getCurrentHR())
  const [bleConnected, setBleConnected] = useState(() => isHRConnected())
  const [bleDeviceName, setBleDeviceName] = useState(() => getConnectedDeviceName())

  useEffect(() => {
    const unsub = onHeartRate(bpm => {
      setLiveBPM(bpm)
      if (bpm === 0 && bleDeviceName === '') setBleConnected(false)
    })
    return unsub
  }, [bleDeviceName])

  // Re-check connection status on mount (singleton might still be alive)
  useEffect(() => {
    setBleConnected(isHRConnected())
    setBleDeviceName(getConnectedDeviceName())
    setLiveBPM(getCurrentHR())
  }, [])

  const T = (en: string, he: string) => isHebrew ? he : en

  const platform = detectPlatform()
  const bleOk = isBLESupported()

  function persist(next: WearableState) {
    setWState(next)
    saveState(next)
    const hasWatch = next.savedDevices.some(d => d.id === 'watch')
    updateProfile({
      devices: {
        smartWatch: hasWatch,
        smartScale: false,
        cardioLocation: next.locationEnabled,
      },
    })
  }

  // ── Real BLE connect ────────────────────────────────────────────────────────
  async function handleConnect(mode: 'hr' | 'any') {
    setBleError(null)
    if (!bleOk) {
      setBleError(isHebrew
        ? 'הדפדפן שלך לא תומך ב-Bluetooth. נסה Chrome ב-Android, Windows, או macOS.'
        : 'Bluetooth not supported. Use Chrome on Android, Windows, or macOS.')
      return
    }
    setConnecting(true)
    try {
      const { name } = await connectBLEHeartRate(mode)
      setBleDeviceName(name)
      setBleConnected(true)
      const now = new Date().toLocaleTimeString()
      const without = wState.savedDevices.filter(d => d.id !== 'watch')
      persist({ ...wState, savedDevices: [...without, { id: 'watch', name, connectedAt: now }] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // User cancelled = normal, don't show error
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('user')) {
        setBleError(isHebrew ? `שגיאה: ${msg}` : `Error: ${msg}`)
      }
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    await disconnectBLE()
    setBleConnected(false)
    setBleDeviceName('')
    setLiveBPM(0)
    persist({ ...wState, savedDevices: wState.savedDevices.filter(d => d.id !== 'watch') })
  }

  const hrZone = getHRZone(liveBPM, profile.age)
  const savedWatch = wState.savedDevices.find(d => d.id === 'watch')

  return (
    <div className="app-layout">
      <PageHeader title={`⌚ ${T('Connected Devices', 'מכשירים מחוברים')}`} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        {/* ── Platform banner ────────────────────────────────────────────── */}
        {platform.isIOS ? (
          <div className="wear-banner wear-banner-warn">
            <span className="wear-banner-icon">🍎</span>
            <div>
              <strong>{T('iPhone / iPad', 'iPhone / iPad')}</strong>
              <p>{T(
                'Web Bluetooth is blocked by Apple on iOS. To connect your Apple Watch or other wearables, you need to use a native app. This feature works on Android (Chrome) and macOS (Chrome).',
                'Apple חוסמת Bluetooth באינטרנט על iOS. כדי לחבר Apple Watch או שעון אחר, יש להשתמש באפליקציה נייטיב. פיצ׳ר זה עובד על Android (Chrome) ו-macOS (Chrome).'
              )}</p>
            </div>
          </div>
        ) : !bleOk ? (
          <div className="wear-banner wear-banner-warn">
            <span className="wear-banner-icon">⚠️</span>
            <div>
              <strong>{T('Browser not supported', 'הדפדפן אינו נתמך')}</strong>
              <p>{T(
                'Real Bluetooth requires Chrome or Edge. Firefox and Safari do not support Web Bluetooth.',
                'Bluetooth אמיתי דורש Chrome או Edge. Firefox ו-Safari אינם תומכים ב-Web Bluetooth.'
              )}</p>
            </div>
          </div>
        ) : (
          <div className="wear-banner wear-banner-ok">
            <span className="wear-banner-icon">✅</span>
            <p>{T(
              'Bluetooth available — you can connect a real smartwatch or heart rate monitor.',
              'Bluetooth זמין — ניתן לחבר שעון חכם אמיתי או חיישן דופק.'
            )}</p>
          </div>
        )}

        {/* ── Live HR card (when connected + reading) ───────────────────── */}
        {bleConnected && (
          <div className="wear-hr-live" style={{ borderColor: HR_ZONE_COLOR[hrZone] }}>
            <div className="wear-hr-left">
              <span className="wear-hr-pulse">❤️</span>
              <div>
                <p className="wear-hr-bpm" style={{ color: HR_ZONE_COLOR[hrZone] }}>
                  {liveBPM > 0 ? `${liveBPM} bpm` : T('Connected — waiting for reading…', 'מחובר — ממתין לנתונים…')}
                </p>
                <p className="wear-hr-zone">
                  {liveBPM > 0 && (isHebrew ? HR_ZONE_LABEL[hrZone].he : HR_ZONE_LABEL[hrZone].en)}
                  {bleDeviceName && <span className="wear-device-name"> · {bleDeviceName}</span>}
                </p>
              </div>
            </div>
            <button className="wear-disconnect-btn" onClick={handleDisconnect}>
              {T('Disconnect', 'נתק')}
            </button>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {bleError && (
          <div className="wear-banner wear-banner-error">
            <span className="wear-banner-icon">❌</span>
            <p>{bleError}</p>
          </div>
        )}

        {/* ── WATCH SECTION ─────────────────────────────────────────────── */}
        <div className="wear-section">
          <h2 className="wear-section-title">⌚ {T('Smartwatch / Heart Rate Monitor', 'שעון חכם / חיישן דופק')}</h2>

          {bleConnected && savedWatch ? (
            /* ── Already connected ── */
            <div className="wear-device-card wear-device-connected">
              <div className="wear-device-info">
                <span className="wear-device-icon">⌚</span>
                <div>
                  <strong>{savedWatch.name}</strong>
                  <small>{T('Connected', 'מחובר')} · {savedWatch.connectedAt}</small>
                </div>
              </div>
              <button className="wear-btn-danger" onClick={handleDisconnect}>
                {T('Disconnect', 'נתק')}
              </button>
            </div>
          ) : !bleOk || platform.isIOS ? (
            /* ── Not supported ── */
            <div className="wear-device-card wear-device-unavailable">
              <span className="wear-device-icon">🚫</span>
              <p>{T('Not available on this device/browser', 'לא זמין במכשיר/דפדפן זה')}</p>
            </div>
          ) : (
            /* ── Connect options ── */
            <>
              <div className="wear-connect-steps">
                <button className="wear-steps-toggle" onClick={() => setShowSteps(s => !s)}>
                  {T('📋 How to connect your watch', '📋 איך לחבר את השעון')}
                  <span>{showSteps ? '▲' : '▼'}</span>
                </button>
                {showSteps && (
                  <ol className="wear-steps-list">
                    <li>{T('Make sure Bluetooth is ON on your phone', 'וודא שהבלוטות׳ מופעל בטלפון')}</li>
                    <li>{T('On your watch: open Heart Rate app OR enable HR broadcast mode', 'בשעון: פתח אפליקציית דופק OR הפעל מצב שידור דופק')}</li>
                    <li>
                      {T('Apple Watch: ', 'Apple Watch: ')}
                      <em>{T('Settings → Privacy → Motion & Fitness → enable', 'הגדרות → פרטיות → תנועה וכושר → הפעל')}</em>
                    </li>
                    <li>
                      {T('Samsung Galaxy Watch: ', 'Samsung Galaxy Watch: ')}
                      <em>{T('Galaxy Wearable app → Watch settings → Bluetooth → make discoverable', 'אפליקציית Galaxy Wearable → הגדרות שעון → Bluetooth → הפוך לנגיש')}</em>
                    </li>
                    <li>{T('Click "Connect" below and pick your watch from the list', 'לחץ "חבר" ובחר את השעון מהרשימה')}</li>
                  </ol>
                )}
              </div>

              <div className="wear-connect-btns">
                <button
                  className={`wear-connect-main${connecting ? ' loading' : ''}`}
                  disabled={connecting}
                  onClick={() => handleConnect('hr')}
                >
                  {connecting
                    ? T('🔍 Searching…', '🔍 מחפש…')
                    : T('🔵 Connect Watch (Heart Rate)', '🔵 חבר שעון (דופק)')}
                </button>

                <button
                  className="wear-connect-alt"
                  disabled={connecting}
                  onClick={() => handleConnect('any')}
                >
                  {T('Show all nearby Bluetooth devices', 'הצג את כל מכשירי הבלוטות׳ הקרובים')}
                </button>
              </div>

              <p className="wear-compat-note">
                ✓ {T('Compatible: Samsung Galaxy Watch 4+, Polar H10, Garmin HRM, Apple Watch (macOS Chrome), Amazfit, Fitbit Sense', 'תואם: Samsung Galaxy Watch 4+, Polar H10, Garmin HRM, Apple Watch (macOS Chrome), Amazfit, Fitbit Sense')}
              </p>
            </>
          )}
        </div>

        {/* ── GPS LOCATION ──────────────────────────────────────────────── */}
        <div className="wear-section">
          <h2 className="wear-section-title">📍 {T('GPS Tracking', 'מעקב GPS')}</h2>
          <div className="wear-device-card wear-device-row">
            <div className="wear-device-info">
              <span className="wear-device-icon">📍</span>
              <div>
                <strong>{T('Location Access', 'גישה למיקום')}</strong>
                <small>{T('Used for outdoor workouts — measures distance & route', 'לאימונים בחוץ — מדידת מרחק ומסלול')}</small>
              </div>
            </div>
            <button
              className={`wear-toggle-btn${wState.locationEnabled ? ' on' : ''}`}
              onClick={async () => {
                if (!wState.locationEnabled) {
                  try {
                    await new Promise<void>((res, rej) => {
                      navigator.geolocation.getCurrentPosition(() => res(), rej)
                    })
                    persist({ ...wState, locationEnabled: true })
                  } catch {
                    setBleError(isHebrew ? 'לא ניתן לקבל גישה למיקום' : 'Location access denied')
                  }
                } else {
                  persist({ ...wState, locationEnabled: false })
                }
              }}
            >
              {wState.locationEnabled ? T('ON', 'פועל') : T('OFF', 'כבוי')}
            </button>
          </div>
        </div>

        {/* ── What's supported info ──────────────────────────────────────── */}
        <div className="wear-info-box">
          <p className="wear-info-title">ℹ️ {T('About smartwatch connectivity', 'על חיבור שעונים חכמים')}</p>
          <ul className="wear-info-list">
            <li>✅ Android + Chrome → {T('Full BLE support', 'תמיכה מלאה ב-BLE')}</li>
            <li>✅ macOS + Chrome → {T('Supports Apple Watch, Polar, Garmin', 'תומך Apple Watch, Polar, Garmin')}</li>
            <li>✅ Windows + Chrome/Edge → {T('Supports most BLE HR monitors', 'תומך ברוב חיישני דופק BLE')}</li>
            <li>❌ iPhone / iPad → {T('Blocked by Apple — native app required', 'חסום על ידי Apple — דרושה אפליקציה')}</li>
            <li>❌ Firefox / Safari → {T('Web Bluetooth not supported', 'Web Bluetooth לא נתמך')}</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
