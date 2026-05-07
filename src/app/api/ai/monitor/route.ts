import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runEmailAccountAgent } from '@/lib/agents/emailAccountAgent'
import { sendSlackEmailAlert } from '@/lib/slack'
import { sendTelegramAlert } from '@/lib/telegram'

// POST /api/ai/monitor
// Runs the Inbox Specialist across all connected accounts.
// For each high-priority alert: saves to dashboard + pings Telegram + pings Slack.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id!

  const accounts = await prisma.connectedAccount.findMany({
    where: { userId, isActive: true },
  })

  if (accounts.length === 0) {
    return NextResponse.json({ alerts: [], checked: 0 })
  }

  const results = await Promise.allSettled(
    accounts.map(account => runEmailAccountAgent(account, userId))
  )

  const alerts: Array<{
    account: string
    inboxType: string
    category: string
    from: string
    subject: string
    summary: string
    suggestedAction: string
    priority: string
  }> = []

  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const result = r.value

    for (const alert of result.detectedAlerts) {
      if (alert.priority !== 'high') continue

      const prefix = result.inboxType === 'work'
        ? `New ACC ${alert.category}-related email detected`
        : `New ${alert.category} email detected`

      const message = `${prefix}. From: ${alert.from}. Subject: "${alert.subject}". ${alert.summary}. Suggested next step: ${alert.suggestedAction}.`

      await prisma.agentMessage.create({
        data: {
          userId,
          fromAgent: 'Inbox Specialist',
          toAgent: 'Osman',
          message,
          messageType: 'alert',
        },
      })

      // Notify on both channels — each is a no-op if not configured
      await Promise.all([
        sendTelegramAlert({
          inboxType: result.inboxType,
          category: alert.category,
          from: alert.from,
          subject: alert.subject,
          summary: alert.summary,
          suggestedAction: alert.suggestedAction,
          priority: alert.priority,
        }),
        sendSlackEmailAlert({
          inboxType: result.inboxType,
          category: alert.category,
          from: alert.from,
          subject: alert.subject,
          summary: alert.summary,
          suggestedAction: alert.suggestedAction,
          priority: alert.priority,
        }),
      ])

      alerts.push({
        account: result.accountEmail,
        inboxType: result.inboxType,
        category: alert.category,
        from: alert.from,
        subject: alert.subject,
        summary: alert.summary,
        suggestedAction: alert.suggestedAction,
        priority: alert.priority,
      })
    }

    // Urgent emails not already covered by detectedAlerts
    for (const urgent of result.urgentEmails) {
      if (urgent.priority !== 'high') continue
      const alreadyCovered = result.detectedAlerts.some(a => a.subject === urgent.subject)
      if (alreadyCovered) continue

      const message = `Urgent email in ${result.accountLabel}. From: ${urgent.from}. Subject: "${urgent.subject}". ${urgent.reason}. Next step: ${urgent.suggestedAction}.`

      await prisma.agentMessage.create({
        data: {
          userId,
          fromAgent: 'Inbox Specialist',
          toAgent: 'Osman',
          message,
          messageType: 'alert',
        },
      })

      await Promise.all([
        sendTelegramAlert({
          inboxType: result.inboxType,
          category: 'Urgent',
          from: urgent.from,
          subject: urgent.subject,
          summary: urgent.reason,
          suggestedAction: urgent.suggestedAction,
          priority: urgent.priority,
        }),
        sendSlackEmailAlert({
          inboxType: result.inboxType,
          category: 'Urgent',
          from: urgent.from,
          subject: urgent.subject,
          summary: urgent.reason,
          suggestedAction: urgent.suggestedAction,
          priority: urgent.priority,
        }),
      ])
    }
  }

  return NextResponse.json({
    alerts,
    checked: accounts.length,
    checkedAt: new Date().toISOString(),
  })
}
