const EXERCISE_DB_URL = 'https://oss.exercisedb.dev/api/v1/exercises'
const CACHE_KEY = 'ascend_exercisedb_animation_cache_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14
const MAX_PAGES = 8

export interface ExerciseDbAnimation {
  bodyParts?: string[]
  equipments?: string[]
  exerciseId: string
  gifUrl: string
  name: string
  secondaryMuscles?: string[]
  targetMuscles?: string[]
}

interface ExerciseDbResponse {
  data?: ExerciseDbAnimation[]
  meta?: {
    hasNextPage?: boolean
    nextCursor?: string | null
    total?: number
  }
  success?: boolean
}

interface ExerciseAnimationCache {
  exercises: ExerciseDbAnimation[]
  savedAt: number
}

export interface ExerciseAnimationMatch {
  exercise: ExerciseDbAnimation
  score: number
}

let memoryCache: ExerciseDbAnimation[] | null = null
let pendingFetch: Promise<ExerciseDbAnimation[]> | null = null

const WORD_ALIASES: Record<string, string[]> = {
  'push ups': ['push up', 'push-up'],
  'pushups': ['push up', 'push-up'],
  'squats': ['squat'],
  'lunges': ['lunge'],
  'rows': ['row'],
  'pull ups': ['pull up', 'pull-up'],
  'pullups': ['pull up', 'pull-up'],
  'chin ups': ['chin up', 'chin-up'],
  'chinups': ['chin up', 'chin-up'],
  'sit ups': ['sit up', 'sit-up'],
  'situps': ['sit up', 'sit-up'],
  'mountain climbers': ['mountain climber'],
  'leg raises': ['leg raise'],
  'calf raises': ['calf raise'],
  'bicep curl': ['biceps curl'],
  'biceps curls': ['biceps curl'],
  'tricep pushdown': ['triceps pushdown'],
  'triceps pushdowns': ['triceps pushdown'],
  'lat pull down': ['lat pulldown'],
  'pulley': ['cable'],
}

const STOP_WORDS = new Set([
  'and',
  'with',
  'machine',
  'exercise',
  'bodyweight',
  'body',
  'weight',
  'weighted',
  'basic',
  'classic',
  'modified',
  'assisted',
])

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function compactExercise(exercise: ExerciseDbAnimation): ExerciseDbAnimation | null {
  if (!exercise?.name || !exercise?.gifUrl || !exercise?.exerciseId) return null

  return {
    bodyParts: exercise.bodyParts,
    equipments: exercise.equipments,
    exerciseId: exercise.exerciseId,
    gifUrl: exercise.gifUrl,
    name: exercise.name,
    secondaryMuscles: exercise.secondaryMuscles,
    targetMuscles: exercise.targetMuscles,
  }
}

function readCache(ignoreTtl = false): ExerciseDbAnimation[] | null {
  if (!canUseLocalStorage()) return null

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as ExerciseAnimationCache
    if (!Array.isArray(parsed.exercises)) return null
    if (!ignoreTtl && (!parsed.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS)) return null

    return parsed.exercises
  } catch (error) {
    console.warn('[ExerciseDB] animation cache read failed', error)
    return null
  }
}

