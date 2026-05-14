import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  sendTo, sendTyping, sendWithApprovalButtons,
  editMessage, answerCallbackQuery, isAuthorizedChat,
} from '@/lib/telegram'
import { runEmailAccountAgent } from '@/lib/agents/emailAccountAgent'
import type { EmailAccountAgentResult, InboxType } from '@/lib/agents/emailAccountAgent'
import { runReplyDraftAgent } from '@/lib/agents/replyDraftAgent'
import { runHRAgent } from '@/lib/agents/hrAgent'
import { runJobSearchAgent } from '@/lib/agents/jobSearchAgent'
import { runDailyBriefingAgent } from '@/lib/agents/dailyBriefingAgent'
import { fetchTodayEvents, getAllCalendarEvents } from '@/lib/google/calendar'
import { hasCalendarScope } from '@/lib/google/oauth'
import * as ollama from '@/lib/ai/ollama'
import * as openai from '@/lib/ai/openai'
import { AGENT_BASE_PROMPT } from '@/lib/context/personal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TgMessage {
  message_id: number
  from: { id: number; first_name: string }
  chat: { id: number; type: string }
  text?: string
  date: number
}

interface TgCallback {
  id: string
  from: { id: number }
  message: TgMessage
  data: string
}

interface TgUpdate {
  update_id: number
  message?: TgMessage
  callback_query?: TgCallback
}

interface TopEmail {
  index: number
  from: string
  subject: string
  reason: string
  suggestedAction: string
  priority: 'high' | 'medium' | 'low'
  emailId?: string
  accountEmail: string
  inboxType: InboxType
}

// ── Agent team definitions ─────────────────────────────────────────────────────

const AGENTS = {
  chief: {
    id: 'chief',
    name: 'Chief',
    role: 'Office Companion',
    emoji: '🏢',
    intro: "I run your day. Morning briefings, routing, big picture. Ask me anything or tap any department below. I route you to the right agent but I don't duplicate their work.",
    callback: 'agent_chief',
  },
  zara: {
    id: 'zara',
    name: 'Zara',
    role: 'Inbox Specialist',
    emoji: '📬',
    intro: "I live in your inbox. I filter, prioritize, and flag what actually matters — HR emails, job leads, professor messages. Nothing slips. I also draft replies, but I never send without your say.",
    callback: 'agent_zara',
  },
  cal: {
    id: 'cal',
    name: 'Cal',
    role: 'Schedule Manager',
    emoji: '📅',
    intro: "Your time is mine to protect. I track your events, spot conflicts, and suggest available windows. No meetings get created without your approval.",
    callback: 'agent_cal',
  },
  rex: {
    id: 'rex',
    name: 'Rex',
    role: 'Ops Manager',
    emoji: '✅',
    intro: "Tasks. Priorities. What's done, what's blocked, what's next. I keep the machine moving. Add something, I'll track it.",
    callback: 'agent_rex',
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    role: 'Career Advisor',
    emoji: '💼',
    intro: "Job search, applications, recruiter follow-ups, interview prep. I track every opportunity and help you stay on top of your pipeline. Strategic, encouraging, focused.",
    callback: 'agent_nova',
  },
  lex: {
    id: 'lex',
    name: 'Lex',
    role: 'Work & Compliance',
    emoji: '🏛',
    intro: "I-9, E-Verify, Workday, ACC HR, immigration status. Work authorization and compliance are my domain. Professional, precise, and careful — because this stuff matters.",
    callback: 'agent_lex',
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    role: 'Academic Tracker',
    emoji: '🎓',
    intro: "Classes, deadlines, professor emails, assignments. I keep your academic life organized. Nothing missed, nothing late. Simple and supportive.",
    callback: 'agent_scout',
  },
} as const

type AgentId = keyof typeof AGENTS

// ── Core helpers ───────────────────────────────────────────────────────────────

async function getUser() {
  return prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
}

function trunc(text: string, max = 3800): string {
  return text.length > max ? text.slice(0, max) + '\n\n<i>...truncated</i>' : text
}

function priorityEmoji(priority: string): string {
  return priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '⚪'
}

// ── Keyboard builders ──────────────────────────────────────────────────────────

function teamKeyboard() {
  const buttons = Object.values(AGENTS).map(a => ({
    text: `${a.emoji} ${a.name}`,
    callback_data: a.callback,
  }))
  const rows: typeof buttons[] = []
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2))
  return { inline_keyboard: rows }
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🌅 Briefing', callback_data: 'menu_briefing' },
        { text: '📬 Emails', callback_data: 'menu_emails' },
      ],
      [
        { text: '📅 Today', callback_data: 'menu_today' },
        { text: '✅ Tasks', callback_data: 'menu_tasks' },
      ],
      [
        { text: '💼 Jobs', callback_data: 'menu_jobs' },
        { text: '🏛 HR Help', callback_data: 'menu_hr' },
      ],
      [{ text: '👥 Meet the Team', callback_data: 'menu_team' }],
    ],
  }
}

// The Office — full department navigation
function officeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📬 Inbox', callback_data: 'menu_emails' },
        { text: '📅 Calendar', callback_data: 'menu_today' },
      ],
      [
        { text: '📝 Tasks', callback_data: 'menu_tasks' },
        { text: '💼 Career', callback_data: 'menu_jobs' },
      ],
      [
        { text: '🎓 School', callback_data: 'do_studentemail' },
        { text: '🏢 Work & HR', callback_data: 'menu_hr' },
      ],
      [
        { text: '🌅 Morning Briefing', callback_data: 'menu_briefing' },
        { text: '👥 Team', callback_data: 'menu_team' },
      ],
    ],
  }
}

// Quick nav strip — appended after every major response
function navKeyboard() {
  return {
    inline_keyboard: [[
      { text: '🏢 Office', callback_data: 'go_office' },
      { text: '📬 Inbox', callback_data: 'menu_emails' },
      { text: '📅 Cal', callback_data: 'menu_today' },
      { text: '✅ Tasks', callback_data: 'menu_tasks' },
    ]],
  }
}

// ── Intent detection ────────────────────────────────────────────────────────────

