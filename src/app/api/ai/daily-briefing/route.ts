import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runEmailAccountAgent } from '@/lib/agents/emailAccountAgent'
import { runDailyBriefingAgent } from '@/lib/agents/dailyBriefingAgent'
import { runJobSearchAgent } from '@/lib/agents/jobSearchAgent'
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
    // ── Step 1: Fetch + analyze all email accounts ──────────────────────────
    const emailResults = await Promise.allSettled(
      activeAccounts.map(account => runEmailAccountAgent(account, userId))
    )

    const successfulEmailResults = emailResults
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof runEmailAccountAgent>>> => r.status === 'fulfilled')
      .map(r => r.value)

    // ── Step 2: Fetch calendar events ───────────────────────────────────────
    let calendarEvents: Awaited<ReturnType<typeof fetchTodayEvents>> = []
    try {
      calendarEvents = await fetchTodayEvents(activeAccounts[0].id)
    } catch {
      // Calendar is optional — don't fail the brief
    }

    // ── Step 3: Run core briefing + job update in parallel ──────────────────
    const [briefingResult, jobResult] = await Promise.allSettled([
      runDailyBriefingAgent(userId, successfulEmailResults, calendarEvents),
      runJobSearchAgent(userId, 'today summary'),
    ])

    if (briefingResult.status === 'rejected') {
      throw briefingResult.reason
    }

    const briefing = briefingResult.value

    // ── Step 4: Save tasks extracted from emails ────────────────────────────
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

    // ── Step 5: Build suggested replies (emails needing reply + accountId) ──
    const accountIdMap = new Map(activeAccounts.map(a => [a.emailAddress, a.id]))
    const suggestedReplies = successfulEmailResults.flatMap(r =>
      r.emailsNeedingReply.map(e => ({
        from: e.from,
        subject: e.subject,
        emailId: e.emailId,
        suggestedTone: e.suggestedReplyTone,
        accountEmail: r.accountEmail,
        accountId: accountIdMap.get(r.accountEmail) ?? '',
      }))
    )

    // ── Step 6: Merge extended results ──────────────────────────────────────
    const jobUpdate = jobResult.status === 'fulfilled'
      ? {
          summary: jobResult.value.response,
          toReview: jobResult.value.dailySummary?.topToReview.length ?? 0,
          readyToApply: jobResult.value.dailySummary?.readyToApply.length ?? 0,
          followUpsDue: jobResult.value.dailySummary?.followUpsDue.length ?? 0,
          actions: jobResult.value.nextSteps,
        }
      : null

    // ── Step 7: Send notifications ──────────────────────────────────────────
    const workUnread = briefing.workEmailSection.accounts.reduce((a, acc) => a + acc.unreadCount, 0)
    const studentJobUnread = briefing.studentJobSection.accounts.reduce((a, acc) => a + acc.unreadCount, 0)
    const urgentCount = briefing.urgentFollowUps.filter(u => u.priority === 'high').length

    await Promise.all([
      sendTelegramMorningBriefing({
        greeting: briefing.greeting,
        overview: briefing.overview,
        topPriorities: briefing.topPriorities,
        workUnread,
        studentJobUnread,
        urgentCount,
        calendarSummary: briefing.calendarSummary,
        taskSummary: briefing.taskSummary,
        suggestedNextActions: briefing.suggestedNextActions,
      }),
      sendSlackMorningBriefing({
        greeting: briefing.greeting,
        overview: briefing.overview,
        topPriorities: briefing.topPriorities,
        workUnread,
        studentJobUnread,
        urgentCount,
        calendarSummary: briefing.calendarSummary,
        taskSummary: briefing.taskSummary,
      }),
    ])

    return NextResponse.json({
      ...briefing,
      suggestedReplies,
      jobUpdate,
    })
  } catch (error) {
    console.error('Daily briefing error:', error)
    return NextResponse.json({ error: 'Failed to generate daily briefing' }, { status: 500 })
  }
}
