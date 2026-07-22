import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.txt' })

// ── Constants ────────────────────────────────────────────────────────────────

const OPENROUTER_URL  = 'https://openrouter.ai/api/v1/chat/completions'
const HTTP_REFERER    = 'http://localhost:5173'
const APP_TITLE       = 'Ascend AI'
const TIMEOUT_MS      = 30000
// Free-tier models first. google/gemini-flash-1.5 (paid) is kept at the end,
// not first — live testing during this session confirmed it currently fails
// on every request (no usable credit/access on this OpenRouter key), so
// trying it first was wasting one guaranteed-failed round-trip per chat
// message. If credit is added back, move it to the front again.
const MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',           // NVIDIA 30B — less traffic
  'z-ai/glm-4.5-air:free',                         // Z-AI — less popular
  'google/gemma-4-26b-a4b-it:free',                // Google 26B
  'poolside/laguna-m.1:free',                       // Poolside — less popular
  'openai/gpt-oss-20b:free',                        // OpenAI 20B
  'qwen/qwen3-next-80b-a3b-instruct:free',          // Qwen 80B
  'nvidia/nemotron-3-super-120b-a12b:free',         // NVIDIA 120B
  'openai/gpt-oss-120b:free',                       // OpenAI 120B
  'meta-llama/llama-3.2-3b-instruct:free',          // Meta 3B — small fallback
  'nousresearch/hermes-3-llama-3.1-405b:free',      // last resort
  'google/gemini-flash-1.5',                        // paid — currently failing, tried last
]

export const MAX_PROMPT_LENGTH = 4000

// ── Per-IP rate limiting ─────────────────────────────────────────────────────
// Prevents a single user/bot from spamming /api/ai.
// Window: 60 seconds. Max requests per window: 15.

const IP_RATE_WINDOW_MS  = 60_000   // 1 minute window
const IP_RATE_MAX        = 15       // max AI requests per minute per IP
const ipRequestLog = new Map()      // ip → [timestamp, ...]

function getClientIp(req) {
  // Support reverse-proxy headers (Vercel, Netlify, Cloudflare). The LEFTMOST
  // entry in x-forwarded-for is client-supplied and can be spoofed to get a
  // fresh rate-limit bucket on every request; the edge proxy appends the
  // real client IP as the LAST entry, which is the one to trust.
  const forwarded = req.headers?.['x-forwarded-for']
  if (forwarded) {
    const parts = forwarded.split(',').map(part => part.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return req.socket?.remoteAddress ?? 'unknown'
}

function checkIpRateLimit(req) {
  const ip  = getClientIp(req)
  const now = Date.now()
  const log = (ipRequestLog.get(ip) ?? []).filter(t => now - t < IP_RATE_WINDOW_MS)
  if (log.length >= IP_RATE_MAX) {
    const retryAfter = Math.ceil((log[0] + IP_RATE_WINDOW_MS - now) / 1000)
    return { limited: true, retryAfter }
  }
  log.push(now)
  ipRequestLog.set(ip, log)
  // Evict stale IPs every 500 entries to prevent memory growth
  if (ipRequestLog.size > 500) {
    for (const [k, v] of ipRequestLog) {
      if (v.every(t => now - t >= IP_RATE_WINDOW_MS)) ipRequestLog.delete(k)
    }
  }
  return { limited: false }
}

// ── Per-model rate-limit memory ──────────────────────────────────────────────
// Remembers which models are rate-limited and for how long (60s cooldown).
// Persists across requests for the lifetime of the server process.

const RATE_LIMIT_COOLDOWN_MS = 30_000
const rateLimitedUntil = new Map() // modelId → timestamp when it's safe to retry

function isRateLimited(model) {
  const until = rateLimitedUntil.get(model)
  if (!until) return false
  if (Date.now() >= until) {
    rateLimitedUntil.delete(model)
    return false
  }
  return true
}

function markRateLimited(model) {
  const until = Date.now() + RATE_LIMIT_COOLDOWN_MS
  rateLimitedUntil.set(model, until)
  const secsLeft = Math.ceil(RATE_LIMIT_COOLDOWN_MS / 1000)
  console.log(`Model ${model} rate-limited — cooling down for ${secsLeft}s`)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizePrompt(value) {
  if (typeof value !== 'string') throw { status: 400, message: 'Prompt must be a string.' }
  // Remove ASCII control characters only — keep all printable text including Hebrew
  const prompt = value.replace(/\p{Cc}/gu, '').trim()
  if (!prompt) throw { status: 400, message: 'Prompt cannot be empty.' }
  if (prompt.length > MAX_PROMPT_LENGTH) throw { status: 413, message: 'Prompt too long (max 4000).' }
  return prompt
}

const MAX_MESSAGES_TOTAL_LENGTH = 6000
const ALLOWED_MESSAGE_ROLES = new Set(['system', 'user', 'assistant'])

// Structured chat history (system + turn-by-turn), used by ChatPage instead of one
// flattened prompt string, so the model gets a proper multi-turn conversation.
function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw { status: 400, message: 'Messages must be a non-empty array.' }
  }
  const cleaned = rawMessages
    .filter(m => m && typeof m === 'object' && ALLOWED_MESSAGE_ROLES.has(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.replace(/\p{Cc}/gu, '').trim() }))
    .filter(m => m.content.length > 0)

  if (cleaned.length === 0) {
    throw { status: 400, message: 'Messages must contain at least one non-empty message.' }
  }
  const totalLength = cleaned.reduce((sum, m) => sum + m.content.length, 0)
  if (totalLength > MAX_MESSAGES_TOTAL_LENGTH) {
    throw { status: 413, message: `Messages too long (max ${MAX_MESSAGES_TOTAL_LENGTH} chars combined).` }
  }
  return cleaned
}

