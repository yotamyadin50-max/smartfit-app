import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useI18n } from '../context/I18nContext'
import { getAgeGuidance, useUser } from '../context/UserContext'
import { ChatMessage, suggestedQuestions } from '../data/mockChat'
import {
  getHybridAiReply,
  isAbortError,
  getLocalModeLabel,
  getTimeoutLocalModeLabel,
  handleFallback,
  sanitizeUserMessage,
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
import BottomNav from '../components/layout/BottomNav'

let msgIdCounter = 0
function makeId() { return String(++msgIdCounter) }

const MAX_CHAT_HISTORY_PROMPT_CHARS = 1800
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const buildPrompt = (text: string, nextMessages: ChatMessage[]) => {
    const answerLanguage = language === 'he' ? 'Hebrew' : 'English'
    const health = profile.health
    const nutrition = profile.nutrition
    const habits = profile.habits
    const watch = getConnectedWatch()
    const scale = getConnectedScale()
    const latestWeight = getLatestWeight(profile.weightKg)
    const progress = getProgressData()
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
    ].join('\n')
    const recentMessages = nextMessages
      .slice(-6)
      .map(message => `${message.role === 'user' ? 'User' : 'SmartFit'}: ${message.text}`)
      .join('\n')
      .slice(-MAX_CHAT_HISTORY_PROMPT_CHARS)

    return [
      `Answer in ${answerLanguage}.`,
      'You are SmartFit AI, a fitness and nutrition coach for general guidance only.',
      `User age group: ${ageGuidance.group}.`,
      'User profile:',
      profileContext,
      'Stay within fitness, training, recovery, healthy meals, and habits.',
      'When you create a workout or list exercises, keep each exercise explanation short: maximum 2-3 readable lines.',
      'For each exercise include only: how to do it briefly, the most important technique cue, and one short machine description if it is a machine exercise.',
      'Use simple language for beginners. For advanced users, add only one short cue about control or range of motion.',
      'Do not provide medical advice, extreme diets, unsafe exercises, or weight-loss promises.',
      'If the user asks for something risky, give a safer general alternative.',
      'Recent conversation:',
      recentMessages,
      `Current question: ${text}`,
    ].join('\n')
  }

  const executeSendMessage = async (cleanMessage: string) => {
    pendingMessageRef.current = null

    if (activeRequestRef.current && activeMessageRef.current === cleanMessage) {
      return
    }

    if (activeRequestRef.current) {
      cancelledRequestIdsRef.current.add(activeRequestIdRef.current)
      console.log('AI request aborted', { reason: 'new-message' })
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
      const replyResult = await getHybridAiReply({
        prompt: buildPrompt(userMsg.text, nextMessages),
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
      console.log('AI reply text:', replyText)
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

      console.log('SmartFit chat AI final failure', error)
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

  const loadingTitle = language === 'he' ? 'SmartFit AI חושב...' : 'SmartFit AI is thinking...'
  const loadingDetail = language === 'he'
    ? slowLoading ? 'יוצר תוכנית מותאמת אישית...' : 'מכין תשובה מותאמת...'
    : slowLoading ? 'Creating a personalized plan...' : 'Preparing a personalized answer...'

  return (
    <div className="app-layout chat-layout">
      <div className="chat-header">
        <div className="brand">
          <div className="brand-icon">AI</div>
          <span className="brand-name">{t('chatTitle')}</span>
        </div>
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
          {suggestedQuestions[language].map((question, index) => (
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

      <BottomNav />
    </div>
  )
}