function detectIntent(text: string): string {
  const t = text.toLowerCase()
  if (t.startsWith('/')) return 'command'
  if (['email', 'inbox', 'gmail', 'unread', 'mail', 'message'].some(k => t.includes(k))) return 'email'
  if (['calendar', 'schedule', 'event', 'meeting', 'appointment', 'today', 'tomorrow'].some(k => t.includes(k))) return 'calendar'
  if (['task', 'todo', 'finish', 'priority', 'what do i have', 'what should i', 'pending'].some(k => t.includes(k))) return 'tasks'
  if (['job', 'apply', 'career', 'resume', 'interview', 'recruiter', 'internship', 'hiring', 'application'].some(k => t.includes(k))) return 'jobs'
  if (['hr', 'i-9', 'i9', 'workday', 'e-verify', 'immigration', 'uscis', 'compliance', 'ead', 'opt', 'onboarding'].some(k => t.includes(k))) return 'hr'
  if (['school', 'class', 'professor', 'assignment', 'exam', 'course', 'grade', 'syllabus'].some(k => t.includes(k))) return 'school'
  if (['briefing', 'morning', 'plan my day', 'overview', "what's up", 'whats up', 'summary'].some(k => t.includes(k))) return 'briefing'
  if (['hi', 'hello', 'hey', 'sup', 'yo', 'good morning', 'good afternoon', 'good evening', 'office'].some(k => t.includes(k))) return 'greeting'
  return 'general'
}

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function getTasksSummary(userId: string): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: { userId, status: { in: ['pending', 'in_progress'] } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: 10,
  })
  if (tasks.length === 0) return '✅ <b>Rex here.</b> No open tasks. Clean slate — add something and I\'ll track it.'
  const lines = tasks.map((t, i) => {
    const dot = t.priority === 'high' ? '🔴' : t.priority === 'normal' ? '🟡' : '⚪'
    return `${i + 1}. ${dot} ${t.title}`
  })
  return [
    `✅ <b>Rex here. ${tasks.length} open task${tasks.length > 1 ? 's' : ''}:</b>`,
    '',
    ...lines,
    '',
    `<i>Reply /addtask [title] to add one.</i>`,
  ].join('\n')
}

async function getCalendarSummary(userId: string, range: 'today' | 'week'): Promise<string> {
  const now = new Date()
  const timeMin = range === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : now
  const timeMax = range === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  try {
    const events = await getAllCalendarEvents(userId, { timeMin, timeMax, maxPerCalendar: 10 })
    if (events.length === 0) {
      return `📅 <b>Cal here.</b> ${range === 'today' ? 'Nothing on the calendar today.' : 'Your week looks clear.'} Enjoy the breathing room.`
    }
    const lines = events.slice(0, 8).map(e => {
      const time = e.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const meet = e.meetingLink ? ' 📹' : ''
      return `• <b>${time}</b> — ${e.title}${meet}\n  <i>${e.calendarName} · ${e.sourceAccountEmail}</i>`
    })
    const header = range === 'today' ? `📅 <b>Cal here. Today's schedule:</b>` : `📅 <b>Cal here. Your week ahead:</b>`
    return [header, '', ...lines].join('\n')
  } catch {
    return '📅 <b>Cal here.</b> Calendar not connected. Reconnect your accounts in the dashboard.'
  }
}

// Legacy string version — used inline in briefing text
async function getEmailSummaryText(userId: string, filter?: 'work' | 'student_job'): Promise<string> {
  const accounts = await prisma.connectedAccount.findMany({ where: { userId, isActive: true } })
  const filtered = filter
    ? accounts.filter(a => filter === 'work' ? a.emailAddress.includes('@austincc.edu') : !a.emailAddress.includes('@austincc.edu'))
    : accounts
  if (filtered.length === 0) return '📭 No email accounts found.'
  const results = await Promise.allSettled(filtered.map(a => runEmailAccountAgent(a, userId)))
  const lines: string[] = ['📬 <b>Zara here.</b>', '']
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const res = r.value
    lines.push(`<b>${res.accountLabel}</b> — ${res.unreadCount} unread`)
    lines.push(res.summary)
    if (res.urgentEmails.length > 0) {
      lines.push(`\n🚨 <b>Needs attention (${res.urgentEmails.length}):</b>`)
      res.urgentEmails.slice(0, 3).forEach(e => {
        lines.push(`${priorityEmoji(e.priority)} ${e.from}`)
        lines.push(`  "${e.subject}"`)
        lines.push(`  → ${e.suggestedAction}`)
      })
    }
    if (res.emailsNeedingReply.length > 0) lines.push(`\n✉️ ${res.emailsNeedingReply.length} need${res.emailsNeedingReply.length === 1 ? 's' : ''} a reply`)
    lines.push('')
  }
  return trunc(lines.join('\n'))
}

async function getOfficeSummary(userId: string) {
  const [taskCount, importantUnreadCount] = await Promise.all([
    prisma.task.count({ where: { userId, status: { in: ['pending', 'in_progress'] } } }),
    prisma.emailCache.count({ where: { userId, isImportant: true, isUnread: true } }),
  ])
  let calEventCount = 0
  try {
    const now = new Date()
    const events = await getAllCalendarEvents(userId, {
      timeMin: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      timeMax: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      maxPerCalendar: 5,
    })
    calEventCount = events.length
  } catch {}
  return { taskCount, importantUnreadCount, calEventCount }
}

// ── Email priority layer ───────────────────────────────────────────────────────

function collectTopEmails(results: EmailAccountAgentResult[], limit = 5): TopEmail[] {
  const all: TopEmail[] = []
  for (const r of results) {
    for (const e of r.urgentEmails) {
      // Match with emailsNeedingReply to get emailId when possible
      const match = r.emailsNeedingReply.find(re =>
        re.subject === e.subject ||
        re.from.split('@')[0].toLowerCase() === e.from.split('@')[0].toLowerCase()
      )
      all.push({
        index: 0,
        from: e.from,
        subject: e.subject,
        reason: e.reason,
        suggestedAction: e.suggestedAction,
        priority: e.priority,
        emailId: match?.emailId,
        accountEmail: r.accountEmail,
        inboxType: r.inboxType,
      })
    }
  }
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
  all.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2))
  return all.slice(0, limit).map((e, i) => ({ ...e, index: i + 1 }))
}

