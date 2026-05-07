import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as openai from '@/lib/ai/openai'
import { runHRAgent } from '@/lib/agents/hrAgent'
import { runJobSearchAgent } from '@/lib/agents/jobSearchAgent'
import {
  AGENT_BASE_PROMPT,
  EMAIL_AGENT_PROMPT,
  CALENDAR_AGENT_PROMPT,
  DAILY_BRIEFING_PROMPT,
} from '@/lib/context/personal'
import { estimateCost } from '@/lib/ai/router'
import { z } from 'zod'

const Schema = z.object({
  agentType: z.enum(['email', 'calendar', 'hr', 'job_search', 'task', 'briefing', 'assistant']),
  task: z.string().min(1).max(2000),
  context: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { agentType, task, context } = parsed.data
  const userId = session.user.id!

  try {
    // Specialized agents
    if (agentType === 'hr') {
      const result = await runHRAgent(userId, task, context)
      return NextResponse.json(result)
    }

    if (agentType === 'job_search') {
      const result = await runJobSearchAgent(userId, task, context)
      return NextResponse.json(result)
    }

    // General agents — pick system prompt by type
    const systemPrompts: Record<string, string> = {
      email: EMAIL_AGENT_PROMPT,
      calendar: CALENDAR_AGENT_PROMPT,
      briefing: DAILY_BRIEFING_PROMPT,
      task: AGENT_BASE_PROMPT,
      assistant: AGENT_BASE_PROMPT,
    }

    const systemPrompt = systemPrompts[agentType] ?? AGENT_BASE_PROMPT

    // Add email context for email/briefing agents
    let enrichedTask = task
    if (['email', 'briefing', 'task'].includes(agentType)) {
      const recentEmails = await prisma.emailCache.findMany({
        where: { userId },
        orderBy: { receivedAt: 'desc' },
        take: 10,
        select: { from: true, subject: true, snippet: true, connectedAccount: { select: { accountLabel: true } } },
      })
      if (recentEmails.length > 0) {
        enrichedTask += `\n\nRecent emails:\n${recentEmails.map(e =>
          `[${e.connectedAccount.accountLabel}] From: ${e.from} | ${e.subject}`
        ).join('\n')}`
      }
    }

    const result = await openai.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: enrichedTask },
    ], 'gpt-4o-mini')

    await prisma.apiUsageLog.create({
      data: {
        userId,
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: estimateCost('gpt-4o-mini', result.inputTokens, result.outputTokens),
        action: `agent_${agentType}`,
      },
    })

    return NextResponse.json({ response: result.content })
  } catch (error) {
    console.error('Agent error:', error)
    return NextResponse.json({ error: 'Agent failed. Check your API key.' }, { status: 500 })
  }
}
