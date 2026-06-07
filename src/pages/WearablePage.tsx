import PageHeader from '../components/layout/PageHeader'
import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { saveAppAccess } from '../lib/appAccess'

import {
  disconnectScale,
  getConnectedScale,
  getConnectedWatch,
  getLatestWeight,
  getWeightHistory,
  saveConnectedScale,
  saveManualWeight,
} from '../deviceConnections'
import { readJson, writeJson } from '../lib/storage'
import {
  canReconnectBLEHeartRate,
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
  reconnectBLEHeartRate,
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
  const [waitingTimeout, setWaitingTimeout] = useState(false)
  const [scaleConnected, setScaleConnected] = useState(() => getConnectedScale().connected)
  const [latestWeight, setLatestWeight] = useState(() => getLatestWeight(profile.weightKg))
  const [manualWeight, setManualWeight] = useState(() => {
    const weight = getLatestWeight(profile.weightKg)
    return typeof weight === 'number' ? String(weight) : ''
  })

  // Always subscribe — reads from singleton so no stale closure
  useEffect(() => {
    const unsub = onHeartRate(bpm => {
      setLiveBPM(bpm)
      setBleConnected(isHRConnected())
      setBleDeviceName(getConnectedDeviceName())
    })
    return unsub
  }, [])

  // Sync state from singleton on mount (device may already be connected)
  useEffect(() => {
    const storedWatch = getConnectedWatch()
    const currentDeviceName = getConnectedDeviceName()
    setBleConnected(isHRConnected())
    setBleDeviceName(currentDeviceName || storedWatch.deviceName || '')
    setLiveBPM(getCurrentHR())
    setScaleConnected(getConnectedScale().connected)
    setLatestWeight(getLatestWeight(profile.weightKg))

    if (storedWatch.deviceName && (storedWatch.autoReconnect || storedWatch.remembered)) {
      const hasSavedWatch = wState.savedDevices.some(d => d.id === 'watch')
      if (!hasSavedWatch) {
        persist({
          ...wState,
          savedDevices: [
            ...wState.savedDevices,
            {
              id: 'watch',
              name: storedWatch.deviceName,
              connectedAt: storedWatch.lastSync ?? storedWatch.lastSeen ?? '',
            },
          ],
        })
      }

      if (!isHRConnected()) {
        void tryReconnectSavedWatch(false)
      }
    }
  }, [])

  // 30s timeout: if connected but no reading, show hint
  useEffect(() => {
    if (!bleConnected || liveBPM > 0) { setWaitingTimeout(false); return }
    const t = setTimeout(() => setWaitingTimeout(true), 30_000)
    return () => clearTimeout(t)
  }, [bleConnected, liveBPM])

  const T = (en: string, he: string) => isHebrew ? he : en

  const platform = detectPlatform()
  const bleOk = isBLESupported()

  function persist(next: WearableState) {
    setWState(next)
    saveState(next)
    const savedWatch = next.savedDevices.find(d => d.id === 'watch')
    const savedScaleDevice = next.savedDevices.find(d => d.id === 'scale')
    const hasWatch = Boolean(savedWatch)
    const hasScale = Boolean(savedScaleDevice) || getConnectedScale().connected
    if (savedWatch) {
      saveAppAccess('smartWatch', {
        status: 'granted',
        source: 'device',
        deviceName: savedWatch.name,
        remember: true,
        note: 'wearable-page-saved-watch',
      })
      saveAppAccess('bluetooth', {
        status: 'granted',
        source: 'device',
        deviceName: savedWatch.name,
        remember: true,
        note: 'wearable-page-saved-watch',
      })
    }
    if (hasScale) {
      saveAppAccess('smartScale', {
        status: 'granted',
        source: 'device',
        deviceName: savedScaleDevice?.name ?? getConnectedScale().deviceName,
        remember: true,
        note: 'wearable-page-saved-scale',
      })
    }
    saveAppAccess('location', {
      status: next.locationEnabled ? 'granted' : 'disabled',
      source: 'manual',
      remember: next.locationEnabled,
      note: next.locationEnabled ? 'location-enabled-in-app' : 'location-disabled-in-app',
    })
    updateProfile({
      devices: {
        ...profile.devices,
        smartWatch: hasWatch,
        smartScale: hasScale,
        cardioLocation: next.locationEnabled,
      },
    })
  }

  // ── Real BLE connect ────────────────────────────────────────────────────────
  async function handleConnect(mode: 'hr' | 'any') {
    setBleError(null)
    if (!bleOk) {
      saveAppAccess('bluetooth', {
        status: 'unavailable',
        source: 'browser',
        remember: false,
        note: 'web-bluetooth-unavailable',
      })
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

  async function tryReconnectSavedWatch(showError = true) {
    const storedWatch = getConnectedWatch()
    const watchName = storedWatch.deviceName || bleDeviceName
    if (!watchName || !storedWatch.autoReconnect) return

    if (!bleOk || platform.isIOS) {
      if (showError) {
        setBleError(T(
          'Saved watch exists, but Bluetooth is not available on this device.',
          'השעון שמור, אבל Bluetooth לא זמין במכשיר הזה.',
        ))
      }
      return
    }

    if (!canReconnectBLEHeartRate()) {
      if (showError) {
        setBleError(T(
          'The watch is saved. For security, the browser may require choosing it once again before automatic reconnect works.',
          'השעון שמור. מטעמי אבטחה, הדפדפן עשוי לדרוש לבחור אותו שוב פעם אחת לפני חיבור אוטומטי.',
        ))
      }
      return
    }

    setConnecting(true)
    setBleError(null)
    try {
      const { name } = await reconnectBLEHeartRate()
      setBleDeviceName(name)
      setBleConnected(true)
      const now = new Date().toLocaleTimeString()
      const without = wState.savedDevices.filter(d => d.id !== 'watch')
      persist({ ...wState, savedDevices: [...without, { id: 'watch', name, connectedAt: now }] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log('Ascend AI watch reconnect failed', { message: msg })
      if (showError) {
        setBleError(T(
          'Could not reconnect automatically. Choose the watch again and Ascend AI will remember it.',
          'לא ניתן להתחבר אוטומטית כרגע. בחר את השעון שוב ו-Ascend AI יזכור אותו.',
        ))
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

  function handleConnectScale() {
    const name = T('Smart Scale - manual sync', 'משקל חכם - סנכרון ידני')
    const now = new Date().toLocaleTimeString()
    const without = wState.savedDevices.filter(d => d.id !== 'scale')
    saveConnectedScale({ connected: true, deviceName: name, provider: 'scale' })
    setScaleConnected(true)
    persist({ ...wState, savedDevices: [...without, { id: 'scale', name, connectedAt: now }] })
  }

  function handleDisconnectScale() {
    disconnectScale()
    setScaleConnected(false)
    persist({ ...wState, savedDevices: wState.savedDevices.filter(d => d.id !== 'scale') })
  }

  function handleSaveWeight() {
    const value = Number(manualWeight)
    const entry = saveManualWeight(value, { keepScaleConnected: scaleConnected })
    if (!entry) {
      setBleError(isHebrew ? 'הכנס משקל תקין בין 25 ל-250 ק״ג' : 'Enter a valid weight between 25 and 250 kg')
      return
    }

    setBleError(null)
    setLatestWeight(entry.weight)
    if (scaleConnected) {
      saveConnectedScale({
        connected: true,
        deviceName: savedScale?.name ?? T('Smart Scale - manual sync', 'משקל חכם - סנכרון ידני'),
        provider: 'scale',
      })
    }
    updateProfile({
      weightKg: entry.weight,
      devices: {
        ...profile.devices,
        smartScale: scaleConnected,
      },
    })
  }

  async function handleToggleLocation() {
    if (!wState.locationEnabled) {
      if (!navigator.geolocation) {
        saveAppAccess('location', {
          status: 'unavailable',
          source: 'browser',
          remember: false,
          note: 'geolocation-unavailable',
        })
        setBleError(isHebrew ? 'המכשיר לא תומך בגישה למיקום' : 'Location is not available on this device')
        return
      }

      try {
        await new Promise<void>((res, rej) => {
          navigator.geolocation.getCurrentPosition(() => res(), rej, {
            enableHighAccuracy: true,
            timeout: 12000,
          })
        })
        setBleError(null)
        saveAppAccess('location', {
          status: 'granted',
          source: 'browser',
          remember: true,
          note: 'location-approved-from-wearable-page',
        })
        persist({ ...wState, locationEnabled: true })
      } catch {
        saveAppAccess('location', {
          status: 'denied',
          source: 'browser',
          remember: false,
          note: 'location-denied-from-wearable-page',
        })
        setBleError(isHebrew ? 'לא ניתן לקבל גישה למיקום' : 'Location access denied')
      }
      return
    }

    persist({ ...wState, locationEnabled: false })
  }

  const hrZone = getHRZone(liveBPM, profile.age)
  const storedWatch = getConnectedWatch()
  const savedWatch = wState.savedDevices.find(d => d.id === 'watch')
  const rememberedWatchName = savedWatch?.name ?? storedWatch.deviceName
  const showRememberedWatch = !bleConnected && Boolean(rememberedWatchName) && (
    storedWatch.autoReconnect || storedWatch.remembered || Boolean(savedWatch)
  )
  const savedScale = wState.savedDevices.find(d => d.id === 'scale')
  const weightHistoryCount = getWeightHistory().length

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
                {waitingTimeout && liveBPM === 0 && (
                  <p style={{ fontSize: 12, color: '#f97316', marginTop: 4 }}>
                    {T(
                      '⚠️ No reading yet — make sure your watch is in workout mode or HR broadcast is on.',
                      '⚠️ עדיין אין נתונים — וודא שהשעון במצב אימון או שידור דופק מופעל.'
                    )}
                  </p>
                )}
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

          {bleConnected && (savedWatch || rememberedWatchName) ? (
            /* ── Already connected ── */
            <div className="wear-device-card wear-device-connected">
              <div className="wear-device-info">
                <span className="wear-device-icon">⌚</span>
                <div>
                  <strong>{savedWatch?.name ?? rememberedWatchName}</strong>
                  <small>{T('Connected', 'מחובר')} · {savedWatch?.connectedAt ?? storedWatch.lastSync ?? ''}</small>
                </div>
              </div>
              <button className="wear-btn-danger" onClick={handleDisconnect}>
                {T('Disconnect', 'נתק')}
              </button>
            </div>
          ) : showRememberedWatch && bleOk && !platform.isIOS ? (
            <div className="wear-device-card">
              <div className="wear-device-info">
                <span className="wear-device-icon">⌚</span>
                <div>
                  <strong>{rememberedWatchName}</strong>
                  <small>{T(
                    'Saved - Ascend AI will reconnect when the watch is available.',
                    'שמור - Ascend AI יתחבר מחדש כשהשעון יהיה זמין.',
                  )}</small>
                </div>
              </div>
              <div className="wear-connect-btns">
                <button
                  className={`wear-connect-alt${connecting ? ' loading' : ''}`}
                  disabled={connecting}
                  onClick={() => tryReconnectSavedWatch(true)}
                >
                  {connecting ? T('Reconnecting...', 'מתחבר מחדש...') : T('Reconnect', 'חבר מחדש')}
                </button>
                <button
                  className="wear-connect-alt"
                  disabled={connecting}
                  onClick={() => handleConnect('hr')}
                >
                  {T('Choose watch again', 'בחר שעון שוב')}
                </button>
                <button className="wear-btn-danger" onClick={handleDisconnect}>
                  {T('Forget', 'שכח')}
                </button>
              </div>
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
                      <em>{T(
                        'Start a workout on the watch OR open Samsung Health → Settings → Heart Rate → set to "Always"',
                        'התחל אימון בשעון, או Samsung Health → הגדרות → דופק → הגדר ל"תמיד"'
                      )}</em>
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

        {/* ── SMART SCALE ───────────────────────────────────────────────────── */}
        <div className="wear-section">
          <h2 className="wear-section-title">⚖️ {T('Smart Scale / Weight Sync', 'משקל חכם / סנכרון משקל')}</h2>
          <div className={`wear-device-card${scaleConnected ? ' wear-device-connected' : ''}`}>
            <div className="wear-device-row">
              <div className="wear-device-info">
                <span className="wear-device-icon">⚖️</span>
                <div>
                  <strong>{savedScale?.name ?? T('Smart Scale', 'משקל חכם')}</strong>
                  <small>
                    {scaleConnected
                      ? `${T('Connected', 'מחובר')} · ${savedScale?.connectedAt ?? getConnectedScale().lastSync ?? ''}`
                      : T('Not connected — you can enter data manually', 'לא מחובר — ניתן להזין נתונים ידנית')}
                  </small>
                </div>
              </div>
              <button
                className={scaleConnected ? 'wear-btn-danger' : 'wear-connect-alt'}
                onClick={scaleConnected ? handleDisconnectScale : handleConnectScale}
              >
                {scaleConnected ? T('Disconnect', 'נתק') : T('Enable', 'הפעל')}
              </button>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">
                {T('Latest weight', 'משקל אחרון')}
                {typeof latestWeight === 'number' ? ` · ${latestWeight} kg` : ''}
              </label>
              <input
                className="form-input"
                inputMode="decimal"
                max="250"
                min="25"
                placeholder={T('Enter weight in kg', 'הכנס משקל בק״ג')}
                type="number"
                value={manualWeight}
                onChange={event => setManualWeight(event.target.value)}
              />
              <button className="btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={handleSaveWeight}>
                {T('Save weight', 'שמור משקל')}
              </button>
              <p className="wear-compat-note">
                {T(
                  `Saved entries: ${weightHistoryCount}. Generic browser apps cannot read most scales directly, so Ascend AI keeps a clean manual sync path.`,
                  `רשומות שמורות: ${weightHistoryCount}. אפליקציות דפדפן בדרך כלל לא יכולות לקרוא משקלים ישירות, לכן Ascend AI שומר מסלול סנכרון ידני נקי.`
                )}
              </p>
            </div>
          </div>
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
              onClick={handleToggleLocation}
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
