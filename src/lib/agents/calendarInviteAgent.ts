import { NormalizedCalendarEvent, getAllCalendarEvents } from '@/lib/google/calendar'
import { prisma } from '@/lib/db'
import * as gemini from '@/lib/ai/gemini'
import { estimateCost } from '@/lib/ai/router'

export interface CalendarInviteResult {
  hasPendingInvites: boolean
  invites: Array<{
    id: string
    title: string
    organizer: string
    timeString: string
    conflict: boolean
    conflictReason?: string
    priority: 'high' | 'medium' | 'low'
    priorityReason: string
    meetingLink: boolean
    summary: string
    suggestedAction: string
    actionValue: 'accept' | 'decline' | 'reschedule' | 'skip'
  }>
}

function buildPrompt(invites: NormalizedCalendarEvent[], allEvents: NormalizedCalendarEvent[]): string {
  // Strip out full details to save tokens, only keep relevant context for checking conflicts
  const contextEvents = allEvents.map(e => ({
    title: e.title,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    status: e.status
  }))

  const invitesToAnalyze = invites.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description?.substring(0, 500), // Trim long descriptions
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    attendees: e.attendees,
    hasMeetLink: !!e.meetingLink,
    organizer: e.sourceAccountEmail // Fallback organizer
  }))

  return `You are the Calendar Invite Specialist agent. Your job is to review pending calendar invitations and recommend whether the user should accept, decline, or ask to reschedule.

You must check for time conflicts against the user's existing calendar events.
You must identify the importance of the event based on keywords (compliance, HR, school, job, bills, deadlines, urgent personal items).

Return a JSON object with this EXACT structure:
{
  "invites": [
    {
      "id": "event id",
      "title": "event title",
      "organizer": "who sent it",
      "timeString": "friendly time string (e.g., 'Thursday, May 9 at 10:00 AM (30 min)')",
      "conflict": true or false,
      "conflictReason": "If conflict is true, explain what it overlaps with. Keep it short. E.g., 'Overlaps with Student Advising (9:30-10:30 AM)'",
      "priority": "high" | "medium" | "low",
      "priorityReason": "Why this priority? E.g., 'work compliance related' or 'social catchup'",
      "meetingLink": true or false,
      "summary": "1-sentence summary of what the meeting is about",
      "suggestedAction": "What should the user do? E.g., 'Ask Jonathan if the meeting can move to 11:00 AM' or 'Accept the invite.'",
      "actionValue": "accept" | "decline" | "reschedule" | "skip"
    }
  ]
}

Here are the pending invites to analyze:
${JSON.stringify(invitesToAnalyze, null, 2)}

Here is the user's current calendar schedule to check against for conflicts:
${JSON.stringify(contextEvents, null, 2)}

Today is: ${new Date().toISOString().split('T')[0]}

Return ONLY valid JSON.`
}

export async function runCalendarInviteAgent(userId: string): Promise<CalendarInviteResult> {
  // 1. Fetch all events for the next 30 days
  const now = new Date()
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  let allEvents: NormalizedCalendarEvent[] = []
  try {
    allEvents = await getAllCalendarEvents(userId, {
      timeMin: now,
      timeMax: nextMonth,
      maxPerCalendar: 100
    })
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return { hasPendingInvites: false, invites: [] }
  }

  // 2. Identify pending invites (needsAction)
  // An event is an invite to us if our email is in the attendees list and status is needsAction.
  // The normalized event structure currently tracks status at the event level, which is usually the user's response status.
  const pendingInvites = allEvents.filter(e => 
    e.status === 'needsAction' || e.status === 'tentative'
  )

  if (pendingInvites.length === 0) {
    return { hasPendingInvites: false, invites: [] }
  }

  // Filter out the invites from the context events so we don't conflict with ourselves
  const confirmedEvents = allEvents.filter(e => e.status === 'confirmed' || e.status === 'accepted')

  // 3. Ask AI to analyze
  const prompt = buildPrompt(pendingInvites, confirmedEvents)

  try {
    const result = await gemini.chatJson<{
      invites: CalendarInviteResult['invites']
    }>(prompt)

    // Log usage
    await prisma.apiUsageLog.create({
      data: {
        userId,
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        inputTokens: Math.floor(prompt.length / 4),
        outputTokens: 500,
        estimatedCost: estimateCost('gemini-1.5-flash', Math.floor(prompt.length / 4), 500),
        action: 'calendar_invite_agent',
      },
    })

    return {
      hasPendingInvites: result.invites && result.invites.length > 0,
      invites: result.invites || [],
    }
  } catch (error) {
    console.error('calendarInviteAgent error:', error)
    return { hasPendingInvites: false, invites: [] }
  }
}
