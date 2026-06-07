export const ACHIEVEMENT_PROGRESS_EVENT = 'ascendai-progress-updated'

export type AchievementEventKind = 'badge' | 'goal'

export interface StoredAchievementEvent {
  date: string
  descriptionEn: string
  descriptionHe: string
  icon: string
  id: string
  kind: AchievementEventKind
  path: string
  titleEn: string
  titleHe: string
}

const EVENTS_KEY = 'smartfit_achievement_events'

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isStoredAchievementEvent(value: unknown): value is StoredAchievementEvent {
  return (
    isObject(value) &&
    typeof value.date === 'string' &&
    typeof value.descriptionEn === 'string' &&
    typeof value.descriptionHe === 'string' &&
    typeof value.icon === 'string' &&
    typeof value.id === 'string' &&
    (value.kind === 'badge' || value.kind === 'goal') &&
    typeof value.path === 'string' &&
    typeof value.titleEn === 'string' &&
    typeof value.titleHe === 'string'
  )
}

export function getAchievementEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter(isStoredAchievementEvent).slice(0, 80) : []
  } catch {
    return []
  }
}

export function saveAchievementEvents(events: StoredAchievementEvent[]) {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 80)))
  } catch {
    // Ignore storage quota; achievements are nice-to-have local history.
  }
}

export function addAchievementEvents(events: StoredAchievementEvent[]) {
  if (events.length === 0) return
  const existing = getAchievementEvents()
  const ids = new Set(existing.map(event => event.id))
  const fresh = events.filter(event => !ids.has(event.id))
  if (fresh.length === 0) return
  saveAchievementEvents([...fresh, ...existing])
}

export function emitProgressEvent() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ACHIEVEMENT_PROGRESS_EVENT))
}
