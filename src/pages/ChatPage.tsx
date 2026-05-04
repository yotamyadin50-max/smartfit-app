import { useState, useRef, useEffect } from 'react'
import { ChatMessage, getMockResponse, suggestedQuestions } from '../data/mockChat'
import BottomNav from '../components/layout/BottomNav'

let msgIdCounter = 0
function makeId() { return String(++msgIdCounter) }

const INITIAL_MESSAGE: ChatMessage = {
  id: makeId(),
  role: 'assistant',
  text: "Hi! I'm SmartFit AI 🤖 I can help with fitness and nutrition questions. (Note: this is a demo — real AI responses coming soon!)",
  timestamp: new Date(),
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = { id: makeId(), role: 'user', text: text.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // TODO: replace with real AI call (src/lib/ai.ts → sendChatMessage)
    setTimeout(() => {
      const reply: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        text: getMockResponse(text),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, reply])
      setLoading(false)
    }, 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="app-layout chat-layout">
      <div className="chat-header">
        <div className="brand">
          <div className="brand-icon">🤖</div>
          <span className="brand-name">AI <span>Coach</span></span>
        </div>
        <span className="chat-scope-badge">Fitness & Nutrition only</span>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble-wrap ${msg.role}`}>
            {msg.role === 'assistant' && <span className="chat-avatar">🤖</span>}
            <div className={`chat-bubble ${msg.role}`}>
              <p>{msg.text}</p>
              <span className="chat-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-wrap assistant">
            <span className="chat-avatar">🤖</span>
            <div className="chat-bubble assistant typing">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="suggested-questions">
          {suggestedQuestions.map(q => (
            <button key={q} className="suggested-q-btn" onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder="Ask about fitness or nutrition…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className="chat-send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
          ➤
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
