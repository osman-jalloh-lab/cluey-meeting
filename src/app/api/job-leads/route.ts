import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getDailyJobSummary } from '@/lib/agents/jobEvaluator'

// Status pipeline:
// Found → Evaluated → Applying → Applied → Screening → Interview → Offer → Accepted | Rejected | Skipped
const JOB_STATUSES = ['Found', 'Evaluated', 'Applying', 'Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Skipped'] as const

const CreateSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  source: z.string().optional(),
  jobUrl: z.string().optional(),
  matchScore: z.number().int().min(0).max(100).default(0),
  scoreBreakdown: z.string().optional(),
  matchReason: z.string().optional(),
  recommendation: z.string().optional(),
  requiredSkills: z.string().optional(),
  matchedSkills: z.string().optional(),
  missingSkills: z.string().optional(),
  resumeKeywords: z.string().optional(),
  resumeAngle: z.string().optional(),
  workAuthNotes: z.string().optional(),
  sponsorshipRequired: z.boolean().default(false),
  clearanceRequired: z.boolean().default(false),
  status: z.string().default('Found'),
  resumeVersion: z.string().optional(),
  coverLetterVersion: z.string().optional(),
  nextAction: z.string().optional(),
  notes: z.string().optional(),
  deadline: z.string().optional(),
  appliedAt: z.string().optional(),
  followUpDate: z.string().optional(),
  interviewDate: z.string().optional(),
  requiresApproval: z.boolean().default(true),
})

const UpdateSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  resumeVersion: z.string().optional(),
  coverLetterVersion: z.string().optional(),
  nextAction: z.string().optional(),
  notes: z.string().optional(),
  matchScore: z.number().int().min(0).max(100).optional(),
  appliedAt: z.string().optional(),
  followUpDate: z.string().optional(),
  interviewDate: z.string().optional(),
  followUpCount: z.number().int().min(0).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const summary = searchParams.get('summary') === 'true'
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  // Daily summary mode
  if (summary) {
    const dailySummary = await getDailyJobSummary(session.user.id)
    return NextResponse.json({ summary: dailySummary })
  }

  const where: any = { userId: session.user.id }
  if (status) where.status = status

  const leads = await prisma.jobLead.findMany({
    where,
    orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })

  // Count by status for pipeline overview
  const pipeline = await prisma.jobLead.groupBy({
    by: ['status'],
    where: { userId: session.user.id },
    _count: { id: true },
  })

  return NextResponse.json({
    leads,
    pipeline: pipeline.reduce((acc, p) => ({ ...acc, [p.status]: p._count.id }), {} as Record<string, number>),
    total: leads.length,
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })

  const data = parsed.data
  const lead = await prisma.jobLead.create({
    data: {
      userId: session.user.id,
      title: data.title,
      company: data.company,
      location: data.location,
      source: data.source,
      jobUrl: data.jobUrl,
      matchScore: data.matchScore,
      scoreBreakdown: data.scoreBreakdown,
      matchReason: data.matchReason,
      recommendation: data.recommendation,
      requiredSkills: data.requiredSkills,
      matchedSkills: data.matchedSkills,
      missingSkills: data.missingSkills,
      resumeKeywords: data.resumeKeywords,
      resumeAngle: data.resumeAngle,
      workAuthNotes: data.workAuthNotes,
      sponsorshipRequired: data.sponsorshipRequired,
      clearanceRequired: data.clearanceRequired,
      status: data.status,
      resumeVersion: data.resumeVersion,
      coverLetterVersion: data.coverLetterVersion,
      nextAction: data.nextAction,
      notes: data.notes,
      requiresApproval: data.requiresApproval,
      deadline: data.deadline ? new Date(data.deadline) : null,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
    },
  })

  return NextResponse.json({ lead })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })

  const { id, appliedAt, followUpDate, interviewDate, ...rest } = parsed.data

  // If status is being set to Applied and no appliedAt provided, set it now
  const appliedAtDate = appliedAt
    ? new Date(appliedAt)
    : (rest.status === 'Applied' ? new Date() : undefined)

  const lead = await prisma.jobLead.update({
    where: { id, userId: session.user.id },
    data: {
      ...rest,
      ...(appliedAtDate !== undefined && { appliedAt: appliedAtDate }),
      ...(followUpDate && { followUpDate: new Date(followUpDate) }),
      ...(interviewDate && { interviewDate: new Date(interviewDate) }),
    },
  })

  return NextResponse.json({ lead })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.jobLead.delete({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
