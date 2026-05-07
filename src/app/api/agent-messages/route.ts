import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateSchema = z.object({
  fromAgent: z.string().min(1),
  toAgent: z.string().optional(),
  taskId: z.string().optional(),
  message: z.string().min(1).max(1000),
  messageType: z.enum(['update', 'alert', 'handoff', 'complete', 'question']).default('update'),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const messages = await prisma.agentMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { task: { select: { title: true, status: true } } },
  })

  // Mark all as read
  await prisma.agentMessage.updateMany({
    where: { userId: session.user.id, status: 'sent' },
    data: { status: 'read' },
  })

  return NextResponse.json({ messages })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const msg = await prisma.agentMessage.create({
    data: { userId: session.user.id, ...parsed.data },
  })

  return NextResponse.json({ message: msg })
}
