import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { readJson, removeJson, writeJson } from '../lib/storage'

interface User {
  id: string
  email: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MOCK_STORAGE_KEY = 'smartfit_mock_user'

function isMockUser(value: unknown): value is User {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as User).id === 'string' &&
      typeof (value as User).email === 'string',
  )
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function mockSignIn(email: string, password: string): { error: string | null; user: User | null } {
  if (!email || !password) return { error: 'Email and password are required', user: null }
  if (!isValidEmail(email)) return { error: 'Invalid email address', user: null }
  if (password.length < 6) return { error: 'Password must be at least 6 characters', user: null }
  const user: User = { id: `mock-${btoa(email)}`, email }
  writeJson(MOCK_STORAGE_KEY, user)
  return { error: null, user }
}

function mockSignUp(email: string, password: string): { error: string | null; user: User | null } {
  if (!email || !password) return { error: 'Email and password are required', user: null }
  if (password.length < 6) return { error: 'Password must be at least 6 characters', user: null }
  if (!isValidEmail(email)) return { error: 'Invalid email address', user: null }
  const user: User = { id: `mock-${btoa(email)}`, email }
  writeJson(MOCK_STORAGE_KEY, user)
  return { error: null, user }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = readJson<unknown>(MOCK_STORAGE_KEY, null)
    setUser(isMockUser(stored) ? stored : null)
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    const result = mockSignIn(email, password)
    if (result.user) setUser(result.user)
    return { error: result.error }
  }

  const signUp = async (email: string, password: string) => {
    const result = mockSignUp(email, password)
    if (result.user) setUser(result.user)
    return { error: result.error }
  }

  const signOut = async () => {
    removeJson(MOCK_STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
