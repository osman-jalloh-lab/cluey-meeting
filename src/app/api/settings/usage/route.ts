import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs = await prisma.apiUsageLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const totalCost = logs.reduce((sum, l) => sum + l.estimatedCost, 0)

  const byProvider = logs.reduce((acc, log) => {
    if (!acc[log.provider]) acc[log.provider] = { calls: 0, cost: 0 }
    acc[log.provider].calls++
    acc[log.provider].cost += log.estimatedCost
    return acc
  }, {} as Record<string, { calls: number; cost: number }>)

  return NextResponse.json({ logs, totalCost, byProvider })
}
