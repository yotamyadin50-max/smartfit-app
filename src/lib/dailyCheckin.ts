/**
 * dailyCheckin.ts
 * Stores and retrieves daily mood check-ins.
 * Format in localStorage: array of { date: 'YYYY-MM-DD', feeling: '😴' | '😐' | '💪' }
 */

export type FeelingEmoji = '😴' | '😐' | '💪'

export interface DailyCheckin {
  date: string   // YYYY-MM-DD
  feeling: FeelingEmoji
}

const KEY = 'smartfit_daily_checkin'
const MAX_HISTORY = 30

function todayStr() {
  return new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD
}

function load(): DailyCheckin[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is DailyCheckin =>
        typeof item?.date === 'string' && typeof item?.feeling === 'string',
    )
  } catch {
    return []
  }
}

function save(entries: DailyCheckin[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_HISTORY)))
  } catch {}
}

/** Returns today's check-in if it exists, otherwise null */
export function getTodayCheckin(): DailyCheckin | null {
  const today = todayStr()
  return load().find(c => c.date === today) ?? null
}

/** Saves (or updates) today's feeling */
export function saveTodayCheckin(feeling: FeelingEmoji) {
  const today = todayStr()
  const all = load().filter(c => c.date !== today)
  all.push({ date: today, feeling })
  save(all)
}

/** Returns the last N check-ins sorted newest first */
export function getCheckinHistory(days = 7): DailyCheckin[] {
  return load()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
}
