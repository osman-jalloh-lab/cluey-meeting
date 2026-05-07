// GET /api/jobs/followups
// Returns all job leads that have follow-ups due, sorted by urgency.
// Used by the dashboard summary and Telegram daily briefing.

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateFollowUpStatus } from '@/lib/agents/jobEvaluator'

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leads = await prisma.jobLead.findMany({
    where: {
      userId: session.user.id,
      status: { in: ['Applied', 'Screening', 'Interview'] },
    },
    orderBy: { appliedAt: 'asc' },
  })

  const withFollowUp = leads.map(lead => {
    const followUp = calculateFollowUpStatus(
      lead.status,
      lead.appliedAt,
      lead.followUpDate,
      lead.followUpCount,
    )
    return { ...lead, followUp }
  })

  const urgencyOrder: Record<string, number> = {
    overdue: 0,
    'due-today': 1,
    'due-soon': 2,
    waiting: 3,
    cold: 4,
  }

  withFollowUp.sort((a, b) => (urgencyOrder[a.followUp.urgency] ?? 5) - (urgencyOrder[b.followUp.urgency] ?? 5))

  const actionable = withFollowUp.filter(l => ['overdue', 'due-today', 'due-soon'].includes(l.followUp.urgency))
  const waiting = withFollowUp.filter(l => l.followUp.urgency === 'waiting')
  const cold = withFollowUp.filter(l => l.followUp.urgency === 'cold')

  return NextResponse.json({ actionable, waiting, cold, total: withFollowUp.length })
}

// PATCH /api/jobs/followups
// Mark a follow-up as sent — increments followUpCount and sets next followUpDate
export async function PATCH(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'Missing lead id' }, { status: 400 })

  const lead = await prisma.jobLead.findFirst({
    where: { id: body.id, userId: session.user.id },
  })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cadenceDays: Record<string, number> = { Applied: 7, Screening: 3, Interview: 1 }
  const days = cadenceDays[lead.status] ?? 7
  const nextFollowUp = new Date(Date.now() + days * 86400000)

  const updated = await prisma.jobLead.update({
    where: { id: lead.id },
    data: {
      followUpCount: lead.followUpCount + 1,
      followUpDate: nextFollowUp,
    },
  })

  return NextResponse.json({ lead: updated, nextFollowUp })
}
