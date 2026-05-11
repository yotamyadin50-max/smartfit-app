import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.txt' })

// ── Constants ────────────────────────────────────────────────────────────────

const OPENROUTER_URL  = 'https://openrouter.ai/api/v1/chat/completions'
const HTTP_REFERER    = 'http://localhost:5173'
const APP_TITLE       = 'SmartFit'
const TIMEOUT_MS      = 30000
const PRIMARY_MODEL   = 'meta-llama/llama-3.1-8b-instruct:free'
const FALLBACK_MODEL  = 'microsoft/phi-3-mini-128k-instruct:free'

export const MAX_PROMPT_LENGTH = 4000

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizePrompt(value) {
  if (typeof value !== 'string') throw { status: 400, message: 'Prompt must be a string.' }
  // Remove ASCII control characters only — keep all printable text including Hebrew
  const prompt = value.replace(/\p{Cc}/gu, '').trim()
  if (!prompt) throw { status: 400, message: 'Prompt cannot be empty.' }
  if (prompt.length > MAX_PROMPT_LENGTH) throw { status: 413, message: 'Prompt too long (max 4000).' }
  return prompt
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

async function callOpenRouter(apiKey, model, prompt) {
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
        messages: [{ role: 'user', content: prompt }],
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

  console.log('OpenRouter success')
  return {
    text,
    model: data.model || model,
    mode: 'openrouter',
    modeLabel: 'AI active — free model',
  }
}

// ── Main handler (called by api/ai.js and vite dev middleware) ───────────────

export async function handleOpenRouterAiPayload(payload) {
  // 1. Sanitise prompt
  let prompt
  try {
    prompt = sanitizePrompt(payload?.prompt)
  } catch (err) {
    console.log('OpenRouter skipped: bad prompt —', err.message)
    return {
      text: '[Local mode] Prompt was empty or invalid.',
      model: 'local-mode',
      mode: 'local',
      modeLabel: 'Local mode — invalid prompt',
    }
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

  // 3. Try primary model, then fallback model
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      return await callOpenRouter(apiKey, model, prompt)
    } catch (err) {
      console.log(`OpenRouter failed (${model}):`, err.message)
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
