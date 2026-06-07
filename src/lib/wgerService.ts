export interface WgerExercise {
  id: number
  name: string
  category: string
  categoryId: number
  primaryMuscles: string[]
  secondaryMuscles: string[]
  imageUrl: string | null
  instructions: string
}

export interface WgerCategory {
  id: number
  name: string
}

export const WGER_CATEGORIES: WgerCategory[] = [
  { id: 10, name: 'Abs' },
  { id: 8,  name: 'Arms' },
  { id: 12, name: 'Back' },
  { id: 11, name: 'Chest' },
  { id: 9,  name: 'Legs' },
  { id: 13, name: 'Shoulders' },
  { id: 15, name: 'Cardio' },
]

// Map our app's workout choice to a wger category ID (for the browser)
export const CHOICE_TO_WGER_CATEGORY: Record<string, number> = {
  abs: 10,
  arms: 8,
  back: 12,
  chest: 11,
  legs: 9,
  goal: 9,
  gym: 9,
  aerobic: 15,
}

// Map gym focus areas to wger category IDs (for workout generation)
export const GYM_FOCUS_TO_WGER: Record<string, number[]> = {
  full:      [11, 12, 9, 13, 8, 10],
  chest:     [11],
  back:      [12],
  legs:      [9],
  shoulders: [13],
  arms:      [8],
  abs:       [10],
}

// Map home workout choice to wger category ID
export const HOME_CHOICE_TO_WGER: Record<string, number> = {
  abs:   10,
  arms:  8,
  back:  12,
  chest: 11,
  legs:  9,
  goal:  9,
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  data: WgerExercise[]
  ts: number
  hasMore: boolean
  total: number
}

function cacheKey(categoryId: number, offset: number): string {
  return `wger_v2_cat${categoryId}_off${offset}`
}

function readCache(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return entry
  } catch {
    return null
  }
}

function writeCache(key: string, entry: CacheEntry): void {
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // storage quota — ignore
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function parseExercise(raw: Record<string, unknown>): WgerExercise | null {
  // exerciseinfo endpoint puts the English name directly on the object
  // (it's the translation filtered by the language=2 query param)
  const translations = (raw.translations as Array<Record<string, unknown>>) ?? []
  const enTrans = translations.find(t => t.language === 2) as Record<string, unknown> | undefined
  const name = (enTrans?.name as string) || (raw.name as string) || ''
  if (!name.trim()) return null

  const rawMuscles = (raw.muscles as Array<Record<string, unknown>>) ?? []
  const rawSecondary = (raw.muscles_secondary as Array<Record<string, unknown>>) ?? []
  const images = (raw.images as Array<Record<string, unknown>>) ?? []
  const mainImage = images.find(img => img.is_main) || images[0]
  const category = raw.category as Record<string, unknown> | null

  return {
    id: raw.id as number,
    name: name.trim(),
    category: (category?.name as string) ?? '',
    categoryId: (category?.id as number) ?? 0,
    primaryMuscles: rawMuscles
      .map(m => m.name_en as string)
      .filter(Boolean),
    secondaryMuscles: rawSecondary
      .map(m => m.name_en as string)
      .filter(Boolean),
    imageUrl: mainImage ? (mainImage.image as string) : null,
    instructions: stripHtml((enTrans?.description as string) || ''),
  }
}

// Fetch exercises from multiple categories, deduped — used by workout builder
export async function fetchWgerPool(categoryIds: number[], signal?: AbortSignal): Promise<WgerExercise[]> {
  const seen = new Set<number>()
  const all: WgerExercise[] = []
  const unique = [...new Set(categoryIds)]
  for (const catId of unique) {
    try {
      const { exercises } = await fetchWgerExercises(catId, 0, signal)
      for (const ex of exercises) {
        if (!seen.has(ex.id)) {
          seen.add(ex.id)
          all.push(ex)
        }
      }
    } catch {
      // skip failed category, don't abort
    }
  }
  return all
}

export async function fetchWgerExercises(
  categoryId: number,
  offset = 0,
  signal?: AbortSignal,
): Promise<{ exercises: WgerExercise[]; hasMore: boolean; total: number }> {
  const key = cacheKey(categoryId, offset)
  const cached = readCache(key)
  if (cached) {
    return { exercises: cached.data, hasMore: cached.hasMore, total: cached.total }
  }

  const url = `https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=20&category=${categoryId}&offset=${offset}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`wger API ${res.status}`)

  const json = await res.json() as { count: number; next: string | null; results: Record<string, unknown>[] }
  const exercises = json.results
    .map(parseExercise)
    .filter((ex): ex is WgerExercise => ex !== null)

  const entry: CacheEntry = {
    data: exercises,
    ts: Date.now(),
    hasMore: !!json.next,
    total: json.count,
  }
  writeCache(key, entry)

  return { exercises, hasMore: !!json.next, total: json.count }
}
