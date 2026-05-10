import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import OfficeClient from '@/components/dashboard/OfficeClient'

export default async function OfficePage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [accounts, tasks, recentEmails, agentMessages] = await Promise.all([
    prisma.connectedAccount.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { id: true, emailAddress: true, accountLabel: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.task.findMany({
      where: { userId: session.user.id, status: { in: ['pending', 'in_progress'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    }),
    prisma.emailCache.findMany({
      where: { userId: session.user.id, isUnread: true },
      orderBy: { receivedAt: 'desc' },
      take: 10,
      include: { connectedAccount: { select: { accountLabel: true, emailAddress: true } } },
    }),
    prisma.agentMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <OfficeClient
      user={session.user}
      accounts={accounts}
      tasks={tasks}
      recentEmails={recentEmails}
      agentMessages={agentMessages.map(m => ({
        id: m.id,
        fromAgent: m.fromAgent,
        toAgent: m.toAgent,
        message: m.message,
        messageType: m.messageType,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  )
}
