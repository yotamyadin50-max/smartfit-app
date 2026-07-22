import {
  checkIpRateLimit,
  getPublicErrorResponse,
  handleOpenRouterAiPayload,
  readNodeRequestJson,
} from '../server/openRouterAi.js'

// Origins allowed to call this endpoint.
// capacitor://localhost and https://localhost cover Android + iOS Capacitor WebViews.
const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',   // Capacitor Android (androidScheme: 'https' → still sends this origin)
  'https://localhost',       // Capacitor iOS / androidScheme https
  'http://localhost:5173',   // Vite dev server
  'http://localhost:4173',   // Vite preview
])

function setCorsHeaders(req, res) {
  const origin = req.headers?.origin ?? ''
  const allowed = ALLOWED_ORIGINS.has(origin) || !origin
  res.setHeader('Access-Control-Allow-Origin', allowed ? (origin || '*') : 'null')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  // Pre-flight request (browser / Capacitor WebView sends this before POST)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  // Only POST is accepted
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const rateLimit = checkIpRateLimit(req)
  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter))
    res.status(429).json({ error: 'Too many AI requests. Please wait a moment.', retryAfter: rateLimit.retryAfter })
    return
  }

  try {
    // Parse body — Vercel may pre-parse it, Vite dev server sends a raw stream
    const payload =
      req.body && typeof req.body === 'object' ? req.body : await readNodeRequestJson(req)

    const result = await handleOpenRouterAiPayload(payload)

    // Always 200 — the client decides what to do based on result.mode
    res.status(200).json(result)
  } catch (error) {
    console.log('Ascend AI /api/ai unexpected error:', error?.message || error)
    const { status, body } = getPublicErrorResponse(error)
    res.status(status).json(body)
  }
}
