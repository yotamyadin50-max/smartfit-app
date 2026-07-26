import PageHeader from '../components/layout/PageHeader'
import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useI18n } from '../context/I18nContext'
import { getAgeGuidance, useUser } from '../context/UserContext'
import type { ChatMessage } from '../data/mockChat'
import type { Language } from '../context/I18nContext'
import type { UserProfile } from '../context/UserContext'
import { getTodayCheckin } from '../lib/dailyCheckin'

function getPersonalizedSuggestions(profile: Partial<UserProfile>, language: Language): string[] {
  const isHe = language === 'he'
  const goals = profile.goals?.length ? profile.goals : [profile.goal ?? 'fitness']
  const level = profile.fitnessLevel ?? profile.level ?? 'beginner'

  if (isHe) {
    if (goals.includes('cut'))        return ['כמה קלוריות כדאי לאכול ביום?', 'אילו תרגילים הכי טובים לשריפת שומן?', 'מה לאכול לפני ואחרי אימון?', 'כמה פעמים בשבוע כדאי להתאמן?', 'איך שומרים על מוטיבציה?']
    if (goals.includes('bulk'))       return ['כמה חלבון אני צריך ביום?', 'אילו תרגילים הכי טובים לבניית שריר?', 'מה לאכול אחרי אימון?', 'כמה קלוריות להוסיף לעלייה?', 'כמה ימי מנוחה צריך?']
    if (goals.includes('endurance'))  return ['כיצד לשפר ביצועי ריצה?', 'מה לאכול לפני אימון אירובי?', 'כמה מים לשתות ביום?', 'כיצד למנוע פציעות?', 'מה הקצב המומלץ לאימון?']
    if (level === 'beginner')         return ['איפה מתחילים עם אימונים?', 'כמה פעמים בשבוע כדאי להתאמן למתחילים?', 'מה לאכול לפני אימון?', 'כמה חלבון אני צריך?', 'כמה ימי מנוחה צריך?']
    return ['כמה חלבון אני צריך?', 'כמה ימי מנוחה כדאי בשבוע?', 'מה לאכול לפני אימון?', 'איך בונים שריר מהר יותר?', 'האם אירובי חשוב לחיטוב?']
  }

  if (goals.includes('cut'))        return ['How many calories should I eat per day?', 'Best exercises for fat burning?', 'What to eat before and after a workout?', 'How many times a week should I train?', 'How do I stay motivated?']
  if (goals.includes('bulk'))       return ['How much protein do I need per day?', 'Best exercises for muscle building?', 'What to eat after a workout?', 'How many calories to add for bulking?', 'How many rest days do I need?']
  if (goals.includes('endurance'))  return ['How do I improve my running?', 'What to eat before cardio?', 'How much water per day?', 'How to prevent injuries?', 'What is a good training pace?']
  if (level === 'beginner')         return ['Where do I start with training?', 'How many times a week for beginners?', 'What to eat before a workout?', 'How much protein do I need?', 'How many rest days do I need?']
  return ['How much protein do I need?', 'How many rest days per week?', 'What should I eat before a workout?', 'How do I build muscle faster?', 'Is cardio necessary for fat loss?']
}
import {
  getHybridAiReply,
  isAbortError,
  getLocalModeLabel,
  getTimeoutLocalModeLabel,
  handleFallback,
  sanitizeUserMessage,
  type AiChatMessage,
} from '../lib/aiClient'
import {
  getRecentChatMessages,
  saveRecentChatMessages,
  type StoredChatMessage,
} from '../lib/smartfitData'
import { getConnectedScale, getConnectedWatch, getLatestWeight } from '../deviceConnections'
import { getProgressData } from '../progressStorage'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { loadChatHistoryFromSupabase, saveChatMessageToSupabase } from '../lib/supabaseDb'


function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const MAX_CHAT_HISTORY_PROMPT_CHARS = 1800
// Server's sanitizeMessages() hard-rejects a combined messages payload over
// 6000 chars (server/openRouterAi.js). Keep well under that so a long
// conversation with verbose AI replies never trips the server-side reject —
// which previously showed the user a raw "[Local mode] Messages were empty
// or invalid." string instead of a real answer.
const MAX_CHAT_MESSAGES_TOTAL_CHARS = 4000
const CHAT_SEND_DEBOUNCE_MS = 300
const SLOW_AI_LOADING_MS = 10000

type ChatUiMessage = ChatMessage & {
  isLocalMode?: boolean
  localModeLabel?: string
}

function toUiMessage(message: StoredChatMessage): ChatUiMessage {
  return {
    ...message,
    timestamp: new Date(message.timestamp),
  }
}

