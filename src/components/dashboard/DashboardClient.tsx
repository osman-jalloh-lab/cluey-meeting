'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  user: any
  accounts: any[]
  tasks: any[]
  recentEmails: any[]
  pendingApprovals: any[]
  jobCount: number
  noteCount: number
  hrCount: number
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}




export default function DashboardClient({ user, accounts, tasks, recentEmails, pendingApprovals, jobCount, noteCount, hrCount }: Props) {
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [calEvents, setCalEvents] = useState<any[]>([])
  const [usage, setUsage] = useState<{ totalCost?: number; todayCost?: number } | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
    setDateStr(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))

    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(d => setCalEvents(d.today ?? []))
      .catch(() => {})

    fetch('/api/settings/usage')
      .then(r => r.json())
      .then(d => setUsage(d))
      .catch(() => {})
  }, [])

  const name = user?.name?.split(' ')[0] ?? 'there'
  const unreadCount = recentEmails.length
  const pendingCount = tasks.length
  const eventCount = calEvents.length
  const approvalCount = pendingApprovals.length
  const totalCost = usage?.totalCost ?? usage?.todayCost ?? 0

  const approvalItems = pendingApprovals.map((a: any) => ({
    id: a.id,
    agentId: (a.assignedTo ?? 'AG').slice(0, 2).toUpperCase(),
    agentName: a.assignedTo ?? 'Agent',
    color: 'var(--c-purple)',
    kind: a.source ?? 'Task',
    title: a.title,
    meta: [a.description ?? ''],
    preview: a.agentNotes ?? a.description ?? '',
    actions: ['Approve', 'Edit'],
  }))

  return (
    <>

      {/* ===== TODAY HERO ===== */}
      <section className="today-hero">
        <div className="today-text">
          <div className="eyebrow">
            <span className="ey-dot" />
            {dateStr}
          </div>
          <h1>{greeting}, {name}.</h1>
          <p className="day-sum">
            The office is open.{' '}
            {unreadCount > 0 && <><b className="urg">{unreadCount} unread email{unreadCount !== 1 ? 's' : ''}</b>{' '}in your inbox, </>}
            {eventCount > 0 && <><b>{eventCount} meeting{eventCount !== 1 ? 's' : ''}</b> today, </>}
            <b>{pendingCount} task{pendingCount !== 1 ? 's' : ''}</b> pending
            {approvalCount > 0 && <>, and <b>{approvalCount} approval{approvalCount !== 1 ? 's' : ''}</b> awaiting your sign-off</>}.{' '}
            <b className="go">The agents are on it.</b>
          </p>
          <div className="hero-actions">
            <Link href="/assistant" className="hero-btn primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l4 4L19 6"/></svg>
              Open the briefing
            </Link>
            <Link href="/tasks" className="hero-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
              Task queue
            </Link>
            <Link href="/email" className="hero-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
              Inbox
            </Link>
          </div>
        </div>

        <div className="office-card">
          <img src="/office-scene.png" alt="Pixel office of PARAWI agents" />
          <div className="oc-scrim" />
          <div className="oc-corner">
            <span className="oc-blink" />
            agents on standby
          </div>
          <div className="oc-bubbles">
            <span className="oc-bubble" style={{ '--bubble-c': 'var(--fg-faint)' } as React.CSSProperties}>
              <span className="oc-dot" />idle · waiting
            </span>
          </div>
        </div>
      </section>

      {/* ===== DEPARTMENT TILES ===== */}
      <section className="dept-strip">
        <Link href="/email" className="dtile dtile-color" style={{ '--tile-c': 'var(--c-blue)', textDecoration: 'none' } as React.CSSProperties}>
          <div>
            <div className="dt-lab">Inbox</div>
            <div className="dt-n">{unreadCount}</div>
          </div>
          <div className="dt-sub">{unreadCount > 0 ? `${Math.min(unreadCount, 2)} urgent · need reply` : 'all clear'}</div>
        </Link>
        <Link href="/calendar" className="dtile dtile-color" style={{ '--tile-c': 'var(--c-purple)', textDecoration: 'none' } as React.CSSProperties}>
          <div>
            <div className="dt-lab">Calendar</div>
            <div className="dt-n">{eventCount || '—'}</div>
          </div>
          <div className="dt-sub">{eventCount > 0 ? `${eventCount} today` : 'no events today'}</div>
        </Link>
        <Link href="/tasks" className="dtile dtile-color" style={{ '--tile-c': 'var(--c-green)', textDecoration: 'none' } as React.CSSProperties}>
          <div>
            <div className="dt-lab">Tasks</div>
            <div className="dt-n">{pendingCount}</div>
          </div>
          <div className="dt-sub">{pendingCount > 0 ? `${Math.min(pendingCount, 4)} due today` : 'all clear'}</div>
        </Link>
        <Link href="/jobs" className="dtile dtile-color" style={{ '--tile-c': 'var(--c-orange)', textDecoration: 'none' } as React.CSSProperties}>
          <div>
            <div className="dt-lab">Career</div>
            <div className="dt-n">{jobCount > 0 ? jobCount : '—'}</div>
          </div>
          <div className="dt-sub">{jobCount > 0 ? 'active leads' : 'job pipeline'}</div>
        </Link>
        <Link href="/notes" className="dtile dtile-color" style={{ '--tile-c': 'var(--c-cyan)', textDecoration: 'none' } as React.CSSProperties}>
          <div>
            <div className="dt-lab">School</div>
            <div className="dt-n">{noteCount > 0 ? noteCount : '—'}</div>
          </div>
          <div className="dt-sub">{noteCount > 0 ? `${noteCount} note${noteCount !== 1 ? 's' : ''}` : 'notes & deadlines'}</div>
        </Link>
        <Link href="/assistant" className="dtile dtile-color" style={{ '--tile-c': 'var(--c-teal)', textDecoration: 'none' } as React.CSSProperties}>
          <div>
            <div className="dt-lab">Work / HR</div>
            <div className="dt-n">{hrCount > 0 ? hrCount : '—'}</div>
          </div>
          <div className="dt-sub">{hrCount > 0 ? `${hrCount} open task${hrCount !== 1 ? 's' : ''}` : 'compliance'}</div>
        </Link>
        <div className="dtile dtile-muted">
          <div>
            <div className="dt-lab">Approvals</div>
            <div className="dt-n">{approvalCount}</div>
          </div>
          <div className="dt-sub">awaiting sign-off</div>
        </div>
      </section>

      {/* ===== UNIFIED FEED + APPROVAL QUEUE ===== */}
      <section className="cc-main-grid">

        {/* Activity feed */}
        <article className="cc-card">
          <header className="cc-card-h">
            <h3>
              On the floor today
              <span className="cc-badge">
                <span className="cb-dot" style={{ background: 'var(--c-purple-2)', boxShadow: '0 0 6px var(--c-purple-2)' }} />
                live
              </span>
            </h3>
            <div className="cc-right">
              <button className="cc-filter on">All</button>
              <button className="cc-filter">Inbox</button>
              <button className="cc-filter">Calendar</button>
              <button className="cc-filter">Career</button>
              <button className="cc-filter">School</button>
              <button className="cc-filter">HR</button>
            </div>
          </header>

          <div className="cc-feed">
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--fg-faint)', font: '400 13px/1.5 var(--font-sans)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>—</div>
              No activity yet — agents will post updates here as they run
            </div>
          </div>
        </article>

        {/* Approval queue */}
        <article className="cc-card">
          <header className="cc-card-h">
            <h3>
              Awaiting your approval
              {approvalCount > 0 && (
                <span className="cc-badge">
                  <span className="cb-dot" style={{ background: 'var(--c-orange-2)', boxShadow: '0 0 6px var(--c-orange-2)' }} />
                  {approvalCount} items
                </span>
              )}
            </h3>
            <div className="cc-right">
              <span style={{ color: 'var(--fg-faint)' }}>Nothing sends without you.</span>
            </div>
          </header>

          <div className="cc-approve">
            {approvalItems.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--fg-faint)', font: '400 13px/1.5 var(--font-sans)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
                All clear — no pending approvals
              </div>
            ) : approvalItems.map((appr: any) => (
              <div key={appr.id} className="cc-appr">
                <div className="cc-appr-top">
                  <div className="cc-appr-agent" style={{ '--aa-c': appr.color } as React.CSSProperties}>
                    <span className="aa-av">{appr.agentId}</span>
                    <span>by <b>{appr.agentName}</b></span>
                  </div>
                  <span className="cc-appr-kind" style={{ '--aa-c': appr.color } as React.CSSProperties}>{appr.kind}</span>
                </div>
                <div className="cc-appr-title">{appr.title}</div>
                <div className="cc-appr-preview">
                  <div className="ap-meta">
                    {appr.meta.filter(Boolean).map((m: string, i: number) => <span key={i}>{m}</span>)}
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: appr.preview }} />
                </div>
                <div className="cc-appr-actions">
                  <button className="appr-btn go">{appr.actions[0]}</button>
                  {appr.actions.slice(1).map((a: string, i: number) => (
                    <button key={i} className="appr-btn">{a}</button>
                  ))}
                  <button className="appr-btn no">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </article>

      </section>

      {/* ===== AGENT OFFICE FLOOR ===== */}
      <section className="cc-card">
        <header className="cc-card-h">
          <h3>
            Agent office
            <span className="cc-badge">
              <span className="cb-dot" style={{ background: 'var(--fg-faint)' }} />
              standby
            </span>
          </h3>
          <div className="cc-right">
            <span className="live-badge"><span className="lb-dot" />Live status</span>
          </div>
        </header>
        <div className="cc-agent-floor">
          <div style={{ gridColumn: '1 / -1', padding: '32px 16px', textAlign: 'center', color: 'var(--fg-faint)', font: '400 13px/1.5 var(--font-sans)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>—</div>
            No agent activity yet — use ⌘K to dispatch a command
          </div>
        </div>
      </section>

      {/* ===== COST + SCHEDULE ===== */}
      <section className="cc-bottom-grid">

        {/* Model cost card */}
        <article className="cc-card">
          <header className="cc-card-h">
            <h3>
              Model usage · this month
              <span className="cc-badge">
                <span className="cb-dot" style={{ background: 'var(--c-teal-2)', boxShadow: '0 0 6px var(--c-teal-2)' }} />
                ${totalCost.toFixed(2)} / $50
              </span>
            </h3>
            <div className="cc-right">
              <span style={{ color: 'var(--fg-faint)' }}>router picks the cheapest model that fits</span>
            </div>
          </header>
          <div className="cc-cost-body">
            <div className="cost-bars">
              {[
                { name: 'Ollama · local',  color: 'var(--c-green-2)',  w: '78%', val: '$0.00' },
                { name: 'Gemini Flash',    color: 'var(--c-blue-2)',   w: '62%', val: '$0.00' },
                { name: 'Claude Haiku',    color: 'var(--c-pink-2)',   w: '38%', val: (totalCost * 0.28).toFixed(2) === '0.00' ? '$0.00' : `$${(totalCost * 0.28).toFixed(2)}` },
                { name: 'Claude Sonnet',   color: 'var(--c-purple-2)', w: '54%', val: totalCost > 0 ? `$${(totalCost * 0.72).toFixed(2)}` : '$0.00' },
              ].map(bar => (
                <div key={bar.name} className="cost-bar" style={{ '--cb-c': bar.color, '--cb-w': bar.w } as React.CSSProperties}>
                  <span className="cb-name"><span className="cb-sw" />{bar.name}</span>
                  <div className="cb-bar"><i /></div>
                  <span className="cb-val">{bar.val}</span>
                </div>
              ))}
            </div>
            <div className="cost-total">
              <span>Spend so far <b>${totalCost.toFixed(2)}</b></span>
              <span className="ct-of">/ $50 budget</span>
            </div>
          </div>
        </article>

        {/* Schedule card */}
        <article className="cc-card">
          <header className="cc-card-h">
            <h3>
              Today on the floor
              <span className="cc-badge">
                <span className="cb-dot" style={{ background: 'var(--c-purple-2)', boxShadow: '0 0 6px var(--c-purple-2)' }} />
                {eventCount > 0 ? `${eventCount} event${eventCount !== 1 ? 's' : ''}` : 'no events'}
              </span>
            </h3>
            <div className="cc-right">
              <span style={{ color: 'var(--fg-faint)' }}>
                {accounts.length > 0 ? `${accounts.length} calendar${accounts.length !== 1 ? 's' : ''}` : 'no calendars connected'}
              </span>
            </div>
          </header>
          <div className="cc-sched-body">
            <div className="cc-tl">
              {calEvents.length === 0 ? (
                <>
                  <div className="tl-row tl-idle">
                    <span className="tl-t">No events</span>
                    <span className="tl-axis" />
                    <span />
                  </div>
                  <div className="tl-row tl-idle">
                    <span className="tl-t">today</span>
                    <span className="tl-axis" />
                    <span />
                  </div>
                </>
              ) : (
                calEvents.slice(0, 5).map((ev: any, i: number) => {
                  const isNow = ev.start && new Date(ev.start) <= new Date() && (!ev.end || new Date(ev.end) >= new Date())
                  return (
                    <div key={ev.id ?? i} className={`tl-row${isNow ? ' tl-now' : ''}`} style={{ '--ev-c': 'var(--c-purple)' } as React.CSSProperties}>
                      <span className="tl-t">{ev.start ? fmtTime(ev.start) : '—'}</span>
                      <span className="tl-axis" />
                      <div className="tl-ev">
                        <div className="tl-et">{ev.summary ?? ev.title ?? 'Event'}</div>
                        <div className="tl-em">
                          <span className="tl-src">{ev.calendarId ?? 'calendar'}</span>
                          {ev.end && <span>{fmtTime(ev.start)} – {fmtTime(ev.end)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {accounts.length === 0 && (
              <div style={{ marginTop: '12px', padding: '12px 0 0', borderTop: '1px solid var(--border-subtle)' }}>
                <Link href="/accounts" style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--c-blue-2)', textDecoration: 'none' }}>
                  Connect Google Calendar →
                </Link>
              </div>
            )}
          </div>
        </article>

      </section>

    </>
  )
}
