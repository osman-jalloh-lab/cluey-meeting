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

  // ── Route 3: Real job search via JSearch (RapidAPI) ────────────────────────
  const jsearchKey = process.env.JSEARCH_API_KEY
  let rawJobs: Array<{ job_title: string; employer_name: string; job_city: string; job_state: string; job_is_remote: boolean; job_apply_link: string; job_description: string; job_employment_type: string }> = []

  if (jsearchKey) {
    try {
      // Build a query from the task — strip common filler words
      const query = task.replace(/find|search|look for|show me|get me/gi, '').trim()
      const url = new URL('https://jsearch.p.rapidapi.com/search')
      url.searchParams.set('query', `${query} Austin TX OR remote`)
      url.searchParams.set('num_pages', '1')
      url.searchParams.set('page', '1')
      url.searchParams.set('date_posted', 'month')
      url.searchParams.set('employment_types', 'FULLTIME,PARTTIME,CONTRACTOR,INTERN')

      const res = await fetch(url.toString(), {
        headers: {
          'X-RapidAPI-Key': jsearchKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) console.error('[JSearch] HTTP', res.status, data.message ?? '')
      rawJobs = (data.data ?? []).slice(0, 10)
    } catch (e) {
      console.error('[JSearch] fetch error:', e instanceof Error ? e.message : String(e))
    }
  }

  const recentLeads = await prisma.jobLead.findMany({
    where: { userId, status: { in: ['Applied', 'Screening', 'Interview', 'Evaluated'] } },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { title: true, company: true, status: true, matchScore: true, nextAction: true },
  })

  const leadsSummary = recentLeads.length > 0
    ? `\nActive leads already tracked:\n${recentLeads.map(l => `- ${l.title} at ${l.company} (${l.status})`).join('\n')}`
    : ''

  const jobsContext = rawJobs.length > 0
    ? `\nReal job listings from JSearch:\n${rawJobs.map((j, i) =>
        `${i + 1}. ${j.job_title} at ${j.employer_name} | ${j.job_is_remote ? 'Remote' : `${j.job_city}, ${j.job_state}`} | ${j.job_employment_type}\n   Apply: ${j.job_apply_link}\n   ${j.job_description?.slice(0, 200)}...`
      ).join('\n\n')}`
    : '\nNo live listings fetched (JSEARCH_API_KEY not set). Advise generally.'

  const systemPrompt = `${AGENT_SHORT_PROMPT}

You are Nova, Osman's Career Advisor. Review the REAL job listings below and rank the best matches for Osman. Focus on: cybersecurity, GRC, IT support, SOC analyst roles. He is F-1 OPT authorized (no full sponsorship needed for OPT, but flag H-1B-only roles). He works max 19.5 hrs/week at UT System OCIO starting May 18 2026 — so part-time or flexible roles are ideal alongside that.

Return ONLY this JSON:
{"response":"2-3 sentence summary of what you found","opportunities":[{"company":"exact company name","role":"exact job title","action":"apply at <url> or specific next step","priority":"high|medium|low"}],"draftEmail":null,"nextSteps":["specific step 1","specific step 2","specific step 3"]}`

  const userPrompt = `Task: ${task}${jobsContext}${leadsSummary}${emailContext ? `\n\nExtra context: ${emailContext}` : ''}`

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
