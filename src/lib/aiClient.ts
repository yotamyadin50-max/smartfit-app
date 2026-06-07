import type { UserProfile, UserStats } from '../context/UserContext'
import type { Language } from '../context/I18nContext'
import { generateLocalReply } from '../localCoachEngine'
import {
  buildAiCacheKey,
  getCachedAiReply,
  getProgressEntries,
  setCachedAiReply,
  type CachedAiReply,
} from './smartfitData'

export type AiReplyMode = 'openrouter' | 'local' | 'safe'

export type SmartFitAiReply = {
  cached?: boolean
  mode: AiReplyMode
  modeLabel?: string
  text: string
}

export type HybridAiRequest = {
  prompt: string
  language?: Language
  profile?: Partial<UserProfile>
  signal?: AbortSignal
  stats?: UserStats
  timeoutLabel?: string
  userMessage: string
}

// In the web build VITE_API_BASE_URL is empty (relative URL works).
// In the native Capacitor build set VITE_API_BASE_URL=https://your-deploy.vercel.app
// so the APK calls the real server instead of timing-out on a missing local endpoint.
const AI_ENDPOINT = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '') + '/api/ai'
const AI_BASE_TIMEOUT_MS = 45000
const AI_EXTENDED_TIMEOUT_MS = 60000
const AI_SLOW_REQUEST_MS = 10000
const MAX_AI_RETRIES = 1
const MAX_USER_MESSAGE_LENGTH = 500
const MAX_PROMPT_LENGTH = 4000
export const LOCAL_MODE_LABEL = 'מצב מקומי — ללא API'
export const TIMEOUT_LOCAL_MODE_LABEL = 'עובר למצב מקומי... הבקשה לקחה יותר מדי זמן'
export const SAFE_MODE_LABEL = 'מצב מקומי — תשובה בסיסית בטוחה'

export function getLocalModeLabel(language: Language = 'he') {
  return language === 'he' ? LOCAL_MODE_LABEL : 'Local mode — no API'
}

export function getTimeoutLocalModeLabel(language: Language = 'he') {
  return language === 'he' ? TIMEOUT_LOCAL_MODE_LABEL : 'Switching to local mode... request took too long'
}

export function getSafeModeLabel(language: Language = 'he') {
  return language === 'he' ? SAFE_MODE_LABEL : 'Local mode — safe basic answer'
}

export function sanitizeUserMessage(message: string) {
  return message
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_USER_MESSAGE_LENGTH)
}

function sanitizePrompt(prompt: string) {
  return prompt
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_PROMPT_LENGTH)
}

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  return window.localStorage.getItem('smartfit_language') === 'he' ? 'he' : 'en'
}

function wait(milliseconds: number) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

