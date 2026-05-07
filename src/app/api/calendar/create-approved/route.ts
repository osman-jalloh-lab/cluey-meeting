import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEvent } from '@/lib/google/calendar'
import { z } from 'zod'

const Schema = z.object({
  accountId: z.string(),
  summary: z.string().min(1),
  description: z.string().optional(),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  addMeetLink: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const account = await prisma.connectedAccount.findFirst({
    where: { id: parsed.data.accountId, userId: session.user.id, isActive: true },
  })

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  try {
    const eventId = await createEvent(parsed.data.accountId, {
      summary: parsed.data.summary,
      description: parsed.data.description,
      start: new Date(parsed.data.start),
      end: new Date(parsed.data.end),
      location: parsed.data.location,
      addMeetLink: parsed.data.addMeetLink,
    })

    return NextResponse.json({ success: true, eventId })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
