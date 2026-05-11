import { createClient } from '@supabase/supabase-js'

// These env vars are set in .env (VITE_ prefix makes them available in the browser)
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Accepts both the new "sb_publishable_..." format and the legacy "eyJ..." JWT format
export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' && supabaseUrl.startsWith('https://') &&
  typeof supabaseKey === 'string' && supabaseKey.length > 20 &&
  (supabaseKey.startsWith('sb_publishable_') || supabaseKey.startsWith('eyJ'))

/**
 * Supabase client.
 * Always non-null — if credentials are missing it is created with dummy values
 * so imports never break, but every call will fail gracefully.
 */
export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseKey  ?? 'placeholder-anon-key',
)
