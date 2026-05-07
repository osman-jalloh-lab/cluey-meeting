import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/google/gmail'
import { z } from 'zod'

const Schema = z.object({
  accountId: z.string(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
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
    await sendEmail(
      parsed.data.accountId,
      parsed.data.to,
      parsed.data.subject,
      parsed.data.body
    )

    // Log the action
    await prisma.aiMemory.upsert({
      where: { userId_key: { userId: session.user.id, key: `last_sent_email_${Date.now()}` } },
      create: {
        userId: session.user.id,
        key: `last_sent_email_${Date.now()}`,
        value: `Sent email to ${parsed.data.to} with subject "${parsed.data.subject}"`,
        category: 'email_actions',
      },
      update: {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
