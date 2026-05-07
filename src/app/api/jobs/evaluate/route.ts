// POST /api/jobs/evaluate
// Paste a job description — get back a full structured evaluation with score,
// gaps, resume keywords, and next action. Automatically saves to JobLead if score >= 3.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { evaluateJob, generateInterviewPrep, generateCompanyResearch } from '@/lib/agents/jobEvaluator'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const Schema = z.object({
  jobTitle: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  jobDescription: z.string().min(50).max(8000),
  generatePrep: z.boolean().default(false),    // also generate interview prep?
  generateResearch: z.boolean().default(false), // also generate company research?
  saveToTracker: z.boolean().default(true),     // save to JobLead table if score >= 3?
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { jobTitle, company, jobDescription, generatePrep, generateResearch, saveToTracker } = parsed.data
  const userId = session.user.id

  // Run evaluation
  const evaluation = await evaluateJob(userId, jobTitle, company, jobDescription)

  let interviewPrep: string | null = null
  let companyResearch: string | null = null

  // Optional: generate interview prep and company research in parallel
  if (generatePrep || generateResearch) {
    const [prep, research] = await Promise.all([
      generatePrep ? generateInterviewPrep(userId, jobTitle, company, jobDescription, evaluation) : Promise.resolve(null),
      generateResearch ? generateCompanyResearch(userId, company, jobTitle) : Promise.resolve(null),
    ])
    interviewPrep = prep
    companyResearch = research
  }

  // Save to JobLead tracker
  let savedLead = null
  if (saveToTracker && evaluation.score >= 3) {
    savedLead = await prisma.jobLead.create({
      data: {
        userId,
        title: evaluation.title || jobTitle,
        company: evaluation.company || company,
        location: evaluation.location,
        matchScore: evaluation.score * 20, // 1-5 → 20-100
        scoreBreakdown: JSON.stringify(evaluation.scoreBreakdown),
        matchReason: evaluation.whyItMatches,
        recommendation: evaluation.recommendation,
        missingSkills: evaluation.gaps.join(', '),
        resumeKeywords: evaluation.resumeKeywords.join(', '),
        resumeAngle: evaluation.resumeAngle,
        workAuthNotes: evaluation.workAuthNotes,
        sponsorshipRequired: evaluation.sponsorshipRequired,
        clearanceRequired: evaluation.clearanceRequired,
        nextAction: evaluation.nextAction,
        status: 'Evaluated',
        createdBy: 'Nova — Career Advisor',
        interviewPrep: interviewPrep ?? undefined,
        companyResearch: companyResearch ?? undefined,
      },
    })
  }

  return NextResponse.json({
    evaluation,
    interviewPrep,
    companyResearch,
    savedToTracker: !!savedLead,
    leadId: savedLead?.id ?? null,
  })
}