function writeCache(exercises: ExerciseDbAnimation[]) {
  if (!canUseLocalStorage() || exercises.length === 0) return

  try {
    const payload: ExerciseAnimationCache = {
      exercises,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('[ExerciseDB] animation cache write failed', error)
  }
}

function getCachedExercises() {
  if (memoryCache) return memoryCache

  const cached = readCache()
  if (cached) {
    memoryCache = cached
    return cached
  }

  return []
}

export function normalizeExerciseName(name: string) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function getNameVariants(name: string) {
  const normalized = normalizeExerciseName(name)
  const variants = [normalized]

  for (const [from, replacements] of Object.entries(WORD_ALIASES)) {
    if (normalized.includes(from)) {
      replacements.forEach(replacement => variants.push(normalized.replace(from, replacement)))
    }
  }

  variants.push(
    normalized.replace(/\bsquats\b/g, 'squat'),
    normalized.replace(/\blunges\b/g, 'lunge'),
    normalized.replace(/\brows\b/g, 'row'),
    normalized.replace(/\braises\b/g, 'raise'),
    normalized.replace(/\bcurls\b/g, 'curl'),
    normalized.replace(/\bpresses\b/g, 'press'),
    normalized.replace(/\bextensions\b/g, 'extension'),
  )

  return unique(variants.map(normalizeExerciseName))
}

function getTokens(value: string) {
  return normalizeExerciseName(value)
    .split(' ')
    .filter(token => token.length > 2 && !STOP_WORDS.has(token))
}

function wordBoundaryIncludes(haystack: string, needle: string) {
  if (!haystack || !needle) return false
  return haystack === needle || haystack.includes(` ${needle} `) || haystack.startsWith(`${needle} `) || haystack.endsWith(` ${needle}`)
}

function scoreExercise(queryVariants: string[], exercise: ExerciseDbAnimation) {
  const exerciseName = normalizeExerciseName(exercise.name)
  const exerciseTokens = new Set(getTokens(exerciseName))
  let bestScore = 0

  for (const variant of queryVariants) {
    if (!variant) continue
    if (exerciseName === variant) bestScore = Math.max(bestScore, 120)
    if (wordBoundaryIncludes(exerciseName, variant)) bestScore = Math.max(bestScore, 96 - Math.abs(exerciseName.length - variant.length) * 0.4)
    if (wordBoundaryIncludes(variant, exerciseName)) bestScore = Math.max(bestScore, 82 - Math.abs(exerciseName.length - variant.length) * 0.25)

    const queryTokens = getTokens(variant)
    if (queryTokens.length === 0) continue

    const matchingTokens = queryTokens.filter(token => exerciseTokens.has(token))
    const queryCoverage = matchingTokens.length / queryTokens.length
    const exerciseCoverage = matchingTokens.length / Math.max(exerciseTokens.size, 1)
    const tokenScore = queryCoverage * 58 + exerciseCoverage * 24 - Math.abs(exerciseName.length - variant.length) * 0.06

    bestScore = Math.max(bestScore, tokenScore)
  }

  return bestScore
}

async function fetchExercisePage(after?: string): Promise<ExerciseDbResponse> {
  const params = new URLSearchParams({ limit: '1500' })
  if (after) params.set('after', after)

  const response = await fetch(`${EXERCISE_DB_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error(`ExerciseDB request failed with status ${response.status}`)
  }

  return response.json() as Promise<ExerciseDbResponse>
}

export async function fetchExerciseAnimations() {
  const cached = getCachedExercises()
  if (cached.length > 0) return cached
  if (pendingFetch) return pendingFetch

  pendingFetch = (async () => {
    const byId = new Map<string, ExerciseDbAnimation>()
    let after: string | undefined

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const payload = await fetchExercisePage(after)
      const pageExercises = Array.isArray(payload.data) ? payload.data : []

      pageExercises
        .map(compactExercise)
        .filter((exercise): exercise is ExerciseDbAnimation => Boolean(exercise))
        .forEach(exercise => byId.set(exercise.exerciseId, exercise))

      if (!payload.meta?.hasNextPage || !payload.meta.nextCursor) break
      if (payload.meta.total && byId.size >= payload.meta.total) break
      after = payload.meta.nextCursor
    }

    const exercises = Array.from(byId.values())
    memoryCache = exercises
    writeCache(exercises)
    pendingFetch = null
    return exercises
  })().catch(error => {
    pendingFetch = null
    // Fall back to a stale on-disk cache (even past its 14-day TTL) rather
    // than an empty pool, so exercise GIFs keep working through a temporary
    // outage — an empty array would previously "succeed" silently here.
    const stale = readCache(true)
    if (stale) {
      console.warn('[ExerciseDB] failed to fetch animations — using stale cached pool', error)
      memoryCache = stale
      return stale
    }
    console.warn('[ExerciseDB] failed to fetch animations and no cache available', error)
    return [] as ExerciseDbAnimation[]
  })

  return pendingFetch
}

export function findBestExerciseAnimation(exerciseName: string, exercises = getCachedExercises()): ExerciseAnimationMatch | null {
  const variants = getNameVariants(exerciseName)
  let best: ExerciseAnimationMatch | null = null

  for (const exercise of exercises) {
    const score = scoreExercise(variants, exercise)
    if (!best || score > best.score) {
      best = { exercise, score }
    }
  }

  return best && best.score >= 45 ? best : null
}

export async function getExerciseAnimationUrl(exerciseName: string) {
  const exercises = await fetchExerciseAnimations()
  const match = findBestExerciseAnimation(exerciseName, exercises)
  return match?.exercise.gifUrl ?? null
}

export async function getExerciseAnimationMatch(exerciseName: string) {
  const exercises = await fetchExerciseAnimations()
  return findBestExerciseAnimation(exerciseName, exercises)
}
