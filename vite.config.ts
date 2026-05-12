// @ts-nocheck
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {
  checkIpRateLimit,
  getPublicErrorResponse,
  handleOpenRouterAiPayload,
  readNodeRequestJson,
  sendJson,
} from './server/openRouterAi.js'

// Security headers added to every dev-server response
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
}

function openRouterDevApi() {
  return {
    name: 'smartfit-openrouter-dev-api',
    configureServer(server) {
      // Apply security headers to all responses
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
        next()
      })

      server.middlewares.use('/api/ai', async (req, res) => {
        // Security headers already set above
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST')
          sendJson(res, 405, { error: 'Method not allowed.' })
          return
        }

        // Per-IP rate limit: max 15 requests/minute
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
          console.log('SmartFit dev /api/ai status', error?.status || 500)
          const { status, body } = getPublicErrorResponse(error)
          sendJson(res, status, body)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const serverEnv = {
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env,
  }

  Object.assign(process.env, serverEnv)

  return {
    plugins: [react(), openRouterDevApi()],
    // Required for Capacitor: assets must use relative paths so they load
    // correctly when served from the native Android/iOS webview
    base: '/',
    build: {
      // Output directory that Capacitor reads (must match capacitor.config.ts webDir)
      outDir: 'dist',
    },
  }
})
