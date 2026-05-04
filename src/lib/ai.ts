// ─────────────────────────────────────────────────────────────
// AI API Placeholder
// ─────────────────────────────────────────────────────────────
// When ready to connect:
//   1. Set VITE_AI_API_KEY in .env.local
//   2. Replace the mock functions below with real API calls
//   3. Recommended: OpenAI / Anthropic / custom backend route
// ─────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// TODO: replace with real API call
export async function sendChatMessage(_messages: AIMessage[]): Promise<string> {
  throw new Error('AI API not connected yet. Use mock responses.')
}

// TODO: replace with real API call
export async function generateWorkoutPlan(_userProfile: object): Promise<object> {
  throw new Error('AI API not connected yet.')
}

// TODO: replace with real API call
export async function generateMealFromIngredients(_ingredients: string[]): Promise<object> {
  throw new Error('AI API not connected yet.')
}

// TODO: replace with real API call
export async function generateProgressInsight(_historyData: object): Promise<string> {
  throw new Error('AI API not connected yet.')
}

export const isAIConfigured = Boolean(import.meta.env.VITE_AI_API_KEY)
