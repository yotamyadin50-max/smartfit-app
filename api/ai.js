import {
  getPublicErrorResponse,
  handleOpenRouterAiPayload,
  readNodeRequestJson,
  sendJson,
} from '../server/openRouterAi.js'

export default async function handler(req, res) {
  // Only POST is accepted
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed.' })
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
    console.log('SmartFit /api/ai unexpected error:', error?.message || error)
    const { status, body } = getPublicErrorResponse(error)
    res.status(status).json(body)
  }
}
