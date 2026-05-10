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

  // Invites state
  const [invitesLoading, setInvitesLoading] = useState(true)
  const [inviteResult, setInviteResult] = useState<any>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [inviteToast, setInviteToast] = useState<string | null>(null)

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

    fetch('/api/agents/calendar-invites')
      .then(r => r.json())
      .then(data => setInviteResult(data))
      .catch(e => console.error(e))
      .finally(() => setInvitesLoading(false))
  }, [])

  const handleApprove = (id: string, actionValue: string) => {
    setApprovedIds(prev => new Set([...prev, id]))
    setTimeout(() => setDismissedIds(prev => new Set([...prev, id])), 900)
    const label = actionValue === 'accept' ? 'accepted' : actionValue === 'decline' ? 'declined' : actionValue
    setInviteToast(`Invite ${label} — acknowledged`)
    setTimeout(() => setInviteToast(null), 2500)
  }

  const handleSkip = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]))
  }

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
    <div className="pg-row">
      <div className="ic" style={{ background: 'rgba(99,153,255,0.12)', color: 'var(--c-blue-2)', fontSize: '14px' }}>📅</div>
      <div className="body">
        <p className="ttl">{eventTitle(event)}</p>
        <p className="sub" style={{ color: 'var(--c-blue-2)' }}>{formatTime(event.start)} — {formatTime(event.end)}</p>
        <div className="ftr">
          {event.location && <span className="tag-chip">📍 {event.location}</span>}
          {event.sourceAccountEmail && <span className="tag-chip">🗓 {event.calendarName ?? 'Calendar'}</span>}
          {eventMeetLink(event) && (
            <a href={eventMeetLink(event)} target="_blank" rel="noopener noreferrer"
               style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: 'var(--r-pill)', background: 'rgba(16,185,129,0.12)', color: '#10b981', font: '600 10px/1 var(--font-sans)', textDecoration: 'none', letterSpacing: '0.04em' }}>
              📹 JOIN MEET
            </a>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="pg-wrap">
      {/* Page topbar */}
      <div className="pg-topbar">
        <div className="pg-topbar-l">
          <h1>📅 Calendar</h1>
          <p style={{ margin: 0, font: '400 12px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {needsReconnect && (
        <div className="approval-strip" style={{ marginBottom: '16px', borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
          <div className="ic" style={{ background: 'rgba(245,158,11,0.2)', color: '#FBBF24' }}>⚠️</div>
          <div className="body">
            <p className="ttl" style={{ color: '#FBBF24' }}>Calendar access needed</p>
            <p className="desc">Go to <a href="/accounts" style={{ color: 'var(--c-blue-2)', textDecoration: 'none' }}>Accounts</a> and click Reconnect on any account showing ✕ Calendar.</p>
          </div>
        </div>
      )}

      {error && !needsReconnect && (
        <div className="approval-strip" style={{ marginBottom: '16px', borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.06)' }}>
          <div className="ic" style={{ background: 'rgba(245,158,11,0.2)', color: '#FBBF24' }}>⚠️</div>
          <div className="body">
            <p className="ttl">{error}</p>
          </div>
        </div>
      )}

      {/* Calendar Invite Agent — Approval strips */}
      {inviteToast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, padding: '10px 16px', borderRadius: 'var(--r-3)', background: '#10b981', color: '#fff', font: '600 12px/1 var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <span>✓</span>{inviteToast}
        </div>
      )}

      {!invitesLoading && inviteResult?.hasPendingInvites && inviteResult.invites.filter((inv: any) => !dismissedIds.has(inv.id)).length > 0 && (
        <div className="pg-panel" style={{ marginBottom: '16px', borderColor: 'rgba(139,92,246,0.3)' }}>
          <div className="pg-panel-head">
            <div className="l">
              <h3>🤖 Cal — Pending Approval</h3>
            </div>
            <span className="badge badge-approval">{inviteResult.invites.filter((inv: any) => !dismissedIds.has(inv.id)).length} invites</span>
          </div>
          {inviteResult.invites.filter((inv: any) => !dismissedIds.has(inv.id)).map((invite: any, i: number, arr: any[]) => (
            <div key={invite.id} style={{ padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'opacity 0.3s', opacity: approvedIds.has(invite.id) ? 0.5 : 1 }}>
              <div style={{ marginBottom: '10px' }}>
                <p style={{ margin: '0 0 4px', font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-primary)' }}>
                  {invite.title}
                </p>
                <p style={{ margin: '0 0 2px', font: '400 12px/1.4 var(--font-sans)', color: 'var(--fg-secondary)' }}>
                  From {invite.organizer} · {invite.timeString}
                </p>
                {invite.conflict && (
                  <p style={{ margin: '4px 0 0', font: '400 11px/1 var(--font-sans)', color: '#F87171' }}>
                    ⚠ Conflict: {invite.conflictReason}
                  </p>
                )}
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 'var(--r-3)', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: '10px' }}>
                <p style={{ margin: 0, font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-secondary)' }}>
                  <strong style={{ color: '#10b981' }}>Suggested:</strong> {invite.suggestedAction}
                </p>
              </div>
              <div className="acts" style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                  disabled={approvedIds.has(invite.id)}
                  onClick={() => handleApprove(invite.id, invite.actionValue ?? 'accept')}
                >
                  {approvedIds.has(invite.id) ? '✓ Done' : 'Approve'}
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => handleSkip(invite.id)}
                >
                  Edit
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '11px', padding: '6px 12px', color: 'var(--fg-muted)' }}
                  onClick={() => handleSkip(invite.id)}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="pg-panel">
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height: '64px', margin: '8px', borderRadius: 'var(--r-3)' }} />)}
        </div>
      ) : (
        <>
          {/* Today */}
          <div className="pg-panel" style={{ marginBottom: '16px' }}>
            <div className="pg-panel-head">
              <div className="l"><h3>Today</h3></div>
              <span className="count">{todayEvents.length}</span>
            </div>
            {todayEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="icon">✨</div>
                <p className="msg">No events today.</p>
              </div>
            ) : (
              todayEvents.map((e, i) => <EventCard key={eventKey(e, i)} event={e} />)
            )}
          </div>

          {/* Upcoming */}
          <div className="pg-panel">
            <div className="pg-panel-head">
              <div className="l"><h3>Upcoming — next 7 days</h3></div>
              <span className="count">{upcomingEvents.length}</span>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="icon">📭</div>
                <p className="msg">No upcoming events.</p>
              </div>
            ) : (
              upcomingEvents.slice(0, 15).map((e, i) => (
                <div key={eventKey(e, i)} className="pg-row">
                  <div style={{ width: '48px', flexShrink: 0 }}>
                    <p style={{ margin: 0, font: '700 10px/1.2 var(--font-mono)', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                      {formatDay(e.start).split(' ')[0]}
                    </p>
                    <p style={{ margin: '2px 0 0', font: '600 14px/1 var(--font-sans)', color: 'var(--fg-primary)' }}>
                      {formatDay(e.start).split(' ')[2]}
                    </p>
                  </div>
                  <div className="body">
                    <p className="ttl">{eventTitle(e)}</p>
                    <p className="sub" style={{ color: 'var(--c-blue-2)' }}>{formatTime(e.start)}</p>
                    {e.sourceAccountEmail && (
                      <div className="ftr">
                        <span className="tag-chip">{e.calendarName ?? 'Calendar'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
