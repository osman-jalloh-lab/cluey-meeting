// Slack incoming webhook utility
// No SDK needed — just a fetch POST to your webhook URL.
// Set SLACK_WEBHOOK_URL in .env.local to enable notifications.

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export type SlackColor = 'danger' | 'warning' | 'good' | '#6366f1'

export interface SlackField {
  title: string
  value: string
  short?: boolean
}

export interface SlackMessage {
  text: string
  color?: SlackColor
  fields?: SlackField[]
  footer?: string
}

export async function sendSlackAlert(msg: SlackMessage): Promise<void> {
  if (!WEBHOOK_URL) return // Silent no-op when not configured

  const payload = {
    attachments: [
      {
        color: msg.color ?? 'danger',
        text: msg.text,
        fields: msg.fields ?? [],
        footer: msg.footer ?? 'PARAWI Command Centre',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {}) // Never let Slack failure break the main flow
}

export async function sendSlackEmailAlert({
  inboxType,
  category,
  from,
  subject,
  summary,
  suggestedAction,
  priority,
}: {
  inboxType: 'work' | 'student_job'
  category: string
  from: string
  subject: string
  summary: string
  suggestedAction: string
  priority: string
}): Promise<void> {
  const label = inboxType === 'work' ? 'ACC Work' : 'Student/Job'
  const color: SlackColor = priority === 'high' ? 'danger' : 'warning'

  const text = inboxType === 'work'
    ? `*New ACC ${category}-related email detected.*`
    : `*New ${category} email detected in ${label} inbox.*`

  await sendSlackAlert({
    text,
    color,
    fields: [
      { title: 'From', value: from, short: true },
      { title: 'Subject', value: subject, short: true },
      { title: 'Summary', value: summary, short: false },
      { title: 'Suggested Next Step', value: suggestedAction, short: false },
    ],
    footer: `PARAWI — ${label} Inbox`,
  })
}

export async function sendSlackMorningBriefing({
  greeting,
  overview,
  topPriorities,
  workUnread,
  studentJobUnread,
  urgentCount,
  calendarSummary,
  taskSummary,
}: {
  greeting: string
  overview: string
  topPriorities: string[]
  workUnread: number
  studentJobUnread: number
  urgentCount: number
  calendarSummary: string
  taskSummary: string
}): Promise<void> {
  const priorityText = topPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n')

  await sendSlackAlert({
    text: `*${greeting}*\n${overview}`,
    color: '#6366f1',
    fields: [
      { title: 'Work Inbox', value: `${workUnread} unread`, short: true },
      { title: 'Student/Job Inbox', value: `${studentJobUnread} unread`, short: true },
      { title: 'Urgent Items', value: String(urgentCount), short: true },
      { title: 'Calendar', value: calendarSummary, short: true },
      { title: 'Tasks', value: taskSummary, short: false },
      { title: 'Top Priorities', value: priorityText || 'None', short: false },
    ],
    footer: 'PARAWI Morning Briefing',
  })
}
