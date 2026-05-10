import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'
import { useUser } from '../../context/UserContext'

export default function SignupForm() {
  const { signUp } = useAuth()
  const { resetUserData } = useUser()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

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
          placeholder="At least 6 characters"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
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
