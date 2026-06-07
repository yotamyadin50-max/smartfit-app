import { getHybridAiReply } from './aiClient'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function getLastUserMessage(messages: AIMessage[]) {
  return [...messages].reverse().find(message => message.role === 'user')?.content.trim() || ''
}

function buildSystemPrompt(messages: AIMessage[]): string {
  const systemMessages = messages.filter(m => m.role === 'system')
  if (systemMessages.length === 0) return ''
  return systemMessages.map(m => m.content.trim()).join('\n\n')
}

function buildConversationBlock(messages: AIMessage[]): string {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => {
      const label = m.role === 'user' ? 'User' : 'Assistant'
      return `${label}: ${m.content.trim()}`
    })
    .join('\n')
}

export async function sendChatMessage(messages: AIMessage[]): Promise<string> {
  const userMessage = getLastUserMessage(messages)
  const systemPrompt = buildSystemPrompt(messages)
  const conversationBlock = buildConversationBlock(messages)

  const prompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${conversationBlock}`
    : conversationBlock

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

const AI_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined
export const isAIConfigured =
  typeof AI_API_KEY === 'string' && AI_API_KEY.length > 10
