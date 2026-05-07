import * as openai from '@/lib/ai/openai'
import { prisma } from '@/lib/db'
import { HR_AGENT_PROMPT } from '@/lib/context/personal'
import { estimateCost } from '@/lib/ai/router'

export interface HRAgentResult {
  response: string
  actions: Array<{ type: string; description: string; requiresApproval: boolean }>
  riskFlags: string[]
  nextSteps: string[]
}

export async function runHRAgent(
  userId: string,
  task: string,
  context?: string
): Promise<HRAgentResult> {
  const prompt = `${context ? `Context: ${context}\n\n` : ''}Task: ${task}

Respond with JSON:
{
  "response": "detailed response to the HR task",
  "actions": [{"type": "draft|review|file|contact","description": "what action","requiresApproval": true}],
  "riskFlags": ["any compliance risks to flag"],
  "nextSteps": ["step 1", "step 2"]
}`

  const result = await openai.chatJson<HRAgentResult>([
    { role: 'system', content: HR_AGENT_PROMPT },
    { role: 'user', content: prompt },
  ], 'gpt-4o-mini')

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: Math.floor((HR_AGENT_PROMPT + prompt).length / 4),
      outputTokens: 400,
      estimatedCost: estimateCost('gpt-4o-mini', Math.floor((HR_AGENT_PROMPT + prompt).length / 4), 400),
      action: 'hr_agent',
    },
  })

  return result
}
