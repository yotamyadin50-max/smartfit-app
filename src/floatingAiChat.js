import { getHybridAiReply, handleFallback, sanitizeUserMessage } from './lib/aiClient'

const chatRoot = document.getElementById('sf-floating-ai-chat')

if (chatRoot) {
  const chatText = {
    en: {
      close: 'Close AI chat',
      error: 'The AI service is not available right now. Please try again later.',
      emptyReply: 'I could not generate a response. Please try again.',
      initial: 'Hi, I am your floating AI coach. Ask me a question and I will answer here.',
      loading: 'Thinking...',
      placeholder: 'Ask anything...',
      retrying: 'Connection failed. Trying once more...',
      send: 'Send',
      title: 'AI Coach',
      toggle: 'Open AI chat',
    },
    he: {
      close: 'סגור צ׳אט AI',
      error: 'השירות לא זמין כרגע, נסה שוב מאוחר יותר.',
      emptyReply: 'לא הצלחתי ליצור תשובה. נסה שוב.',
      initial: 'היי, אני מאמן ה-AI הצף שלך. כתוב שאלה ואענה כאן.',
      loading: 'חושב...',
      placeholder: 'שאל כל דבר...',
      retrying: 'החיבור נכשל. מנסה שוב פעם אחת...',
      send: 'שלח',
      title: 'מאמן AI',
      toggle: 'פתח צ׳אט AI',
    },
  }

  const getLanguage = () => {
    try {
      const storedLanguage = JSON.parse(window.localStorage.getItem('smartfit_language') || 'null')
      if (storedLanguage === 'he' || storedLanguage === 'en') return storedLanguage
    } catch {
      // Keep the chat usable even if localStorage is blocked or corrupted.
    }

    return document.documentElement.lang === 'he' ? 'he' : 'en'
  }
  const getCopy = () => chatText[getLanguage()]

  chatRoot.innerHTML = `
    <button class="sf-ai-chat-toggle" type="button" aria-label="Open AI chat" aria-expanded="false">
      <span class="sf-ai-chat-toggle-glow"></span>
      <span class="sf-ai-chat-toggle-text">AI</span>
    </button>
    <section class="sf-ai-chat-panel" aria-label="Floating AI chat" hidden>
      <header class="sf-ai-chat-header">
        <div>
          <p class="sf-ai-chat-kicker">SmartFit AI</p>
          <h2 class="sf-ai-chat-title">AI Coach</h2>
        </div>
        <button class="sf-ai-chat-close" type="button" aria-label="Close AI chat">&times;</button>
      </header>
      <div class="sf-ai-chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
      <form class="sf-ai-chat-form">
        <textarea class="sf-ai-chat-input" rows="1" maxlength="500" placeholder="Ask anything..."></textarea>
        <button class="sf-ai-chat-send" type="submit">Send</button>
      </form>
    </section>
  `

  const toggle = chatRoot.querySelector('.sf-ai-chat-toggle')
  const panel = chatRoot.querySelector('.sf-ai-chat-panel')
  const closeButton = chatRoot.querySelector('.sf-ai-chat-close')
  const messages = chatRoot.querySelector('.sf-ai-chat-messages')
  const form = chatRoot.querySelector('.sf-ai-chat-form')
  const input = chatRoot.querySelector('.sf-ai-chat-input')
  const sendButton = chatRoot.querySelector('.sf-ai-chat-send')
  const title = chatRoot.querySelector('.sf-ai-chat-title')

  let isWaitingForReply = false

  const applyCopy = () => {
    const text = getCopy()
    toggle.setAttribute('aria-label', text.toggle)
    closeButton.setAttribute('aria-label', text.close)
    title.textContent = text.title
    input.placeholder = text.placeholder
    sendButton.textContent = text.send
  }

  const setChatOpen = isOpen => {
    panel.hidden = !isOpen
    toggle.setAttribute('aria-expanded', String(isOpen))
    chatRoot.classList.toggle('sf-ai-chat-open', isOpen)
    if (isOpen) {
      applyCopy()
      input.focus()
    }
  }

  const scrollToLatest = () => {
    messages.scrollTop = messages.scrollHeight
  }

  const createMessage = (role, text) => {
    const bubble = document.createElement('div')
    bubble.className = `sf-ai-chat-message sf-ai-chat-message-${role}`

    const body = document.createElement('p')
    body.textContent = text
    bubble.appendChild(body)

    messages.appendChild(bubble)
    scrollToLatest()
    return bubble
  }

  const setLoadingState = isLoading => {
    isWaitingForReply = isLoading
    sendButton.disabled = isLoading
    input.disabled = isLoading
  }

  const formatReply = reply => (
    reply.mode === 'openrouter'
      ? reply.text
      : `[${reply.modeLabel}]\n${reply.text}`
  )

  const fetchAiReply = async message => {
    const prompt = sanitizeUserMessage(message)
    if (!prompt) return formatReply(handleFallback({ userMessage: 'שאלה כללית על כושר ותזונה' }))

    const reply = await getHybridAiReply({ prompt, userMessage: prompt })
    const replyText = formatReply(reply).trim()
    console.log('AI reply text:', replyText)
    return replyText || formatReply(handleFallback({ userMessage: prompt }))
  }

  const sendMessage = async message => {
    const text = getCopy()
    const cleanMessage = sanitizeUserMessage(message)
    if (!cleanMessage || isWaitingForReply) return

    createMessage('user', cleanMessage)
    input.value = ''
    input.style.height = ''
    setLoadingState(true)

    const loadingBubble = createMessage('bot', text.loading)
    loadingBubble.classList.add('sf-ai-chat-message-loading')

    try {
      const reply = await fetchAiReply(cleanMessage)
      loadingBubble.classList.remove('sf-ai-chat-message-loading')
      loadingBubble.querySelector('p').textContent = reply.trim() || getCopy().emptyReply
    } catch (error) {
      console.log('SmartFit floating AI final failure', error)
      const fallback = handleFallback({ userMessage: cleanMessage })
      loadingBubble.classList.remove('sf-ai-chat-message-loading')
      loadingBubble.querySelector('p').textContent = formatReply(fallback)
    } finally {
      setLoadingState(false)
      input.focus()
      scrollToLatest()
    }
  }

  toggle.addEventListener('click', () => setChatOpen(panel.hidden))
  closeButton.addEventListener('click', () => setChatOpen(false))

  form.addEventListener('submit', event => {
    event.preventDefault()
    sendMessage(input.value)
  })

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      form.requestSubmit()
    }
  })

  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`
  })

  applyCopy()
  createMessage('bot', getCopy().initial)

  new MutationObserver(applyCopy).observe(document.documentElement, {
    attributeFilter: ['lang', 'dir'],
    attributes: true,
  })
}
