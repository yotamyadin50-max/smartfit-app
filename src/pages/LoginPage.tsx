import LoginForm from '../components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">Smart<span>Fit</span></span>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
