import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [accounts, tasks, recentEmails] = await Promise.all([
    prisma.connectedAccount.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { id: true, emailAddress: true, accountLabel: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.task.findMany({
      where: { userId: session.user.id, status: { in: ['pending', 'in_progress'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    prisma.emailCache.findMany({
      where: { userId: session.user.id, isUnread: true },
      orderBy: { receivedAt: 'desc' },
      take: 10,
      include: { connectedAccount: { select: { accountLabel: true, emailAddress: true } } },
    }),
  ])

  return (
    <DashboardClient
      user={session.user}
      accounts={accounts}
      tasks={tasks}
      recentEmails={recentEmails}
    />
  )
}
