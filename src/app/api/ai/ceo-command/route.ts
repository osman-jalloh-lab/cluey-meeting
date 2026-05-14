import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { runEmailAccountAgent } from '@/lib/agents/emailAccountAgent'
import { runJobSearchAgent } from '@/lib/agents/jobSearchAgent'
import { runDailyBriefingAgent } from '@/lib/agents/dailyBriefingAgent'
import { getAllCalendarEvents } from '@/lib/google/calendar'

const Schema = z.object({
  command: z.string().min(1).max(500),
})

// Agent routing by keyword - no API cost
const ROUTING_RULES: Array<{ keywords: string[]; agent: string; priority: string; source: string }> = [
  {
    keywords: ['email', 'inbox', 'gmail', 'unread', 'reply', 'message', 'recruiter email', 'check mail'],
    agent: 'Inbox Specialist',
    priority: 'normal',
    source: 'gmail',
  },
  {
    keywords: ['calendar', 'schedule', 'meeting', 'event', 'appointment', 'block time', 'week', 'tomorrow'],
    agent: 'Schedule Manager',
    priority: 'normal',
    source: 'calendar',
  },
  {
    keywords: ['job', 'internship', 'apply', 'career', 'resume', 'cover letter', 'hiring', 'opportunity', 'find jobs', 'pipeline'],
    agent: 'Career Advisor',
    priority: 'high',
    source: 'job-search',
  },
  {
    keywords: ['task', 'priority', 'focus', 'finish', 'unfinished', 'todo', 'action', 'blocked', 'hr', 'i-9', 'i9', 'compliance', 'ead', 'workday', 'verify', 'immigration', 'uscis', 'opt status'],
    agent: 'Ops Manager',
    priority: 'normal',
    source: 'tasks',
  },
  {
    keywords: ['briefing', 'morning', 'summary', 'plan my day', 'daily', 'recap', 'overview', 'what do i have', 'assign', 'delegate', 'report', 'status update', 'check in', 'learn', 'study', 'course', 'certification', 'cert', 'school', 'skill', 'grow'],
    agent: 'Chief of Staff',
    priority: 'normal',
    source: 'briefing',
  },
]

function routeCommand(command: string): { agent: string; priority: string; source: string } {
  const lower = command.toLowerCase()
  for (const rule of ROUTING_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { agent: rule.agent, priority: rule.priority, source: rule.source }
    }
  }
  return { agent: 'Chief of Staff', priority: 'normal', source: 'manual' }
}

function buildTaskTitle(command: string, agent: string): string {
  const lower = command.toLowerCase()
  if (lower.startsWith('find') || lower.startsWith('search') || lower.startsWith('look')) return command
  if (lower.startsWith('check')) return command
  if (lower.startsWith('create') || lower.startsWith('make') || lower.startsWith('generate')) return command
  if (lower.startsWith('plan')) return command
  if (lower.startsWith('show') || lower.startsWith('list')) return command
  return `${agent}: ${command}`
}

// ── Agent executors - each returns a formatted string result ──────────────────

