import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'
import { useUser } from '../../context/UserContext'

export default function SignupForm() {
  const { signUp } = useAuth()
  const { resetUserData } = useUser()
  const { t, isHebrew } = useI18n()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Password strength: min 8 chars, at least 1 digit or special char
  const passwordStrength = (() => {
    if (password.length === 0) return 0
    let score = 0
    if (password.length >= 8)  score++
    if (password.length >= 12) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    return Math.min(score, 4)
  })()

  const strengthLabel = ['', 'חלשה', 'בינונית', 'טובה', 'חזקה']
  const strengthLabelEn = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e']

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(isHebrew
        ? 'הסיסמה חייבת להכיל לפחות 8 תווים'
        : 'Password must be at least 8 characters')
      return
    }
    if (!/[0-9]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) {
      setError(isHebrew
        ? 'הסיסמה חייבת להכיל לפחות ספרה אחת או תו מיוחד'
        : 'Password must contain at least one number or special character')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await signUp(email.trim(), password)
    setLoading(false)

    if (error) {
      setError(error)
      return
    }

    resetUserData()
    navigate('/onboarding')
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="auth-heading">{t('authCreate')}</h1>
      <p className="auth-subheading">{t('authCreateSub')}</p>

      {error && <div className="error-banner">{error}</div>}

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
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">{t('password')}</label>
        <input
          id="password"
          type="password"
          className={`form-input${error ? ' error' : ''}`}
          placeholder="At least 8 characters"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        {password.length > 0 && (
          <div className="password-strength-wrap">
            <div className="password-strength-bar">
              {[1,2,3,4].map(n => (
                <div
                  key={n}
                  className="password-strength-seg"
                  style={{ background: n <= passwordStrength ? strengthColor[passwordStrength] : 'var(--border)' }}
                />
              ))}
            </div>
            <span className="password-strength-label" style={{ color: strengthColor[passwordStrength] }}>
              {isHebrew ? strengthLabel[passwordStrength] : strengthLabelEn[passwordStrength]}
            </span>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="confirm">{t('confirmPassword')}</label>
        <input
          id="confirm"
          type="password"
          className={`form-input${error ? ' error' : ''}`}
          placeholder="••••••••"
          value={confirm}
          onChange={event => setConfirm(event.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? t('creatingAccount') : t('createAccount')}
      </button>

      <p className="auth-footer">
        {t('haveAccount')} <Link to="/login">{t('signIn')}</Link>
      </p>
    </form>
  )
}
