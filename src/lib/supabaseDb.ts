/**
 * supabaseDb.ts
 *
 * All database read/write operations for Ascend AI.
 * The app is LOCAL-FIRST: localStorage is always the source of truth.
 * These functions sync data to/from Supabase in the background.
 *
 * Every function is safe to call even when Supabase is not configured —
 * they check isSupabaseConfigured and no-op silently.
 *
 * Console prefix: [Ascend AI DB] — filter by this in DevTools to see all sync activity.
 */

import { isSupabaseConfigured, supabase } from './supabase'
import type { UserProfile, UserStats } from '../context/UserContext'
import type { FoodEntry, WeightEntry, SavedMeal, ShredGoal, ManualBurnEntry } from './shredStorage'

export interface ShredData {
  foodLog: FoodEntry[]
  weightLog: WeightEntry[]
  savedMeals: SavedMeal[]
  goal: ShredGoal | null
  manualBurnLog: ManualBurnEntry[]
}

const TAG = '[Ascend AI DB]'

// ── Profile ──────────────────────────────────────────────────────────────────

/**
 * Save the user's profile to Supabase.
 * Called after onboarding and whenever the user updates settings.
 */
export async function saveProfileToSupabase(userId: string, profile: UserProfile): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      profile: profile,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.warn(TAG, '❌ save profile failed', error.message)
  } else {
    if (import.meta.env.DEV) console.log(TAG, '✅ profile saved', { userId, name: profile.name, goal: profile.goal })
  }
}

/**
 * Load the user's profile from Supabase.
 * Returns null if not found or not configured.
 */
export async function loadProfileFromSupabase(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('profile')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn(TAG, '❌ load profile failed', error.message)
    return null
  }
  if (!data?.profile) {
    if (import.meta.env.DEV) console.log(TAG, 'ℹ️ no profile in cloud yet (new user)')
    return null
  }

  if (import.meta.env.DEV) console.log(TAG, '✅ profile loaded from cloud', { userId })
  return data.profile as UserProfile
}

// ── Stats ─────────────────────────────────────────────────────────────────────

/**
 * Save gamification stats (XP, level, streak, etc.) to Supabase.
 */
export async function saveStatsToSupabase(userId: string, stats: UserStats): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      stats: stats,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.warn(TAG, '❌ save stats failed', error.message)
  } else {
    if (import.meta.env.DEV) console.log(TAG, '✅ stats saved', { userId, xp: stats.xp, level: stats.level, streak: stats.streak })
  }
}

/**
 * Load stats from Supabase.
 */
export async function loadStatsFromSupabase(userId: string): Promise<UserStats | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('stats')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn(TAG, '❌ load stats failed', error.message)
    return null
  }
  if (!data?.stats) {
    return null
  }

  const s = data.stats as UserStats
  if (import.meta.env.DEV) console.log(TAG, '✅ stats loaded from cloud', { xp: s.xp, level: s.level, streak: s.streak })
  return s
}

// ── Progress (workouts, cardio, meal plans) ───────────────────────────────────

export type ProgressRow = {
  calories?: number
  cardio_type?: string
  date: string
  difficulty?: string
  distance_km?: number
  duration: number
  feeling?: string
  goal?: string
  type: string
  user_id: string
}

/**
 * Append a completed workout or cardio session to Supabase.
 */
export async function saveProgressEntryToSupabase(
  userId: string,
  entry: Omit<ProgressRow, 'user_id'>
): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('progress')
    .insert({ ...entry, user_id: userId })

  if (error) {
    console.warn(TAG, '❌ save progress failed', error.message)
  } else {
    if (import.meta.env.DEV) console.log(TAG, '✅ progress entry saved', { userId, type: entry.type, duration: entry.duration, date: entry.date })
  }
}

/**
 * Load recent progress entries (last 90 days) from Supabase.
 */
export async function loadProgressFromSupabase(userId: string): Promise<ProgressRow[]> {
  if (!isSupabaseConfigured) return []

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: false })
    .limit(200)

  if (error) {
    console.warn(TAG, '❌ load progress failed', error.message)
    return []
  }

  const rows = (data ?? []) as ProgressRow[]
  console.log(TAG, `✅ progress loaded from cloud — ${rows.length} entries`)
  return rows
}

// ── Chat history ──────────────────────────────────────────────────────────────

export type ChatRow = {
  id: string
  is_local_mode?: boolean
  local_mode_label?: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
  user_id: string
}

/**
 * Append a single chat message to Supabase.
 */
export async function saveChatMessageToSupabase(
  userId: string,
  message: Omit<ChatRow, 'user_id'>
): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('chat_messages')
    .insert({ ...message, user_id: userId })

  if (error) {
    console.warn(TAG, '❌ save chat message failed', error.message)
  } else {
    console.log(TAG, `✅ chat message saved [${message.role}]`, message.text.slice(0, 60))
  }
}