async function sendEmailPriorityCards(chatId: number, emails: TopEmail[]): Promise<void> {
  if (emails.length === 0) return
  await sendTo(chatId, `📌 <b>Top ${emails.length} email${emails.length > 1 ? 's' : ''} that need your attention:</b>`)
  for (const email of emails) {
    const pe = priorityEmoji(email.priority)
    const inboxLabel = email.inboxType === 'work' ? '🏢 Work' : '📚 Student/Personal'
    const text = [
      `${pe} <b>${email.index}. ${email.subject.slice(0, 55)}</b>`,
      `<b>From:</b> ${email.from}`,
      `<b>Why it matters:</b> ${email.reason}`,
      `<b>Action:</b> ${email.suggestedAction}`,
      `<i>${inboxLabel} · ${email.priority} priority</i>`,
    ].join('\n')

    const rows: Array<Array<{ text: string; callback_data?: string; url?: string }>> = []
    if (email.emailId) {
      // Row 1: Read full email + View in Gmail
      rows.push([
        { text: '📖 Read Email', callback_data: `readmail_${email.emailId}` },
        { text: '📧 Open in Gmail', url: `https://mail.google.com/mail/#all/${email.emailId}` },
      ])
      // Row 2: Draft Reply + Remind Later
      rows.push([
        { text: '✍️ Draft Reply', callback_data: `drf_${email.emailId}` },
        { text: '⏰ Remind Later', callback_data: `rem_${email.emailId}` },
      ])
    } else {
      rows.push([{ text: '⏰ Remind Later', callback_data: 'rem_none' }])
    }
    await sendTo(chatId, text, { reply_markup: { inline_keyboard: rows } })
  }
}

// Read full email body from cache
async function handleReadEmail(chatId: number, userId: string, emailId: string): Promise<void> {
  await sendTyping(chatId)
  const cached = await prisma.emailCache.findFirst({
    where: { userId, gmailMessageId: emailId },
  })
  if (!cached) {
    await sendTo(chatId, '❌ Email not found in cache. Open Gmail directly.', { reply_markup: navKeyboard() })
    return
  }

  // Build the full email view
  const body = cached.bodyText ?? cached.snippet ?? '(no body text available)'
  const truncated = body.length > 900 ? body.slice(0, 900) + '\n\n<i>...email continues. Open Gmail for the full version.</i>' : body

  const lines = [
    `📧 <b>${(cached.subject ?? '(no subject)').slice(0, 70)}</b>`,
    `<b>From:</b> ${cached.from}`,
    cached.to ? `<b>To:</b> ${cached.to.slice(0, 60)}` : '',
    cached.receivedAt ? `<b>Received:</b> ${new Date(cached.receivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '',
    cached.hasAttachment ? '<b>Has attachment</b>' : '',
    '',
    '<b>Message:</b>',
    truncated,
  ].filter(Boolean).join('\n')

  await sendTo(chatId, trunc(lines), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✍️ Draft Reply', callback_data: `drf_${emailId}` },
          { text: '⏰ Remind Later', callback_data: `rem_${emailId}` },
        ],
        [{ text: '📧 Open in Gmail', url: `https://mail.google.com/mail/#all/${emailId}` }],
        [{ text: '🏢 Office', callback_data: 'go_office' }, { text: '📬 Back to Inbox', callback_data: 'menu_emails' }],
      ],
    },
  })
}

// Full email scan UX — sections by inbox type + priority cards
async function sendEmailScanResults(chatId: number, userId: string, filter?: 'work' | 'student_job'): Promise<void> {
  await sendTyping(chatId)
  const accounts = await prisma.connectedAccount.findMany({ where: { userId, isActive: true } })
  const filtered = filter
    ? accounts.filter(a => filter === 'work' ? a.emailAddress.includes('@austincc.edu') : !a.emailAddress.includes('@austincc.edu'))
    : accounts
  if (filtered.length === 0) {
    await sendTo(chatId, '📭 No email accounts connected. Add them in the dashboard.', { reply_markup: navKeyboard() })
    return
  }
  const settled = await Promise.allSettled(filtered.map(a => runEmailAccountAgent(a, userId)))
  const emailResults = settled
    .filter((r): r is PromiseFulfilledResult<EmailAccountAgentResult> => r.status === 'fulfilled')
    .map(r => r.value)

  const workAccts = emailResults.filter(r => r.inboxType === 'work')
  const studentAccts = emailResults.filter(r => r.inboxType === 'student_job')

  const lines: string[] = ['📬 <b>Zara here. Here is your inbox scan:</b>', '']

  if (workAccts.length > 0) {
    lines.push('🏢 <b>Work Inbox</b>')
    for (const r of workAccts) {
      const replyNeeded = r.emailsNeedingReply.length
      lines.push(`<b>${r.accountLabel}</b>`)
      lines.push(`${r.unreadCount} unread · ${r.totalEmails} checked${replyNeeded > 0 ? ` · ✉️ ${replyNeeded} need${replyNeeded === 1 ? 's' : ''} a reply` : ''}`)
      lines.push(r.summary)
    }
    lines.push('')
  }

  if (studentAccts.length > 0) {
    lines.push('📚 <b>Student &amp; Personal Inbox</b>')
    for (const r of studentAccts) {
      const replyNeeded = r.emailsNeedingReply.length
      lines.push(`<b>${r.accountLabel}</b>`)
      lines.push(`${r.unreadCount} unread · ${r.totalEmails} checked${replyNeeded > 0 ? ` · ✉️ ${replyNeeded} need${replyNeeded === 1 ? 's' : ''} a reply` : ''}`)
      lines.push(r.summary)
    }
    lines.push('')
  }

  await sendTo(chatId, trunc(lines.join('\n')))

  // Priority cards for top urgent emails across all accounts
  const topEmails = collectTopEmails(emailResults, 5)
  if (topEmails.length > 0) {
    await sendEmailPriorityCards(chatId, topEmails)
  } else {
    await sendTo(chatId, '📬 No urgent emails flagged. Inbox looks clear.')
  }

  await sendTo(chatId, '<i>What would you like to do next?</i>', { reply_markup: navKeyboard() })
}