// Keeps the system message plus as much of the most recent history as fits
// in maxTotalChars, dropping the oldest turns first.
function capMessagesLength(messages: AiChatMessage[], maxTotalChars: number): AiChatMessage[] {
  const [system, ...history] = messages
  let total = system.content.length
  const kept: AiChatMessage[] = []
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const next = history[i]
    if (total + next.content.length > maxTotalChars && kept.length > 0) break
    total += next.content.length
    kept.unshift(next)
  }
  return [system, ...kept]
}

function toStoredMessage(message: ChatUiMessage): StoredChatMessage {
  return {
    id: message.id,
    isLocalMode: message.isLocalMode,
    localModeLabel: message.localModeLabel,
    role: message.role,
    text: message.text,
    timestamp: message.timestamp.toISOString(),
  }
}

export default function ChatPage() {
  const { t, language } = useI18n()
  const { profile, stats } = useUser()
  const ageGuidance = getAgeGuidance(profile)
  const createInitialMessage = (): ChatUiMessage => ({
    id: makeId(),
    role: 'assistant',
    text: `${t('chatInitial')} ${t('ageChatNote')}: ${t(ageGuidance.group)}.`,
    timestamp: new Date(),
  })
  const [messages, setMessages] = useState<ChatUiMessage[]>(() => {
    const storedMessages = getRecentChatMessages().map(toUiMessage)
    return storedMessages.length ? storedMessages : [createInitialMessage()]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [slowLoading, setSlowLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeRequestRef = useRef<AbortController | null>(null)
  const activeRequestIdRef = useRef(0)
  const cancelledRequestIdsRef = useRef<Set<number>>(new Set())
  const debounceTimerRef = useRef<number | null>(null)
  const slowLoadingTimerRef = useRef<number | null>(null)
  const pendingMessageRef = useRef<string | null>(null)
  const activeMessageRef = useRef<string | null>(null)
  const messagesRef = useRef<ChatUiMessage[]>(messages)

  useEffect(() => {
    messagesRef.current = messages
    saveRecentChatMessages(messages.map(toStoredMessage))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history from Supabase on mount (replaces localStorage if cloud has messages)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const cloudMessages = await loadChatHistoryFromSupabase(data.user.id)
      if (!cloudMessages.length) return
      const storedMessages: StoredChatMessage[] = cloudMessages.map(row => ({
        id: row.id,
        role: row.role,
        text: row.text,
        timestamp: row.timestamp,
        isLocalMode: row.is_local_mode ?? false,
        localModeLabel: row.local_mode_label,
      }))
      setMessages(storedMessages.map(toUiMessage))
    })
  // isSupabaseConfigured is a module-level constant (never changes) — safe to omit.
  }, [setMessages])

  useEffect(() => () => {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    if (slowLoadingTimerRef.current) window.clearTimeout(slowLoadingTimerRef.current)
    pendingMessageRef.current = null
  }, [])

  const clearSlowLoadingTimer = () => {
    if (slowLoadingTimerRef.current) {
      window.clearTimeout(slowLoadingTimerRef.current)
      slowLoadingTimerRef.current = null
    }
  }

  const buildPrompt = (text: string, nextMessages: ChatUiMessage[]): { prompt: string; messages: AiChatMessage[] } => {
    const answerLanguage = language === 'he' ? 'Hebrew' : 'English'
    const health = profile.health
    const nutrition = profile.nutrition
    const habits = profile.habits
    const watch = getConnectedWatch()
    const scale = getConnectedScale()
    const latestWeight = getLatestWeight(profile.weightKg)
    const progress = getProgressData()

    // Last 3 workouts for AI context
    const recentWorkouts = [...progress.workouts, ...progress.cardio]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
    const recentWorkoutsLine = recentWorkouts.length
      ? `האימונים האחרונים: ${recentWorkouts.map(w => `${w.type} ${w.duration}דק (${new Date(w.date).toLocaleDateString('he-IL')})`).join(', ')}. streak: ${stats.streak} ימים. XP: ${stats.xp}.`
      : `streak: ${stats.streak} ימים. XP: ${stats.xp}. אין עדיין אימונים מוקלטים.`

    // Daily feeling context
    const todayCheckin = getTodayCheckin()
    const feelingLine = todayCheckin
      ? `תחושת המשתמש היום: ${todayCheckin.feeling === '💪' ? 'מצוין/מוכן לאימון' : todayCheckin.feeling === '😴' ? 'עייף/אנרגיה נמוכה' : 'בסדר'}.`
      : ''

    const profileContext = [
      `name: ${profile.name || 'not provided'}`,
      `age: ${profile.age ?? 'not provided'}`,
      `level: ${profile.level ?? profile.fitnessLevel}`,
      `goals: ${(profile.goals ?? [profile.goal]).join(', ')}`,
      `workout days per week: ${profile.workout_days ?? 'not provided'}`,
      `workout time: ${profile.workout_time ?? profile.workoutDuration} min`,
      `equipment: ${(profile.equipment ?? []).join(', ') || 'not provided'}`,
      `nutrition: eats regularly ${nutrition?.eatsRegularly ?? 'unknown'}, meals ${nutrition?.mealsPerDay ?? 'unknown'}, likes ${nutrition?.likedFoods || 'not provided'}, avoids ${nutrition?.avoidedFoods || 'not provided'}, sensitivities ${nutrition?.sensitivities || 'not provided'}`,
      `health: injuries ${health?.hasPainOrInjuries ?? false}, sensitive areas ${(health?.sensitiveAreas ?? []).join(', ') || 'none'}, energy ${health?.energyLevel ?? 'unknown'}, sleep ${health?.sleepHours ?? 'unknown'} hours`,
      `habits: activity ${habits?.dailyActivity ?? 'unknown'}, fixed workout time ${habits?.fixedWorkoutTime ?? 'unknown'}, hardest part ${habits?.hardestPart ?? 'unknown'}`,
      `devices: smart watch ${watch.connected ? 'connected' : 'not connected'}, smart scale ${scale.connected ? 'connected' : 'not connected'}, latest weight ${latestWeight ?? 'not provided'}`,
      `progress: workouts ${progress.workouts.length}, cardio sessions ${progress.cardio.length}, saved meal plans ${progress.mealPlans.length}`,
      recentWorkoutsLine,
      ...(feelingLine ? [feelingLine] : []),
    ].join('\n')
    const recentMessages = nextMessages
      .slice(-6)
      .map(message => `${message.role === 'user' ? 'User' : 'Ascend AI'}: ${message.text}`)
      .join('\n')
      .slice(-MAX_CHAT_HISTORY_PROMPT_CHARS)

    const userName = profile.name?.trim()
    const systemContent = [
      `Answer in ${answerLanguage}.`,
      'You are Ascend AI, a fitness and nutrition coach for general guidance only.',
      userName ? `The user's name is ${userName}. Address them by name naturally.` : '',
      `User age group: ${ageGuidance.group}.`,
      'IMPORTANT: Keep every reply short — 10 lines maximum. Be direct and skip filler sentences.',
      'User profile:',
      profileContext,
      'Stay within fitness, training, recovery, healthy meals, and habits.',
      'When you create a workout or list exercises, keep each exercise explanation short: maximum 1-2 lines.',
      'Do not provide medical advice, extreme diets, unsafe exercises, or weight-loss promises.',
      'If the user asks for something risky, give a safer general alternative.',
    ].join('\n')

    const prompt = [
      systemContent,
      'Recent conversation:',
      recentMessages,
      `Current question: ${text}`,
    ].join('\n')

    // Real messages array (system + turn-by-turn history) so the model gets
    // proper multi-turn context instead of one flattened string. Capped so a
    // long conversation never trips the server's combined-length limit.
    const messages = capMessagesLength([
      { role: 'system', content: systemContent },
      ...nextMessages.slice(-6).map(message => ({ role: message.role, content: message.text })),
    ], MAX_CHAT_MESSAGES_TOTAL_CHARS)

    return { prompt, messages }
  }

  const executeSendMessage = async (cleanMessage: string) => {
    pendingMessageRef.current = null

    if (activeRequestRef.current && activeMessageRef.current === cleanMessage) {
      return
    }

    if (activeRequestRef.current) {
      cancelledRequestIdsRef.current.add(activeRequestIdRef.current)
      if (import.meta.env.DEV) console.log('AI request aborted', { reason: 'new-message' })
      activeRequestRef.current.abort(new DOMException('new-message', 'AbortError'))
    }

    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId
    const controller = new AbortController()
    activeRequestRef.current = controller
    activeMessageRef.current = cleanMessage

    const userMsg: ChatMessage = { id: makeId(), role: 'user', text: cleanMessage, timestamp: new Date() }
    const nextMessages = [...messagesRef.current, userMsg]
    setMessages(prev => [...prev, userMsg])
    // Save user message to Supabase (fire-and-forget)
    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data }) => {
        if (cancelledRequestIdsRef.current.has(requestId)) return
        if (data.user) saveChatMessageToSupabase(data.user.id, {
          id: userMsg.id,
          role: 'user',
          text: userMsg.text,
          timestamp: userMsg.timestamp.toISOString(),
        })
      })
    }
    setInput('')
    setSlowLoading(false)
    setLoading(true)
    clearSlowLoadingTimer()
    slowLoadingTimerRef.current = window.setTimeout(() => {
      slowLoadingTimerRef.current = null
      setSlowLoading(true)
    }, SLOW_AI_LOADING_MS)

    try {
      const { prompt, messages } = buildPrompt(userMsg.text, nextMessages)
      const replyResult = await getHybridAiReply({
        prompt,
        messages,
        language,
        profile,
        signal: controller.signal,
        stats,
        timeoutLabel: getTimeoutLocalModeLabel(language),
        userMessage: userMsg.text,
      })

      if (cancelledRequestIdsRef.current.has(requestId)) {
        cancelledRequestIdsRef.current.delete(requestId)
        return
      }

      const replyText = replyResult.text.trim()
      if (import.meta.env.DEV) console.log('AI reply text:', replyText)
      if (!replyText) {
        const fallback = handleFallback({
          profile,
          language,
          stats,
          userMessage: userMsg.text,
        })
        setMessages(prev => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            text: fallback.text,
            timestamp: new Date(),
            isLocalMode: true,
            localModeLabel: fallback.modeLabel,
          },
        ])
        return
      }

      const reply: ChatUiMessage = {
        id: makeId(),
        role: 'assistant',
        text: replyText,
        timestamp: new Date(),
        isLocalMode: replyResult.mode !== 'openrouter',
        localModeLabel: replyResult.modeLabel,
      }
      setMessages(prev => [...prev, reply])
      // Save AI reply to Supabase (fire-and-forget)
      if (isSupabaseConfigured) {
        supabase.auth.getUser().then(({ data }) => {
          if (cancelledRequestIdsRef.current.has(requestId)) return
          if (data.user) saveChatMessageToSupabase(data.user.id, {
            id: reply.id,
            role: 'assistant',
            text: reply.text,
            timestamp: reply.timestamp.toISOString(),
            is_local_mode: reply.isLocalMode,
            local_mode_label: reply.localModeLabel,
          })
        })
      }
    } catch (error) {
      if (cancelledRequestIdsRef.current.has(requestId)) {
        cancelledRequestIdsRef.current.delete(requestId)
        return
      }

      console.warn('Ascend AI chat AI final failure', error)
      const fallback = handleFallback({
        profile,
        language,
        stats,
        timeoutLabel: isAbortError(error) ? getTimeoutLocalModeLabel(language) : getLocalModeLabel(language),
        userMessage: userMsg.text,
      })
      setMessages(prev => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          text: fallback.text,
          timestamp: new Date(),
          isLocalMode: true,
          localModeLabel: fallback.modeLabel,
        },
      ])
    } finally {
      if (activeRequestIdRef.current === requestId) {
        activeRequestRef.current = null
        activeMessageRef.current = null
        clearSlowLoadingTimer()
        setSlowLoading(false)
        setLoading(false)
      }
    }
  }

  const sendMessage = (text: string) => {
    const cleanMessage = sanitizeUserMessage(text)
    if (!cleanMessage) return
    if (pendingMessageRef.current === cleanMessage) return
    if (activeRequestRef.current && activeMessageRef.current === cleanMessage) return

    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    pendingMessageRef.current = cleanMessage
    setInput('')

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      void executeSendMessage(cleanMessage)
    }, CHAT_SEND_DEBOUNCE_MS)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(input)
    }
  }

  const loadingTitle = language === 'he' ? 'Ascend AI חושב...' : 'Ascend AI is thinking...'
  const loadingDetail = language === 'he'
    ? slowLoading ? 'עדיין מחשב, זה לוקח קצת יותר...' : 'מכין תשובה מותאמת...'
    : slowLoading ? 'Still thinking, this is taking a bit longer...' : 'Preparing a personalized answer...'

  return (
    <div className="app-layout chat-layout">
      <PageHeader title={`🤖 ${t('chatTitle')}`} />
      <div className="chat-header" style={{ paddingTop: 0 }}>
        <span className="chat-scope-badge">{t('chatScope')} - {t(ageGuidance.group)}</span>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={`${message.id}-${message.timestamp.getTime()}-${index}`} className={`chat-bubble-wrap ${message.role}`}>
            {message.role === 'assistant' && <span className="chat-avatar">AI</span>}
            <div className={`chat-bubble ${message.role}`}>
              {message.isLocalMode && <span className="chat-local-mode-badge">{message.localModeLabel || getLocalModeLabel(language)}</span>}
              <p>{message.text}</p>
              <span className="chat-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-wrap assistant">
            <span className="chat-avatar">AI</span>
            <div className="chat-bubble assistant typing">
              <div className="chat-loading-row" aria-label={loadingTitle}>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                <span className="chat-loading-title">{loadingTitle}</span>
              </div>
              <span className="chat-loading-detail">{loadingDetail}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="suggested-questions">
          {getPersonalizedSuggestions(profile, language).map((question, index) => (
            <button key={`${language}-suggestion-${index}-${question}`} className="suggested-q-btn" onClick={() => sendMessage(question)}>{question}</button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder={t('chatPlaceholder')}
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={500}
        />
        <button className="chat-send-btn" onClick={() => sendMessage(input)} disabled={!input.trim()} aria-label={t('send')}>
          {t('send')}
        </button>
      </div>

    </div>
  )
}
