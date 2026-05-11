/**
 * supabaseDb.ts
 *
 * All database read/write operations for SmartFit.
 * The app is LOCAL-FIRST: localStorage is always the source of truth.
 * These functions sync data to/from Supabase in the background.
 *
 * Every function is safe to call even when Supabase is not configured —
 * they check isSupabaseConfigured and no-op silently.
 */

import { isSupabaseConfigured, supabase } from './supabase'
import type { UserProfile, UserStats } from '../context/UserContext'

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

  if (error) console.warn('SmartFit: failed to save profile to Supabase', error.message)
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
    .single()

  if (error || !data?.profile) return null
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

  if (error) console.warn('SmartFit: failed to save stats to Supabase', error.message)
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
    .single()

  if (error || !data?.stats) return null
  return data.stats as UserStats
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

  if (error) console.warn('SmartFit: failed to save progress to Supabase', error.message)
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
    console.warn('SmartFit: failed to load progress from Supabase', error.message)
    return []
  }
  return (data ?? []) as ProgressRow[]
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

  if (error) console.warn('SmartFit: failed to save chat message to Supabase', error.message)
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
    console.warn('SmartFit: failed to load chat history from Supabase', error.message)
    return []
  }
  return ((data ?? []) as ChatRow[]).reverse()
}

// ── Full sync on login ────────────────────────────────────────────────────────

/**
 * Called when the user logs in.
 * Loads profile + stats from Supabase and returns them so the app can
 * decide whether to use the cloud version or keep the local version.
 */
export async function loadUserDataFromSupabase(userId: string) {
  if (!isSupabaseConfigured) return null

  const [profile, stats] = await Promise.all([
    loadProfileFromSupabase(userId),
    loadStatsFromSupabase(userId),
  ])

  return { profile, stats }
}
