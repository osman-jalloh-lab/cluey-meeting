// src/lib/ai/useOllama.ts
// Smart routing hook — sends cheap tasks to free local Ollama,
// falls back to cloud (/api/ai/agent) for complex ones.
// Drop this into any component with: const { ask, loading, error } = useOllama()

'use client'

import { useState, useCallback } from 'react'

// These agent types always use free local Ollama
const OLLAMA_AGENTS = new Set([
  'task',
  'briefing',
  'hr',
  'calendar',
])


export type AgentType =
  | 'email'
  | 'calendar'
  | 'hr'
  | 'job_search'
  | 'task'
  | 'briefing'
  | 'assistant'

interface OllamaResponse {
  response: string
  model: string
  cost: number
  provider: string
}

interface UseOllamaReturn {
  ask: (agentType: AgentType, prompt: string, history?: {role: string, content: string}[]) => Promise<string>
  loading: boolean
  error: string | null
  provider: 'ollama' | 'cloud' | null
  cost: number
}

export function useOllama(): UseOllamaReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<'ollama' | 'cloud' | null>(null)
  const [cost, setCost] = useState(0)

  const ask = useCallback(async (
    agentType: AgentType,
    prompt: string,
    history: {role: string, content: string}[] = []
  ): Promise<string> => {
    setLoading(true)
    setError(null)

    // Map agent type to agentId for Ollama system prompts
    const agentIdMap: Record<string, string> = {
      task: 'tasks',
      briefing: 'briefing',
      hr: 'hr',
      calendar: 'schedule',
      email: 'inbox',
      job_search: 'jobs',
      assistant: 'ceo',
    }

    const useLocal = OLLAMA_AGENTS.has(agentType)

    try {
      if (useLocal) {
        // ── FREE: Ollama local ─────────────────────────────────────────────
        setProvider('ollama')

        const messages = [
          ...history,
          { role: 'user', content: prompt }
        ]

        const res = await fetch('/api/ai/ollama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentIdMap[agentType] ?? agentType,
            messages,
            mode: 'chat',
          }),
        })

        if (!res.ok) {
          // If Ollama is down, fall back to cloud silently
          console.warn('Ollama unavailable, falling back to cloud')
          return await callCloud(agentType, prompt, history)
        }

        const data: OllamaResponse = await res.json()
        setCost(prev => prev + 0) // always free
        return data.response

      } else {
        // ── PAID: Cloud API ────────────────────────────────────────────────
        setProvider('cloud')
        return await callCloud(agentType, prompt, history)
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)

      // Last resort fallback to cloud
      try {
        return await callCloud(agentType, prompt, history)
      } catch {
        throw new Error(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { ask, loading, error, provider, cost }
}

// ── Internal: call existing cloud agent route ──────────────────────────────
async function callCloud(
  agentType: string,
  task: string,
  history: {role: string, content: string}[]
): Promise<string> {
  const res = await fetch('/api/ai/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentType, task, history }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Agent failed')
  return data.response ?? data.result ?? data.message ?? JSON.stringify(data)
}

// ── Utility: check if Ollama is running ───────────────────────────────────
export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/ai/ollama')
    const data = await res.json()
    return data.available === true
  } catch {
    return false
  }
}

// ── Utility: direct one-shot call (no hook needed) ────────────────────────
export async function askOllama(
  agentId: string,
  prompt: string,
  model = 'llama3.1'
): Promise<string> {
  const res = await fetch('/api/ai/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, prompt, model }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Ollama call failed')
  return data.response
}
