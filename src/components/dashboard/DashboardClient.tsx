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

const AGENTS = [
  { id: 'CH', name: 'Chief',  role: 'Office Companion',   color: 'var(--c-purple)', status: 'active', model: 'claude-sonnet',  load: 42, statusText: 'Routing this morning\'s traffic. <b>3 handoffs</b> to specialists in the last hour.' },
  { id: 'ZR', name: 'Zara',   role: 'Inbox Specialist',   color: 'var(--c-blue)',   status: 'active', model: 'Gemini Flash',   load: 78, statusText: 'Scanned <b>6 inboxes</b> · 156 messages · 12 ranked. One quarantined as phishing.' },
  { id: 'RX', name: 'Rex',    role: 'Ops Manager',        color: 'var(--c-green)',  status: 'active', model: 'Ollama local',   load: 35, statusText: '<b>4 tasks</b> due today · 1 overdue. Reordering queue by impact.' },
  { id: 'LX', name: 'Lex',    role: 'Work & Compliance',  color: 'var(--c-teal)',   status: 'active', model: 'claude-haiku',   load: 25, statusText: 'Watching <b>I-9</b> thread + OPT renewal window. Drafted a Tuesday reminder.' },
  { id: 'NV', name: 'Nova',   role: 'Career Advisor',     color: 'var(--c-orange)', status: 'active', model: 'claude-sonnet',  load: 55, statusText: '3 recruiter threads open · 2 leads matched (score > 78). One reply ready.' },
  { id: 'CL', name: 'Cal',    role: 'Schedule Manager',   color: 'var(--c-purple)', status: 'warn',   model: 'Gemini Flash',   load: 30, statusText: '<b>1 conflict</b> · resolution suggested. Awaiting your tap to apply.' },
  { id: 'SC', name: 'Scout',  role: 'Academic Tracker',   color: 'var(--c-cyan)',   status: 'active', model: 'Ollama local',   load: 18, statusText: 'Tracking <b>4 classes</b>. Deadline pulled forward in DB Systems · alerted Rex.' },
  { id: 'DR', name: 'Draft',  role: 'Reply Writer',       color: 'var(--c-blue)',   status: 'active', model: 'claude-haiku',   load: 48, statusText: '<b>2 replies</b> ready for review. Tone: warm-professional · matches your past sends.' },
]

const FEED_ITEMS = [
  { id: 'feed-lx', av: 'LX', color: 'var(--c-teal)',   tag: 'Work · HR',  urgent: true, by: 'Lex', byRole: 'Work & Compliance', head: 'Action required: complete I-9 by Friday', desc: 'ACC Workday · Section 2 not signed by HR yet. <b>Blocks your next paycheck.</b> Suggested action: ping HR contact tomorrow if no response.', time: '07:18', pills: ['Open', 'Draft ping'] },
  { id: 'feed-nv', av: 'NV', color: 'var(--c-orange)', tag: 'Career',     urgent: false, by: 'Nova', byRole: 'Career Advisor', head: 'Kestrel Labs — phone screen Tuesday 3pm?', desc: '4th in this thread. Recruiter cc\'d the hiring manager. Nova drafted a reply offering Tuesday or Thursday 3pm CT. Cal confirmed both slots are free.', time: '07:42', pills: ['View thread', 'Review reply'] },
  { id: 'feed-cl', av: 'CL', color: 'var(--c-purple)', tag: 'Calendar',   urgent: 'Conflict', by: 'Cal', byRole: 'Schedule Manager', head: '3:00 PM clash · Kestrel screen vs. Database Systems lecture', desc: 'Cal suggests moving the screen to <b>Thursday 3pm</b>. Nova has prepared a polite reschedule message. One tap to send.', time: '07:50', pills: ['Keep both', 'Apply fix'] },
  { id: 'feed-sc', av: 'SC', color: 'var(--c-cyan)',   tag: 'School',     urgent: false, by: 'Scout', byRole: 'Academic Tracker', head: 'Prof. Adeyemi: Problem Set 06 deadline moved to Wed 11:59 PM', desc: 'Rex created the task and pushed it ahead of two lower-priority items. You have <b>14 hrs</b> of focused work blocked across Mon/Tue evenings.', time: '07:55', pills: ['Open syllabus', 'View task'] },
  { id: 'feed-zr', av: 'ZR', color: 'var(--c-blue)',   tag: 'Inbox',      urgent: false, by: 'Zara', byRole: 'Inbox Specialist', head: 'Scanned 6 inboxes · 156 new · 12 ranked priority', desc: 'Two threads need a reply today. One looks like a phishing attempt impersonating Workday — moved to <b>Quarantine</b> for your review.', time: '08:01', pills: ['Open'] },
  { id: 'feed-rx', av: 'RX', color: 'var(--c-green)',  tag: 'Tasks',      urgent: false, by: 'Rex', byRole: 'Ops Manager', head: '4 tasks due today · 1 overdue from yesterday', desc: 'Reordered by impact: <b>I-9 follow-up</b>, Kestrel reply, Database PS06, finance·rent ACH. Snooze any from here.', time: '08:14', pills: ['Open list'] },
  { id: 'feed-nv2', av: 'NV', color: 'var(--c-orange)', tag: 'Career',    urgent: false, by: 'Nova', byRole: 'Career Advisor', head: '3 new job leads matched · 2 worth applying', desc: 'Aurora Robotics (Austin · onsite) and Ledgerline (remote, F-1 friendly) cleared your job-evaluator score > 78. Mockup CV diff ready for review.', time: '08:22', pills: ['Open pipeline'] },
]