// ── Draft reply flow ───────────────────────────────────────────────────────────

async function handleDraftRequest(chatId: number, userId: string, emailId: string): Promise<void> {
  if (emailId === 'none') {
    await sendTo(chatId, "⏰ Noted. I'll remind you about this in tomorrow's briefing.", { reply_markup: navKeyboard() })
    return
  }
  await sendTyping(chatId)
  await sendTo(chatId, '✍️ <b>Zara drafting your reply...</b>')
  try {
    const cached = await prisma.emailCache.findFirst({
      where: { userId, gmailMessageId: emailId },
    })
    if (!cached) {
      await sendTo(chatId, '❌ Could not find this email in cache. Open the dashboard to draft manually.', { reply_markup: navKeyboard() })
      return
    }
    let accountEmail = ''
    if (cached.connectedAccountId) {
      const acct = await prisma.connectedAccount.findUnique({
        where: { id: cached.connectedAccountId },
        select: { emailAddress: true },
      })
      accountEmail = acct?.emailAddress ?? ''
    }

    const draft = await runReplyDraftAgent(userId, {
      from: cached.from,
      subject: cached.subject ?? '',
      body: cached.bodyText ?? cached.snippet ?? '',
      accountEmail,
    })

    const task = await prisma.agentTask.create({
      data: {
        userId,
        title: `Draft: ${draft.subject.slice(0, 60)}`,
        description: `To: ${draft.to}\n\n${draft.body}`,
        assignedTo: 'Inbox Agent',
        createdBy: 'Telegram',
        priority: 'normal',
        status: 'open',
        source: 'telegram',
        requiresApproval: true,
        agentNotes: JSON.stringify({
          type: 'send_reply',
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
          emailId,
          accountEmail,
        }),
      },
    })

    const preview = [
      '✍️ <b>Zara drafted a reply for you:</b>',
      '',
      `📧 <b>To:</b> ${draft.to}`,
      `<b>Subject:</b> ${draft.subject}`,
      '',
      `<b>Draft:</b>`,
      `<i>${draft.body.slice(0, 500)}</i>`,
      draft.body.length > 500 ? '<i>...full draft available in the dashboard</i>' : '',
      '',
      '<i>Review carefully. Nothing is ever sent without your approval.</i>',
    ].filter(Boolean).join('\n')

    await sendTo(chatId, preview, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve Send', callback_data: `dra_${task.id}` },
            { text: '🔄 Regenerate', callback_data: `drg_${task.id}` },
          ],
          [
            { text: '✏️ Edit in Dashboard', callback_data: `drd_${task.id}` },
            { text: '❌ Don\'t Send', callback_data: `drs_${task.id}` },
          ],
          [{ text: '⏰ Remind Later', callback_data: `drr_${task.id}` }],
        ],
      },
    })
  } catch (err) {
    console.error('Draft error:', err)
    await sendTo(chatId, '❌ Drafting hit an error. Open the dashboard to draft manually.', { reply_markup: navKeyboard() })
  }
}

async function handleDraftAction(chatId: number, msgId: number, userId: string, action: string, taskId: string): Promise<void> {
  const task = await prisma.agentTask.findFirst({ where: { id: taskId, userId } })
  if (!task) {
    await editMessage(chatId, msgId, '❌ Draft not found. It may have already been removed.')
    return
  }
  if (action === 'dra') {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'completed', result: 'Approved via Telegram — ready to send from the dashboard' },
    })
    await editMessage(chatId, msgId, '✅ <b>Approved.</b> Open the dashboard to send it. Zara never sends without you.')
  } else if (action === 'drg') {
    await editMessage(chatId, msgId, '🔄 <b>Zara is rewriting the draft...</b>')
    let info: { emailId?: string } = {}
    try { info = JSON.parse(task.agentNotes ?? '{}') } catch {}
    if (info.emailId) {
      await prisma.agentTask.delete({ where: { id: taskId } }).catch(() => {})
      await handleDraftRequest(chatId, userId, info.emailId)
    } else {
      await sendTo(chatId, '❌ Cannot regenerate — original email data missing. Draft manually in the dashboard.')
    }
  } else if (action === 'drd') {
    await editMessage(chatId, msgId, '✏️ Open the dashboard to edit this draft. It is saved in Agent Tasks.')
  } else if (action === 'drs') {
    await prisma.agentTask.update({ where: { id: taskId }, data: { status: 'cancelled' } })
    await editMessage(chatId, msgId, '❌ <b>Draft cancelled.</b> Nothing was sent.')
  } else if (action === 'drr') {
    await prisma.agentTask.update({ where: { id: taskId }, data: { carryForward: true } })
    await editMessage(chatId, msgId, "⏰ <b>Reminder set.</b> This draft will carry into tomorrow's briefing.")
  }
}

// ── Office home screen ─────────────────────────────────────────────────────────

async function showOfficeHome(chatId: number, userId: string): Promise<void> {
  await sendTyping(chatId)
  const { taskCount, importantUnreadCount, calEventCount } = await getOfficeSummary(userId)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const lines = [
    `🏢 <b>The Office</b>`,
    `<i>${today}</i>`,
    '',
    `📊 <b>Today\'s Snapshot</b>`,
    importantUnreadCount > 0
      ? `🚨 ${importantUnreadCount} urgent email${importantUnreadCount > 1 ? 's' : ''} flagged`
      : `📬 Inbox looks clear`,
    calEventCount > 0
      ? `📅 ${calEventCount} meeting${calEventCount > 1 ? 's' : ''} today`
      : `📅 No meetings on the calendar today`,
    taskCount > 0
      ? `✅ ${taskCount} open task${taskCount > 1 ? 's' : ''} pending`
      : `✅ All tasks clear`,
    '',
    `Where do you want to focus?`,
  ]

  await sendTo(chatId, lines.join('\n'), { reply_markup: officeKeyboard() })
}

