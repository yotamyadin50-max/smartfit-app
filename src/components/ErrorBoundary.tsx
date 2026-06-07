import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100dvh',
          background: 'var(--bg, #070c18)', color: 'var(--text-primary, #eef2ff)',
          padding: '24px', textAlign: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            משהו השתבש
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            רענן את האפליקציה כדי להמשיך
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '12px 28px',
              borderRadius: 12, border: 'none',
              background: '#6366f1', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            רענן
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
