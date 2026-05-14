import { google, calendar_v3 } from 'googleapis'
import { getAuthenticatedClient, hasCalendarScope } from './oauth'
import { prisma } from '@/lib/db'

export async function getCalendarClient(connectedAccountId: string) {
  const auth = await getAuthenticatedClient(connectedAccountId)
  return google.calendar({ version: 'v3', auth })
}

// Existing minimal shape — kept for backwards compat with briefing agent
export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: Date
  end: Date
  location?: string
  attendees?: string[]
  meetLink?: string
  status: string
}

// Normalized shape used by getAllCalendarEvents and the Today/Briefing pages
export interface NormalizedCalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  location?: string
  meetingLink?: string
  attendees: string[]
  calendarId: string
  calendarName: string
  sourceAccountId: string
  sourceAccountEmail: string
  provider: 'google'
  status: string
}

function mapEventToNormalized(
  event: calendar_v3.Schema$Event,
  calendarId: string,
  calendarName: string,
  sourceAccountId: string,
  sourceAccountEmail: string,
): NormalizedCalendarEvent {
  return {
    id: event.id ?? '',
    title: event.summary ?? 'No title',
    description: event.description ?? undefined,
    start: event.start?.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start?.date ?? ''),
    end: event.end?.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end?.date ?? ''),
    location: event.location ?? undefined,
    meetingLink: event.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === 'video'
    )?.uri ?? undefined,
    attendees: event.attendees?.map((a) => a.email ?? '').filter(Boolean) ?? [],
    calendarId,
    calendarName,
    sourceAccountId,
    sourceAccountEmail,
    provider: 'google',
    status: event.status ?? 'confirmed',
  }
}

// Fetch the list of calendars for a connected account
export async function fetchCalendarList(connectedAccountId: string): Promise<
  Array<{ id: string; summary: string; primary: boolean }>
> {
  const calendar = await getCalendarClient(connectedAccountId)
  const res = await calendar.calendarList.list({ minAccessRole: 'reader' })
  return (res.data.items ?? []).map(c => ({
    id: c.id ?? 'primary',
    summary: c.summary ?? c.id ?? 'Calendar',
    primary: c.primary ?? false,
  }))
}

// Fetch events from ALL connected accounts that have calendar scopes
// Returns a sorted, normalized list with sourceAccountEmail attached to each event
export async function getAllCalendarEvents(
  userId: string,
  options: { timeMin: Date; timeMax: Date; maxPerCalendar?: number } = {
    timeMin: new Date(),
    timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxPerCalendar: 20,
  }
): Promise<NormalizedCalendarEvent[]> {
  const accounts = await prisma.connectedAccount.findMany({
    where: {
      userId,
      isActive: true,
      accessTokenEncrypted: { not: null },
      NOT: { scopes: 'mcp' },
    },
    orderBy: { createdAt: 'asc' },
  })

  const calendarAccounts = accounts.filter(a => hasCalendarScope(a.scopes))

  if (calendarAccounts.length === 0) return []

  const allEvents: NormalizedCalendarEvent[] = []

  for (const account of calendarAccounts) {
    try {
      const calendar = await getCalendarClient(account.id)

      // Get all calendars for this account
      let calList: Array<{ id: string; summary: string; primary: boolean }> = []
      try {
        calList = await fetchCalendarList(account.id)
      } catch {
        // Fall back to primary only
        calList = [{ id: 'primary', summary: 'Primary', primary: true }]
      }

      // Track event IDs seen for this account to avoid cross-calendar duplicates
      // (same event appears in primary + a subscribed/shared calendar)
      const seenForAccount = new Set<string>()

      // Fetch events from each calendar
      for (const cal of calList) {
        try {
          const res = await calendar.events.list({
            calendarId: cal.id,
            timeMin: options.timeMin.toISOString(),
            timeMax: options.timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: options.maxPerCalendar ?? 20,
          })

          for (const e of res.data.items ?? []) {
            if (!e.id) continue
            if (seenForAccount.has(e.id)) continue  // skip cross-calendar duplicate
            seenForAccount.add(e.id)
            allEvents.push(mapEventToNormalized(e, cal.id, cal.summary, account.id, account.emailAddress))
          }
        } catch {
          // Skip this calendar, continue with others
        }
      }
    } catch {
      // Skip this account, continue with others
    }
  }

  // Sort by start time
  return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
}

// --- Backwards-compatible helpers (used by briefing agent + existing routes) ---

export async function fetchTodayEvents(connectedAccountId: string): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(connectedAccountId)

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (response.data.items ?? []).map(event => ({
    id: event.id!,
    summary: event.summary ?? 'No title',
    description: event.description ?? undefined,
    start: event.start?.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start?.date ?? ''),
    end: event.end?.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end?.date ?? ''),
    location: event.location ?? undefined,
    attendees: event.attendees?.map(a => a.email ?? '').filter(Boolean) ?? [],
    meetLink: event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? undefined,
    status: event.status ?? 'confirmed',
  }))
}

export async function fetchUpcomingEvents(
  connectedAccountId: string,
  days = 7
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(connectedAccountId)

  const now = new Date()
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  })

  return (response.data.items ?? []).map(event => ({
    id: event.id!,
    summary: event.summary ?? 'No title',
    description: event.description ?? undefined,
    start: event.start?.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start?.date ?? ''),
    end: event.end?.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end?.date ?? ''),
    location: event.location ?? undefined,
    attendees: event.attendees?.map(a => a.email ?? '').filter(Boolean) ?? [],
    meetLink: event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? undefined,
    status: event.status ?? 'confirmed',
  }))
}

// Create event using the token of a specific connected account
export async function createEvent(
  connectedAccountId: string,
  event: {
    summary: string
    description?: string
    start: Date
    end: Date
    location?: string
    addMeetLink?: boolean
    calendarId?: string  // defaults to 'primary'
  }
): Promise<string> {
  // Safety: verify the account has calendar.events scope before writing
  const account = await prisma.connectedAccount.findUnique({
    where: { id: connectedAccountId },
    select: { scopes: true },
  })
  if (!hasCalendarScope(account?.scopes)) {
    throw new Error('This account does not have Calendar write permission. Reconnect to grant Calendar access.')
  }

  const calendar = await getCalendarClient(connectedAccountId)
  const calendarId = event.calendarId ?? 'primary'

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: event.addMeetLink ? 1 : 0,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
      conferenceData: event.addMeetLink
        ? {
            createRequest: {
              requestId: Math.random().toString(36).slice(2),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          }
        : undefined,
    },
  })

  return response.data.id!
}