async function runEmailAgent(userId: string, command: string): Promise<string> {
  const accounts = await prisma.connectedAccount.findMany({ where: { userId, isActive: true } })
  if (accounts.length === 0) return 'No email accounts connected. Add one in Accounts settings.'
  const results = await Promise.allSettled(accounts.map(a => runEmailAccountAgent(a, userId)))
  const lines: string[] = []
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const res = r.value
    lines.push(`${res.accountLabel} (${res.inboxType}) - ${res.unreadCount} unread of ${res.totalEmails} checked`)
    lines.push(res.summary)
    if (res.urgentEmails.length > 0) {
      lines.push(`\nNeeds attention (${res.urgentEmails.length}):`)
      res.urgentEmails.slice(0, 5).forEach(e => {
        lines.push(`* ${e.from}`)
        lines.push(`  "${e.subject}"`)
        lines.push(`  Why urgent: ${e.reason}`)
        lines.push(`  Action: ${e.suggestedAction}`)
      })
    }
    if (res.emailsNeedingReply.length > 0) {
      lines.push(`\nNeeds reply (${res.emailsNeedingReply.length}):`)
      res.emailsNeedingReply.forEach(e => {
        lines.push(`* "${e.subject}" from ${e.from} - tone: ${e.suggestedReplyTone}`)
      })
    }
    if (res.tasks.length > 0) {
      lines.push(`\nAction items extracted (${res.tasks.length}):`)
      res.tasks.slice(0, 5).forEach(t => {
        lines.push(`* [${t.priority}] ${t.title}`)
        if (t.dueDate) lines.push(`  Due: ${t.dueDate}`)
      })
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

async function runCalendarAgent(userId: string): Promise<string> {
  const now = new Date()
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  let events: Awaited<ReturnType<typeof getAllCalendarEvents>> = []
  let calendarError: string | null = null

  try {
    events = await getAllCalendarEvents(userId, { timeMin, timeMax, maxPerCalendar: 15 })
  } catch (e) {
    calendarError = e instanceof Error ? e.message : String(e)
  }

  if (calendarError) {
    return `Calendar error: ${calendarError}. Go to /accounts and reconnect your Google account to refresh the token.`
  }
  if (events.length === 0) {
    return 'No events found in the next 7 days. If you expect events, go to /accounts and reconnect Google Calendar.'
  }

  const lines = events.slice(0, 10).map(e => {
    const when = e.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const time = e.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `* ${when} ${time} - ${e.title}${e.meetingLink ? ' [has link]' : ''}\n  ${e.calendarName} | ${e.sourceAccountEmail}`
  })
  return `Next 7 days (${events.length} events):\n\n${lines.join('\n')}`
}

async function runTasksAgent(userId: string): Promise<string> {
  const [open, completed] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { in: ['pending', 'in_progress'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 15,
    }),
    prisma.task.findMany({
      where: { userId, status: 'completed' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])
  const lines: string[] = []
  if (open.length === 0) {
    lines.push('No open tasks.')
  } else {
    lines.push(`Open tasks (${open.length}):`)
    open.forEach((t, i) => {
      const p = t.priority === 'high' ? '🔴' : t.priority === 'normal' ? '🟡' : '⚪'
      lines.push(`${i + 1}. ${p} [${t.status}] ${t.title}`)
      if (t.dueDate) lines.push(`   Due: ${new Date(t.dueDate).toLocaleDateString()}`)
    })
  }
  if (completed.length > 0) {
    lines.push(`\nRecently completed (${completed.length}):`)
    completed.forEach(t => lines.push(`* ${t.title}`))
  }
  return lines.join('\n')
}

async function runBriefingAgent(userId: string): Promise<string> {
  const accounts = await prisma.connectedAccount.findMany({ where: { userId, isActive: true } })
  const now = new Date()
  const [emailResults, calendarEvents] = await Promise.all([
    Promise.allSettled(accounts.map(a => runEmailAccountAgent(a, userId))),
    getAllCalendarEvents(userId, {
      timeMin: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      timeMax: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      maxPerCalendar: 20,
    }).catch(() => []),
  ])
  const emails = emailResults
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof runEmailAccountAgent>>> => r.status === 'fulfilled')
    .map(r => r.value)
  // Map NormalizedCalendarEvent to CalendarEvent shape expected by briefing agent
  const todayEvents = calendarEvents.map(e => ({
    id: e.id, summary: e.title, description: e.description,
    start: e.start, end: e.end, location: e.location,
    attendees: e.attendees, meetLink: e.meetingLink, status: e.status,
  }))
  const b = await runDailyBriefingAgent(userId, emails, todayEvents)
  const lines = [
    b.greeting,
    '',
    b.overview,
    '',
    'Top Priorities:',
    b.topPriorities.slice(0, 5).map((p, i) => `${i + 1}. ${p}`).join('\n'),
    '',
    `Calendar: ${b.calendarSummary}`,
    `Tasks: ${b.taskSummary}`,
    '',
    b.suggestedNextActions.length > 0 ? 'Do next:\n' + b.suggestedNextActions.slice(0, 4).map((a, i) => `${i + 1}. ${a}`).join('\n') : '',
    '',
    b.urgentFollowUps.length > 0 ? 'Urgent follow-ups:\n' + b.urgentFollowUps.slice(0, 3).map(u => `* [${u.priority}] ${u.suggestedAction} - ${u.reason}`).join('\n') : '',
  ].filter(Boolean)
  return lines.join('\n')
}

async function executeAgent(source: string, userId: string, command: string): Promise<string> {
  try {
    if (source === 'gmail') return await runEmailAgent(userId, command)
    if (source === 'calendar') return await runCalendarAgent(userId)
    if (source === 'job-search') {
      const r = await runJobSearchAgent(userId, command)
      const parts = [r.response]
      if (r.nextSteps.length > 0) parts.push('\nNext steps:\n' + r.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'))
      if (r.opportunities && r.opportunities.length > 0) {
        parts.push('\nOpportunities:\n' + r.opportunities.slice(0, 5).map(o => `* ${o.role} at ${o.company} - ${o.action}`).join('\n'))
      }
      return parts.join('\n')
    }
    if (source === 'tasks') return await runTasksAgent(userId)
    if (source === 'briefing') return await runBriefingAgent(userId)
    // Generic fallback
    return await runBriefingAgent(userId)
  } catch (e) {
    return `Agent error: ${e instanceof Error ? e.message : String(e)}`
  }
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { command } = parsed.data
  const userId = session.user.id!

  const routing = routeCommand(command)
  const taskTitle = buildTaskTitle(command, routing.agent)

  // Create task (status: working - we execute immediately)
  const task = await prisma.agentTask.create({
    data: {
      userId,
      title: taskTitle,
      description: command,
      assignedTo: routing.agent,
      createdBy: 'Chief of Staff',
      priority: routing.priority as 'low' | 'normal' | 'high' | 'urgent',
      status: 'working',
      source: routing.source,
      requiresApproval: false,
    },
  })

  // Log the handoff
  await prisma.agentMessage.create({
    data: {
      userId,
      fromAgent: 'Chief of Staff',
      toAgent: routing.agent,
      taskId: task.id,
      message: `Command: "${command}". Running now.`,
      messageType: 'handoff',
    },
  })

  // Execute the agent and get actual output
  const result = await executeAgent(routing.source, userId, command)

  // Mark completed with real output
  const completedTask = await prisma.agentTask.update({
    where: { id: task.id },
    data: { status: 'completed', result },
  })

  // Log the completion
  await prisma.agentMessage.create({
    data: {
      userId,
      fromAgent: routing.agent,
      toAgent: 'Chief of Staff',
      taskId: task.id,
      message: `Done: "${taskTitle}". Output ready.`,
      messageType: 'complete',
    },
  })

  return NextResponse.json({
    task: completedTask,
    routing,
    result,
    message: buildAgentAck(routing.agent, command),
  })
}

function buildAgentAck(agent: string, command: string): string {
  const acks: Record<string, (cmd: string) => string> = {
    'Inbox Specialist': (cmd) => `Zara scanned your inbox for: "${cmd}"`,
    'Schedule Manager': (cmd) => `Cal pulled your calendar for: "${cmd}"`,
    'Career Advisor': (cmd) => `Nova ran job search for: "${cmd}"`,
    'Ops Manager': (cmd) => `Rex handled: "${cmd}"`,
    'Chief of Staff': (cmd) => `Chief responded to: "${cmd}"`,
  }
  const fn = acks[agent] ?? ((cmd: string) => `${agent} ran: "${cmd}"`)
  return fn(command)
}