export function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === 'AbortError'
  ) || (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

function getSafeBasicReply(message: string, language: Language = 'he') {
  if (language === 'en') {
    const topic = /workout|exercise|training|אימון|תרגיל|כושר/i.test(message)
      ? 'You can start with a short safe workout: easy warm-up, 2 rounds of squats, modified push-ups, a short plank and glute bridges. Stop if anything feels unusual.'
      : /meal|food|nutrition|recipe|אוכל|תזונה|מתכון|חלבון/i.test(message)
        ? 'Build a simple meal from food you already have: one protein source, vegetables or fruit, and an available carbohydrate. Keep it moderate and avoid extremes.'
        : 'I can help with workouts, nutrition, recipes, progress and habits. Try: "Give me a 10-minute workout" or "I have eggs and tuna".'

    return [
      '## Safe Basic Answer',
      topic,
      '',
      'This information is general only and does not replace professional advice.',
    ].join('\n')
  }

  const topic = /אימון|תרגיל|כושר|workout|exercise|training/i.test(message)
    ? 'אפשר להתחיל באימון קצר ובטוח: 3 דקות חימום, 2 סבבים של סקוואט, שכיבות סמיכה מותאמות, פלאנק קצר וגשר ישבן, ואז 3 דקות מתיחות.'
    : /אוכל|תזונה|מתכון|חלבון|meal|food|nutrition|recipe/i.test(message)
      ? 'בחר ארוחה פשוטה ממה שכבר יש בבית: מקור חלבון, ירק או פרי, ופחמימה זמינה. שמור על כמות נוחה ובלי קיצוניות.'
      : 'אני יכול לעזור עם אימונים, תזונה, מתכונים, התקדמות והרגלים. נסה לשאול למשל: "תן לי אימון 10 דקות" או "יש לי ביצים וטונה".'

  return [
    '## תשובה בסיסית בטוחה',
    topic,
    '',
    'המידע כללי בלבד ואינו מחליף ייעוץ מקצועי.',
  ].join('\n')
}

function getCacheKey(prompt: string, userMessage: string, profile?: Partial<UserProfile>, stats?: UserStats, language: Language = 'en') {
  return buildAiCacheKey([
    language,
    userMessage,
    prompt.slice(-1200),
    profile ? JSON.stringify({
      age: profile.age,
      fitnessLevel: profile.fitnessLevel,
      goal: profile.goal,
      goals: profile.goals,
      habits: profile.habits,
      health: profile.health,
      nutritionPref: profile.nutritionPref,
      nutrition: profile.nutrition,
      equipment: profile.equipment,
      level: profile.level,
      workout_days: profile.workout_days,
      workout_time: profile.workout_time,
      workoutDuration: profile.workoutDuration,
      workoutType: profile.workoutType,
      workoutTypes: profile.workoutTypes,
    }) : '',
    stats ? JSON.stringify(stats) : '',
  ])
}

function toCachedReply(reply: CachedAiReply): SmartFitAiReply {
  return {
    cached: true,
    mode: reply.mode,
    modeLabel: reply.modeLabel,
    text: reply.text,
  }
}

function isComplexAiPrompt(prompt: string) {
  return (
    prompt.length > 1800 ||
    /תוכנית|אימון|אימונים|תזונה|תפריט|מתכון|שבועי|חדר כושר|workout|training|nutrition|meal plan|recipe|weekly|gym/i.test(prompt)
  )
}

function getInitialTimeoutMs(prompt: string) {
  return isComplexAiPrompt(prompt) ? AI_EXTENDED_TIMEOUT_MS : AI_BASE_TIMEOUT_MS
}

function createAbortController(prompt: string, signal?: AbortSignal) {
  const controller = new AbortController()
  const abortSafely = (reason: DOMException) => {
    if (!controller.signal.aborted) {
      controller.abort(reason)
    }
  }
  let timeoutMs = getInitialTimeoutMs(prompt)
  const timeoutAbort = () => {
    if (import.meta.env.DEV) console.log('request timeout', { timeoutMs })
    abortSafely(new DOMException('timeout', 'AbortError'))
  }
  let timeout = window.setTimeout(timeoutAbort, timeoutMs)
  const slowRequestTimer = timeoutMs < AI_EXTENDED_TIMEOUT_MS
    ? window.setTimeout(() => {
      if (controller.signal.aborted) return
      window.clearTimeout(timeout)
      timeoutMs = AI_EXTENDED_TIMEOUT_MS
      timeout = window.setTimeout(timeoutAbort, AI_EXTENDED_TIMEOUT_MS - AI_SLOW_REQUEST_MS)
    }, AI_SLOW_REQUEST_MS)
    : null

  const abortFromParent = () => {
    const reason = signal?.reason instanceof DOMException
      ? signal.reason
      : new DOMException('cancelled', 'AbortError')
    abortSafely(reason)
  }

  if (signal?.aborted) abortFromParent()
  else signal?.addEventListener('abort', abortFromParent, { once: true })

  return {
    controller,
    dispose: () => {
      window.clearTimeout(timeout)
      if (slowRequestTimer !== null) window.clearTimeout(slowRequestTimer)
      signal?.removeEventListener('abort', abortFromParent)
    },
  }
}

function getAbortReason(signal?: AbortSignal) {
  const reason = signal?.reason
  if (reason instanceof DOMException) return reason.message
  return typeof reason === 'string' ? reason : ''
}

function getAbortErrorMessage(error: unknown) {
  if (error instanceof DOMException) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return ''
}

type AiRequestError = Error & {
  endpoint?: string
  model?: string
  responseBody?: string
  skipRetry?: boolean
  status?: number
  statusText?: string
}

function parseAiResponseBody(responseBody: string) {
  try {
    const parsed = JSON.parse(responseBody)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function extractTextFromContentParts(content: unknown) {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''

  return content
    .map(part => {
      if (typeof part === 'string') return part
      if (
        typeof part === 'object' &&
        part !== null &&
        'text' in part &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        return (part as { text: string }).text
      }
      return ''
    })
    .join('')
    .trim()
}

function extractTextFromChoices(data: Record<string, unknown>) {
  if (!Array.isArray(data.choices)) return ''
  const firstChoice = data.choices[0]
  if (typeof firstChoice !== 'object' || firstChoice === null) return ''

  const choice = firstChoice as Record<string, unknown>
  if (typeof choice.text === 'string' && choice.text.trim()) {
    return choice.text.trim()
  }

  if (typeof choice.message === 'object' && choice.message !== null) {
    const message = choice.message as Record<string, unknown>
    return extractTextFromContentParts(message.content)
  }

  return ''
}

function extractAiReplyText(data: Record<string, unknown>, responseBody: string) {
  if (typeof data.text === 'string' && data.text.trim()) return data.text.trim()
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim()

  const choiceText = extractTextFromChoices(data)
  if (choiceText) return choiceText

  const rawText = responseBody.trim()
  if (rawText && Object.keys(data).length === 0) return rawText
  return ''
}

function createAiRequestError(message: string, details: Partial<AiRequestError> = {}) {
  const error = new Error(message) as AiRequestError
  Object.assign(error, details)
  return error
}

function getErrorField(error: unknown, field: keyof AiRequestError) {
  if (typeof error !== 'object' || error === null || !(field in error)) return undefined
  return (error as AiRequestError)[field]
}

function logAiRequestFailure({
  abortReason,
  attempt,
  error,
}: {
  abortReason: string
  attempt: number
  error: unknown
}) {
  const status = getErrorField(error, 'status')
  const statusText = getErrorField(error, 'statusText')
  const responseBody = getErrorField(error, 'responseBody')
  const model = getErrorField(error, 'model')
  const aborted = isAbortError(error)
  const timeout = aborted && abortReason === 'timeout'
  const name = error instanceof Error
    ? error.name
    : typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: unknown }).name)
      : undefined
  const message = getAbortErrorMessage(error) || (typeof error === 'string' ? error : undefined)

  console.error('Ascend AI request failed', {
    aborted,
    attempt,
    endpoint: getErrorField(error, 'endpoint') ?? AI_ENDPOINT,
    message,
    model,
    name,
    responseBody,
    status,
    statusText,
    timeout,
  })
}

