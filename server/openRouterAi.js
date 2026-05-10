import dotenv from 'dotenv'

dotenv.config()
console.log('OPENROUTER_API_KEY exists:', Boolean(process.env.OPENROUTER_API_KEY))

const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'meta-llama/llama-3.1-8b-instruct:free'
const DEFAULT_REFERER = 'http://localhost:5173'
const DEFAULT_TITLE = 'SmartFit AI'
const SYSTEM_PROMPT = 'You are a helpful AI fitness coach. Give safe, general advice.'
const FREE_MODEL_LABEL = 'AI פעיל — מודל חינמי'
const FREE_MODEL_LABEL_EN = 'AI active — free model'
const LOCAL_MODE_LABEL = 'מצב מקומי — ללא API'
const LOCAL_MODE_LABEL_EN = 'Local mode — no API'
const MISSING_API_KEY_MESSAGE = 'צריך API key גם למודלים חינמיים של OpenRouter'
const MISSING_API_KEY_MESSAGE_EN = 'An API key is required even for free OpenRouter models'
const OPENROUTER_TIMEOUT_MS = 25000

export const MAX_PROMPT_LENGTH = 4000

class PublicApiError extends Error {
  constructor(status, publicMessage, logMessage = publicMessage, details = {}) {
    super(logMessage)
    this.name = 'PublicApiError'
    this.status = status
    this.publicMessage = publicMessage
    this.details = details
  }
}

function toPublicError(status, publicMessage, logMessage, details) {
  return new PublicApiError(status, publicMessage, logMessage, details)
}

function sanitizePrompt(value) {
  if (typeof value !== 'string') {
    throw toPublicError(400, 'Prompt must be a string.')
  }

  const prompt = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()
  if (!prompt) {
    throw toPublicError(400, 'Prompt cannot be empty.')
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw toPublicError(413, `Prompt is too long. Maximum length is ${MAX_PROMPT_LENGTH} characters.`)
  }

  return prompt
}

function getOpenRouterMessage(data) {
  const content = data?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map(part => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim()
  }
  return ''
}

function getModelList() {
  return [FREE_MODEL]
}

function getPromptLanguage(prompt) {
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('answer in english') || lowerPrompt.includes('full answer must be in english')) return 'en'
  if (lowerPrompt.includes('answer in hebrew') || lowerPrompt.includes('full answer must be in hebrew')) return 'he'
  return /[\u0590-\u05ff]/.test(prompt) ? 'he' : 'en'
}

function getLocalModeReply(prompt, reason = 'OpenRouter free model is unavailable') {
  const lowerPrompt = prompt.toLowerCase()
  const isHebrew = getPromptLanguage(prompt) === 'he' || lowerPrompt.includes('hebrew')
  const tag = `[${isHebrew ? LOCAL_MODE_LABEL : LOCAL_MODE_LABEL_EN}]`

  if (isHebrew) {
    if (lowerPrompt.includes('אימון') || lowerPrompt.includes('כושר') || lowerPrompt.includes('תרגיל')) {
      return [
        tag,
        'מצב מקומי הופעל כי המודל החינמי לא זמין כרגע.',
        '',
        'המלצה כללית ובטוחה:',
        '1. התחממות קלה של 5 דקות.',
        '2. בצע 2-3 סבבים של סקוואטים, שכיבות סמיכה מותאמות, פלאנק קצר וגשר ישבן.',
        '3. נוח 60-90 שניות בין סבבים.',
        '4. עצור אם יש כאב חד, סחרחורת או תחושה לא רגילה.',
        '',
        'המידע הוא כללי בלבד ואינו מחליף ייעוץ מקצועי.',
      ].join('\n')
    }

    if (lowerPrompt.includes('תזונה') || lowerPrompt.includes('אוכל') || lowerPrompt.includes('ארוחה') || lowerPrompt.includes('מתכון')) {
      return [
        tag,
        'מצב מקומי הופעל כי המודל החינמי לא זמין כרגע.',
        '',
        'המלצה כללית:',
        'בחר ארוחה פשוטה שמבוססת על חלבון, ירקות, ופחמימה זמינה שיש לך בבית.',
        'השתמש רק במצרכים שציינת, והימנע ממרכיבים שסימנת להימנע מהם.',
        '',
        'המידע הוא כללי בלבד ואינו מחליף ייעוץ מקצועי.',
      ].join('\n')
    }

    return [
      tag,
      'מצב מקומי הופעל כי המודל החינמי לא זמין כרגע.',
      'אפשר לשאול על כושר, תזונה, התאוששות והרגלים בריאים.',
      '',
      'המידע הוא כללי בלבד ואינו מחליף ייעוץ מקצועי.',
    ].join('\n')
  }

  if (lowerPrompt.includes('workout') || lowerPrompt.includes('fitness') || lowerPrompt.includes('exercise') || lowerPrompt.includes('training')) {
    return [
      tag,
      'Local Mode is active because the free model is unavailable right now.',
      '',
      'Safe general suggestion:',
      '1. Warm up gently for 5 minutes.',
      '2. Complete 2-3 rounds of squats, modified push-ups, a short plank, and glute bridges.',
      '3. Rest 60-90 seconds between rounds.',
      '4. Stop if you feel sharp pain, dizziness, or anything unusual.',
      '',
      'This information is general only and does not replace professional advice.',
    ].join('\n')
  }

  if (lowerPrompt.includes('nutrition') || lowerPrompt.includes('meal') || lowerPrompt.includes('recipe') || lowerPrompt.includes('food')) {
    return [
      tag,
      'Local Mode is active because the free model is unavailable right now.',
      '',
      'General suggestion:',
      'Build a simple meal from protein, vegetables, and an available carbohydrate you already have.',
      'Use only the ingredients you listed and avoid anything you marked as restricted.',
      '',
      'This information is general only and does not replace professional advice.',
    ].join('\n')
  }

  return [
    tag,
    'Local Mode is active because the free model is unavailable right now.',
    reason,
    '',
    'You can ask about fitness, nutrition, recovery, and healthy habits.',
    'This information is general only and does not replace professional advice.',
  ].join('\n')
}

