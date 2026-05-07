import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllCalendarEvents } from '@/lib/google/calendar'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const oneWeekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    // Fetch today's events from ALL connected Google accounts that have Calendar scopes
    const [todayEvents, upcomingEvents] = await Promise.all([
      getAllCalendarEvents(session.user.id, {
        timeMin: startOfDay,
        timeMax: endOfDay,
        maxPerCalendar: 20,
      }),
      getAllCalendarEvents(session.user.id, {
        timeMin: now,
        timeMax: oneWeekOut,
        maxPerCalendar: 15,
      }),
    ])

    if (todayEvents.length === 0 && upcomingEvents.length === 0) {
      return NextResponse.json({
        today: [],
        upcoming: [],
        needsReconnect: true,
        message: 'No calendar events found. Make sure your accounts have Calendar access — use the Reconnect button in Accounts if needed.',
      })
    }

    return NextResponse.json({
      today: todayEvents,
      upcoming: upcomingEvents,
    })
  } catch (error) {
    console.error('Calendar events error:', error)
    return NextResponse.json({
      today: [],
      upcoming: [],
      error: 'Failed to fetch calendar events.',
    })
  }
}