// ── Callback (button tap) handler ──────────────────────────────────────────────

async function handleCallback(cb: TgCallback, userId: string): Promise<void> {
  const chatId = cb.message.chat.id
  const msgId = cb.message.message_id
  const data = cb.data

  await answerCallbackQuery(cb.id)

  // ── Office home ──────────────────────────────────────────────────────────
  if (data === 'go_office') {
    await showOfficeHome(chatId, userId)
    return
  }

  // ── Main menu actions ────────────────────────────────────────────────────
  if (data === 'menu_briefing') {
    await sendTo(chatId, '🌅 <b>Chief on it. Running your briefing...</b>')
    await runAndSendBriefing(chatId, userId)
    return
  }
  if (data === 'menu_emails') {
    await sendEmailScanResults(chatId, userId)
    return
  }
  if (data === 'menu_today') {
    await sendTyping(chatId)
    await sendTo(chatId, await getCalendarSummary(userId, 'today'), { reply_markup: navKeyboard() })
    return
  }
  if (data === 'menu_tasks') {
    await sendTo(chatId, await getTasksSummary(userId), { reply_markup: navKeyboard() })
    return
  }
  if (data === 'menu_jobs') {
    await sendTo(chatId, '💼 <b>Nova pulling your job search status...</b>')
    await sendTyping(chatId)
    const result = await runJobSearchAgent(userId, 'Summarize recent job search activity and next steps.')
    await sendTo(chatId,
      trunc(`💼 <b>Nova here.</b>\n\n${result.response}${result.nextSteps.length > 0 ? '\n\n<b>Next:</b>\n' + result.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') : ''}`),
      { reply_markup: navKeyboard() }
    )
    return
  }
  if (data === 'menu_hr') {
    await sendTo(chatId, '🏛 <b>Lex checking compliance status...</b>')
    await sendTyping(chatId)
    const result = await runHRAgent(userId, 'What HR, immigration, or compliance items need my attention right now?')
    await sendTo(chatId,
      trunc(`🏛 <b>Lex here.</b>\n\n${result.response}${result.riskFlags.length > 0 ? '\n\n⚠️ <b>Flags:</b>\n' + result.riskFlags.map(f => `• ${f}`).join('\n') : ''}`),
      { reply_markup: navKeyboard() }
    )
    return
  }
  if (data === 'menu_team') {
    await sendTo(chatId,
      '👥 <b>Your Team</b>\n\nTap any agent to talk to them directly.',
      { reply_markup: teamKeyboard() }
    )
    return
  }

  // ── Agent intros ─────────────────────────────────────────────────────────
  for (const agent of Object.values(AGENTS)) {
    if (data === agent.callback) {
      const quickActions = getAgentQuickActions(agent.id)
      await sendTo(chatId,
        `${agent.emoji} <b>${agent.name}</b> — ${agent.role}\n\n"${agent.intro}"\n\nWhat do you need?`,
        { reply_markup: { inline_keyboard: quickActions } }
      )
      return
    }
  }

  // ── Agent quick actions ──────────────────────────────────────────────────
  if (data === 'do_briefing') { await runAndSendBriefing(chatId, userId); return }
  if (data === 'do_emails') { await sendEmailScanResults(chatId, userId); return }
  if (data === 'do_workemail') { await sendEmailScanResults(chatId, userId, 'work'); return }
  if (data === 'do_studentemail') { await sendEmailScanResults(chatId, userId, 'student_job'); return }
  if (data === 'do_today') {
    await sendTyping(chatId)
    await sendTo(chatId, await getCalendarSummary(userId, 'today'), { reply_markup: navKeyboard() })
    return
  }
  if (data === 'do_week') {
    await sendTyping(chatId)
    await sendTo(chatId, await getCalendarSummary(userId, 'week'), { reply_markup: navKeyboard() })
    return
  }
  if (data === 'do_tasks') {
    await sendTo(chatId, await getTasksSummary(userId), { reply_markup: navKeyboard() })
    return
  }
  if (data === 'do_jobs') {
    await sendTyping(chatId)
    const r = await runJobSearchAgent(userId, 'Summarize my job search and next steps.')
    await sendTo(chatId, trunc(`💼 <b>Nova here.</b>\n\n${r.response}`), { reply_markup: navKeyboard() })
    return
  }
  if (data === 'do_hr') {
    await sendTyping(chatId)
    const r = await runHRAgent(userId, 'What HR or compliance tasks need my attention?')
    await sendTo(chatId, trunc(`🏛 <b>Lex here.</b>\n\n${r.response}`), { reply_markup: navKeyboard() })
    return
  }

  // ── Read full email ──────────────────────────────────────────────────────
  if (data.startsWith('readmail_')) {
    await handleReadEmail(chatId, userId, data.slice(9))
    return
  }

  // ── Draft reply flow ─────────────────────────────────────────────────────
  if (data.startsWith('drf_')) {
    await handleDraftRequest(chatId, userId, data.slice(4))
    return
  }
  // Draft approval actions: dra_ approve | drg_ regenerate | drd_ dashboard | drs_ skip | drr_ remind
  if (data.startsWith('dra_') || data.startsWith('drg_') || data.startsWith('drd_') || data.startsWith('drs_') || data.startsWith('drr_')) {
    await handleDraftAction(chatId, msgId, userId, data.slice(0, 3), data.slice(4))
    return
  }

  // ── Email remind ─────────────────────────────────────────────────────────
  if (data.startsWith('rem_')) {
    const emailId = data.slice(4)
    if (emailId === 'none') {
      await sendTo(chatId, "⏰ Got it. I'll flag this in tomorrow's briefing.", { reply_markup: navKeyboard() })
      return
    }
    const cached = await prisma.emailCache.findFirst({ where: { userId, gmailMessageId: emailId } })
    if (cached) {
      await prisma.agentTask.create({
        data: {
          userId,
          title: `Follow up: ${cached.subject?.slice(0, 60) ?? 'Email reminder'}`,
          description: `Remind via Telegram. From: ${cached.from}`,
          assignedTo: 'Inbox Agent',
          createdBy: 'Telegram',
          priority: 'normal',
          status: 'open',
          source: 'telegram',
          requiresApproval: false,
          carryForward: true,
        },
      })
      await sendTo(chatId, `⏰ <b>Reminder set:</b> "${cached.subject?.slice(0, 50)}" carries into tomorrow's briefing.`, { reply_markup: navKeyboard() })
    } else {
      await sendTo(chatId, '⏰ Got it. Check this in the dashboard later.', { reply_markup: navKeyboard() })
    }
    return
  }

  // ── Legacy approval actions ───────────────────────────────────────────────
  if (data.startsWith('approve_') || data.startsWith('ignore_') || data.startsWith('edit_') || data.startsWith('remind_')) {
    await handleApproval(cb, userId)
    return
  }
}

