import * as openai from '@/lib/ai/openai'
import { prisma } from '@/lib/db'
import { JOB_SEARCH_AGENT_PROMPT } from '@/lib/context/personal'
import { estimateCost } from '@/lib/ai/router'

export interface JobSearchAgentResult {
  response: string
  opportunities: Array<{ company: string; role: string; action: string; priority: string }>
  draftEmail?: string
  nextSteps: string[]
}

export async function runJobSearchAgent(
  userId: string,
  task: string,
  emailContext?: string
): Promise<JobSearchAgentResult> {
  // Pull recent job-related emails for context
  const jobEmails = await prisma.emailCache.findMany({
    where: {
      userId,
      OR: [
        { from: { contains: 'linkedin' } },
        { from: { contains: 'indeed' } },
        { from: { contains: 'handshake' } },
        { from: { contains: 'glassdoor' } },
        { from: { contains: 'recruiter' } },
        { subject: { contains: 'job' } },
        { subject: { contains: 'opportunity' } },
        { subject: { contains: 'interview' } },
        { subject: { contains: 'offer' } },
        { subject: { contains: 'hiring' } },
      ],
    },
    orderBy: { receivedAt: 'desc' },
    take: 10,
    select: { from: true, subject: true, snippet: true, receivedAt: true },
  })

  const emailSummary = jobEmails.length > 0
    ? `\n\nRecent job-related emails:\n${jobEmails.map(e => `- ${e.from}: ${e.subject}`).join('\n')}`
    : ''

  const prompt = `Task: ${task}${emailSummary}${emailContext ? `\n\nAdditional context: ${emailContext}` : ''}

Respond with JSON:
{
  "response": "detailed response",
  "opportunities": [{"company":"name","role":"title","action":"what to do","priority":"high|medium|low"}],
  "draftEmail": "optional draft email if task requires one",
  "nextSteps": ["step 1", "step 2"]
}`

  const result = await openai.chatJson<JobSearchAgentResult>([
    { role: 'system', content: JOB_SEARCH_AGENT_PROMPT },
    { role: 'user', content: prompt },
  ], 'gpt-4o-mini')

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: Math.floor(prompt.length / 4),
      outputTokens: 500,
      estimatedCost: estimateCost('gpt-4o-mini', Math.floor(prompt.length / 4), 500),
      action: 'job_search_agent',
    },
  })

  return result
}