export async function fetchAI(prompt: string, signal?: AbortSignal): Promise<SmartFitAiReply> {
  const cleanPrompt = sanitizePrompt(prompt)
  if (!cleanPrompt) throw new Error('empty-prompt')

  let lastError: unknown = null

  for (let attempt = 0; attempt <= MAX_AI_RETRIES; attempt += 1) {
    const { controller, dispose } = createAbortController(cleanPrompt, signal)

    try {
      if (import.meta.env.DEV) console.log('request started', { attempt: attempt + 1 })
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: cleanPrompt }),
        signal: controller.signal,
      })
      const responseBody = await response.text()
      const data = parseAiResponseBody(responseBody)
      const model = typeof data.model === 'string' ? data.model : undefined
      const replyText = extractAiReplyText(data, responseBody)

      if (!response.ok) {
        throw createAiRequestError(`api-status-${response.status}`, {
          endpoint: AI_ENDPOINT,
          model,
          responseBody,
          status: response.status,
          statusText: response.statusText,
        })
      }

      if (!replyText) {
        throw createAiRequestError('empty-ai-response', {
          endpoint: AI_ENDPOINT,
          model,
          responseBody,
          status: response.status,
          statusText: response.statusText,
        })
      }

      if (import.meta.env.DEV) console.log('request completed', { attempt: attempt + 1, status: response.status })
      if (import.meta.env.DEV) console.log('AI reply text:', replyText)
      const isLocalMode = data.mode === 'local' || data.model === 'local-mode'
      return {
        mode: isLocalMode ? 'local' : 'openrouter',
        modeLabel: typeof data.modeLabel === 'string'
          ? data.modeLabel
          : isLocalMode
            ? getLocalModeLabel(getStoredLanguage())
            : undefined,
        text: replyText,
      }
    } catch (error) {
      lastError = error
      const abortReason =
        getAbortReason(controller.signal) ||
        getAbortReason(signal) ||
        getAbortErrorMessage(error)
      const isUserCancellation =
        isAbortError(error) &&
        (abortReason === 'new-message' || abortReason === 'cancelled')

      if (isAbortError(error)) {
        if (import.meta.env.DEV) console.log('request aborted', { attempt: attempt + 1, reason: abortReason || 'unknown' })
      }

      if (!isUserCancellation) {
        logAiRequestFailure({ abortReason, attempt: attempt + 1, error })
      }

      const isServerLocalMode =
        error instanceof Error && (error as AiRequestError).skipRetry === true

      if (isUserCancellation || isServerLocalMode || attempt >= MAX_AI_RETRIES) {
        throw error
      }

      if (import.meta.env.DEV) console.log('retrying request', { nextAttempt: attempt + 2 })
      await wait(450)
    } finally {
      dispose()
    }
  }

  throw lastError instanceof Error ? lastError : new Error('ai-fetch-failed')
}