function getPromptLanguage(prompt) {
  const low = prompt.toLowerCase()
  if (low.includes('answer in english')) return 'en'
  if (low.includes('answer in hebrew'))  return 'he'
  return /[֐-׿]/.test(prompt) ? 'he' : 'en'
}

function localModeReply(prompt, reason) {
  const lang = getPromptLanguage(prompt)
  const low  = prompt.toLowerCase()
  const note = reason ? `(${reason})` : ''

  if (lang === 'he') {
    if (/אימון|כושר|תרגיל/.test(low)) {
      return [
        '[מצב מקומי — ללא API]',
        note,
        'המודל החינמי לא זמין כרגע.',
        '',
        '1. חימום קל 5 דקות.',
        '2. 2-3 סבבים: סקואטים, שכיבות סמיכה, פלאנק 20 שניות.',
        '3. מנוחה 60-90 שניות בין סבבים.',
        '',
        'המידע כללי בלבד ואינו מחליף ייעוץ מקצועי.',
      ].filter(Boolean).join('\n')
    }
    if (/תזונה|אוכל|ארוחה|מתכון/.test(low)) {
      return [
        '[מצב מקומי — ללא API]',
        note,
        'ארוחה מאוזנת: חלבון + ירק + פחמימה זמינה.',
        '',
        'המידע כללי בלבד ואינו מחליף ייעוץ מקצועי.',
      ].filter(Boolean).join('\n')
    }
    return [
      '[מצב מקומי — ללא API]',
      note,
      'ניתן לשאול על כושר, תזונה, התאוששות והרגלים.',
      '',
      'המידע כללי בלבד ואינו מחליף ייעוץ מקצועי.',
    ].filter(Boolean).join('\n')
  }

  if (/workout|exercise|training|fitness/.test(low)) {
    return [
      '[Local mode — no API]',
      note,
      'The free model is unavailable right now.',
      '',
      '1. Warm up 5 minutes.',
      '2. 2-3 rounds: squats, push-ups, 20-second plank.',
      '3. Rest 60-90 seconds between rounds.',
      '',
      'General information only — not a substitute for professional advice.',
    ].filter(Boolean).join('\n')
  }
  if (/nutrition|meal|recipe|food/.test(low)) {
    return [
      '[Local mode — no API]',
      note,
      'The free model is unavailable right now.',
      '',
      'Balanced meal: one protein source + vegetables + a carbohydrate.',
      '',
      'General information only — not a substitute for professional advice.',
    ].filter(Boolean).join('\n')
  }
  return [
    '[Local mode — no API]',
    note,
    'The free model is unavailable right now.',
    'You can ask about fitness, nutrition, recovery, and healthy habits.',
    '',
    'General information only — not a substitute for professional advice.',
  ].filter(Boolean).join('\n')
}

// ── Core OpenRouter request ──────────────────────────────────────────────────