function getAgentQuickActions(agentId: AgentId): Array<Array<{ text: string; callback_data: string }>> {
  const actions: Record<AgentId, Array<Array<{ text: string; callback_data: string }>>> = {
    chief: [
      [{ text: '🌅 Run Briefing', callback_data: 'do_briefing' }],
      [{ text: '✅ Tasks', callback_data: 'do_tasks' }, { text: '📅 Today', callback_data: 'do_today' }],
      [{ text: '🏢 Office Home', callback_data: 'go_office' }, { text: '👥 Team', callback_data: 'menu_team' }],
    ],
    zara: [
      [{ text: '📬 All Inboxes', callback_data: 'do_emails' }],
      [{ text: '🏢 Work Email', callback_data: 'do_workemail' }, { text: '📚 Student Email', callback_data: 'do_studentemail' }],
      [{ text: '🏢 Office', callback_data: 'go_office' }],
    ],
    cal: [
      [{ text: '📅 Today', callback_data: 'do_today' }, { text: '📆 This Week', callback_data: 'do_week' }],
      [{ text: '🏢 Office', callback_data: 'go_office' }],
    ],
    rex: [
      [{ text: '✅ Open Tasks', callback_data: 'do_tasks' }],
      [{ text: '🏢 Office', callback_data: 'go_office' }],
    ],
    nova: [
      [{ text: '💼 Job Search Status', callback_data: 'do_jobs' }],
      [{ text: '🏢 Office', callback_data: 'go_office' }],
    ],
    lex: [
      [{ text: '🏛 HR Status', callback_data: 'do_hr' }],
      [{ text: '🏢 Office', callback_data: 'go_office' }],
    ],
    scout: [
      [{ text: '📚 Student Inbox', callback_data: 'do_studentemail' }],
      [{ text: '🏢 Office', callback_data: 'go_office' }],
    ],
  }
  return actions[agentId] ?? []
}

// ── Briefing runner — sends main briefing + top email priority cards ────────────

async function runAndSendBriefing(chatId: number, userId: string): Promise<void> {
  await sendTyping(chatId)
  try {
    const accounts = await prisma.connectedAccount.findMany({ where: { userId, isActive: true } })
    const emailResults = await Promise.allSettled(accounts.map(a => runEmailAccountAgent(a, userId)))
    const emails = emailResults
      .filter((r): r is PromiseFulfilledResult<EmailAccountAgentResult> => r.status === 'fulfilled')
      .map(r => r.value)

    let calEvents: any[] = []
    try {
      const calAcc = accounts.find(a => hasCalendarScope(a.scopes))
      if (calAcc) calEvents = await fetchTodayEvents(calAcc.id)
    } catch {}

    const b = await runDailyBriefingAgent(userId, emails, calEvents)
    const workUnread = b.workEmailSection.accounts.reduce((a, acc) => a + acc.unreadCount, 0)
    const studentUnread = b.studentJobSection.accounts.reduce((a, acc) => a + acc.unreadCount, 0)
    const urgentCount = b.urgentFollowUps.filter(u => u.priority === 'high').length

    const text = [
      `🌅 <b>${b.greeting}</b>`,
      '',
      b.overview,
      '',
      `📬 <b>Inbox</b>`,
      `🏢 Work: ${workUnread} unread  |  📚 Student: ${studentUnread} unread  |  🚨 ${urgentCount} urgent`,
      '',
      `🎯 <b>Top Priorities</b>`,
      b.topPriorities.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None',
      '',
      `📅 ${b.calendarSummary}`,
      `✅ ${b.taskSummary}`,
      '',
      b.suggestedNextActions.length > 0
        ? '🚀 <b>Do Next</b>\n' + b.suggestedNextActions.slice(0, 3).map((a, i) => `${i + 1}. ${a}`).join('\n')
        : '',
    ].filter(Boolean).join('\n')

    await sendTo(chatId, trunc(text))

    // Email priority cards — top 5 urgent emails across all accounts
    const topEmails = collectTopEmails(emails, 5)
    if (topEmails.length > 0) {
      await sendEmailPriorityCards(chatId, topEmails)
    } else {
      await sendTo(chatId, '📬 No urgent emails flagged. Inbox looks clear.')
    }

    // Office nav after briefing
    await sendTo(chatId, '<i>What would you like to do next?</i>', { reply_markup: officeKeyboard() })

  } catch (err) {
    console.error('Briefing error:', err)
    await sendTo(chatId,
      '❌ <b>Chief here.</b> Briefing hit an error. Make sure your email accounts are connected in the dashboard.',
      { reply_markup: navKeyboard() }
    )
  }
}

// ── Approval handler ───────────────────────────────────────────────────────────

