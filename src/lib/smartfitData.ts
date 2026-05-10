import type { ChatMessage } from '../data/mockChat'
import { readJson, writeJson } from './storage'

export type StoredChatMessage = Omit<ChatMessage, 'timestamp'> & {
  timestamp: string
  isLocalMode?: boolean
  localModeLabel?: string
}

export type ProgressEntry = {
  id: string
  completed: boolean
  date: string
  difficulty: string
  duration: number
  feeling?: string
  goal?: string
  type: string
}

export type RecipeEntry = {
  id: string
  date: string
  ingredients: string[]
  mealType?: string
  title: string
}

export type CachedAiReply = {
  cacheKey: string
  createdAt: string
  mode: 'openrouter' | 'local' | 'safe'
  modeLabel?: string
  text: string
}

export type ProgressSummary = {
  difficulty: {
    easy: number
    hard: number
    normal: number
  }
  monthlyWorkouts: number
  streakDays: number
  totalMinutes: number
  weeklyTargetRate: number
  weeklyWorkouts: number
}

const CHAT_HISTORY_KEY = 'smartfit_chat_history'
const AI_CACHE_KEY = 'smartfit_ai_reply_cache'
const RECIPES_KEY = 'smartfit_saved_recipes'
const PROGRESS_KEYS = ['smartfit_ai_tools_progress', 'smartfit_workout_progress']
const MAX_CHAT_MESSAGES = 30
const MAX_CACHE_ITEMS = 24
const MAX_RECIPE_ITEMS = 60
const AI_CACHE_TTL_MS = 1000 * 60 * 12

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime())
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function cleanText(value: unknown, fallback = '', maxLength = 400) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength)
    : fallback
}

function isStoredChatMessage(value: unknown): value is StoredChatMessage {
  if (!isObject(value)) return false
  return (
    typeof value.id === 'string' &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.text === 'string' &&
    isValidDateString(value.timestamp)
  )
}

function isStoredChatMessages(value: unknown): value is StoredChatMessage[] {
  return Array.isArray(value) && value.every(isStoredChatMessage)
}

function isCachedAiReply(value: unknown): value is CachedAiReply {
  if (!isObject(value)) return false
  return (
    typeof value.cacheKey === 'string' &&
    typeof value.text === 'string' &&
    isValidDateString(value.createdAt) &&
    (value.mode === 'openrouter' || value.mode === 'local' || value.mode === 'safe')
  )
}

function isCachedAiReplies(value: unknown): value is CachedAiReply[] {
  return Array.isArray(value) && value.every(isCachedAiReply)
}

function normalizeProgressEntry(value: unknown): ProgressEntry | null {
  if (!isObject(value)) return null
  const date = isValidDateString(value.date) ? value.date : ''
  if (!date) return null

  return {
    id: cleanText(value.id, `${new Date(date).getTime()}`, 80),
    completed: value.completed !== false,
    date,
    difficulty: cleanText(value.difficulty ?? value.level, 'normal', 40),
    duration: clampNumber(value.duration ?? value.durationMinutes, 1, 240, 20),
    feeling: cleanText(value.feeling, '', 80) || undefined,
    goal: cleanText(value.goal, '', 80) || undefined,
    type: cleanText(value.type ?? value.goal, 'workout', 80),
  }
}

