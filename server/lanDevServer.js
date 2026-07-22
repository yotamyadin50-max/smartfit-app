// Standalone LAN-reachable API server for testing the native Android/iOS
// build. The installed APK has no bundled dev server (it's a static WebView
// build), so VITE_API_BASE_URL must point at a real reachable server for AI
// chat / meal generation to work off "local mode". This script serves the
// same /api/ai and /api/food handlers the Vite dev server uses, bound to
// 0.0.0.0 so a phone on the same Wi-Fi network can reach it.
//
// Usage: node server/lanDevServer.js
// Then build with: VITE_API_BASE_URL=http://<this-machine-LAN-IP>:8787 npm run build:android

import { createServer } from 'node:http'
import { createReadStream, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dotenv from 'dotenv'
import {
  checkIpRateLimit,
  getPublicErrorResponse,
  handleOpenRouterAiPayload,
  readNodeRequestJson,
  sendJson,
} from './openRouterAi.js'
import { searchUsdaFoods } from './foodSearch.js'

dotenv.config()

const PORT = process.env.LAN_DEV_API_PORT || 8787
const __dirname = dirname(fileURLToPath(import.meta.url))
// Plain HTTP download of the debug APK — a workaround for chat clients that
// fail to deliver .apk attachments. Open this URL in the phone's browser
// (same Wi-Fi) instead of trying to download it from the chat attachment.
const APK_PATH = join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const server = createServer(async (req, res) => {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/api/ai' && req.method === 'POST') {
    const rl = checkIpRateLimit(req)
    if (rl.limited) {
      res.setHeader('Retry-After', String(rl.retryAfter))
      sendJson(res, 429, { error: `Too many requests. Try again in ${rl.retryAfter}s.` })
      return
    }
    try {
      const payload = await readNodeRequestJson(req)
      const result = await handleOpenRouterAiPayload(payload)
      sendJson(res, 200, result)
    } catch (error) {
      const { status, body } = getPublicErrorResponse(error)
      sendJson(res, status, body)
    }
    return
  }

  if (url.pathname === '/app-debug.apk' && req.method === 'GET') {
    if (!existsSync(APK_PATH)) {
      sendJson(res, 404, { error: 'APK not built yet — run npm run build:android first.' })
      return
    }
    const { size } = statSync(APK_PATH)
    res.setHeader('Content-Type', 'application/vnd.android.package-archive')
    res.setHeader('Content-Length', String(size))
    res.setHeader('Content-Disposition', 'attachment; filename="smartfit-debug.apk"')
    createReadStream(APK_PATH).pipe(res)
    return
  }

  if (url.pathname === '/api/food' && req.method === 'GET') {
    try {
      const result = await searchUsdaFoods(url.searchParams.get('q') || '')
      sendJson(res, 200, result)
    } catch (error) {
      sendJson(res, error?.status || 502, {
        error: error?.status === 400 ? 'Missing query param ?q=' : 'Could not reach USDA FoodData Central.',
        status: error?.status || 502,
      })
    }
    return
  }

  sendJson(res, 404, { error: 'Not found.' })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[LAN dev API] listening on 0.0.0.0:${PORT} (for the installed Android/iOS build to reach)`)
})