/**
 * Load the last 30 chat messages for a user from Supabase.
 */
export async function loadChatHistoryFromSupabase(userId: string): Promise<ChatRow[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(30)

  if (error) {
    console.warn(TAG, '❌ load chat history failed', error.message)
    return []
  }

  const rows = ((data ?? []) as ChatRow[]).reverse()
  console.log(TAG, `✅ chat history loaded from cloud — ${rows.length} messages`)
  return rows
}

// ── Full sync on login ────────────────────────────────────────────────────────

/**
 * Called when the user logs in.
 * Loads profile + stats from Supabase and returns them so the app can
 * decide whether to use the cloud version or keep the local version.
 */
export async function loadUserDataFromSupabase(userId: string) {
  if (!isSupabaseConfigured) return null

  console.log(TAG, '🔄 loading user data from cloud...', { userId })

  const [profile, stats, shredData] = await Promise.all([
    loadProfileFromSupabase(userId),
    loadStatsFromSupabase(userId),
    loadShredDataFromSupabase(userId),
  ])

  // Restore shred data to localStorage so ShredPage reads it immediately
  if (shredData) {
    try {
      if (shredData.foodLog?.length)      localStorage.setItem('smartfit_shred_food',         JSON.stringify(shredData.foodLog))
      if (shredData.weightLog?.length)    localStorage.setItem('smartfit_shred_weight',       JSON.stringify(shredData.weightLog))
      if (shredData.savedMeals?.length)   localStorage.setItem('smartfit_shred_saved_meals',  JSON.stringify(shredData.savedMeals))
      if (shredData.goal)                 localStorage.setItem('smartfit_shred_goal',          JSON.stringify(shredData.goal))
      if (shredData.manualBurnLog?.length) localStorage.setItem('smartfit_shred_manual_burn', JSON.stringify(shredData.manualBurnLog))
      console.log(TAG, '✅ shred_data restored to localStorage')
    } catch { /* quota */ }
  }

  return { profile, stats }
}

// ── Shred data ────────────────────────────────────────────────────────────────

export async function saveShredDataToSupabase(userId: string, data: ShredData): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, shred_data: data, updated_at: new Date().toISOString() })
  if (error) console.warn(TAG, '❌ save shred_data failed', error.message)
  else console.log(TAG, '✅ shred_data saved')
}

export async function loadShredDataFromSupabase(userId: string): Promise<ShredData | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('shred_data')
    .eq('id', userId)
    .maybeSingle()
  if (error) { console.warn(TAG, '❌ load shred_data failed', error.message); return null }
  return (data?.shred_data as ShredData) ?? null
}

// ── Connection check ──────────────────────────────────────────────────────────

/**
 * Quick sanity-check: verifies Supabase is reachable and the current session is valid.
 * Call from DevTools: import('/src/lib/supabaseDb.ts').then(m => m.checkSupabaseConnection())
 */
export async function checkSupabaseConnection(): Promise<void> {
  if (!isSupabaseConfigured) {
    console.warn(TAG, '⚠️  Supabase is NOT configured — running in mock mode. Check your .env file.')
    return
  }

  console.log(TAG, '🔍 checking Supabase connection...')

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session

  if (!session) {
    console.warn(TAG, '⚠️  No active session — user is not logged in.')
    return
  }

  const userId = session.user.id
  console.log(TAG, '👤 logged in as', session.user.email, '| userId:', userId)

  // Check each table
  const [profileResult, progressResult, chatResult] = await Promise.all([
    supabase.from('profiles').select('id, updated_at').eq('id', userId).single(),
    supabase.from('progress').select('id, type, date', { count: 'exact' }).eq('user_id', userId),
    supabase.from('chat_messages').select('id', { count: 'exact' }).eq('user_id', userId),
  ])

  console.group(TAG + ' 📊 database summary for this user')
  if (profileResult.error) {
    console.warn('  profiles table:', profileResult.error.message)
  } else if (profileResult.data) {
    console.log('  ✅ profiles row found, last updated:', profileResult.data.updated_at)
  } else {
    console.log('  ℹ️  no profile row yet')
  }

  if (progressResult.error) {
    console.warn('  progress table:', progressResult.error.message)
  } else {
    console.log(`  ✅ progress entries: ${progressResult.count ?? 0}`)
    if (progressResult.data?.length) {
      console.table(progressResult.data.slice(0, 5))
    }
  }

  if (chatResult.error) {
    console.warn('  chat_messages table:', chatResult.error.message)
  } else {
    console.log(`  ✅ chat messages: ${chatResult.count ?? 0}`)
  }

  console.groupEnd()
}
