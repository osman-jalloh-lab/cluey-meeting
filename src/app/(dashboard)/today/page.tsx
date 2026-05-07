import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import TodayClient from '@/components/dashboard/TodayClient'

export default async function TodayPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const userId = session.user.id!

  // Fetch pending task count
  const pendingTaskCount = await prisma.task.count({
    where: { userId, status: { in: ['pending', 'in_progress'] } },
  })

  // Fetch recent Inbox Specialist alerts (last 10)
  const recentAlerts = await prisma.agentMessage.findMany({
    where: {
      userId,
      fromAgent: 'Inbox Specialist',
      messageType: 'alert',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, message: true, createdAt: true, messageType: true },
  })

  return (
    <TodayClient
      initialBriefing={null}
      pendingTaskCount={pendingTaskCount}
      recentAlerts={recentAlerts.map(a => ({
        id: a.id,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
        messageType: a.messageType,
      }))}
    />
  )
}
