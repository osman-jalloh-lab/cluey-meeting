import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as openai from '@/lib/ai/openai'
import { z } from 'zod'

const Schema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Get or create conversation
  let conversation = parsed.data.conversationId
    ? await prisma.aiConversation.findFirst({
        where: { id: parsed.data.conversationId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      })
    : null

  if (!conversation) {
    conversation = await prisma.aiConversation.create({
      data: {
        userId: session.user.id,
        title: parsed.data.message.slice(0, 50),
      },
      include: { messages: true },
    })
  }

  // Build message history
  const history = (conversation.messages ?? []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  history.push({ role: 'user', content: parsed.data.message })

  // Save user message
  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content: parsed.data.message,
    },
  })

  try {
    const systemPrompt = `You are the AI assistant for Yash's Command Centre, a personal AI command centre.
You help the user manage their emails, calendar, tasks, and notes.
Be concise, helpful, and proactive. Today is ${new Date().toLocaleDateString()}.
When suggesting actions involving emails or calendar events, remind the user that they must approve before anything is sent or created.`

    const result = await openai.chat(
      [{ role: 'system', content: systemPrompt }, ...history],
      'gpt-4o-mini'
    )

    // Save assistant message
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: result.content,
        provider: 'openai',
        model: 'gpt-4o-mini',
      },
    })

    // Log usage
    await prisma.apiUsageLog.create({
      data: {
        userId: session.user.id,
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: (result.inputTokens * 0.15 + result.outputTokens * 0.60) / 1_000_000,
        action: 'chat',
      },
    })

    return NextResponse.json({
      reply: result.content,
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'AI service unavailable. Check your API key.' }, { status: 500 })
  }
}
