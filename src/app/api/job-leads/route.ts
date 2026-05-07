import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  source: z.string().optional(),
  jobUrl: z.string().optional(),
  matchScore: z.number().int().min(0).max(100).default(0),
  matchReason: z.string().optional(),
  requiredSkills: z.string().optional(),
  matchedSkills: z.string().optional(),
  missingSkills: z.string().optional(),
  workAuthNotes: z.string().optional(),
  status: z.string().default('Found'),
  resumeVersion: z.string().optional(),
  coverLetterVersion: z.string().optional(),
  nextAction: z.string().optional(),
  deadline: z.string().optional(),
  requiresApproval: z.boolean().default(true),
})

const UpdateSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  resumeVersion: z.string().optional(),
  coverLetterVersion: z.string().optional(),
  nextAction: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leads = await prisma.jobLead.findMany({
    where: { userId: session.user.id },
    orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  })

  return NextResponse.json({ leads })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const data = parsed.data
  const lead = await prisma.jobLead.create({
    data: {
      userId: session.user.id,
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : null,
    },
  })

  return NextResponse.json({ lead })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { id, ...data } = parsed.data
  const lead = await prisma.jobLead.update({
    where: { id, userId: session.user.id },
    data,
  })

  return NextResponse.json({ lead })
}
