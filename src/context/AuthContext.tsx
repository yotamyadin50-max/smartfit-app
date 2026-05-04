import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

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

function mockSignIn(email: string, password: string): { error: string | null; user: User | null } {
  if (!email || !password) return { error: 'Email and password are required', user: null }
  if (password.length < 6) return { error: 'Password must be at least 6 characters', user: null }
  const user: User = { id: `mock-${btoa(email)}`, email }
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user))
  return { error: null, user }
}

function mockSignUp(email: string, password: string): { error: string | null; user: User | null } {
  if (!email || !password) return { error: 'Email and password are required', user: null }
  if (password.length < 6) return { error: 'Password must be at least 6 characters', user: null }
  if (!email.includes('@')) return { error: 'Invalid email address', user: null }
  const user: User = { id: `mock-${btoa(email)}`, email }
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user))
  return { error: null, user }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (supabase) {
      // --- Supabase auth ---
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
        }
        setLoading(false)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ? { id: session.user.id, email: session.user.email! } : null)
      })
      return () => subscription.unsubscribe()
    } else {
      // --- Mock auth (no Supabase configured) ---
      const stored = localStorage.getItem(MOCK_STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored))
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    }
    const result = mockSignIn(email, password)
    if (result.user) setUser(result.user)
    return { error: result.error }
  }

  const signUp = async (email: string, password: string) => {
    if (supabase) {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error?.message ?? null }
    }
    const result = mockSignUp(email, password)
    if (result.user) setUser(result.user)
    return { error: result.error }
  }

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem(MOCK_STORAGE_KEY)
      setUser(null)
    }
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
