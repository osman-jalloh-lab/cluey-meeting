import * as openai from '@/lib/ai/openai'
import { prisma } from '@/lib/db'
import { estimateCost } from '@/lib/ai/router'
import { EmailAccountAgentResult } from './emailAccountAgent'
import { CalendarEvent } from '@/lib/google/calendar'

export interface DailyBriefingResult {
  greeting: string
  overview: string
  topPriorities: string[]
  workEmailSection: {
    accounts: Array<{
      accountEmail: string
      accountLabel: string
      summary: string
      unreadCount: number
      urgentCount: number
      alerts: EmailAccountAgentResult['detectedAlerts']
    }>
    hasContent: boolean
  }
  studentJobSection: {
    accounts: Array<{
      accountEmail: string
      accountLabel: string
      summary: string
      unreadCount: number
      urgentCount: number
      alerts: EmailAccountAgentResult['detectedAlerts']
    }>
    hasContent: boolean
  }
  urgentFollowUps: Array<{
    from: string
    subject: string
    reason: string
    suggestedAction: string
    priority: 'high' | 'medium' | 'low'
    source: string
  }>
  calendarSummary: string
  todayEvents: CalendarEvent[]
  taskSummary: string
  suggestedNextActions: string[]
  generatedAt: string
  // Extended fields — populated by the daily-briefing route
  suggestedReplies?: Array<{
    from: string
    subject: string
    emailId: string
    suggestedTone: string
    accountEmail: string
    accountId: string
  }>
  jobUpdate?: {
    summary: string
    toReview: number
    readyToApply: number
    followUpsDue: number
    actions: string[]
  } | null
}

