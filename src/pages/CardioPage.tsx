import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { useUser } from '../context/UserContext'
import {
  startLocationTracker,
  type LocationTrackerHandle,
  type LocationTrackerStatus,
} from '../locationTracker'
import {
  estimateCardioCalories,
  formatPace,
  type CardioActivityType,
} from '../fitnessTracking'
import {
  getCurrentHR,
  onHeartRate,
  isHRConnected,
  getHRZone,
  HR_ZONE_COLOR,
  HR_ZONE_LABEL,
} from '../lib/heartRate'
import { saveCardioSession } from '../progressStorage'

const ACTIVITIES: { type: CardioActivityType; emoji: string; labelHe: string; labelEn: string }[] = [
  { type: 'run',  emoji: '🏃', labelHe: 'ריצה',   labelEn: 'Run'  },
  { type: 'walk', emoji: '🚶', labelHe: 'הליכה',  labelEn: 'Walk' },
  { type: 'bike', emoji: '🚴', labelHe: 'אופניים', labelEn: 'Bike' },
]

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

type SessionState = 'idle' | 'running' | 'paused' | 'done'

export default function CardioPage() {
  const { isHebrew } = useI18n()
  const { profile, addXP } = useUser()
  const navigate = useNavigate()

  const [activity, setActivity] = useState<CardioActivityType>('run')
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [elapsed, setElapsed] = useState(0)          // seconds
  const [distanceKm, setDistanceKm] = useState(0)
  const [bpm, setBpm] = useState(getCurrentHR())
  const [gpsStatus, setGpsStatus] = useState<LocationTrackerStatus>('idle')
  const [saved, setSaved] = useState(false)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const locationRef = useRef<LocationTrackerHandle | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedSecondsRef = useRef<number>(0)

  // HR subscription
  useEffect(() => {
    if (!isHRConnected()) return
    const unsub = onHeartRate(b => setBpm(b))
    return unsub
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopGps = useCallback(() => {
    locationRef.current?.stop()
    locationRef.current = null
  }, [])

  const startSession = () => {
    setSaved(false)
    startTimeRef.current = Date.now() - pausedSecondsRef.current * 1000

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)

    locationRef.current = startLocationTracker({
      onDistanceChange: km => setDistanceKm(km),
      onStatusChange:   s  => setGpsStatus(s),
    })

    setSessionState('running')
  }

  const pauseSession = () => {
    stopTimer()
    stopGps()
    pausedSecondsRef.current = elapsed
    setSessionState('paused')
  }

  const finishSession = () => {
    stopTimer()
    stopGps()
    setSessionState('done')
  }

  const resetSession = () => {
    stopTimer()
    stopGps()
    setElapsed(0)
    setDistanceKm(0)
    pausedSecondsRef.current = 0
    setGpsStatus('idle')
    setSaved(false)
    setSessionState('idle')
  }

  const saveSession = () => {
    const durationMin = Math.round(elapsed / 60)
    const weightKg = profile.weightKg ?? 70
    const calories = estimateCardioCalories({
      activityType: activity,
      distanceKm,
      durationMinutes: durationMin,
      weightKg,
    })
    saveCardioSession({
      type: activity,
      duration: durationMin,
      distanceKm: distanceKm > 0 ? distanceKm : undefined,
      calories,
      feeling: bpm > 0 ? getHRZone(bpm, profile.age) : undefined,
    })
    addXP(10)
    setSaved(true)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      stopGps()
    }
  }, [stopTimer, stopGps])

  const durationMin   = elapsed / 60
  const calories      = estimateCardioCalories({ activityType: activity, distanceKm, durationMinutes: durationMin, weightKg: profile.weightKg ?? 70 })
  const paceStr       = formatPace(durationMin, distanceKm, isHebrew ? 'he' : 'en')
  const hrZone        = getHRZone(bpm, profile.age)
  const hrColor       = HR_ZONE_COLOR[hrZone]
  const hrLabel       = HR_ZONE_LABEL[hrZone][isHebrew ? 'he' : 'en']
  const hrConnected   = isHRConnected()
  const isRunning     = sessionState === 'running'
  const isDone        = sessionState === 'done'
  const isPaused      = sessionState === 'paused'
  const isIdle        = sessionState === 'idle'

  return (
    <div className="app-layout" style={{ padding: '16px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-primary)' }}
          aria-label="back"
        >
          ←
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          {isHebrew ? '🏃 אימון קרדיו' : '🏃 Cardio Session'}
        </h1>
      </div>

      {/* Activity Picker */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {ACTIVITIES.map(a => (
          <button
            key={a.type}
            onClick={() => { if (isIdle) setActivity(a.type) }}
            disabled={!isIdle}
            style={{
              flex: 1,
              padding: '12px 8px',
              borderRadius: 12,
              border: activity === a.type ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: activity === a.type ? 'rgba(168,85,247,0.15)' : 'var(--bg-card)',
              color: activity === a.type ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: isIdle ? 'pointer' : 'default',
              transition: 'all 0.15s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 26 }}>{a.emoji}</span>
            {isHebrew ? a.labelHe : a.labelEn}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div style={{
        textAlign: 'center',
        background: 'var(--bg-card)',
        borderRadius: 20,
        padding: '28px 16px',
        marginBottom: 20,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          fontSize: 64,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-2px',
          color: isRunning ? 'var(--accent)' : 'var(--text-primary)',
          transition: 'color 0.3s',
        }}>
          {formatDuration(elapsed)}
        </div>
        {gpsStatus === 'requesting' && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            {isHebrew ? '📍 מאתר GPS...' : '📍 Locating GPS...'}
          </div>
        )}
        {gpsStatus === 'denied' && (
          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
            {isHebrew ? '📍 GPS לא אושר' : '📍 GPS access denied'}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {/* Distance */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {isHebrew ? 'מרחק' : 'Distance'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#22c55e' }}>
            {distanceKm.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {isHebrew ? 'ק״מ' : 'km'}
          </div>
        </div>

        {/* Pace */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {isHebrew ? 'קצב' : 'Pace'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa', lineHeight: 1.2 }}>
            {paceStr}
          </div>
        </div>

        {/* Calories */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {isHebrew ? 'קלוריות' : 'Calories'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#f97316' }}>
            {calories > 0 ? calories : '--'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>kcal</div>
        </div>

        {/* HR Zone */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {isHebrew ? 'דופק' : 'Heart Rate'}
          </div>
          {hrConnected && bpm > 0 ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 700, color: hrColor }}>
                {bpm}
              </div>
              <div style={{ fontSize: 11, color: hrColor, fontWeight: 600 }}>
                {hrLabel}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', paddingTop: 6 }}>
              {hrConnected ? '...' : (isHebrew ? 'לא מחובר' : 'Not connected')}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {isIdle && (
          <button
            onClick={startSession}
            style={{
              flex: 1,
              padding: '16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isHebrew ? '▶ התחל' : '▶ Start'}
          </button>
        )}

        {isRunning && (
          <>
            <button
              onClick={pauseSession}
              style={{
                flex: 1,
                padding: '16px',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isHebrew ? '⏸ השהה' : '⏸ Pause'}
            </button>
            <button
              onClick={finishSession}
              style={{
                flex: 1,
                padding: '16px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isHebrew ? '⏹ סיים' : '⏹ Finish'}
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={startSession}
              style={{
                flex: 1,
                padding: '16px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isHebrew ? '▶ המשך' : '▶ Resume'}
            </button>
            <button
              onClick={finishSession}
              style={{
                flex: 1,
                padding: '16px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isHebrew ? '⏹ סיים' : '⏹ Finish'}
            </button>
          </>
        )}

        {isDone && (
          <>
            {!saved ? (
              <button
                onClick={saveSession}
                style={{
                  flex: 2,
                  padding: '16px',
                  background: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isHebrew ? '💾 שמור אימון' : '💾 Save Session'}
              </button>
            ) : (
              <div style={{
                flex: 2,
                padding: '16px',
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid #22c55e',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: '#22c55e',
                textAlign: 'center',
              }}>
                {isHebrew ? '✓ נשמר! +10 XP' : '✓ Saved! +10 XP'}
              </div>
            )}
            <button
              onClick={resetSession}
              style={{
                flex: 1,
                padding: '16px',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isHebrew ? '🔄 חדש' : '🔄 New'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
