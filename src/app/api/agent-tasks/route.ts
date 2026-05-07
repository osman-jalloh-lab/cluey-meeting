import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { sendTelegramTaskResult } from '@/lib/telegram'

const CreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  assignedTo: z.string().min(1),
  createdBy: z.string().default('CEO Controller Agent'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  status: z.enum(['open', 'working', 'blocked', 'completed', 'cancelled']).default('open'),
  source: z.string().optional(),
  dueDate: z.string().optional(),
  carryForward: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  result: z.string().optional(),
  agentNotes: z.string().optional(),
})

const UpdateSchema = z.object({
  id: z.string(),
  status: z.enum(['open', 'working', 'blocked', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  result: z.string().optional(),
  agentNotes: z.string().optional(),
  carryForward: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const assignedTo = searchParams.get('assignedTo')
  const carryForward = searchParams.get('carryForward')

  const tasks = await prisma.agentTask.findMany({
    where: {
      userId: session.user.id,
      ...(status ? { status } : {}),
      ...(assignedTo ? { assignedTo } : {}),
      ...(carryForward !== null ? { carryForward: carryForward === 'true' } : {}),
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  return NextResponse.json({ tasks })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const data = parsed.data
  const task = await prisma.agentTask.create({
    data: {
      userId: session.user.id,
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  })

  // Auto-create a message from the creating agent
  await prisma.agentMessage.create({
    data: {
      userId: session.user.id,
      fromAgent: data.createdBy,
      toAgent: data.assignedTo,
      taskId: task.id,
      message: `Task assigned: "${data.title}". Priority: ${data.priority}.`,
      messageType: 'handoff',
    },
  })

  return NextResponse.json({ task })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { id, ...data } = parsed.data
  const task = await prisma.agentTask.update({
    where: { id, userId: session.user.id },
    data,
  })

  if (data.status === 'completed' && data.result) {
    await prisma.agentMessage.create({
      data: {
        userId: session.user.id,
        fromAgent: task.assignedTo,
        toAgent: 'CEO',
        taskId: task.id,
        message: `Completed: "${task.title}". ${data.result}`,
        messageType: 'complete',
      },
    })

    // Push result to Telegram so you see it on your phone
    await sendTelegramTaskResult({
      taskTitle: task.title,
      assignedTo: task.assignedTo,
      result: data.result,
      agentNotes: data.agentNotes ?? undefined,
    })
  }

  return NextResponse.json({ task })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.agentTask.delete({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