async function handleApproval(cb: TgCallback, userId: string): Promise<void> {
  const chatId = cb.message.chat.id
  const msgId = cb.message.message_id
  const [action, ...rest] = cb.data.split('_')
  const taskId = rest.join('_')

  if (!taskId) { await editMessage(chatId, msgId, '❌ Invalid action.'); return }

  const task = await prisma.agentTask.findFirst({ where: { id: taskId, userId } })
  if (!task) { await editMessage(chatId, msgId, '❌ Task not found.'); return }

  if (action === 'approve') {
    let result = '✅ Approved. Check the dashboard to complete this action.'
    try {
      if (task.agentNotes) {
        const pa = JSON.parse(task.agentNotes) as { type: string; taskTitle?: string; taskDescription?: string; taskPriority?: string; to?: string }
        if (pa.type === 'create_task' && pa.taskTitle) {
          await prisma.task.create({ data: { userId, title: pa.taskTitle, description: pa.taskDescription, priority: (pa.taskPriority as any) ?? 'normal', status: 'pending' } })
          result = `✅ <b>Rex added it:</b> ${pa.taskTitle}`
        } else if (pa.type === 'send_reply') {
          result = `✅ Approved. Open dashboard to send reply to ${pa.to}`
        }
      }
    } catch {}
    await prisma.agentTask.update({ where: { id: taskId }, data: { status: 'completed', result: 'Approved via Telegram' } })
    await editMessage(chatId, msgId, result)
  } else if (action === 'edit') {
    await editMessage(chatId, msgId, `✏️ Reply with your changes for:\n<i>${task.title}</i>`)
  } else if (action === 'ignore') {
    await prisma.agentTask.update({ where: { id: taskId }, data: { status: 'cancelled' } })
    await editMessage(chatId, msgId, `❌ Skipped: <i>${task.title}</i>`)
  } else if (action === 'remind') {
    await prisma.agentTask.update({ where: { id: taskId }, data: { carryForward: true } })
    await editMessage(chatId, msgId, `⏰ Carried forward to tomorrow's briefing.`)
  }
}

// ── Main message handler ───────────────────────────────────────────────────────

