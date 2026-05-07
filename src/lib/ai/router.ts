// src/lib/ai/router.ts
// AI Router - selects the best AI provider based on task type
// Ollama = free local model for cheap/fast tasks
// Cloud providers = reserved for complex reasoning

export type TaskType =
  | 'quick_summary'
  | 'email_reply'
  | 'email_triage'
  | 'deep_reasoning'
  | 'long_context'
  | 'daily_plan'
  | 'code_help'
  | 'task_extraction'
  | 'calendar_suggestion'
  | 'daily_briefing'
  | 'job_summary'
  | 'hr_lookup'

export interface RouterConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'ollama'
  model: string
  reason: string
}

export function routeTask(taskType: TaskType): RouterConfig {
  switch (taskType) {
    // ── FREE (Ollama local) ────────────────────────────────────────────────
    case 'quick_summary':
      return { provider: 'ollama', model: 'llama3.1', reason: 'Free local — fast summaries' }

    case 'email_triage':
      return { provider: 'ollama', model: 'llama3.1', reason: 'Free local — classify and flag emails' }

    case 'daily_briefing':
      return { provider: 'ollama', model: 'llama3.1', reason: 'Free local — morning digest compilation' }

    case 'daily_plan':
      return { provider: 'ollama', model: 'llama3.1', reason: 'Free local — task prioritization' }

    case 'task_extraction':
      return { provider: 'ollama', model: 'mistral', reason: 'Free local — fast JSON structured extraction' }

    case 'hr_lookup':
      return { provider: 'ollama', model: 'mistral', reason: 'Free local — I-9/OPT Q&A with structured output' }

    case 'job_summary':
      return { provider: 'ollama', model: 'llama3.1', reason: 'Free local — job tracker digest' }

    case 'calendar_suggestion':
      return { provider: 'ollama', model: 'phi3', reason: 'Free local — lightweight time reasoning' }

    // ── PAID (cloud) ───────────────────────────────────────────────────────
    case 'email_reply':
      return { provider: 'openai', model: 'gpt-4o-mini', reason: 'Professional email drafting needs cloud quality' }

    case 'deep_reasoning':
      return { provider: 'openai', model: 'gpt-4o', reason: 'Best reasoning capabilities' }

    case 'long_context':
      return { provider: 'gemini', model: 'gemini-1.5-pro', reason: 'Large context window for bulk processing' }

    case 'code_help':
      return { provider: 'claude', model: 'claude-sonnet-4-6', reason: 'Best for code and careful writing' }

    default:
      return { provider: 'ollama', model: 'llama3.1', reason: 'Free local fallback' }
  }
}

// ── Cost tracking ──────────────────────────────────────────────────────────
const COST_PER_1M_INPUT: Record<string, number> = {
  'gpt-4o': 2.50,
  'gpt-4o-mini': 0.15,
  'gemini-1.5-pro': 1.25,
  'gemini-1.5-flash': 0.075,
  'claude-sonnet-4-6': 3.00,
  'claude-haiku-4-5-20251001': 0.25,
  // Ollama models are always free
  'llama3.1': 0,
  'mistral': 0,
  'phi3': 0,
}

const COST_PER_1M_OUTPUT: Record<string, number> = {
  'gpt-4o': 10.00,
  'gpt-4o-mini': 0.60,
  'gemini-1.5-pro': 5.00,
  'gemini-1.5-flash': 0.30,
  'claude-sonnet-4-6': 15.00,
  'claude-haiku-4-5-20251001': 1.25,
  'llama3.1': 0,
  'mistral': 0,
  'phi3': 0,
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = ((COST_PER_1M_INPUT[model] ?? 1.00) / 1_000_000) * inputTokens
  const outputCost = ((COST_PER_1M_OUTPUT[model] ?? 2.00) / 1_000_000) * outputTokens
  return inputCost + outputCost
}

// ── Quick helper: is this task free? ──────────────────────────────────────
export function isFreeTask(taskType: TaskType): boolean {
  return routeTask(taskType).provider === 'ollama'
}
