import { fetchRecentEmails } from '@/lib/google/gmail'
import { prisma } from '@/lib/db'
import * as gemini from '@/lib/ai/gemini'
import { estimateCost } from '@/lib/ai/router'
import { ConnectedAccount } from '@prisma/client'
import { getAllCalendarEvents } from '@/lib/google/calendar'

export type InboxType = 'work' | 'student_job'

export interface EmailAlert {
  category: string
  from: string
  subject: string
  summary: string
  suggestedAction: string
  priority: 'high' | 'medium' | 'low'
}

export interface EmailAccountAgentResult {
  accountEmail: string
  accountLabel: string
  inboxType: InboxType
  summary: string
  urgentEmails: Array<{
    from: string
    subject: string
    reason: string
    suggestedAction: string
    priority: 'high' | 'medium' | 'low'
  }>
  detectedAlerts: EmailAlert[]
  tasks: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    dueDate?: string
    source: string
  }>
  emailsNeedingReply: Array<{
    from: string
    subject: string
    emailId: string
    suggestedReplyTone: string
  }>
  unreadCount: number
  totalEmails: number
}

function detectInboxType(emailAddress: string): InboxType {
  const lower = emailAddress.toLowerCase()
  if (lower.includes('@austincc.edu') || lower.includes('@g.austincc.edu')) {
    return 'work'
  }
  return 'student_job'
}



function buildWorkPrompt(emailAddress: string, emailSummaries: object[], calendarContext: string): string {
  return `You are the Inbox Specialist analyzing the ACC work email: ${emailAddress}.

This is a WORK inbox. Watch for these categories with HIGH priority:
- HR & Onboarding: new hire paperwork, employee documents, W-4, direct deposit
- I-9 & E-Verify: I-9 forms, E-Verify cases, re-verification, Supplement B
- Workday: tasks, approvals, system notifications, audit requests
- Immigration: I-20, OPT, EAD, I-94, I-797, USCIS, visa status updates
- Name Change: any documentation requests
- Compliance: policy updates, training deadlines, audit notices
- Payroll & Benefits: pay stubs, benefits enrollment, timesheet approvals

Analyze these emails and return a JSON object with this EXACT structure:
{
  "summary": "1-2 sentence overview of the work inbox",
  "urgentEmails": [
    {
      "from": "sender name/email",
      "subject": "email subject",
      "reason": "why this is urgent (be specific about category: HR/immigration/Workday/etc)",
      "suggestedAction": "exactly what Osman should do next",
      "priority": "high|medium|low"
    }
  ],
  "detectedAlerts": [
    {
      "category": "HR|I-9|Workday|Immigration|Compliance|Onboarding|Name Change|Payroll",
      "from": "sender",
      "subject": "subject",
      "summary": "one-sentence summary of what this email is about",
      "suggestedAction": "prepare response|check documents|follow up with HR|complete in Workday|verify in E-Verify|review I-20",
      "priority": "high|medium|low"
    }
  ],
  "tasks": [
    {
      "title": "action item title",
      "description": "what needs to be done",
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD or null",
      "source": "gmail"
    }
  ],
  "emailsNeedingReply": [
    {
      "from": "sender",
      "subject": "subject",
      "emailId": "id",
      "suggestedReplyTone": "professional|formal"
    }
  ]
}

Emails to analyze:
${JSON.stringify(emailSummaries, null, 2)}

Today: ${new Date().toISOString().split('T')[0]}
Upcoming Calendar Context (to check for meeting-related emails):
${calendarContext || 'No upcoming events.'}

Return ONLY valid JSON. Flag anything immigration or compliance-related as high priority.`
}

function buildStudentJobPrompt(emailAddress: string, emailSummaries: object[], calendarContext: string): string {
  return `You are the Inbox Specialist analyzing the student/job email: ${emailAddress}.

This inbox covers TWO areas — track both:

ACADEMIC emails: professor messages, assignment deadlines, grade updates, class announcements, academic warnings, syllabus changes, exam schedules.

JOB SEARCH emails: recruiter outreach, job offers, interview requests, application status updates, phone screen invites, hiring manager messages, internship opportunities, follow-up requests, rejection notices.

Analyze these emails and return a JSON object with this EXACT structure:
{
  "summary": "1-2 sentence overview (mention both academic and job search activity)",
  "urgentEmails": [
    {
      "from": "sender name/email",
      "subject": "email subject",
      "reason": "why urgent (be specific: interview request/assignment due/offer expires/etc)",
      "suggestedAction": "exactly what Osman should do next",
      "priority": "high|medium|low"
    }
  ],
  "detectedAlerts": [
    {
      "category": "Interview|Job Offer|Recruiter|Application Update|Professor|Assignment|Exam|Academic Warning|Internship|Follow-Up",
      "from": "sender",
      "subject": "subject",
      "summary": "one-sentence summary",
      "suggestedAction": "reply to recruiter|schedule interview|submit assignment|check application portal|follow up",
      "priority": "high|medium|low"
    }
  ],
  "tasks": [
    {
      "title": "action item title",
      "description": "what needs to be done",
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD or null",
      "source": "gmail"
    }
  ],
  "emailsNeedingReply": [
    {
      "from": "sender",
      "subject": "subject",
      "emailId": "id",
      "suggestedReplyTone": "professional|casual|formal"
    }
  ]
}

Emails to analyze:
${JSON.stringify(emailSummaries, null, 2)}

Today: ${new Date().toISOString().split('T')[0]}
Upcoming Calendar Context (to check for meeting/interview-related emails):
${calendarContext || 'No upcoming events.'}

Return ONLY valid JSON. Treat any recruiter or interview email as high priority.`
}