function normalizeRecipeEntry(value: unknown): RecipeEntry | null {
  if (!isObject(value)) return null
  const date = isValidDateString(value.date) ? value.date : new Date().toISOString()
  const ingredients = Array.isArray(value.ingredients)
    ? value.ingredients.map(item => cleanText(item, '', 80)).filter(Boolean).slice(0, 20)
    : []

  return {
    id: cleanText(value.id, `${new Date(date).getTime()}`, 80),
    date,
    ingredients,
    mealType: cleanText(value.mealType, '', 40) || undefined,
    title: cleanText(value.title, 'מתכון שמור', 120),
  }
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function getDayStreak(entries: ProgressEntry[]) {
  const completedDays = new Set(
    entries
      .filter(entry => entry.completed)
      .map(entry => startOfDay(new Date(entry.date)).getTime()),
  )
  let cursor = startOfDay(new Date())
  let streak = 0

  if (!completedDays.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1)

  while (completedDays.has(cursor.getTime())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function isCurrentMonth(date: Date) {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export function getRecentChatMessages() {
  return readJson<StoredChatMessage[]>(CHAT_HISTORY_KEY, [], isStoredChatMessages)
    .slice(-MAX_CHAT_MESSAGES)
}

export function saveRecentChatMessages(messages: StoredChatMessage[]) {
  writeJson(CHAT_HISTORY_KEY, messages.filter(isStoredChatMessage).slice(-MAX_CHAT_MESSAGES))
}

export function getProgressEntries() {
  const merged = PROGRESS_KEYS.flatMap(key =>
    readJson<unknown[]>(key, [], Array.isArray)
      .map(normalizeProgressEntry)
      .filter((entry): entry is ProgressEntry => Boolean(entry)),
  )

  const byId = new Map<string, ProgressEntry>()
  for (const entry of merged) byId.set(entry.id, entry)
  return [...byId.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function saveProgressEntries(entries: ProgressEntry[]) {
  writeJson('smartfit_ai_tools_progress', entries.map(normalizeProgressEntry).filter(Boolean).slice(0, 160))
}

export function getSavedRecipes() {
  return readJson<unknown[]>(RECIPES_KEY, [], Array.isArray)
    .map(normalizeRecipeEntry)
    .filter((entry): entry is RecipeEntry => Boolean(entry))
    .slice(0, MAX_RECIPE_ITEMS)
}

export function saveRecipeEntry(entry: RecipeEntry) {
  const next = [entry, ...getSavedRecipes().filter(item => item.id !== entry.id)].slice(0, MAX_RECIPE_ITEMS)
  writeJson(RECIPES_KEY, next)
}

export function getProgressSummary(weeklyTarget = 3): ProgressSummary {
  const entries = getProgressEntries().filter(entry => entry.completed)
  const weekStart = startOfWeek(new Date()).getTime()
  const weeklyEntries = entries.filter(entry => new Date(entry.date).getTime() >= weekStart)
  const monthlyEntries = entries.filter(entry => isCurrentMonth(new Date(entry.date)))
  const safeTarget = Math.min(7, Math.max(1, weeklyTarget))

  return {
    difficulty: {
      easy: entries.filter(entry => /קל|easy/i.test(`${entry.difficulty} ${entry.feeling ?? ''}`)).length,
      hard: entries.filter(entry => /קשה|hard/i.test(`${entry.difficulty} ${entry.feeling ?? ''}`)).length,
      normal: entries.filter(entry => /סביר|normal|medium|בינוני/i.test(`${entry.difficulty} ${entry.feeling ?? ''}`)).length,
    },
    monthlyWorkouts: monthlyEntries.length,
    streakDays: getDayStreak(entries),
    totalMinutes: entries.reduce((sum, entry) => sum + entry.duration, 0),
    weeklyTargetRate: Math.min(100, Math.round((weeklyEntries.length / safeTarget) * 100)),
    weeklyWorkouts: weeklyEntries.length,
  }
}

export function buildAiCacheKey(parts: string[]) {
  return parts
    .map(part => cleanText(part, '', 800).toLowerCase())
    .filter(Boolean)
    .join('::')
    .slice(0, 1600)
}

export function getCachedAiReply(cacheKey: string): CachedAiReply | null {
  const now = Date.now()
  const cache = readJson<CachedAiReply[]>(AI_CACHE_KEY, [], isCachedAiReplies)
    .filter(item => now - new Date(item.createdAt).getTime() <= AI_CACHE_TTL_MS)

  const match = cache.find(item => item.cacheKey === cacheKey)
  if (cache.length) writeJson(AI_CACHE_KEY, cache.slice(0, MAX_CACHE_ITEMS))
  return match ?? null
}

export function setCachedAiReply(reply: CachedAiReply) {
  const next = [
    reply,
    ...readJson<CachedAiReply[]>(AI_CACHE_KEY, [], isCachedAiReplies)
      .filter(item => item.cacheKey !== reply.cacheKey),
  ].slice(0, MAX_CACHE_ITEMS)

  writeJson(AI_CACHE_KEY, next)
}
