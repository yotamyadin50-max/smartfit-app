import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'

const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30
const STORAGE_KEY = 'smartfit_login_attempts'

interface AttemptData {
  count: number
  lockedUntil: number | null
}

function getAttempts(): AttemptData {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { count: 0, lockedUntil: null }
    return JSON.parse(raw) as AttemptData
  } catch {
    return { count: 0, lockedUntil: null }
  }
}

function saveAttempts(data: AttemptData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function clearAttempts() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export default function LoginForm() {
  const { signIn } = useAuth()
  const { t, isHebrew } = useI18n()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Resume countdown if there's an active lockout on mount
  useEffect(() => {
    const data = getAttempts()
    if (data.lockedUntil && data.lockedUntil > Date.now()) {
      startCountdown(data.lockedUntil)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startCountdown(until: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    const tick = () => {
      const remaining = Math.ceil((until - Date.now()) / 1000)
      if (remaining <= 0) {
        setCountdown(0)
        clearAttempts()
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setCountdown(remaining)
      }
    }
    tick()
    timerRef.current = setInterval(tick, 500)
  }

  const isLocked = countdown > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isLocked) return

    const data = getAttempts()
    // Double-check lockout (e.g. two tabs)
    if (data.lockedUntil && data.lockedUntil > Date.now()) {
      startCountdown(data.lockedUntil)
      return
    }

    setError(null)
    setLoading(true)

    const { error: signInError } = await signIn(email.trim(), password)

    setLoading(false)

    if (signInError) {
      const newCount = data.count + 1
      if (newCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000
        saveAttempts({ count: newCount, lockedUntil: until })
        startCountdown(until)
        setError(
          isHebrew
            ? `יותר מדי ניסיונות. נסה שוב בעוד ${LOCKOUT_SECONDS} שניות.`
            : `Too many attempts. Try again in ${LOCKOUT_SECONDS} seconds.`
        )
      } else {
        saveAttempts({ count: newCount, lockedUntil: null })
        const left = MAX_ATTEMPTS - newCount
        setError(
          isHebrew
            ? `${signInError} (נותרו ${left} ניסיונות)`
            : `${signInError} (${left} attempt${left === 1 ? '' : 's'} left)`
        )
      }
      return
    }

    clearAttempts()
    navigate('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="auth-heading">{t('authWelcome')}</h1>
      <p className="auth-subheading">{t('authWelcomeSub')}</p>

      {error && <div className="error-banner">{error}</div>}

      {isLocked && (
        <div className="lockout-banner">
          {isHebrew
            ? `הטופס נעול. נסה שוב בעוד ${countdown} שניות.`
            : `Form locked. Try again in ${countdown}s.`}
          <div className="lockout-bar">
            <div
              className="lockout-bar-fill"
              style={{ width: `${(countdown / LOCKOUT_SECONDS) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="email">{t('email')}</label>
        <input
          id="email"
          type="email"
          className={`form-input${error ? ' error' : ''}`}
          placeholder="you@example.com"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="email"
          disabled={isLocked}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">{t('password')}</label>
        <input
          id="password"
          type="password"
          className={`form-input${error ? ' error' : ''}`}
          placeholder="••••••••"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={isLocked}
          required
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading || isLocked}>
        {isLocked
          ? (isHebrew ? `נעול (${countdown}s)` : `Locked (${countdown}s)`)
          : loading
            ? t('signingIn')
            : t('signIn')}
      </button>

      <p className="auth-footer">
        {t('noAccount')} <Link to="/signup">{t('createOne')}</Link>
      </p>
    </form>
  )
}
