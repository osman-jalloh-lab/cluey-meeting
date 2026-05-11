import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const uid = session.user.id

  const [accounts, tasks, recentEmails, pendingApprovals, jobCount, noteCount, hrCount] = await Promise.all([
    prisma.connectedAccount.findMany({
      where: { userId: uid, isActive: true },
      select: { id: true, emailAddress: true, accountLabel: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.task.findMany({
      where: { userId: uid, status: { in: ['pending', 'in_progress'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    }),
    prisma.emailCache.findMany({
      where: { userId: uid, isUnread: true },
      orderBy: { receivedAt: 'desc' },
      take: 10,
      include: { connectedAccount: { select: { accountLabel: true, emailAddress: true } } },
    }),
    prisma.agentTask.findMany({
      where: { userId: uid, requiresApproval: true, status: { in: ['open', 'pending'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Career: active job leads (exclude terminal statuses)
    prisma.jobLead.count({
      where: { userId: uid, status: { notIn: ['Rejected', 'Accepted', 'Skipped'] } },
    }),
    // School: notes count
    prisma.note.count({ where: { userId: uid } }),
    // Work/HR: open agentTasks assigned to HR/compliance agents
    prisma.agentTask.count({
      where: { userId: uid, status: { in: ['open', 'in_progress'] }, assignedTo: { in: ['Lex', 'Work & Compliance', 'HR Agent'] } },
    }),
  ])

  return (
    <DashboardClient
      user={session.user}
      accounts={accounts}
      tasks={tasks}
      recentEmails={recentEmails}
      pendingApprovals={pendingApprovals}
      jobCount={jobCount}
      noteCount={noteCount}
      hrCount={hrCount}
    />
  )
}
