import * as openai from '@/lib/ai/openai'
import { prisma } from '@/lib/db'
import { estimateCost } from '@/lib/ai/router'

export interface DraftReplyResult {
  subject: string
  to: string
  body: string
  tone: string
}

export async function runReplyDraftAgent(
  userId: string,
  originalEmail: {
    from: string
    subject: string
    body: string
    accountEmail: string
  },
  tone: 'professional' | 'casual' | 'formal' = 'professional',
  additionalContext?: string
): Promise<DraftReplyResult> {
  const prompt = `Draft a reply to this email.

Original Email:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body.slice(0, 1000)}

Reply from: ${originalEmail.accountEmail}
Requested tone: ${tone}
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Return JSON:
{
  "subject": "Re: [original subject]",
  "to": "recipient email",
  "body": "the full reply body text",
  "tone": "${tone}"
}

Make the reply concise, clear, and appropriate. Return ONLY valid JSON.`

  const result = await openai.chatJson<DraftReplyResult>([
    { role: 'user', content: prompt }
  ])

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: prompt.length / 4,
      outputTokens: 300,
      estimatedCost: estimateCost('gpt-4o-mini', prompt.length / 4, 300),
      action: 'draft_reply',
    },
  })

  return result
}
