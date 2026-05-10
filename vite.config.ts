// @ts-nocheck
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {
  getPublicErrorResponse,
  handleOpenRouterAiPayload,
  readNodeRequestJson,
  sendJson,
} from './server/openRouterAi.js'

function openRouterDevApi() {
  return {
    name: 'smartfit-openrouter-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST')
          sendJson(res, 405, { error: 'Method not allowed.' })
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
  }
})
