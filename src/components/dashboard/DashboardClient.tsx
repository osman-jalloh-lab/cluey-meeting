'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  user: any
  accounts: any[]
  tasks: any[]
  recentEmails: any[]
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

function priorityDot(priority: string) {
  if (priority === 'high') return '#F87171'
  if (priority === 'medium') return '#FBBF24'
  return '#8693B0'
}

export default function DashboardClient({ user, accounts, tasks, recentEmails }: Props) {
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [eventCount, setEventCount] = useState<number | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
    setDateStr(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))

    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(d => setEventCount((d.today ?? []).length))
      .catch(() => {})
  }, [])

  const name = user?.name?.split(' ')[0] ?? 'there'
  const unreadCount = recentEmails.length
  const pendingCount = tasks.length

  return (
    <div className="pg-wrap">

      {/* Welcome header */}
      <div style={{ marginBottom: '24px', padding: '24px 24px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-5)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'linear-gradient(135deg,rgba(99,153,255,0.06),rgba(139,92,246,0.06))', borderRadius: '0 var(--r-5) var(--r-5) 0', pointerEvents: 'none' }} />
        <p style={{ margin: '0 0 4px', font: '400 12px/1 var(--font-mono)', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dateStr}</p>
        <h1 style={{ margin: '0 0 6px', font: '700 24px/1.2 var(--font-sans)', color: 'var(--fg-primary)', letterSpacing: '-0.02em' }}>
          {greeting}, {name} 👋
        </h1>
        <p style={{ margin: '0 0 16px', font: '400 13px/1.4 var(--font-sans)', color: 'var(--fg-secondary)' }}>
          {pendingCount} task{pendingCount !== 1 ? 's' : ''} pending · {unreadCount} unread email{unreadCount !== 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/office" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--r-3)', background: 'linear-gradient(135deg,var(--c-blue),var(--c-purple))', color: '#fff', font: '600 12px/1 var(--font-sans)', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>
            Enter the Office →
          </Link>
          <Link href="/today" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--r-3)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--fg-secondary)', font: '600 12px/1 var(--font-sans)', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Daily Briefing →
          </Link>
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Unread emails', value: unreadCount, color: '#3B82F6', icon: '✉️', href: '/email' },
          { label: 'Pending tasks', value: pendingCount, color: '#10B981', icon: '✅', href: '/tasks' },
          { label: 'Accounts', value: accounts.length, color: '#A78BFA', icon: '🔗', href: '/accounts' },
          { label: "Today's events", value: eventCount ?? '…', color: '#F59E0B', icon: '📅', href: '/calendar' },
        ].map(stat => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none', display: 'block', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-4)', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = stat.color + '60')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>{stat.icon}</span>
              <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>{stat.label}</span>
            </div>
            <div style={{ font: '700 24px/1 var(--font-sans)', color: stat.color }}>{stat.value}</div>
          </Link>
        ))}
      </div>

      {/* Two-column content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Pending tasks */}
        <div className="pg-panel" style={{ margin: 0 }}>
          <div className="pg-panel-head">
            <div className="l">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-teal-2)" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
              <h3>Pending Tasks</h3>
            </div>
            <span className="count">{pendingCount}</span>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <div className="icon">✨</div>
              <p className="msg">All clear — no pending tasks.</p>
            </div>
          ) : (
            <>
              {tasks.slice(0, 5).map((t: any) => (
                <div key={t.id} className="pg-row">
                  <div className="ic" style={{ background: 'rgba(16,185,129,0.1)', color: priorityDot(t.priority), fontSize: '14px' }}>□</div>
                  <div className="body">
                    <p className="ttl">{t.title}</p>
                    <div className="ftr">
                      <span className="tag-chip" style={{ color: priorityDot(t.priority), borderColor: priorityDot(t.priority) + '40' }}>
                        {t.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length > 5 && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-subtle)' }}>
                  <Link href="/tasks" style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--c-blue-2)', textDecoration: 'none' }}>
                    View all {tasks.length} tasks →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent emails */}
        <div className="pg-panel" style={{ margin: 0 }}>
          <div className="pg-panel-head">
            <div className="l">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue-2)" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
              <h3>Unread Emails</h3>
            </div>
            <span className="count">{unreadCount}</span>
          </div>
          {recentEmails.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <div className="icon">📭</div>
              <p className="msg">Inbox is clear.</p>
              {accounts.length === 0 && <p className="hint"><Link href="/accounts">Connect Gmail →</Link></p>}
            </div>
          ) : (
            <>
              {recentEmails.slice(0, 5).map((email: any) => (
                <div key={email.id} className="pg-row">
                  <div className="ic" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--c-blue-2)', fontSize: '13px' }}>✉️</div>
                  <div className="body">
                    <p className="ttl" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.from}</p>
                    <p className="sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject ?? '(no subject)'}</p>
                  </div>
                  <span className="ts">{relativeTime(email.receivedAt)}</span>
                </div>
              ))}
              <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-subtle)' }}>
                <Link href="/email" style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--c-blue-2)', textDecoration: 'none' }}>
                  Open Email Center →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: Integrations status + Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginTop: '16px' }}>

        {/* Connected integrations status */}
        <div className="pg-panel" style={{ margin: 0 }}>
          <div className="pg-panel-head">
            <div className="l">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-purple-2)" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <h3>Integrations</h3>
            </div>
            <span className="count">{accounts.length} connected</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[
              { name: 'Gmail', href: '/email', icon: '✉️', connected: accounts.length > 0 },
              { name: 'Calendar', href: '/calendar', icon: '📅', connected: accounts.length > 0 },
              { name: 'Jobs', href: '/jobs', icon: '💼', connected: true },
            ].map(item => (
              <Link key={item.name} href={item.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRight: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <div>
                  <p style={{ margin: '0 0 2px', font: '600 12px/1 var(--font-sans)', color: 'var(--fg-primary)' }}>{item.name}</p>
                  <p style={{ margin: 0, font: '400 10px/1 var(--font-mono)', color: item.connected ? '#4ADE80' : 'var(--fg-muted)' }}>
                    {item.connected ? '● connected' : '○ not set up'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {accounts.length === 0 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-subtle)' }}>
              <Link href="/accounts" style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--c-blue-2)', textDecoration: 'none' }}>
                Connect Google account →
              </Link>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="pg-panel" style={{ margin: 0, minWidth: '200px' }}>
          <div className="pg-panel-head">
            <div className="l"><h3>Quick Actions</h3></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { label: 'New Task', href: '/tasks?new=true', color: 'var(--c-teal-2)' },
              { label: 'Open Office', href: '/office', color: 'var(--c-blue-2)' },
              { label: 'Email Inbox', href: '/email', color: 'var(--c-purple-2)' },
              { label: 'Settings', href: '/settings', color: 'var(--fg-muted)' },
            ].map(a => (
              <Link key={a.label} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', textDecoration: 'none', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-primary)' }}>{a.label}</span>
                <svg style={{ marginLeft: 'auto' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
