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
  const userMessage = [
    `יש לי את המצרכים הבאים: ${ingredients.join(', ')}.`,
    'צור מתכון פשוט ומהיר רק מהמצרכים האלה, עבור המצרכים האלה בלבד — לא דוגמה כללית.',
    'התשובה שלך חייבת להיות אך ורק אובייקט JSON תקני אחד, בדיוק במבנה הבא:',
    '{"description": "תיאור קצר של המתכון וההכנה", "calories": מספר, "protein": מספר בגרמים, "carbs": מספר בגרמים, "fat": מספר בגרמים}',
    'אסור להוסיף שום טקסט, הסבר, markdown, גדרות קוד (code fences), או דוגמה נוספת — רק אובייקט ה-JSON הזה ותו לא.',
    'הערכים התזונתיים חייבים להיות מחושבים לפי המצרכים שצוינו למעלה, לא ערכים גנריים.',
  ].join('\n')
  const reply = await getHybridAiReply({ prompt: userMessage, userMessage })
  return { text: reply.text, mode: reply.mode }
}

export async function generateProgressInsight(historyData: object): Promise<string> {
  const userMessage = `איך אני מתקדם? נתונים: ${JSON.stringify(historyData)}`
  const reply = await getHybridAiReply({ prompt: userMessage, userMessage })
  return reply.text
}

export const isAIConfigured = !!(import.meta.env.VITE_API_BASE_URL as string | undefined)