const STATIC_APPROVALS = [
  { id: 'appr-dr', agentId: 'DR', agentName: 'Draft', color: 'var(--c-blue)',   kind: 'Email reply',      title: 'Re: Phone screen — Tuesday 3pm?',                      meta: ['to: recruiting@kestrellabs.com', 'thread: 4 msgs'],   preview: 'Hi Maya — Tuesday at 3pm CT works. I\'ll be on Zoom and have my CV and a short demo of PARAWI ready. If anything shifts, Thursday at 3pm is also open. Looking forward to it. — Osman', actions: ['Send', 'Edit', 'Regenerate'] },
  { id: 'appr-cl', agentId: 'CL', agentName: 'Cal',   color: 'var(--c-purple)', kind: 'Calendar fix',     title: 'Move Kestrel phone screen → Thursday 3:00 PM CT',       meta: ['conflict: Database Systems', 'both attendees free'],   preview: 'Sends a reschedule note + creates new event on <b>oj@gmail.com</b> calendar. Original event will be declined with a polite line. Reminder set for 30 min prior.', actions: ['Apply', 'Edit note'] },
  { id: 'appr-lx', agentId: 'LX', agentName: 'Lex',   color: 'var(--c-teal)',   kind: 'HR · Compliance',  title: 'Ping HR re: I-9 Section 2 if no reply by Tue noon',     meta: ['watch: Workday inbox', 'fallback: dean\'s office'],    preview: 'Sets a scheduled action. If HR hasn\'t signed by Tuesday at 12:00, Lex sends a short reminder from your work address with the verification packet attached.', actions: ['Arm it', 'Adjust trigger'] },
  { id: 'appr-rx', agentId: 'RX', agentName: 'Rex',   color: 'var(--c-green)',  kind: 'Task batch',       title: 'Create 4 tasks from this morning\'s threads',            meta: ['source: 6 emails · 1 lecture note'],                   preview: 'I-9 follow-up · Reply to Kestrel · DB PS06 (Wed) · Rent ACH (Tue). All linked back to source messages. No reminders sent yet.', actions: ['Create', 'Review each'] },
  { id: 'appr-nv', agentId: 'NV', agentName: 'Nova',  color: 'var(--c-orange)', kind: 'Career · Apply',   title: 'Submit application: Ledgerline · SWE I (remote)',        meta: ['match score: 82 / 100', 'F-1 sponsor: yes'],           preview: 'Resume v3 + tailored cover letter (270 words). Posted within F-1 OPT window. No questions in their portal will need free-text answers.', actions: ['Submit', 'Open draft'] },
]

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
  const approvalCount = pendingApprovals.length > 0 ? pendingApprovals.length : STATIC_APPROVALS.length
  const totalCost = usage?.totalCost ?? usage?.todayCost ?? 0

  // Build approval items: real ones first, then fill with static
  const approvalItems = pendingApprovals.length > 0
    ? pendingApprovals.map((a: any) => ({
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
    : STATIC_APPROVALS

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
            {AGENTS.length} of {AGENTS.length} agents on shift
          </div>
          <div className="oc-bubbles">
            <span className="oc-bubble" style={{ '--bubble-c': 'var(--c-blue-2)' } as React.CSSProperties}>
              <span className="oc-dot" />Zara · drafting
            </span>
            <span className="oc-bubble" style={{ '--bubble-c': 'var(--c-orange-2)' } as React.CSSProperties}>
              <span className="oc-dot" />Nova · screening
            </span>
            <span className="oc-bubble" style={{ '--bubble-c': 'var(--c-teal-2)' } as React.CSSProperties}>
              <span className="oc-dot" />Lex · compliance
            </span>
            <span className="oc-bubble" style={{ '--bubble-c': 'var(--c-purple-2)' } as React.CSSProperties}>
              <span className="oc-dot" />Cal · resolving
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
            {FEED_ITEMS.map(item => (
              <div key={item.id} className="cc-feed-item" style={{ '--fi-c': item.color } as React.CSSProperties}>
                <span className="fi-stripe" />
                <div className="fi-av">{item.av}</div>
                <div className="fi-body">
                  <div className="fi-top">
                    <span className="fi-tag">{item.tag}</span>
                    {item.urgent === true && <span className="fi-urg">High urgency</span>}
                    {typeof item.urgent === 'string' && <span className="fi-urg">{item.urgent}</span>}
                    <span className="fi-by"><b>{item.by}</b> · {item.byRole}</span>
                  </div>
                  <div className="fi-head">{item.head}</div>
                  <div className="fi-desc" dangerouslySetInnerHTML={{ __html: item.desc }} />
                </div>
                <div className="fi-meta">
                  <span className="fi-time">{item.time}</span>
                  <div className="fi-qa">
                    {item.pills.map((pill, pi) => (
                      <button key={pi} className={`fi-pill${pi === item.pills.length - 1 && item.pills.length > 1 ? ' go' : ''}`}>{pill}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Approval queue */}
        <article className="cc-card">
          <header className="cc-card-h">
            <h3>
              Awaiting your approval
              <span className="cc-badge">
                <span className="cb-dot" style={{ background: 'var(--c-orange-2)', boxShadow: '0 0 6px var(--c-orange-2)' }} />
                {approvalCount} items
              </span>
            </h3>
            <div className="cc-right">
              <span style={{ color: 'var(--fg-faint)' }}>Nothing sends without you.</span>
            </div>
          </header>

          <div className="cc-approve">
            {approvalItems.map((appr: any) => (
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
              <span className="cb-dot" style={{ background: 'var(--c-success)', boxShadow: '0 0 6px var(--c-success)' }} />
              {AGENTS.length} on shift
            </span>
          </h3>
          <div className="cc-right">
            <span className="live-badge"><span className="lb-dot" />Live status</span>
          </div>
        </header>
        <div className="cc-agent-floor">
          {AGENTS.map(agent => (
            <div key={agent.id} className="agent-cell" style={{ '--ac-c': agent.color } as React.CSSProperties}>
              <span className={`ac-pulse${agent.status === 'idle' ? ' idle' : agent.status === 'warn' ? ' warn' : ''}`} />
              <div className="ac-top">
                <div className="ac-av">{agent.id}</div>
                <div>
                  <div className="ac-nm">{agent.name}</div>
                  <div className="ac-rl">{agent.role}</div>
                </div>
              </div>
              <div className="ac-status" dangerouslySetInnerHTML={{ __html: agent.statusText }} />
              <div className="ac-meter">
                <span>load</span>
                <div className="ac-bar">
                  <i style={{ '--ac-w': `${agent.load}%` } as React.CSSProperties} />
                </div>
                <span>{agent.model}</span>
              </div>
            </div>
          ))}
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
