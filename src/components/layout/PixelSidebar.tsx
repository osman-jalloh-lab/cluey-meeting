'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface UserProps {
  name?: string | null
  email?: string | null
}

const DEPARTMENTS = [
  { id: 'office',   label: 'Office',    href: '/dashboard', color: 'var(--c-purple)', icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
  )},
  { id: 'inbox',    label: 'Inbox',     href: '/email',     color: 'var(--c-blue)',   urgent: true, icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>
  )},
  { id: 'calendar', label: 'Calendar',  href: '/calendar',  color: 'var(--c-purple)', icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
  )},
  { id: 'tasks',    label: 'Tasks',     href: '/tasks',     color: 'var(--c-green)',  icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>
  )},
  { id: 'career',   label: 'Career',    href: '/jobs',      color: 'var(--c-orange)', icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18v13H3z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
  )},
  { id: 'school',   label: 'School',    href: '/notes',     color: 'var(--c-cyan)',   icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5a8 8 0 0 0 12 0v-5"/></svg>
  )},
  { id: 'hr',       label: 'Work & HR', href: '/assistant', color: 'var(--c-teal)',   icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>
  )},
]

const AGENTS = [
  { id: 'CH', name: 'Chief', role: 'routing',           color: 'var(--c-purple)', status: 'active' },
  { id: 'ZR', name: 'Zara',  role: 'scanning inbox',    color: 'var(--c-blue)',   status: 'active' },
  { id: 'RX', name: 'Rex',   role: '4 tasks queued',    color: 'var(--c-green)',  status: 'active' },
  { id: 'LX', name: 'Lex',   role: 'HR · I-9 watch',   color: 'var(--c-teal)',   status: 'active' },
  { id: 'NV', name: 'Nova',  role: '3 recruiters open', color: 'var(--c-orange)', status: 'active' },
  { id: 'CL', name: 'Cal',   role: '2 conflicts found', color: 'var(--c-purple)', status: 'warn'   },
  { id: 'SC', name: 'Scout', role: 'watching academic', color: 'var(--c-cyan)',   status: 'active' },
  { id: 'DR', name: 'Draft', role: '2 replies ready',   color: 'var(--c-blue)',   status: 'active' },
]

export default function PixelSidebar({ user }: { user: UserProps }) {
  const pathname = usePathname()
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [todayCost, setTodayCost] = useState<string>('…')

  useEffect(() => {
    fetch('/api/ai/ollama')
      .then(r => r.json())
      .then(d => setOllamaOnline(d.available === true))
      .catch(() => setOllamaOnline(false))

    fetch('/api/settings/usage')
      .then(r => r.json())
      .then(d => {
        if (d.todayCost !== undefined) setTodayCost(`$${Number(d.todayCost).toFixed(2)}`)
        else if (d.totalCost !== undefined) setTodayCost(`$${Number(d.totalCost).toFixed(2)}`)
      })
      .catch(() => {})
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="rail">
      {/* Departments */}
      <div className="rail-section">
        <div className="rail-h">Departments</div>
        {DEPARTMENTS.map(dept => (
          <Link
            key={dept.id}
            href={dept.href}
            className={`dept${isActive(dept.href) ? ' dept-active' : ''}${dept.urgent ? ' dept-urgent' : ''}`}
            style={{ '--dept-c': dept.color } as React.CSSProperties}
          >
            <span className="dept-ic">{dept.icon}</span>
            <span>{dept.label}</span>
            <span className="dept-count">—</span>
          </Link>
        ))}
      </div>

      {/* Agent floor */}
      <div className="rail-section">
        <div className="rail-h">Agent floor · {AGENTS.length} active</div>
        <div className="agents-rail">
          {AGENTS.map(agent => (
            <div key={agent.id} className="agent-row" style={{ '--ar-c': agent.color } as React.CSSProperties}>
              <span className="ar-av">{agent.id}</span>
              <span className="ar-nm">
                {agent.name}
                <small>{agent.role}</small>
              </span>
              <span className={`ar-pulse${agent.status === 'idle' ? ' idle' : agent.status === 'warn' ? ' warn' : ''}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Status footer */}
      <div style={{ marginTop: 'auto' }}>
        <div className="rail-status">
          <div className="rs-row"><span>Today&rsquo;s cost</span><b>{todayCost}</b></div>
          <div className="rs-row">
            <span>Ollama (local)</span>
            <b style={{ color: ollamaOnline === true ? 'var(--c-green-2)' : ollamaOnline === false ? '#f87171' : 'var(--fg-muted)' }}>
              {ollamaOnline === null ? 'checking…' : ollamaOnline ? 'ready' : 'offline'}
            </b>
          </div>
          <div className="rs-row"><span>Sync (Gmail · Cal)</span><b style={{ color: 'var(--c-success)' }}>live</b></div>
          <div className="rs-row"><span>Vault</span><b>AES-256</b></div>
        </div>

        <div style={{ paddingTop: '12px', display: 'flex', gap: '8px' }}>
          <Link
            href="/settings"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--fg-muted)', fontSize: '12px', textDecoration: 'none', transition: 'color 0.1s, background 0.1s' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </Link>
          <Link
            href="/accounts"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--fg-muted)', textDecoration: 'none', transition: 'color 0.1s' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </Link>
        </div>
      </div>
    </aside>
  )
}