async function callOpenRouter(apiKey, model, messages) {
  console.log('Trying OpenRouter:', model)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': HTTP_REFERER,
        'X-Title': APP_TITLE,
      },
      body: JSON.stringify({
        model,
        messages,
      }),
      signal: controller.signal,
    })
  } catch (fetchErr) {
    clearTimeout(timer)
    const reason = fetchErr?.name === 'AbortError' ? 'timeout' : (fetchErr?.message || 'network error')
    console.log('OpenRouter failed:', reason)
    throw new Error(reason)
  }
  clearTimeout(timer)

  // Read body exactly once
  const raw = await response.text()

  if (response.status === 429) {
    console.log('OpenRouter rate-limited (429) — will retry after delay')
    throw Object.assign(new Error(`HTTP 429: rate limited`), { isRateLimit: true })
  }

  if (!response.ok) {
    console.log('OpenRouter failed:', response.status, raw.slice(0, 300))
    throw new Error(`HTTP ${response.status}: ${raw.slice(0, 120)}`)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    console.log('OpenRouter failed: invalid JSON', raw.slice(0, 100))
    throw new Error('invalid JSON response')
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    console.log('OpenRouter failed: no content in response', JSON.stringify(data).slice(0, 300))
    throw new Error('empty content in response')
  }

  const text = typeof content === 'string' ? content.trim() : String(content).trim()

  console.log(`OpenRouter success — model: ${data.model || model}`)
  return {
    text,
    model: data.model || model,
    mode: 'openrouter',
    modeLabel: 'AI active — free model',
  }
}

// ── Main handler (called by api/ai.js and vite dev middleware) ───────────────

export async function handleOpenRouterAiPayload(payload) {
  // 1. Sanitise input — either a structured messages array (chat, multi-turn)
  //    or a single prompt string (one-shot generations), never both.
  let messages
  let prompt
  if (Array.isArray(payload?.messages) && payload.messages.length > 0) {
    try {
      messages = sanitizeMessages(payload.messages)
      // Representative text for local-mode language detection / fallback replies.
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
      prompt = (lastUserMessage ?? messages[messages.length - 1]).content
    } catch (err) {
      console.log('OpenRouter: messages rejected —', err.message, '— falling back to flat prompt if present')
      // The client (aiClient.ts) always sends payload.prompt alongside
      // payload.messages, so a rejected messages array (e.g. over the
      // combined-length cap) can still be served from the flat prompt
      // instead of dropping straight to a confusing local-mode reply.
      try {
        prompt = sanitizePrompt(payload?.prompt)
        messages = [{ role: 'user', content: prompt }]
      } catch {
        return {
          text: localModeReply(typeof payload?.prompt === 'string' ? payload.prompt : '', 'message too long or invalid'),
          model: 'local-mode',
          mode: 'local',
          modeLabel: 'Local mode — invalid messages',
        }
      }
    }
  } else {
    try {
      prompt = sanitizePrompt(payload?.prompt)
    } catch (err) {
      console.log('OpenRouter skipped: bad prompt —', err.message)
      return {
        text: localModeReply(typeof payload?.prompt === 'string' ? payload.prompt : '', 'prompt was empty or invalid'),
        model: 'local-mode',
        mode: 'local',
        modeLabel: 'Local mode — invalid prompt',
      }
    }
    messages = [{ role: 'user', content: prompt }]
  }

  // 2. Require API key
  const apiKey = process.env.OPENROUTER_API_KEY
  console.log('OPENROUTER_API_KEY exists:', Boolean(apiKey))

  if (!apiKey) {
    console.log('Falling back to local mode: no API key')
    return {
      text: localModeReply(prompt, 'OPENROUTER_API_KEY not set'),
      model: 'local-mode',
      mode: 'local',
      modeLabel: 'Local mode — no API key',
    }
  }

  // 3. Try each model in order until one works.
  //    Skip models that were rate-limited recently (60s cooldown).
  for (const model of MODELS) {
    if (isRateLimited(model)) {
      console.log(`Skipping ${model} (still cooling down)`)
      continue
    }
    try {
      return await callOpenRouter(apiKey, model, messages)
    } catch (err) {
      if (err.isRateLimit) {
        markRateLimited(model)
      } else {
        console.log(`OpenRouter failed (${model}):`, err.message)
      }
    }
  }

  // 4. Both models failed — return local mode
  console.log('Falling back to local mode: all models failed')
  return {
    text: localModeReply(prompt, 'all free models unavailable'),
    model: 'local-mode',
    mode: 'local',
    modeLabel: 'Local mode — all models failed',
  }
}

// ── Express / Vercel / Vite-dev helpers ─────────────────────────────────────

export async function readNodeRequestJson(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw { status: 400, message: 'Invalid JSON body.' }
  }
}

export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function getPublicErrorResponse(error) {
  const status  = Number.isInteger(error?.status) ? error.status : 500
  const message = typeof error?.message === 'string' ? error.message : 'Request failed.'
  return { status, body: { error: message, status } }
}

export { checkIpRateLimit }
