import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

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
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured) {
      setError(isHebrew ? 'חיבור Google אינו זמין במצב זה.' : 'Google sign-in is not available in this mode.')
      return
    }
    setGoogleLoading(true)
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (oauthError) {
      setError(isHebrew ? 'כניסה עם Google נכשלה. נסה שוב.' : 'Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
    // On success the page redirects, so no need to setGoogleLoading(false)
  }

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

      <div className="auth-divider">
        <span>{isHebrew ? 'או' : 'or'}</span>
      </div>

      <button
        type="button"
        className="btn-google"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || isLocked}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        {googleLoading
          ? (isHebrew ? 'מתחבר...' : 'Connecting...')
          : (isHebrew ? 'המשך עם Google' : 'Continue with Google')}
      </button>

      <p className="auth-footer">
        {t('noAccount')} <Link to="/signup">{t('createOne')}</Link>
      </p>
    </form>
  )
}
