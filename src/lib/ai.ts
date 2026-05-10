import { getHybridAiReply } from './aiClient'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function getLastUserMessage(messages: AIMessage[]) {
  return [...messages].reverse().find(message => message.role === 'user')?.content.trim() || ''
}

export async function sendChatMessage(messages: AIMessage[]): Promise<string> {
  const userMessage = getLastUserMessage(messages)
  const prompt = messages.map(message => `${message.role}: ${message.content}`).join('\n')
  const reply = await getHybridAiReply({ prompt, userMessage })
  return reply.text
}

export async function generateWorkoutPlan(userProfile: object): Promise<object> {
  const userMessage = `צור אימון בטוח לפי הפרופיל: ${JSON.stringify(userProfile)}`
  const reply = await getHybridAiReply({ prompt: userMessage, userMessage })
  return { text: reply.text, mode: reply.mode }
}

export async function generateMealFromIngredients(ingredients: string[]): Promise<object> {
  const userMessage = `יש לי ${ingredients.join(', ')}. צור מתכון רק מהמצרכים האלה.`
  const reply = await getHybridAiReply({ prompt: userMessage, userMessage })
  return { text: reply.text, mode: reply.mode }
}

export async function generateProgressInsight(historyData: object): Promise<string> {
  const userMessage = `איך אני מתקדם? נתונים: ${JSON.stringify(historyData)}`
  const reply = await getHybridAiReply({ prompt: userMessage, userMessage })
  return reply.text
}

export const isAIConfigured = true
