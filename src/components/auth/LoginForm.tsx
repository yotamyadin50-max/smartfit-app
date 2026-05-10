import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'

export default function LoginForm() {
  const { signIn } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email.trim(), password)

    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="auth-heading">{t('authWelcome')}</h1>
      <p className="auth-subheading">{t('authWelcomeSub')}</p>

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
          placeholder="••••••••"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? t('signingIn') : t('signIn')}
      </button>

      <p className="auth-footer">
        {t('noAccount')} <Link to="/signup">{t('createOne')}</Link>
      </p>
    </form>
  )
}
