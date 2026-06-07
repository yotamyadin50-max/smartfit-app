/**
 * exercisePool.ts
 * Loads exercises from ExerciseDB API and organises them by muscle category.
 * Used by WorkoutPage to show dynamic, always-GIF-backed exercise lists.
 */

import {
  fetchExerciseAnimations,
  type ExerciseDbAnimation,
} from '../services/exerciseAnimationService'

export type ExerciseCategory =
  | 'abs'
  | 'arms'
  | 'back'
  | 'cardio'
  | 'chest'
  | 'full'
  | 'legs'
  | 'shoulders'

export interface PoolExercise {
  equipments: string[]
  gifUrl: string
  name: string
  targetMuscles: string[]
}

// bodyParts strings from ExerciseDB that map to each category
const CATEGORY_BODY_PARTS: Record<ExerciseCategory, string[]> = {
  abs:       ['waist'],
  arms:      ['upper arms', 'lower arms'],
  back:      ['back'],
  cardio:    ['cardio'],
  chest:     ['chest'],
  full:      [],           // special: mix from all
  legs:      ['upper legs', 'lower legs'],
  shoulders: ['shoulders'],
}

function toPoolExercise(ex: ExerciseDbAnimation): PoolExercise {
  return {
    equipments:   ex.equipments   ?? [],
    gifUrl:       ex.gifUrl,
    name:         ex.name,
    targetMuscles: ex.targetMuscles ?? [],
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count)
}

let cachedPool: ExerciseDbAnimation[] | null = null

async function getPool(): Promise<ExerciseDbAnimation[]> {
  if (cachedPool) return cachedPool
  const exercises = await fetchExerciseAnimations()
  // Only keep exercises with a valid gifUrl
  cachedPool = exercises.filter(ex => ex.gifUrl && ex.gifUrl.startsWith('http'))
  return cachedPool
}

/**
 * Returns `count` random exercises for the given category.
 * Falls back to an empty array if the API is unavailable.
 */
export async function getExercisesForCategory(
  category: ExerciseCategory,
  count: number,
): Promise<PoolExercise[]> {
  const pool = await getPool()

  let filtered: ExerciseDbAnimation[]

  if (category === 'full') {
    // Take a balanced mix from all non-cardio categories
    const categories: ExerciseCategory[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'abs']
    const perCat = Math.ceil(count / categories.length)
    const picks: ExerciseDbAnimation[] = []
    for (const cat of categories) {
      const bodyParts = CATEGORY_BODY_PARTS[cat]
      const matches = pool.filter(ex =>
        ex.bodyParts?.some(part => bodyParts.includes(part.toLowerCase()))
      )
      picks.push(...pickRandom(matches, perCat))
    }
    filtered = shuffle(picks).slice(0, count)
  } else {
    const bodyParts = CATEGORY_BODY_PARTS[category]
    filtered = pool.filter(ex =>
      ex.bodyParts?.some(part => bodyParts.includes(part.toLowerCase()))
    )
  }

  return pickRandom(filtered, count).map(toPoolExercise)
}
