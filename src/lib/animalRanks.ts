export type AnimalRank = {
  emoji: string
  id: string
  imageUrl?: string
  levelFrom: number
  nameEn: string
  nameHe: string
}

export type AnimalRankProgress = {
  current: AnimalRank
  currentLevelXp: number
  level: number
  levelProgressPct: number
  levelsUntilNextAnimal: number
  next: AnimalRank | null
  rankIndex: number
  totalXpForNextLevel: number
  xpToNextLevel: number
}

export const LEVELS_PER_ANIMAL = 5

export const ANIMAL_RANKS: AnimalRank[] = [
  { id: 'mouse', nameHe: 'עכבר', nameEn: 'Mouse', emoji: '🐭', levelFrom: 1 },
  { id: 'hamster', nameHe: 'אוגר', nameEn: 'Hamster', emoji: '🐹', levelFrom: 6 },
  { id: 'squirrel', nameHe: 'סנאי', nameEn: 'Squirrel', emoji: '🐿️', levelFrom: 11 },
  { id: 'rabbit', nameHe: 'ארנב', nameEn: 'Rabbit', emoji: '🐰', levelFrom: 16 },
  { id: 'fox', nameHe: 'שועל', nameEn: 'Fox', emoji: '🦊', levelFrom: 21 },
  { id: 'deer', nameHe: 'צבי', nameEn: 'Deer', emoji: '🦌', levelFrom: 26 },
  { id: 'wildcat', nameHe: 'חתול בר', nameEn: 'Wildcat', emoji: '🐈', levelFrom: 31 },
  { id: 'wolf', nameHe: 'זאב', nameEn: 'Wolf', emoji: '🐺', levelFrom: 36 },
  { id: 'eagle', nameHe: 'נשר', nameEn: 'Eagle', emoji: '🦅', levelFrom: 41 },
  { id: 'cheetah', nameHe: 'ברדלס', nameEn: 'Cheetah', emoji: '🐆', levelFrom: 46 },
  { id: 'puma', nameHe: 'פומה', nameEn: 'Puma', emoji: '🐈', levelFrom: 51 },
  { id: 'black-bear', nameHe: 'דוב שחור', nameEn: 'Black Bear', emoji: '🐻', levelFrom: 56 },
  { id: 'cobra', nameHe: 'קוברה', nameEn: 'Cobra', emoji: '🐍', levelFrom: 61 },
  { id: 'crocodile', nameHe: 'תנין', nameEn: 'Crocodile', emoji: '🐊', levelFrom: 66 },
  { id: 'rhino', nameHe: 'קרנף', nameEn: 'Rhino', emoji: '🦏', levelFrom: 71 },
  { id: 'elephant', nameHe: 'פיל', nameEn: 'Elephant', emoji: '🐘', levelFrom: 76 },
  { id: 'gorilla', nameHe: 'גורילה', nameEn: 'Gorilla', emoji: '🦍', levelFrom: 81 },
  { id: 'lion', nameHe: 'אריה', nameEn: 'Lion', emoji: '🦁', levelFrom: 86 },
  { id: 'jaguar', nameHe: 'יגואר', nameEn: 'Jaguar', emoji: '🐆', levelFrom: 91 },
  { id: 'tiger', nameHe: 'נמר', nameEn: 'Tiger', emoji: '🐯', levelFrom: 96 },
]

function safeLevel(level: number) {
  return Math.max(1, Math.floor(Number.isFinite(level) ? level : 1))
}

function safeXp(xp: number) {
  return Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0))
}

export function getXpRequiredForLevel(level: number) {
  const safe = safeLevel(level)
  return 200 + ((safe - 1) * 75) + Math.floor(Math.pow(safe - 1, 1.18) * 12)
}

export function getTotalXpForLevel(level: number) {
  const safe = safeLevel(level)
  let total = 0
  for (let currentLevel = 1; currentLevel < safe; currentLevel += 1) {
    total += getXpRequiredForLevel(currentLevel)
  }
  return total
}

export function getLevelFromXp(xp: number) {
  let remainingXp = safeXp(xp)
  let level = 1

  while (remainingXp >= getXpRequiredForLevel(level) && level < 999) {
    remainingXp -= getXpRequiredForLevel(level)
    level += 1
  }

  return level
}

export function getAnimalRankIndexForLevel(level: number) {
  const index = Math.floor((safeLevel(level) - 1) / LEVELS_PER_ANIMAL)
  return Math.min(ANIMAL_RANKS.length - 1, Math.max(0, index))
}

export function getAnimalRankForLevel(level: number) {
  return ANIMAL_RANKS[getAnimalRankIndexForLevel(level)]
}

export function getAnimalName(rank: AnimalRank, isHebrew: boolean) {
  return isHebrew ? rank.nameHe : rank.nameEn
}

export function getAnimalProgress(stats: { level: number; xp: number }): AnimalRankProgress {
  const levelFromXp = getLevelFromXp(stats.xp)
  const level = Math.max(safeLevel(stats.level), levelFromXp)
  const rankIndex = getAnimalRankIndexForLevel(level)
  const current = ANIMAL_RANKS[rankIndex]
  const next = ANIMAL_RANKS[rankIndex + 1] ?? null
  const levelStartXp = getTotalXpForLevel(level)
  const totalXpForNextLevel = getXpRequiredForLevel(level)
  const currentLevelXp = Math.max(0, safeXp(stats.xp) - levelStartXp)
  const cappedCurrentLevelXp = Math.min(currentLevelXp, totalXpForNextLevel)

  return {
    current,
    currentLevelXp: cappedCurrentLevelXp,
    level,
    levelProgressPct: totalXpForNextLevel ? cappedCurrentLevelXp / totalXpForNextLevel : 1,
    levelsUntilNextAnimal: next ? Math.max(0, next.levelFrom - level) : 0,
    next,
    rankIndex,
    totalXpForNextLevel,
    xpToNextLevel: Math.max(0, totalXpForNextLevel - cappedCurrentLevelXp),
  }
}
