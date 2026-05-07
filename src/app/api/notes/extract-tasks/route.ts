import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractTasksFromNote } from '@/lib/agents/taskExtractorAgent'
import { z } from 'zod'

const Schema = z.object({ noteId: z.string() })

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const note = await prisma.note.findFirst({
    where: { id: parsed.data.noteId, userId: session.user.id },
  })
  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

  try {
    const tasks = await extractTasksFromNote(session.user.id, note)
    const created = []
    for (const task of tasks) {
      const t = await prisma.task.create({
        data: {
          userId: session.user.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          sourceType: 'note',
        },
      })
      created.push(t)
    }
    return NextResponse.json({ tasks: created })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to extract tasks' }, { status: 500 })
  }
}
