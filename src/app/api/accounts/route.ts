import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasCalendarScope, hasGmailScope } from '@/lib/google/oauth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      emailAddress: true,
      accountLabel: true,
      isActive: true,
      createdAt: true,
      tokenExpiresAt: true,
      scopes: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Annotate each account with derived capability flags
  const annotated = accounts.map(a => ({
    ...a,
    gmailConnected: hasGmailScope(a.scopes),
    calendarConnected: hasCalendarScope(a.scopes),
    needsReconnect: !hasCalendarScope(a.scopes) && !!a.scopes && a.scopes !== 'mcp',
    isMcp: a.scopes === 'mcp',
  }))

  return NextResponse.json(annotated)
}
