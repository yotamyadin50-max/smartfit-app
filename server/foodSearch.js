const USDA_ENDPOINT = 'https://api.nal.usda.gov/fdc/v1/foods/search'
const DEFAULT_USDA_KEY = 'DEMO_KEY'

function getUsdaApiKey() {
  return process.env.USDA_API_KEY || process.env.FDC_API_KEY || DEFAULT_USDA_KEY
}

function cleanQuery(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function getNutrient(nutrients, names, unit) {
  const aliases = Array.isArray(names) ? names : [names]
  const match = (nutrients || []).find(item => {
    const nutrientName = String(item.nutrientName || item.nutrient?.name || '').toLowerCase()
    const unitName = String(item.unitName || item.nutrient?.unitName || '').toUpperCase()
    return aliases.some(name => nutrientName === name.toLowerCase()) && (!unit || unitName === unit)
  })
  return Math.max(0, Math.round(Number(match?.value ?? match?.amount ?? 0)))
}

function normalizeFood(food) {
  const nutrients = food.foodNutrients || []
  return {
    fdcId: food.fdcId,
    description: food.description || food.lowercaseDescription || 'Food item',
    kcal: getNutrient(nutrients, ['Energy'], 'KCAL'),
    protein: getNutrient(nutrients, ['Protein']),
    carbs: getNutrient(nutrients, ['Carbohydrate, by difference', 'Carbohydrate, by summation']),
    fat: getNutrient(nutrients, ['Total lipid (fat)', 'Total fat (NLEA)']),
    source: 'USDA',
  }
}

export async function searchUsdaFoods(rawQuery) {
  const query = cleanQuery(rawQuery)
  if (!query) {
    const error = new Error('Missing query param ?q=')
    error.status = 400
    throw error
  }

  const url = new URL(USDA_ENDPOINT)
  url.searchParams.set('query', query)
  url.searchParams.set('pageSize', '10')
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS),Branded')
  url.searchParams.set('api_key', getUsdaApiKey())

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AscendAI/1.0 (ascend-ai.app)' },
    signal: AbortSignal.timeout(9000),
  })

  const responseBody = await response.text()
  if (!response.ok) {
    const error = new Error(responseBody || `USDA returned ${response.status}`)
    error.status = response.status
    error.responseBody = responseBody
    throw error
  }

  let data
  try {
    data = JSON.parse(responseBody)
  } catch {
    const error = new Error('USDA returned invalid JSON')
    error.status = 502
    throw error
  }

  const foods = Array.isArray(data.foods) ? data.foods.map(normalizeFood) : []
  return {
    foods,
    query,
    source: 'USDA FoodData Central',
  }
}