export async function runEmailAccountAgent(
  account: ConnectedAccount,
  userId: string
): Promise<EmailAccountAgentResult> {
  const inboxType = detectInboxType(account.emailAddress)

  let emails: Array<{
    id: string; threadId: string; from: string; to: string; subject: string;
    snippet: string; bodyText: string; receivedAt: Date; isUnread: boolean;
    isImportant: boolean; hasAttachment: boolean;
  }> = []

  const isMcp = account.scopes === 'mcp' || !account.accessTokenEncrypted

  if (!isMcp) {
    try {
      emails = await fetchRecentEmails(account.id, 15)
      for (const email of emails) {
        await prisma.emailCache.upsert({
          where: { connectedAccountId_gmailMessageId: { connectedAccountId: account.id, gmailMessageId: email.id } },
          create: {
            userId, connectedAccountId: account.id, gmailMessageId: email.id,
            threadId: email.threadId, from: email.from, to: email.to,
            subject: email.subject, snippet: email.snippet, bodyText: email.bodyText,
            receivedAt: email.receivedAt, isUnread: email.isUnread,
            isImportant: email.isImportant, hasAttachment: email.hasAttachment,
          },
          update: { isUnread: email.isUnread, isImportant: email.isImportant },
        })
      }
    } catch {
      // Fall back to cache
    }
  }

  if (emails.length === 0) {
    const cached = await prisma.emailCache.findMany({
      where: { connectedAccountId: account.id },
      orderBy: { receivedAt: 'desc' },
      take: 15,
    })
    emails = cached.map(e => ({
      id: e.gmailMessageId,
      threadId: e.threadId ?? '',
      from: e.from,
      to: e.to ?? '',
      subject: e.subject ?? '',
      snippet: e.snippet ?? '',
      bodyText: e.bodyText ?? '',
      receivedAt: e.receivedAt ?? new Date(),
      isUnread: e.isUnread,
      isImportant: e.isImportant,
      hasAttachment: e.hasAttachment,
    }))
  }

  if (emails.length === 0) {
    return {
      accountEmail: account.emailAddress,
      accountLabel: account.accountLabel,
      inboxType,
      summary: 'No emails found in this inbox.',
      urgentEmails: [], detectedAlerts: [], tasks: [], emailsNeedingReply: [],
      unreadCount: 0, totalEmails: 0,
    }
  }

  const emailSummaries = emails.slice(0, 10).map(e => ({
    id: e.id, from: e.from, subject: e.subject, snippet: e.snippet,
    isUnread: e.isUnread, isImportant: e.isImportant,
    receivedAt: e.receivedAt instanceof Date ? e.receivedAt.toISOString() : String(e.receivedAt),
  }))

  // Fetch upcoming calendar events to cross-reference with emails
  let calendarContext = ''
  try {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingEvents = await getAllCalendarEvents(userId, { timeMin: now, timeMax: nextWeek, maxPerCalendar: 10 })
    
    if (upcomingEvents.length > 0) {
      calendarContext = upcomingEvents.map(e => 
        `- ${e.title} on ${e.start.toISOString().split('T')[0]} at ${e.start.toISOString().split('T')[1].substring(0, 5)}`
      ).join('\n')
    }
  } catch (err) {
    console.error('Failed to load calendar context for email agent', err)
  }

  const prompt = inboxType === 'work'
    ? buildWorkPrompt(account.emailAddress, emailSummaries, calendarContext)
    : buildStudentJobPrompt(account.emailAddress, emailSummaries, calendarContext)

  try {
    const result = await gemini.chatJson<{
      summary: string
      urgentEmails: EmailAccountAgentResult['urgentEmails']
      detectedAlerts: EmailAccountAgentResult['detectedAlerts']
      tasks: EmailAccountAgentResult['tasks']
      emailsNeedingReply: EmailAccountAgentResult['emailsNeedingReply']
    }>(prompt)

    await prisma.apiUsageLog.create({
      data: {
        userId, provider: 'gemini', model: 'gemini-1.5-flash',
        inputTokens: Math.floor(prompt.length / 4), outputTokens: 600,
        estimatedCost: estimateCost('gemini-1.5-flash', Math.floor(prompt.length / 4), 600),
        action: `inbox_specialist_${inboxType}`,
      },
    })

    return {
      accountEmail: account.emailAddress,
      accountLabel: account.accountLabel,
      inboxType,
      summary: result.summary ?? '',
      urgentEmails: result.urgentEmails ?? [],
      detectedAlerts: result.detectedAlerts ?? [],
      tasks: result.tasks ?? [],
      emailsNeedingReply: result.emailsNeedingReply ?? [],
      unreadCount: emails.filter(e => e.isUnread).length,
      totalEmails: emails.length,
    }
  } catch {
    return {
      accountEmail: account.emailAddress,
      accountLabel: account.accountLabel,
      inboxType,
      summary: `Found ${emails.length} emails, ${emails.filter(e => e.isUnread).length} unread.`,
      urgentEmails: [], detectedAlerts: [], tasks: [], emailsNeedingReply: [],
      unreadCount: emails.filter(e => e.isUnread).length,
      totalEmails: emails.length,
    }
  }
}
