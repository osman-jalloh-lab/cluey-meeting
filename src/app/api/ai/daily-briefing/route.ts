import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runEmailAccountAgent } from '@/lib/agents/emailAccountAgent'
import { runDailyBriefingAgent } from '@/lib/agents/dailyBriefingAgent'
import { fetchTodayEvents } from '@/lib/google/calendar'
import { sendSlackMorningBriefing } from '@/lib/slack'
import { sendTelegramMorningBriefing } from '@/lib/telegram'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id!

  const activeAccounts = await prisma.connectedAccount.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  if (activeAccounts.length === 0) {
    return NextResponse.json({
      error: 'No connected accounts. Please connect a Gmail account first.',
    }, { status: 400 })
  }

  try {
    const emailResults = await Promise.allSettled(
      activeAccounts.map(account => runEmailAccountAgent(account, userId))
    )

    const successfulEmailResults = emailResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)

    let calendarEvents: any[] = []
    try {
      calendarEvents = await fetchTodayEvents(activeAccounts[0].id)
    } catch {
      // Calendar is optional
    }

    const briefing = await runDailyBriefingAgent(
      userId,
      successfulEmailResults,
      calendarEvents
    )

    // Save extracted tasks
    for (const emailResult of successfulEmailResults) {
      for (const task of emailResult.tasks) {
        await prisma.task.create({
          data: {
            userId,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            sourceType: 'gmail',
          },
        }).catch(() => {})
      }
    }

    // Compile notification payload
    const workUnread = briefing.workEmailSection.accounts.reduce((a, acc) => a + acc.unreadCount, 0)
    const studentJobUnread = briefing.studentJobSection.accounts.reduce((a, acc) => a + acc.unreadCount, 0)
    const urgentCount = briefing.urgentFollowUps.filter(u => u.priority === 'high').length

    const notifyPayload = {
      greeting: briefing.greeting,
      overview: briefing.overview,
      topPriorities: briefing.topPriorities,
      workUnread,
      studentJobUnread,
      urgentCount,
      calendarSummary: briefing.calendarSummary,
      taskSummary: briefing.taskSummary,
      suggestedNextActions: briefing.suggestedNextActions,
    }

    // Send to Telegram + Slack in parallel — both no-op if not configured
    await Promise.all([
      sendTelegramMorningBriefing(notifyPayload),
      sendSlackMorningBriefing(notifyPayload),
    ])

    return NextResponse.json(briefing)
  } catch (error) {
    console.error('Daily briefing error:', error)
    return NextResponse.json({ error: 'Failed to generate daily briefing' }, { status: 500 })
  }
}
