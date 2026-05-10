'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AgentMessage {
  id: string
  fromAgent: string
  toAgent: string | null
  message: string
  messageType: string
  status: string
  createdAt: string
}

interface Props {
  user: any
  accounts: any[]
  tasks: any[]
  recentEmails: any[]
  agentMessages: AgentMessage[]
}

export default function OfficeClient({ user, accounts, tasks, recentEmails, agentMessages }: Props) {
  const [filter, setFilter] = useState('all')
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [agoText, setAgoText] = useState('Last updated just now')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [todaySchedule, setTodaySchedule] = useState<Array<{ title: string; start: string }>>([])
  const [calendarCount, setCalendarCount] = useState<number | null>(null)
  const [scheduleLoaded, setScheduleLoaded] = useState(false)
  const [apiCost, setApiCost] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(d => {
        const today: any[] = d.today ?? []
        setTodaySchedule(today.slice(0, 4).map((e: any) => ({ title: e.title ?? e.summary ?? 'Event', start: e.start })))
        setCalendarCount(today.length)
        setScheduleLoaded(true)
      })
      .catch(() => setScheduleLoaded(true))

    fetch('/api/settings/usage')
      .then(r => r.json())
      .then(d => setApiCost(`$${Number(d.totalCost ?? 0).toFixed(2)}`))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - lastUpdate) / 1000)
      if (s < 60) setAgoText(`Last updated ${s}s ago`)
      else setAgoText(`Last updated ${Math.floor(s / 60)}m ago`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastUpdate])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 600)
    setLastUpdate(Date.now())
    setShowToast(true)
    setTimeout(() => setShowToast(false), 1800)
  }

  const unreadCount = recentEmails.length

  const rooms = [
    { id: 'you', name: 'CEO Office — You', av: 'YOU', c: '#A78BFA', summary: `${tasks.length} tasks today`, status: 'online', badge: 'Active', href: '/tasks' },
    { id: 'email', name: 'Email Manager', av: 'EM', c: '#3B82F6', summary: `${unreadCount} unread emails`, status: 'needs-action', badge: 'Review', href: '/email' },
    { id: 'calendar', name: 'Calendar Manager', av: 'CM', c: '#8B5CF6', summary: calendarCount !== null ? `${calendarCount} events today` : 'Loading calendar…', status: 'online', badge: 'Online', href: '/calendar' },
    { id: 'tasks', name: 'Task Coordinator', av: 'TC', c: '#10B981', summary: `${tasks.length} pending tasks`, status: 'online', badge: 'Online', href: '/tasks' },
    { id: 'jobs', name: 'Job Search Agent', av: 'JS', c: '#F59E0B', summary: '62 saved applications', status: 'other', badge: 'Idle', href: '/jobs' },
    { id: 'hr', name: 'HR & I-9 Specialist', av: 'HR', c: '#EC4899', summary: '3 docs need signature', status: 'needs-action', badge: 'Approval', href: '/accounts' },
    { id: 'knowledge', name: 'Knowledge Manager', av: 'KM', c: '#14B8A6', summary: 'Daily index sync · 248 docs', status: 'other', badge: 'Completed', href: '/notes' },
    { id: 'projects', name: 'Project Manager', av: 'PM', c: '#3B82F6', summary: '7 active projects', status: 'online', badge: 'Online', href: '/tasks' },
    { id: 'automations', name: 'Automation Engineer', av: 'AE', c: '#8B5CF6', summary: '14 flows running', status: 'other', badge: 'Idle', href: '/tasks' },
    { id: 'security', name: 'Security Guardian', av: 'SG', c: '#10B981', summary: '0 alerts in 24h', status: 'online', badge: 'Online', href: '/tasks' },
    { id: 'analytics', name: 'Data Analyst', av: 'DA', c: '#EF4444', summary: 'Sync failed · 3:42 AM', status: 'other', badge: 'Error', href: '/tasks' },
    { id: 'gmail', name: 'Gmail & Calendar Agent', av: 'G&C', c: '#8B5CF6', summary: '2 invite conflicts found', status: 'needs-action', badge: 'Approval', href: '/calendar' },
  ]

  const filteredRooms = rooms.filter(r => filter === 'all' || r.status === filter)
  const activeRoomCount = rooms.filter(r => r.status === 'online' || r.status === 'needs-action').length

  // Build activity feed from real agent messages + fallback static items
  const activityItems: Array<{ icon: string; colorClass: string; l1: string; l2: string; ago: string }> = []

  agentMessages.slice(0, 5).forEach(m => {
    const minAgo = Math.floor((Date.now() - new Date(m.createdAt).getTime()) / 60000)
    const ago = minAgo < 60 ? `${minAgo}m` : `${Math.floor(minAgo / 60)}h`
    activityItems.push({ icon: '🤖', colorClass: 'ico-purple', l1: m.fromAgent, l2: m.message.slice(0, 60) + (m.message.length > 60 ? '…' : ''), ago })
  })

  // Fill with static items if needed
  const staticItems = [
    { icon: '✉️', colorClass: 'ico-blue', l1: 'Email processed', l2: 'auto-categorized 6 items', ago: '2m' },
    { icon: '📅', colorClass: 'ico-purple', l1: 'Calendar event created', l2: '"Project Review" · 10:30 AM', ago: '5m' },
    { icon: '💼', colorClass: 'ico-orange', l1: 'Job application saved', l2: 'Senior PM · Kestrel Labs', ago: '7m' },
    { icon: '✅', colorClass: 'ico-green', l1: 'Task completed', l2: '"Update SOC2 evidence"', ago: '11m' },
  ]
  while (activityItems.length < 4) activityItems.push(staticItems[activityItems.length])

  return (
    <>
      <header className="topbar">
        <div className="topbar-l">
          <div className="crumbs"><span>PARAWI</span><span className="sep">›</span><span>Office View</span></div>
          <h1>The Office</h1>
        </div>
        <div className="topbar-r">
          <div className="cost-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg>
            <span>STATIC LOAD</span>
            <span className="sep"></span>
            <span className="price">$0.00 · 0 AI calls</span>
          </div>
          <div className="updated">
            <div className="l1"><span className="pulse"></span><span>{agoText}</span></div>
            <div className="l2">Auto-refreshes every 60s</div>
          </div>
          <button className={`btn-refresh ${isRefreshing ? 'spin' : ''}`} onClick={handleRefresh}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="stats">
        <div className="tile" style={{ background: 'linear-gradient(160deg,#3B82F6,#1E5BD0)' }}>
          <div className="src">cached · db</div>
          <div className="row"><div className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></div><div><div className="role">Emails</div></div></div>
          <div><div className="stat">{unreadCount}</div><div className="sub">Unread emails</div></div>
        </div>
        <div className="tile" style={{ background: 'linear-gradient(160deg,#8B5CF6,#5B2EC8)' }}>
          <div className="src">cached · db</div>
          <div className="row"><div className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg></div><div><div className="role">Calendar</div></div></div>
          <div><div className="stat">{calendarCount ?? '…'}</div><div className="sub">Today&apos;s events</div></div>
        </div>
        <div className="tile" style={{ background: 'linear-gradient(160deg,#10B981,#0A7C5A)' }}>
          <div className="src">cached · db</div>
          <div className="row"><div className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 12 2 2 4-4"/></svg></div><div><div className="role">Tasks</div></div></div>
          <div><div className="stat">{tasks.length}</div><div className="sub">Pending tasks</div></div>
        </div>
        <div className="tile" style={{ background: 'linear-gradient(160deg,#F59E0B,#B26E04)' }}>
          <div className="src">cached · db</div>
          <div className="row"><div className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg></div><div><div className="role">Jobs</div></div></div>
          <div><div className="stat">62</div><div className="sub">Saved applications</div></div>
        </div>
        <div className="tile" style={{ background: 'linear-gradient(160deg,#EC4899,#B12973)' }}>
          <div className="src">poll · 60s</div>
          <div className="row"><div className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 19a6 6 0 0 1 12 0M14 19a4.5 4.5 0 0 1 7 0"/></svg></div><div><div className="role">Agents</div></div></div>
          <div><div className="stat">{activeRoomCount}/12</div><div className="sub">Active now</div></div>
        </div>
        <div className="tile" style={{ background: 'linear-gradient(160deg,#14B8A6,#0A7C73)' }}>
          <div className="src">poll · 10m</div>
          <div className="row"><div className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M17 18a5 5 0 0 0-1-9.9A7 7 0 1 0 4 14h11a3 3 0 0 1 0 6"/></svg></div><div><div className="role">API Cost</div></div></div>
          <div><div className="stat">{apiCost ?? '…'}</div><div className="sub">This month · $50 cap</div></div>
        </div>
      </section>

      {/* The pixel office scene + agent rooms */}
      <section className="office">
        <div className="office-bar">
          <div className="l">
            <h2>The Office</h2>
            <span className="sub">12 agents · click any room to open</span>
          </div>
        </div>

        <div className="scene">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/imagery/office-scene.png" className="pixelated" alt="Pixel art office with AI agents at desks" />
          <div className="scene-overlay"><span className="dot"></span>LIVE · {activeRoomCount} OF 12 ACTIVE</div>
          <div className="scene-hint">↓ click any agent room below to open</div>
        </div>

        <div className="rooms-section">
          <div className="rooms-section-head">
            <div className="title">Agent rooms</div>
            <div className="filters" role="group" aria-label="Filter by status">
              <button className={`filter-chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All · 12</button>
              <button className={`filter-chip ${filter === 'needs-action' ? 'on' : ''}`} onClick={() => setFilter('needs-action')}>Needs you · 3</button>
              <button className={`filter-chip ${filter === 'online' ? 'on' : ''}`} onClick={() => setFilter('online')}>Online · 5</button>
              <button className={`filter-chip ${filter === 'other' ? 'on' : ''}`} onClick={() => setFilter('other')}>Other · 4</button>
            </div>
          </div>

          <div className="rooms-grid">
            {filteredRooms.map(r => {
              let badgeClass = 'badge-online'
              if (r.badge === 'Review') badgeClass = 'badge-review'
              if (r.badge === 'Approval') badgeClass = 'badge-approval'
              if (r.badge === 'Idle') badgeClass = 'badge-idle'
              if (r.badge === 'Error') badgeClass = 'badge-error'
              if (r.badge === 'Completed') badgeClass = 'badge-completed'

              return (
                <Link key={r.id} className={`room ${r.id === 'you' ? 'you' : ''}`} href={r.href} style={{ '--c': r.c } as React.CSSProperties}>
                  <div className="room-head">
                    <div className="room-avatar" style={{ background: r.c }}>{r.av}</div>
                    <span className={`badge ${badgeClass}`}>{r.badge}</span>
                  </div>
                  <div>
                    <div className="room-name">{r.name}</div>
                    <div className="room-summary">{r.summary}</div>
                  </div>
                  <svg className="room-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Right sidebar */}
      <aside className="right">
        <div className="panel">
          <div className="ph">
            <div className="ph-l"><svg width="10" height="10" viewBox="0 0 24 24" fill="var(--c-success)"><circle cx="12" cy="12" r="6"/></svg><div className="t">Real-time activity</div></div>
            <div className="ph-r">▾</div>
          </div>
          {activityItems.map((item, i) => (
            <div key={i} className="row-i">
              <div className={`ico ${item.colorClass}`}>{item.icon}</div>
              <div className="text"><div className="l1">{item.l1}</div><div className="l2">{item.l2}</div></div>
              <div className="ago">{item.ago}</div>
            </div>
          ))}
          <div className="panel-footer">
            <span className="poll-tag"><span className="d"></span>polls every 30s</span>
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <div className="ph-l"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-purple-2)" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg><div className="t">Today&apos;s schedule</div></div>
            <div className="ph-r">▾</div>
          </div>
          {!scheduleLoaded ? (
            <div className="srow"><div className="time" style={{ color: 'var(--fg-muted)' }}>Loading…</div><div className="ev"></div></div>
          ) : todaySchedule.length === 0 ? (
            <div className="srow"><div className="ev" style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>No events today</div></div>
          ) : (
            todaySchedule.map((ev, i) => {
              const t = new Date(ev.start)
              const timeStr = isNaN(t.getTime()) ? '' : t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const nowMs = Date.now()
              const isNow = !isNaN(t.getTime()) && Math.abs(nowMs - t.getTime()) < 90 * 60 * 1000
              return (
                <div key={i} className="srow">
                  <div className="time">{timeStr}</div>
                  <div className={`ev${isNow ? ' now' : ''}`}>{ev.title}</div>
                </div>
              )
            })
          )}
          <div className="panel-footer">
            <span className="poll-tag"><span className="d"></span>live · calendar API</span>
            <Link className="panel-link" href="/calendar">Full calendar →</Link>
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <div className="ph-l"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-secondary)' }}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 19a6 6 0 0 1 12 0M14 19a4.5 4.5 0 0 1 7 0"/></svg><div className="t">Agent status · 12</div></div>
            <div className="ph-r">▾</div>
          </div>
          <div className="agents-list">
            {rooms.map(r => (
              <Link key={r.id} className="agent-row" href={r.href}>
                <div className="av" style={{ background: r.c }}>{r.av.substring(0, 2)}</div>
                <div className="nm">{r.name}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pending tasks quick panel */}
        {tasks.length > 0 && (
          <div className="panel">
            <div className="ph">
              <div className="ph-l"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-teal-2)" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 12 2 2 4-4"/></svg><div className="t">Pending tasks · {tasks.length}</div></div>
              <div className="ph-r">▾</div>
            </div>
            {tasks.slice(0, 5).map((t: any) => (
              <div key={t.id} className="row-i">
                <div className="ico ico-green">□</div>
                <div className="text">
                  <div className="l1">{t.title}</div>
                  <div className="l2">{t.priority} priority</div>
                </div>
              </div>
            ))}
            <div className="panel-footer">
              <Link className="panel-link" href="/tasks">All tasks →</Link>
            </div>
          </div>
        )}
      </aside>

      {/* Analytics */}
      <section className="analytics">
        <div className="analytics-bar">
          <h3>Analytics Dashboard</h3>
          <div className="meta"><span>cached · last refresh 2m ago</span><span>⤢</span></div>
        </div>
        <div className="charts-grid">
          <div className="chart-card">
            <div className="ch-h">Email Volume</div>
            <div className="ch-sub">Last 7 days <span className="delta-up">+24%</span></div>
            <div className="bars-mini b-purple">
              <span style={{ height: '35%' }}></span><span style={{ height: '55%' }}></span><span style={{ height: '42%' }}></span><span style={{ height: '78%' }}></span><span style={{ height: '64%' }}></span><span style={{ height: '88%' }}></span><span style={{ height: '48%' }}></span>
            </div>
            <div className="days-mini"><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span></div>
          </div>
          <div className="chart-card">
            <div className="ch-h">API Usage</div>
            <div className="ch-sub">This month</div>
            <div className="ring-multi">
              <svg width="92" height="92" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#2B3650" strokeWidth="6"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#3B82F6" strokeWidth="6" strokeDasharray="264" strokeDashoffset="100" transform="rotate(-90 50 50)"/>
                <text x="50" y="50" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="18" fill="#F1F4FB">68%</text>
                <text x="50" y="64" textAnchor="middle" fontFamily="Inter" fontWeight="500" fontSize="9" fill="#8693B0">of limit</text>
              </svg>
            </div>
          </div>
          <div className="chart-card">
            <div className="ch-h">Agent Tasks</div>
            <div className="ch-sub">This week <span className="delta-up">+8%</span></div>
            <div className="bars-mini b-blue">
              <span style={{ height: '50%' }}></span><span style={{ height: '70%' }}></span><span style={{ height: '45%' }}></span><span style={{ height: '85%' }}></span><span style={{ height: '60%' }}></span><span style={{ height: '75%' }}></span><span style={{ height: '90%' }}></span>
            </div>
            <div className="days-mini"><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span></div>
          </div>
        </div>
      </section>

      <div className={`toast ${showToast ? 'show' : ''}`}><span className="ok">✓</span><span>Refreshed · 0 AI calls</span></div>
    </>
  )
}
