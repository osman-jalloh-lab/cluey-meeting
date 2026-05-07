import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runReplyDraftAgent } from '@/lib/agents/replyDraftAgent'
import { z } from 'zod'

const Schema = z.object({
  accountId: z.string(),
  originalEmail: z.object({
    from: z.string(),
    subject: z.string(),
    body: z.string(),
    accountEmail: z.string(),
  }),
  tone: z.enum(['professional', 'casual', 'formal']).default('professional'),
  additionalContext: z.string().optional(),
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
    where: { id: parsed.data.accountId, userId: session.user.id },
  })

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  try {
    const draft = await runReplyDraftAgent(
      session.user.id,
      parsed.data.originalEmail,
      parsed.data.tone,
      parsed.data.additionalContext
    )
    return NextResponse.json(draft)
  } catch (error) {
    console.error('Draft reply error:', error)
    return NextResponse.json({ error: 'Failed to draft reply' }, { status: 500 })
  }
}