export function handleFallback(request: Pick<HybridAiRequest, 'language' | 'profile' | 'stats' | 'timeoutLabel' | 'userMessage'>): SmartFitAiReply {
  const language = request.language ?? getStoredLanguage()
  try {
    const entries = getProgressEntries()
    const text = generateLocalReply(request.userMessage, request.profile, language, {
      entries,
      stats: request.stats,
    })

    if (text.trim()) {
      return {
        mode: 'local',
        modeLabel: request.timeoutLabel ?? getLocalModeLabel(language),
        text,
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.log('FITNESS AI local fallback failed', error)
  }

  return {
    mode: 'safe',
    modeLabel: getSafeModeLabel(language),
    text: getSafeBasicReply(request.userMessage, language),
  }
}

export async function getHybridAiReply(request: HybridAiRequest): Promise<SmartFitAiReply> {
  const language = request.language ?? getStoredLanguage()
  const userMessage = sanitizeUserMessage(request.userMessage)
  const prompt = sanitizePrompt(request.prompt)

  if (!userMessage) {
    return handleFallback({
      ...request,
      language,
      userMessage: language === 'en' ? 'General question about fitness and nutrition' : 'שאלה כללית על כושר ותזונה',
    })
  }

  const cacheKey = getCacheKey(prompt, userMessage, request.profile, request.stats, language)
  const cached = getCachedAiReply(cacheKey)
  if (cached) return toCachedReply(cached)

  try {
    const aiReply = await fetchAI(prompt, request.signal)
    setCachedAiReply({
      cacheKey,
      createdAt: new Date().toISOString(),
      mode: aiReply.mode,
      modeLabel: aiReply.modeLabel,
      text: aiReply.text,
    })
    return aiReply
  } catch (error) {
    if (isAbortError(error) && getAbortReason(request.signal) === 'new-message') {
      throw error
    }

    const timeoutLabel = isAbortError(error)
      ? request.timeoutLabel ?? getTimeoutLocalModeLabel(language)
      : getLocalModeLabel(language)
    const fallback = handleFallback({ ...request, language, timeoutLabel, userMessage })
    return fallback
  }
}
