import SignupForm from '../components/auth/SignupForm'

export default function SignupPage() {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">Smart<span>Fit</span></span>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
