import { prisma } from '@/lib/db'
import * as openai from '@/lib/ai/openai'
import { AGENT_SHORT_PROMPT } from '@/lib/context/personal'
import { evaluateJob, getDailyJobSummary } from './jobEvaluator'
import type { JobEvaluation, DailyJobSummary } from './jobEvaluator'

export interface JobSearchAgentResult {
  response: string
  opportunities: Array<{ company: string; role: string; action: string; priority: string }>
  draftEmail?: string
  nextSteps: string[]
  evaluation?: JobEvaluation        // populated when a JD was passed in
  dailySummary?: DailyJobSummary    // populated when task is a summary/briefing request
}

// Detect if the task is asking for a job evaluation vs. a general query
function isEvaluationRequest(task: string): boolean {
  const t = task.toLowerCase()
  return ['evaluate', 'score', 'assess', 'rate this job', 'should i apply', 'good fit', 'review this'].some(k => t.includes(k))
}

function isSummaryRequest(task: string): boolean {
  const t = task.toLowerCase()
  return ['summary', 'briefing', 'today', 'what should i do', 'pipeline', 'follow up', 'status'].some(k => t.includes(k))
}

export async function runJobSearchAgent(
  userId: string,
  task: string,
  emailContext?: string
): Promise<JobSearchAgentResult> {

  // ── Route 1: Daily summary ──────────────────────────────────────────────────
  if (isSummaryRequest(task)) {
    const dailySummary = await getDailyJobSummary(userId)
    const lines = [
      `Here is your job search status:`,
      `${dailySummary.stats.totalLeads} total leads tracked. ${dailySummary.stats.applied} applied. ${dailySummary.stats.inProgress} in progress. Average score: ${dailySummary.stats.averageScore}/100.`,
      dailySummary.topToReview.length > 0 ? `Top leads to review: ${dailySummary.topToReview.map(j => `${j.title} at ${j.company}`).join(', ')}.` : '',
      dailySummary.readyToApply.length > 0 ? `Ready to apply: ${dailySummary.readyToApply.map(j => `${j.title} at ${j.company}`).join(', ')}.` : '',
      dailySummary.followUpsDue.length > 0 ? `Follow-ups due: ${dailySummary.followUpsDue.map(j => j.company).join(', ')}.` : '',
    ].filter(Boolean)

    return {
      response: lines.join(' '),
      opportunities: dailySummary.readyToApply.map(j => ({
        company: j.company,
        role: j.title,
        action: 'Apply now',
        priority: 'high',
      })),
      nextSteps: dailySummary.todayActions,
      dailySummary,
    }
  }

  // ── Route 2: Job evaluation (JD pasted in) ──────────────────────────────────
  if (isEvaluationRequest(task) && task.length > 300) {
    // Extract title and company from the task text if possible — fallback to Unknown
    let jobTitle = 'Unknown Role'
    const company = 'Unknown Company'

    // Try to extract from first line of the task
    const firstLine = task.split('\n')[0] ?? ''
    if (firstLine.length < 100) {
      jobTitle = firstLine.trim() || jobTitle
    }

    const evaluation = await evaluateJob(userId, jobTitle, company, task)

    // Auto-save to job leads if score >= 3
    if (evaluation.score >= 3) {
      await prisma.jobLead.create({
        data: {
          userId,
          title: evaluation.title || jobTitle,
          company: evaluation.company || company,
          location: evaluation.location,
          matchScore: evaluation.score * 20, // convert 1-5 to 0-100
          scoreBreakdown: JSON.stringify(evaluation.scoreBreakdown),
          matchReason: evaluation.whyItMatches,
          recommendation: evaluation.recommendation,
          requiredSkills: '',
          matchedSkills: '',
          missingSkills: evaluation.gaps.join(', '),
          resumeKeywords: evaluation.resumeKeywords.join(', '),
          resumeAngle: evaluation.resumeAngle,
          workAuthNotes: evaluation.workAuthNotes,
          sponsorshipRequired: evaluation.sponsorshipRequired,
          clearanceRequired: evaluation.clearanceRequired,
          nextAction: evaluation.nextAction,
          status: 'Evaluated',
          createdBy: 'Nova — Career Advisor',
        },
      })
    }

    const scoreLabel = ['', 'Skip', 'Probably skip', 'Review gaps first', 'Apply after small edits', 'Apply now'][evaluation.score]
    return {
      response: `Nova evaluated this job. Score: ${evaluation.score}/5 — ${scoreLabel}.\n\n${evaluation.whyItMatches}\n\nGaps: ${evaluation.gaps.join(', ') || 'None identified'}.\n\nNext action: ${evaluation.nextAction}`,
      opportunities: evaluation.score >= 3 ? [{ company: evaluation.company, role: evaluation.title, action: evaluation.nextAction, priority: evaluation.score >= 4 ? 'high' : 'medium' }] : [],
      nextSteps: [evaluation.nextAction, ...evaluation.resumeKeywords.slice(0, 2).map(k => `Add "${k}" to your resume if truthful`)],
      evaluation,
    }
  }

  // ── Route 3: General job query via gpt-4o-mini ─────────────────────────────
  const recentLeads = await prisma.jobLead.findMany({
    where: { userId, status: { in: ['Applied', 'Screening', 'Interview', 'Evaluated'] } },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { title: true, company: true, status: true, matchScore: true, nextAction: true },
  })

  const leadsSummary = recentLeads.length > 0
    ? `\nActive job leads:\n${recentLeads.map(l => `- ${l.title} at ${l.company} (${l.status}, score: ${l.matchScore}/100)`).join('\n')}`
    : ''

  const systemPrompt = `${AGENT_SHORT_PROMPT}

You are Nova, Osman's Career Advisor. Help with job search advice, pipeline review, and next steps. Focus on: cybersecurity, GRC, IT support, SOC analyst roles in Austin TX or remote. He is F-1 OPT authorized. He starts at UT System OCIO May 18 2026 (19.5 hrs/week max).

Return ONLY this JSON:
{"response":"direct answer","opportunities":[{"company":"name","role":"title","action":"next step","priority":"high|medium|low"}],"draftEmail":null,"nextSteps":["step1","step2"]}`

  const userPrompt = `Task: ${task}${leadsSummary}${emailContext ? `\n\nContext: ${emailContext}` : ''}`

  try {
    const result = await openai.chatJson<JobSearchAgentResult>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    return result
  } catch {
    return {
      response: 'Could not reach job search agent. Check your OpenAI API key.',
      opportunities: [],
      nextSteps: [],
    }
  }
}
