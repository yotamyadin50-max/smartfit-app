import { searchUsdaFoods } from '../server/foodSearch.js'

/**
 * /api/food?q=<query>
 * Server-side proxy to USDA FoodData Central.
 * Keeps USDA/API details out of public client code.
 */

const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'https://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
])

function setCorsHeaders(req, res) {
  const origin = req.headers?.origin ?? ''
  const allowed = ALLOWED_ORIGINS.has(origin) || !origin
  res.setHeader('Access-Control-Allow-Origin', allowed ? (origin || '*') : 'null')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed.' }); return }

  const query = req.query?.q ?? ''
  if (!query.trim()) { res.status(400).json({ error: 'Missing query param ?q=' }); return }

  try {
    const data = await searchUsdaFoods(query)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json(data)
  } catch (err) {
    console.error('[/api/food]', err?.message || err)
    res.status(err?.status || 502).json({
      error: err?.status === 400 ? 'Missing query param ?q=' : 'Could not reach USDA FoodData Central.',
      status: err?.status || 502,
    })
  }
}
