import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { readJson, removeJson, writeJson } from '../lib/storage'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  id: string
  email: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>
  signUp:  (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Persistent device session ─────────────────────────────────────────────────
// Stores the last known user in localStorage so the app opens instantly
// without waiting for Supabase. Supabase then verifies in the background.

const CACHED_USER_KEY = 'smartfit_cached_user'

function getCachedUser(): User | null {
  try {
    const v = localStorage.getItem(CACHED_USER_KEY)
    if (!v) return null
    const parsed = JSON.parse(v)
    if (typeof parsed?.id === 'string' && typeof parsed?.email === 'string') return parsed
    return null
  } catch { return null }
}

function setCachedUser(user: User | null) {
  if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(CACHED_USER_KEY)
}

// ── Mock fallback (used when Supabase is not configured) ──────────────────────

const MOCK_KEY = 'smartfit_mock_user'

function isMockUser(v: unknown): v is User {
  return Boolean(v && typeof v === 'object' && typeof (v as User).id === 'string' && typeof (v as User).email === 'string')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function mockSignIn(email: string, password: string) {
  if (!email || !password) return { error: 'Email and password are required', user: null }
  if (!isValidEmail(email))  return { error: 'Invalid email address', user: null }
  if (password.length < 6)   return { error: 'Password must be at least 6 characters', user: null }
  const user: User = { id: `mock-${btoa(email)}`, email }
  writeJson(MOCK_KEY, user)
  return { error: null, user }
}

function mockSignUp(email: string, password: string) {
  if (!email || !password) return { error: 'Email and password are required', user: null }
  if (!isValidEmail(email))  return { error: 'Invalid email address', user: null }
  if (password.length < 6)   return { error: 'Password must be at least 6 characters', user: null }
  const user: User = { id: `mock-${btoa(email)}`, email }
  writeJson(MOCK_KEY, user)
  return { error: null, user }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise immediately from cache → no loading screen for returning users
  const [user, setUserState] = useState<User | null>(() => getCachedUser())
  const [loading, setLoading] = useState(() => getCachedUser() === null)

  const setUser = (u: User | null) => {
    setUserState(u)
    setCachedUser(u)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // ── Mock mode ─────────────────────────────────────────────────────────
      const stored = readJson<unknown>(MOCK_KEY, null)
      const mockUser = isMockUser(stored) ? stored : null
      setUser(mockUser)
      setLoading(false)
      return
    }

    // ── Supabase mode ─────────────────────────────────────────────────────────
    // Verify session in background (user already sees the app from cache)
    let settled = false
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true
        console.warn('[Auth] getSession timed out — keeping cached user')
        setLoading(false)
      }
    }, 8000)

    supabase.auth.getSession().then(({ data }) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      const session = data.session
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
      } else {
        // Session expired — clear cache and send to login
        setUser(null)
      }
      setLoading(false)
    }).catch(() => {
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        setLoading(false)
      }
    })

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
      } else {
        setUser(null)
      }
    })

    return () => {
      settled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  // ── signIn ────────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const result = mockSignIn(email, password)
      if (result.user) setUser(result.user)
      return { error: result.error }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    if (data.user) setUser({ id: data.user.id, email: data.user.email ?? '' })
    return { error: null }
  }

  // ── signUp ────────────────────────────────────────────────────────────────

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const result = mockSignUp(email, password)
      if (result.user) setUser(result.user)
      return { error: result.error }
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }

    // Supabase may require email confirmation — user object is present but
    // session is null until confirmed. Show a helpful message if so.
    if (data.user && !data.session) {
      return { error: 'Check your email to confirm your account, then sign in.' }
    }
    if (data.user) setUser({ id: data.user.id, email: data.user.email ?? '' })
    return { error: null }
  }

  // ── signOut ───────────────────────────────────────────────────────────────

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      removeJson(MOCK_KEY)
    } else {
      await supabase.auth.signOut()
    }
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