async function handleMessage(msg: TgMessage, userId: string): Promise<void> {
  const chatId = msg.chat.id
  const text = msg.text?.trim() ?? ''
  if (!text) return

  await sendTyping(chatId)
  const intent = detectIntent(text)

  // ── /start and /help ──────────────────────────────────────────────────────
  if (text === '/start' || text === '/help') {
    await sendTo(chatId,
      `👋 <b>Hey Osman. Welcome to The Office.</b>\n\nI'm <b>Chief</b> — your Office Companion. I route you to the right agent, run your briefings, and keep things moving.\n\nTap a department below or just talk to me naturally.`,
      { reply_markup: officeKeyboard() }
    )
    return
  }

  // ── /office ────────────────────────────────────────────────────────────────
  if (text === '/office') {
    await showOfficeHome(chatId, userId)
    return
  }

  // ── /team ─────────────────────────────────────────────────────────────────
  if (text === '/team') {
    await sendTo(chatId,
      '👥 <b>Your Agent Team</b>\n\nTap any agent to talk to them.',
      { reply_markup: teamKeyboard() }
    )
    return
  }

  // ── /briefing ─────────────────────────────────────────────────────────────
  if (text === '/briefing') {
    await sendTo(chatId, '🌅 <b>Chief on it...</b>')
    await runAndSendBriefing(chatId, userId)
    return
  }

  // ── /tasks ────────────────────────────────────────────────────────────────
  if (text === '/tasks') {
    await sendTo(chatId, await getTasksSummary(userId), { reply_markup: navKeyboard() })
    return
  }

  // ── /addtask ──────────────────────────────────────────────────────────────
  if (text.startsWith('/addtask')) {
    const title = text.slice('/addtask'.length).trim()
    if (!title) { await sendTo(chatId, 'Usage: /addtask [task title]', { reply_markup: navKeyboard() }); return }
    await prisma.task.create({ data: { userId, title, priority: 'normal', status: 'pending' } })
    await sendTo(chatId, `✅ <b>Rex added it:</b> ${title}`, { reply_markup: navKeyboard() })
    return
  }

  // ── /today ────────────────────────────────────────────────────────────────
  if (text === '/today') {
    await sendTo(chatId, await getCalendarSummary(userId, 'today'), { reply_markup: navKeyboard() })
    return
  }

  // ── /week ─────────────────────────────────────────────────────────────────
  if (text === '/week') {
    await sendTo(chatId, await getCalendarSummary(userId, 'week'), { reply_markup: navKeyboard() })
    return
  }

  // ── /emails ───────────────────────────────────────────────────────────────
  if (text === '/emails') {
    await sendEmailScanResults(chatId, userId)
    return
  }

  // ── /workemail ────────────────────────────────────────────────────────────
  if (text === '/workemail') {
    await sendEmailScanResults(chatId, userId, 'work')
    return
  }

  // ── /studentemail ─────────────────────────────────────────────────────────
  if (text === '/studentemail') {
    await sendEmailScanResults(chatId, userId, 'student_job')
    return
  }

  // ── /read <emailId> — show full email body ───────────────────────────────
  if (text.startsWith('/read ')) {
    const emailId = text.slice(6).trim()
    if (!emailId) {
      await sendTo(chatId, 'Usage: /read <emailId>\nGet the emailId from a priority card button.', { reply_markup: navKeyboard() })
      return
    }
    await handleReadEmail(chatId, userId, emailId)
    return
  }

  // ── /jobs ─────────────────────────────────────────────────────────────────
  if (text === '/jobs') {
    await sendTo(chatId, '💼 <b>Nova checking your pipeline...</b>')
    const r = await runJobSearchAgent(userId, 'Summarize recent job search activity and next steps.')
    await sendTo(chatId,
      trunc(`💼 <b>Nova here.</b>\n\n${r.response}\n\n${r.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`),
      { reply_markup: navKeyboard() }
    )
    return
  }

  // ── /hr ───────────────────────────────────────────────────────────────────
  if (text.startsWith('/hr')) {
    const q = text.slice('/hr'.length).trim() || 'What HR, immigration, or compliance items need my attention right now?'
    await sendTo(chatId, '🏛 <b>Lex reviewing...</b>')
    const r = await runHRAgent(userId, q)
    await sendTo(chatId, trunc([
      '🏛 <b>Lex here.</b>',
      '',
      r.response,
      r.riskFlags.length > 0 ? '\n⚠️ <b>Flags:</b>\n' + r.riskFlags.map(f => `• ${f}`).join('\n') : '',
      r.nextSteps.length > 0 ? '\n📋 <b>Next:</b>\n' + r.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '',
    ].filter(Boolean).join('\n')), { reply_markup: navKeyboard() })
    return
  }

  // ── /menu (alias to office) ───────────────────────────────────────────────
  if (text === '/menu') {
    await showOfficeHome(chatId, userId)
    return
  }

  // ── Greeting ──────────────────────────────────────────────────────────────
  if (intent === 'greeting') {
    const hour = new Date().getHours()
    const timeGreet = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    await sendTo(chatId,
      `Good ${timeGreet}, Osman.\n\nChief here — welcome back to The Office. What are we working on?`,
      { reply_markup: officeKeyboard() }
    )
    return
  }

  // ── Natural language routing ───────────────────────────────────────────────
  if (intent === 'email') {
    await sendEmailScanResults(chatId, userId)
    return
  }
  if (intent === 'calendar') {
    await sendTo(chatId, await getCalendarSummary(userId, 'today'), { reply_markup: navKeyboard() })
    return
  }
  if (intent === 'tasks') {
    const isCreate = ['add', 'create', 'new task', 'remind me to', 'make a task'].some(k => text.toLowerCase().includes(k))
    if (isCreate) {
      let taskTitle = text
      try {
        const ollamaUp = await ollama.isOllamaAvailable()
        if (ollamaUp) {
          taskTitle = (await ollama.generate(`Extract just the task title from: "${text}". Return only the task title.`, 'llama3.1')).content.trim()
        } else {
          taskTitle = (await openai.chat([
            { role: 'system', content: 'Extract the task title from the user message. Return only the task title, nothing else.' },
            { role: 'user', content: text },
          ], 'gpt-4o-mini')).content.trim()
        }
      } catch {}
      const pending = await prisma.agentTask.create({
        data: { userId, title: `Create: ${taskTitle}`, description: text, assignedTo: 'Ops Manager', createdBy: 'Telegram', priority: 'normal', status: 'open', source: 'telegram', requiresApproval: true, agentNotes: JSON.stringify({ type: 'create_task', taskTitle }) },
      })
      await sendWithApprovalButtons(chatId, `✅ <b>Rex here. Add this task?</b>\n\n<b>${taskTitle}</b>`, pending.id, [
        { label: '✅ Add it', callbackData: `approve_${pending.id}` },
        { label: '❌ Skip', callbackData: `ignore_${pending.id}` },
      ])
      return
    }
    await sendTo(chatId, await getTasksSummary(userId), { reply_markup: navKeyboard() })
    return
  }
  if (intent === 'jobs') {
    await sendTo(chatId, '💼 <b>Nova on it...</b>')
    const r = await runJobSearchAgent(userId, text)
    await sendTo(chatId, trunc(`💼 <b>Nova here.</b>\n\n${r.response}`), { reply_markup: navKeyboard() })
    return
  }
  if (intent === 'hr') {
    await sendTo(chatId, '🏛 <b>Lex reviewing...</b>')
    const r = await runHRAgent(userId, text)
    await sendTo(chatId, trunc(`🏛 <b>Lex here.</b>\n\n${r.response}`), { reply_markup: navKeyboard() })
    return
  }
  if (intent === 'school') {
    await sendEmailScanResults(chatId, userId, 'student_job')
    return
  }
  if (intent === 'briefing') {
    await sendTo(chatId, '🌅 <b>Chief on it...</b>')
    await runAndSendBriefing(chatId, userId)
    return
  }

  // ── General / AI fallback ──────────────────────────────────────────────────
  const [recentTasks, recentEmails] = await Promise.all([
    prisma.task.findMany({ where: { userId, status: { in: ['pending', 'in_progress'] } }, orderBy: { priority: 'desc' }, take: 5, select: { title: true, priority: true } }),
    prisma.emailCache.findMany({ where: { userId }, orderBy: { receivedAt: 'desc' }, take: 5, select: { from: true, subject: true } }),
  ])
  const context = [
    AGENT_BASE_PROMPT,
    'Open tasks: ' + recentTasks.map(t => `[${t.priority}] ${t.title}`).join(', '),
    'Recent emails: ' + recentEmails.map(e => `${e.from}: ${e.subject}`).join(' | '),
  ].join('\n')
  try {
    const ollamaUp = await ollama.isOllamaAvailable()
    let response: string
    if (ollamaUp) {
      response = (await ollama.chat([{ role: 'user', content: text }], 'llama3.1', context)).content
    } else {
      response = (await openai.chat([{ role: 'system', content: context }, { role: 'user', content: text }], 'gpt-4o-mini')).content
    }
    await sendTo(chatId, trunc(response), { reply_markup: navKeyboard() })
  } catch (err) {
    console.error('AI fallback error:', err)
    await sendTo(chatId, 'I hit an error on that one. Try a command or tap below.', { reply_markup: navKeyboard() })
  }
}

// ── Webhook route — all handlers awaited, never fire-and-forget ────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: TgUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const incomingChatId = body.message?.chat.id ?? body.callback_query?.from.id
  if (!incomingChatId || !isAuthorizedChat(incomingChatId)) {
    return NextResponse.json({ ok: true })
  }

  const user = await getUser()
  if (!user) {
    const chatId = body.message?.chat.id ?? body.callback_query?.message?.chat.id
    if (chatId) await sendTo(chatId, '❌ No user account found. Open the dashboard and log in first.')
    return NextResponse.json({ ok: true })
  }

  if (body.callback_query) {
    try {
      await handleCallback(body.callback_query, user.id)
    } catch (err) {
      console.error('Callback error:', err)
      await answerCallbackQuery(body.callback_query.id, 'Something went wrong')
    }
    return NextResponse.json({ ok: true })
  }

  if (body.message) {
    try {
      await handleMessage(body.message, user.id)
    } catch (err) {
      console.error('Message handler error:', err)
      const chatId = body.message.chat.id
      await sendTo(chatId, '❌ Something went wrong. Try /office to start fresh.').catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}

export async function GET(): Promise<NextResponse> {
  const { getWebhookInfo } = await import('@/lib/telegram')
  const info = await getWebhookInfo()
  return NextResponse.json(info)
}
