import {
  getPublicErrorResponse,
  handleOpenRouterAiPayload,
  readNodeRequestJson,
} from '../server/openRouterAi.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const payload =
      req.body && typeof req.body === 'object' ? req.body : await readNodeRequestJson(req)
    const result = await handleOpenRouterAiPayload(payload)
    res.status(200).json(result)
  } catch (error) {
    console.log('SmartFit /api/ai status', error?.status || 500)
    const { status, body } = getPublicErrorResponse(error)
    res.status(status).json(body)
  }
}
