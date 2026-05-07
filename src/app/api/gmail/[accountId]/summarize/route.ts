import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runEmailAccountAgent } from '@/lib/agents/emailAccountAgent'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { accountId } = await params

  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, userId: session.user.id, isActive: true },
  })

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  try {
    const result = await runEmailAccountAgent(account, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Email agent error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize inbox. Check your API keys and account connection.' },
      { status: 500 }
    )
  }
}