export async function runDailyBriefingAgent(
  userId: string,
  emailResults: EmailAccountAgentResult[],
  calendarEvents: CalendarEvent[],
): Promise<DailyBriefingResult> {
  const openTasks = await prisma.task.findMany({
    where: { userId, status: { in: ['pending', 'in_progress'] } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: 10,
  })

  const now = new Date()
  const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'

  const workAccounts = emailResults.filter(r => r.inboxType === 'work')
  const studentJobAccounts = emailResults.filter(r => r.inboxType === 'student_job')

  const allUrgent = emailResults.flatMap(r =>
    r.urgentEmails.map(e => ({ ...e, source: r.accountLabel }))
  )

  const prompt = `You are the Inbox Specialist creating a structured daily briefing for Osman Jalloh.

Time: ${now.toLocaleTimeString()} (${timeOfDay})
Date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

WORK EMAIL ACCOUNTS (ACC):
${workAccounts.length === 0 ? 'None connected' : workAccounts.map(r => `
Account: ${r.accountLabel} (${r.accountEmail})
- Summary: ${r.summary}
- Unread: ${r.unreadCount}, Urgent: ${r.urgentEmails.length}
- Alerts: ${r.detectedAlerts.map(a => `[${a.category}] ${a.subject} from ${a.from} - ${a.suggestedAction}`).join(' | ') || 'none'}
`).join('\n')}

STUDENT / JOB EMAIL ACCOUNTS:
${studentJobAccounts.length === 0 ? 'None connected' : studentJobAccounts.map(r => `
Account: ${r.accountLabel} (${r.accountEmail})
- Summary: ${r.summary}
- Unread: ${r.unreadCount}, Urgent: ${r.urgentEmails.length}
- Alerts: ${r.detectedAlerts.map(a => `[${a.category}] ${a.subject} from ${a.from} - ${a.suggestedAction}`).join(' | ') || 'none'}
`).join('\n')}

CALENDAR TODAY:
${calendarEvents.length === 0 ? 'No events today' : calendarEvents.map(e => `- ${e.summary} at ${e.start.toLocaleTimeString()}`).join('\n')}

OPEN TASKS:
${openTasks.length === 0 ? 'No open tasks' : openTasks.map(t => `- [${t.priority}] ${t.title}`).join('\n')}

URGENT ACROSS ALL INBOXES:
${allUrgent.length === 0 ? 'Nothing urgent' : allUrgent.map(e => `- [${e.priority.toUpperCase()}] ${e.subject} from ${e.from} (${e.source}) — ${e.suggestedAction}`).join('\n')}

Create a concise, actionable daily briefing JSON:
{
  "greeting": "good ${timeOfDay} message — direct, no filler",
  "overview": "2-3 sentence executive summary covering both inboxes, calendar, and tasks",
  "topPriorities": ["priority 1 — specific action", "priority 2 — specific action", "priority 3 — specific action"],
  "calendarSummary": "brief calendar overview for today",
  "taskSummary": "brief task overview — count and what's urgent",
  "suggestedNextActions": ["first thing to do", "second thing", "third thing", "fourth thing"]
}

Be direct. No filler words. Every action must be specific.
Return ONLY valid JSON.`

  try {
    const result = await openai.chatJson<{
      greeting: string
      overview: string
      topPriorities: string[]
      calendarSummary: string
      taskSummary: string
      suggestedNextActions: string[]
    }>([{ role: 'user', content: prompt }])

    await prisma.apiUsageLog.create({
      data: {
        userId,
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputTokens: prompt.length / 4,
        outputTokens: 600,
        estimatedCost: estimateCost('gpt-4o-mini', prompt.length / 4, 600),
        action: 'daily_briefing',
      },
    })

    return {
      greeting: result.greeting,
      overview: result.overview,
      topPriorities: result.topPriorities ?? [],
      workEmailSection: {
        accounts: workAccounts.map(r => ({
          accountEmail: r.accountEmail,
          accountLabel: r.accountLabel,
          summary: r.summary,
          unreadCount: r.unreadCount,
          urgentCount: r.urgentEmails.length,
          alerts: r.detectedAlerts,
        })),
        hasContent: workAccounts.length > 0,
      },
      studentJobSection: {
        accounts: studentJobAccounts.map(r => ({
          accountEmail: r.accountEmail,
          accountLabel: r.accountLabel,
          summary: r.summary,
          unreadCount: r.unreadCount,
          urgentCount: r.urgentEmails.length,
          alerts: r.detectedAlerts,
        })),
        hasContent: studentJobAccounts.length > 0,
      },
      urgentFollowUps: allUrgent,
      calendarSummary: result.calendarSummary,
      todayEvents: calendarEvents,
      taskSummary: result.taskSummary,
      suggestedNextActions: result.suggestedNextActions ?? [],
      generatedAt: now.toISOString(),
    }
  } catch {
    return {
      greeting: `Good ${timeOfDay}!`,
      overview: `${emailResults.reduce((a, r) => a + r.unreadCount, 0)} unread emails across ${emailResults.length} inboxes. ${calendarEvents.length} events today.`,
      topPriorities: allUrgent.slice(0, 3).map(e => e.suggestedAction),
      workEmailSection: {
        accounts: workAccounts.map(r => ({
          accountEmail: r.accountEmail,
          accountLabel: r.accountLabel,
          summary: r.summary,
          unreadCount: r.unreadCount,
          urgentCount: r.urgentEmails.length,
          alerts: r.detectedAlerts,
        })),
        hasContent: workAccounts.length > 0,
      },
      studentJobSection: {
        accounts: studentJobAccounts.map(r => ({
          accountEmail: r.accountEmail,
          accountLabel: r.accountLabel,
          summary: r.summary,
          unreadCount: r.unreadCount,
          urgentCount: r.urgentEmails.length,
          alerts: r.detectedAlerts,
        })),
        hasContent: studentJobAccounts.length > 0,
      },
      urgentFollowUps: allUrgent,
      calendarSummary: `${calendarEvents.length} events today`,
      todayEvents: calendarEvents,
      taskSummary: `${openTasks.length} open tasks`,
      suggestedNextActions: [],
      generatedAt: now.toISOString(),
    }
  }
}
