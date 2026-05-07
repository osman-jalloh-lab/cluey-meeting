// src/lib/ai/ollama.ts
// Local Ollama — zero cost, runs on your machine at localhost:11434
// Matches the same interface as claude.ts / gemini.ts / openai.ts

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'

export type OllamaModel =
  | 'llama3.1'      // best all-rounder — summaries, email triage, briefings
  | 'phi3'          // fast + lightweight — task lists, quick classifications
  | 'mistral'       // structured output — JSON, I-9 lookups, job parsing

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ── Basic generate (single prompt → response) ──────────────────────────────
export async function generate(
  prompt: string,
  model: OllamaModel = 'llama3.1',
  systemPrompt?: string
): Promise<{ content: string; model: string; cost: 0 }> {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  return {
    content: data.response as string,
    model,
    cost: 0, // always free
  }
}

// ── Chat (multi-turn messages) ─────────────────────────────────────────────
export async function chat(
  messages: ChatMessage[],
  model: OllamaModel = 'llama3.1',
  systemPrompt?: string
): Promise<{ content: string; model: string; cost: 0 }> {
  const ollamaMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: false,
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama chat error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  return {
    content: data.message?.content as string,
    model,
    cost: 0,
  }
}

// ── JSON output (structured extraction) ───────────────────────────────────
export async function chatJson<T>(
  prompt: string,
  model: OllamaModel = 'mistral'
): Promise<T> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `${prompt}\n\nRespond with valid JSON only. No explanation, no markdown, no backticks.`,
      stream: false,
      format: 'json',
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama JSON error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return JSON.parse(data.response) as T
}

// ── Health check — use this to detect if Ollama is running ────────────────
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2000), // 2s timeout
    })
    return res.ok
  } catch {
    return false
  }
}

// ── List installed models ──────────────────────────────────────────────────
export async function listModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`)
    const data = await res.json()
    return (data.models ?? []).map((m: { name: string }) => m.name)
  } catch {
    return []
  }
}
