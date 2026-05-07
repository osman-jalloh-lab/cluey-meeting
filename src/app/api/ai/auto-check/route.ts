import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runEmailAccountAgent } from '@/lib/agents/emailAccountAgent'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id!

  const accounts = await prisma.connectedAccount.findMany({
    where: { userId, isActive: true },
  })

  const results = await Promise.allSettled(
    accounts.map(account => runEmailAccountAgent(account, userId))
  )

  const summary = results.map((r, i) => ({
    account: accounts[i].emailAddress,
    status: r.status,
    unread: r.status === 'fulfilled' ? r.value.unreadCount : 0,
  }))

  return NextResponse.json({ checked: accounts.length, summary, checkedAt: new Date().toISOString() })
}
