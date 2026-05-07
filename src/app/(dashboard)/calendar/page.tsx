'use client'

import { useState, useEffect } from 'react'

interface CalendarEvent {
  id: string
  // NormalizedCalendarEvent fields (present when fetched via getAllCalendarEvents)
  title?: string
  summary?: string           // backwards compat from old shape
  description?: string
  start: string
  end: string
  location?: string
  meetingLink?: string       // new shape
  meetLink?: string          // old shape
  status: string
  calendarId?: string
  calendarName?: string
  sourceAccountId?: string
  sourceAccountEmail?: string
}

// Stable unique key regardless of which shape the API returns
function eventKey(e: CalendarEvent, index: number): string {
  // Composite: accountId + calendarId + eventId — unique across all accounts/calendars
  const parts = [
    e.sourceAccountId ?? 'unknown',
    e.calendarId ?? 'primary',
    e.id,
  ]
  return `${parts.join('_')}_${index}`
}

function eventTitle(e: CalendarEvent): string {
  return e.title ?? e.summary ?? 'No title'
}

function eventMeetLink(e: CalendarEvent): string | undefined {
  return e.meetingLink ?? e.meetLink
}

export default function CalendarPage() {
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsReconnect, setNeedsReconnect] = useState(false)

  useEffect(() => {
    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(data => {
        setTodayEvents(data.today ?? [])
        setUpcomingEvents(data.upcoming ?? [])
        if (data.needsReconnect) setNeedsReconnect(true)
        if (data.error) setError(data.error)
      })
      .catch(() => setError('Failed to load calendar'))
      .finally(() => setLoading(false))
  }, [])

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } catch { return dateStr }
  }

  const formatDay = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } catch { return dateStr }
  }

  const EventCard = ({ event }: { event: CalendarEvent }) => (
    <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3">
        <div className="w-1 rounded-full self-stretch" style={{ background: 'var(--primary)', minWidth: '4px' }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{eventTitle(event)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--primary)' }}>
            {formatTime(event.start)} — {formatTime(event.end)}
          </p>
          {event.location && (
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>📍 {event.location}</p>
          )}
          {event.description && (
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>{event.description}</p>
          )}
          {/* Source account badge */}
          {event.sourceAccountEmail && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
              🗓 {event.calendarName ?? 'Calendar'} · {event.sourceAccountEmail}
            </p>
          )}
          {eventMeetLink(event) && (
            <a href={eventMeetLink(event)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 rounded"
               style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              📹 Join Google Meet
            </a>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>📅 Calendar</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      {needsReconnect && (
        <div className="mb-4 p-4 rounded-xl text-sm flex items-start gap-3"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)' }}>
          <span>⚠️</span>
          <div>
            <p className="font-medium mb-1" style={{ color: '#f59e0b' }}>Calendar access needed</p>
            <p style={{ color: 'var(--muted)' }}>
              Go to <a href="/accounts" style={{ color: 'var(--primary)' }}>Accounts</a> and click Reconnect on any account showing ✕ Calendar.
            </p>
          </div>
        </div>
      )}

      {error && !needsReconnect && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading calendar...</p>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Today</h2>
            {todayEvents.length === 0 ? (
              <div className="p-4 rounded-xl text-center" style={{ border: '1px dashed var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No events today.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((e, i) => (
                  <EventCard key={eventKey(e, i)} event={e} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Upcoming (next 7 days)</h2>
            {upcomingEvents.length === 0 ? (
              <div className="p-4 rounded-xl text-center" style={{ border: '1px dashed var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No upcoming events.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 15).map((e, i) => (
                  <div key={eventKey(e, i)} className="p-4 rounded-xl"
                       style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="text-xs font-semibold w-16 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>
                        {formatDay(e.start)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{eventTitle(e)}</p>
                        <p className="text-xs" style={{ color: 'var(--primary)' }}>{formatTime(e.start)}</p>
                        {e.sourceAccountEmail && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                            {e.calendarName ?? 'Calendar'} · {e.sourceAccountEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
