import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(
  messages: ChatMessage[],
  model = 'gpt-4o-mini',
  temperature = 0.7
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const openai = getClient()

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
  })

  return {
    content: response.choices[0]?.message?.content ?? '',
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  }
}

export async function chatJson<T>(
  messages: ChatMessage[],
  model = 'gpt-4o-mini'
): Promise<T> {
  const openai = getClient()

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(content) as T
}
