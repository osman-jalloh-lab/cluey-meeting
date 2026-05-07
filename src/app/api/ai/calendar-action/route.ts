import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import * as ollama from '@/lib/ai/ollama'
import { hasCalendarScope } from '@/lib/google/oauth'

// POST /api/ai/calendar-action
// Accepts natural language instruction + optional email context.
// Uses Ollama (local, free) to reason about intent and extract structured data.
// Returns intent JSON for user confirmation — does NOT write to Google Calendar directly.
// Actual write happens via /api/calendar/create-approved after user confirms.

const Schema = z.object({
  instruction: z.string().min(1).max(2000),
  emailContext: z.string().optional(), // raw email text to reason about
  emailFrom: z.string().optional(),
  emailSubject: z.string().optional(),
})

interface CalendarActionIntent {
  intent: 'create_event' | 'create_task' | 'move_event' | 'unclear' | 'question'
  title?: string
  description?: string
  date?: string        // YYYY-MM-DD
  time?: string        // HH:MM (24h)
  endTime?: string     // HH:MM (24h)
  durationMinutes?: number
  location?: string
  addMeetLink?: boolean
  suggestedAccountEmail?: string  // which Google account to use
  clarificationNeeded?: string    // if intent is unclear, what to ask
  taskTitle?: string
  taskPriority?: 'high' | 'normal' | 'low'
  taskDueDate?: string
  confidence: 'high' | 'medium' | 'low'
}

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

  const { instruction, emailContext, emailFrom, emailSubject } = parsed.data
  const userId = session.user.id!

  // Check if Ollama is running
  const ollamaUp = await ollama.isOllamaAvailable()
  if (!ollamaUp) {
    return NextResponse.json({
      error: 'Ollama is not running. Start it with: ollama serve',
      ollamaRequired: true,
    }, { status: 503 })
  }

  // Get connected accounts with calendar access for context
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true, emailAddress: true, accountLabel: true, scopes: true },
    orderBy: { createdAt: 'asc' },
  })

  const calendarAccounts = accounts.filter(a => hasCalendarScope(a.scopes))
  const accountList = accounts.map(a => ({
    email: a.emailAddress,
    label: a.accountLabel,
    hasCalendar: hasCalendarScope(a.scopes),
  }))

  // Get recent tasks for context
  const recentTasks = await prisma.task.findMany({
    where: { userId, status: { in: ['pending', 'in_progress'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { title: true, priority: true },
  })

  const today = new Date().toISOString().split('T')[0]
  const todayFull = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const prompt = `You are a personal assistant helping Osman Jalloh manage his calendar and tasks.
Today is ${todayFull} (${today}).

Connected Google accounts (for calendar decisions):
${accountList.map(a => `- ${a.label} (${a.email}) — Calendar: ${a.hasCalendar ? 'YES' : 'NO — needs reconnect'}`).join('\n')}

${emailContext ? `Email being referenced:
From: ${emailFrom ?? 'unknown'}
Subject: ${emailSubject ?? 'unknown'}
Content: ${emailContext.slice(0, 1500)}
` : ''}

Open tasks for context:
${recentTasks.map(t => `- [${t.priority}] ${t.title}`).join('\n') || 'none'}

User instruction: "${instruction}"

Analyze the instruction and return a JSON object with this structure:
{
  "intent": "create_event|create_task|move_event|unclear|question",
  "title": "event or task title — be specific",
  "description": "optional description",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM in 24h format or null",
  "endTime": "HH:MM in 24h format or null",
  "durationMinutes": 60,
  "location": "location or null",
  "addMeetLink": false,
  "suggestedAccountEmail": "best matching account email from the list above, or null if unclear",
  "clarificationNeeded": "what to ask the user if intent or details are unclear, or null",
  "taskTitle": "if creating a task, the task title",
  "taskPriority": "high|normal|low",
  "taskDueDate": "YYYY-MM-DD or null",
  "confidence": "high|medium|low"
}

Rules:
- If instruction mentions "work" or "ACC", suggest the ACC account
- If instruction mentions "student", "school", or "personal", suggest the Gmail account
- If no account is specified, ask for clarification if multiple calendar accounts exist
- If the date is unclear, set date to null and set clarificationNeeded
- Do NOT invent details that weren't mentioned
- Return ONLY valid JSON`

  try {
    const intent = await ollama.chatJson<CalendarActionIntent>(prompt, 'mistral')

    // If suggested account doesn't have calendar, flag it
    let accountWarning: string | null = null
    if (intent.suggestedAccountEmail) {
      const suggested = accounts.find(a => a.emailAddress === intent.suggestedAccountEmail)
      if (suggested && !hasCalendarScope(suggested.scopes)) {
        accountWarning = `${intent.suggestedAccountEmail} does not have Calendar access yet. Reconnect it in Accounts first.`
      }
    } else if (calendarAccounts.length === 0) {
      accountWarning = 'No connected accounts have Calendar access. Reconnect your accounts in Accounts to grant Calendar permission.'
    } else if (calendarAccounts.length === 1) {
      // Auto-assign the only calendar account
      intent.suggestedAccountEmail = calendarAccounts[0].emailAddress
    }

    return NextResponse.json({
      intent,
      availableCalendarAccounts: calendarAccounts.map(a => ({
        id: a.id,
        email: a.emailAddress,
        label: a.accountLabel,
      })),
      accountWarning,
      requiresConfirmation: true, // Always — never auto-write
    })
  } catch (error) {
    console.error('Calendar action error:', error)
    return NextResponse.json({
      error: 'Failed to parse instruction. Try being more specific.',
    }, { status: 500 })
  }
}
