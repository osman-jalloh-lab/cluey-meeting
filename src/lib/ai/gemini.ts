import { GoogleGenerativeAI } from '@google/generative-ai'

let client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return client
}

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export async function chat(
  prompt: string,
  model = 'gemini-1.5-flash',
  systemInstruction?: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const genAI = getClient()
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction,
  })

  const result = await geminiModel.generateContent(prompt)
  const response = result.response

  return {
    content: response.text(),
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  }
}

export async function chatJson<T>(
  prompt: string,
  model = 'gemini-1.5-flash'
): Promise<T> {
  const genAI = getClient()
  const geminiModel = genAI.getGenerativeModel({
    model,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const result = await geminiModel.generateContent(prompt)
  const content = result.response.text()
  return JSON.parse(content) as T
}
