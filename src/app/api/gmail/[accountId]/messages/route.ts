import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { accountId } = await params

  // Verify account belongs to user
  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  })

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Return cached emails
  const emails = await prisma.emailCache.findMany({
    where: { connectedAccountId: accountId },
    orderBy: { receivedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      gmailMessageId: true,
      from: true,
      subject: true,
      snippet: true,
      receivedAt: true,
      isUnread: true,
      isImportant: true,
      hasAttachment: true,
      priority: true,
      needsReply: true,
      summary: true,
    },
  })

  return NextResponse.json(emails)
}