function getSafeLocalModeReply(prompt, reason) {
  try {
    return getLocalModeReply(prompt, reason)
  } catch (error) {
    console.log('SmartFit server local fallback status', 500)
    return [
      `[${LOCAL_MODE_LABEL}]`,
      '## תשובה בסיסית בטוחה',
      'אפשר לשאול על אימונים, תזונה, מתכונים, התאוששות והרגלים. כרגע נפעיל מצב מקומי כדי לשמור על הצ׳אט עובד.',
      '',
      'המידע כללי בלבד ואינו מחליף ייעוץ מקצועי.',
    ].join('\n')
  }
}

export async function readNodeRequestJson(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  if (!rawBody.trim()) return {}

  try {
    return JSON.parse(rawBody)
  } catch (error) {
    throw toPublicError(400, 'Invalid JSON body.', error?.message || 'Invalid JSON body.')
  }
}

export async function handleOpenRouterAiPayload(payload) {
  let prompt = ''
  try {
    prompt = sanitizePrompt(payload?.prompt)
  } catch (error) {
    return {
      text: getSafeLocalModeReply('שאלה כללית על כושר ותזונה', error?.publicMessage || error?.message),
      model: 'local-mode',
      modeLabel: LOCAL_MODE_LABEL,
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  const models = getModelList()

  if (!apiKey) {
    const language = getPromptLanguage(prompt)
    return {
      text: getSafeLocalModeReply(prompt, language === 'he' ? MISSING_API_KEY_MESSAGE : MISSING_API_KEY_MESSAGE_EN),
      model: 'local-mode',
      modeLabel: language === 'he' ? LOCAL_MODE_LABEL : LOCAL_MODE_LABEL_EN,
    }
  }

  let lastError = null

  for (const model of models) {
    try {
      return await requestOpenRouterCompletion({ apiKey, model, prompt })
    } catch (error) {
      lastError = error
      if (!error?.details?.logged) {
        console.log('OpenRouter status', error?.status || 500)
      }
    }
  }

  return {
    text: getSafeLocalModeReply(prompt, lastError?.publicMessage || lastError?.message),
    model: 'local-mode',
    modeLabel: getPromptLanguage(prompt) === 'he' ? LOCAL_MODE_LABEL : LOCAL_MODE_LABEL_EN,
  }
}

async function requestOpenRouterCompletion({ apiKey, model, prompt }) {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new DOMException('timeout', 'AbortError')),
    OPENROUTER_TIMEOUT_MS,
  )
  let response

  try {
    response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': DEFAULT_REFERER,
        'X-Title': DEFAULT_TITLE,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    })
  } catch (error) {
    throw toPublicError(
      503,
      error?.name === 'AbortError'
        ? 'OpenRouter request timed out.'
        : `OpenRouter request failed before receiving a response: ${error?.message || 'Network error.'}`
    )
  } finally {
    clearTimeout(timeout)
  }

  const responseText = await response.text()

  if (!response.ok) {
    console.log('OpenRouter status', response.status)
    throw toPublicError(
      response.status,
      responseText || `OpenRouter request failed with status ${response.status}`,
      responseText || `OpenRouter request failed with status ${response.status}`,
      { model, logged: true }
    )
  }

  let data = null
  try {
    data = responseText ? JSON.parse(responseText) : null
  } catch {
    data = null
  }

  const text = data?.choices?.[0]?.message?.content
  if (!text) {
    throw toPublicError(502, 'OpenRouter returned an empty response. Please try again.', undefined, {
      model,
    })
  }

  return {
    text: `[${getPromptLanguage(prompt) === 'he' ? FREE_MODEL_LABEL : FREE_MODEL_LABEL_EN}]\n${getOpenRouterMessage(data)}`,
    model,
    modeLabel: getPromptLanguage(prompt) === 'he' ? FREE_MODEL_LABEL : FREE_MODEL_LABEL_EN,
  }
}

export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function getPublicErrorResponse(error) {
  const status = Number.isInteger(error?.status) ? error.status : 500
  const errorMessage =
    typeof error?.publicMessage === 'string'
      ? error.publicMessage
      : typeof error?.message === 'string'
        ? error.message
        : 'OpenRouter request failed.'

  return {
    status,
    body: {
      error: errorMessage,
      status,
      ...(error?.details?.model ? { model: error.details.model } : {}),
    },
  }
}
