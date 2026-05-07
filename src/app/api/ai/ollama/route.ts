// src/app/api/ai/ollama/route.ts
// Drop-in API route — matches the same shape as your other AI routes

import { NextRequest, NextResponse } from 'next/server'
import { generate, chat, isOllamaAvailable, listModels } from '@/lib/ai/ollama'

// ── POST /api/ai/ollama ────────────────────────────────────────────────────
// Body: { prompt, agentId?, model?, systemPrompt?, messages?, mode? }
// mode: 'generate' (default) | 'chat' | 'health' | 'models'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      prompt,
      agentId,
      model = 'llama3.1',
      systemPrompt,
      messages,
      mode = 'generate',
    } = body

    // health check mode
    if (mode === 'health') {
      const available = await isOllamaAvailable()
      const models = available ? await listModels() : []
      return NextResponse.json({ available, models })
    }

    // models list mode
    if (mode === 'models') {
      const models = await listModels()
      return NextResponse.json({ models })
    }

    // pick system prompt from agentId if not provided directly
    const resolvedSystem = systemPrompt ?? getAgentSystemPrompt(agentId)

    // chat mode (multi-turn)
    if (mode === 'chat' && Array.isArray(messages)) {
      const result = await chat(messages, model, resolvedSystem)
      return NextResponse.json({
        response: result.content,
        model: result.model,
        agentId,
        cost: 0,
        provider: 'ollama',
      })
    }

    // default: single generate
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const result = await generate(prompt, model, resolvedSystem)

    return NextResponse.json({
      response: result.content,
      model: result.model,
      agentId,
      cost: 0,
      provider: 'ollama',
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    // give a helpful error if Ollama isn't running
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return NextResponse.json(
        {
          error: 'Ollama is not running. Start it with: ollama serve',
          hint: 'Make sure OLLAMA_ORIGINS=http://localhost:3000 is set',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── GET /api/ai/ollama — health check ─────────────────────────────────────
export async function GET() {
  const available = await isOllamaAvailable()
  const models = available ? await listModels() : []
  return NextResponse.json({ available, models, provider: 'ollama' })
}

// ── Agent system prompts ───────────────────────────────────────────────────
// Each agent gets a focused personality. Keep these tight — smaller models
// perform much better with clear, short system prompts.

function getAgentSystemPrompt(agentId?: string): string {
  const prompts: Record<string, string> = {
    inbox: `You are an Inbox Specialist for Osman Jalloh, a cybersecurity student and HR compliance professional in Austin TX.
Your job: triage emails fast. Classify each as: job-alert, recruiter-reply, newsletter, admin, or urgent.
Flag anything from a real human recruiter or employer. Skip promotional noise.
Be direct and brief. No filler phrases.`,

    hr: `You are an HR Compliance Specialist focused on F-1 OPT, I-9, EAD, E-Verify, and Workday workflows.
Answer questions accurately and carefully. When unsure, say so — compliance errors have real consequences.
Osman works in HR at Austin Community College and is on F-1 OPT himself.
Be precise, reference specific form sections when relevant.`,

    jobs: `You are a Career Advisor for Osman Jalloh. He has 100+ applications out targeting cybersecurity, GRC, IT support, and HR admin roles in Austin TX.
He holds CompTIA Security+ and CySA+. He starts a CS Student Associate role at UT System on May 18.
He has a Ferrovial HR Compliance Intern phone screen on Wed May 6 at 3PM.
Summarize job tracker status, flag recruiter replies, and give honest advice about applications.`,

    tasks: `You are an Ops Manager for Osman. Your job is to prioritize ruthlessly.
Today's known priorities: CodePath prework due today, Ferrovial interview prep (Wed 3PM), UT System BGC follow-up, Cluey OAuth fix.
Give a numbered list. Be blunt about what actually matters right now. No padding.`,

    schedule: `You are a Schedule Manager. Osman's calendar today (May 5): PHIL-1301 at 10:30AM, ITSY-2330 Ethical Hacking at 6PM.
Ferrovial phone screen is Wed May 6 at 3PM with Jude Malta on Teams.
Surface conflicts, prep reminders, and time blocks. Keep it tight.`,

    briefing: `You are the Daily Briefing Officer. Produce a clean, executive-style morning brief for Osman Jalloh.
Cover: top 3 priorities, calendar highlights, email flags, job pipeline status, and one focus recommendation.
Write in plain prose. No bullet soup. Max 200 words.`,

    learning: `You are a Learning Advisor for Osman. He has Security+ and CySA+. Next targets: CRISC, CISM, or cloud certs.
He's a junior at ACC studying network/cybersecurity. Recommend what to study based on his job targets (GRC, compliance, cybersecurity).
Be specific — name resources, not just topics.`,

    ceo: `You are the CEO Controller for Osman Jalloh's Command Centre.
Your job: take a complex command, break it into subtasks, assign each to the right agent, and return a clear action plan.
Agents available: inbox, hr, jobs, tasks, schedule, briefing, learning.
Be strategic and calm. Return a structured plan with agent assignments.`,
  }

  return prompts[agentId ?? ''] ?? `You are a helpful AI assistant for Osman Jalloh's personal command centre. Be direct, brief, and useful.`
}
