'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface UserProps {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function PixelSidebar({ user }: { user: UserProps }) {
  const pathname = usePathname()
  const integrationsRoutes = ['/email', '/calendar', '/jobs', '/accounts', '/notes']
  const [integrationsOpen, setIntegrationsOpen] = useState(
    integrationsRoutes.some(p => pathname.startsWith(p))
  )

  const initials = user.name
    ? user.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'YOU'

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')
  const integrationsActive = integrationsRoutes.some(p => pathname.startsWith(p))

  return (
    <aside className="rail">
      <div className="head">
        <div className="avatar">{initials}</div>
        <div className="head-meta">
          <div className="who">PARAWI</div>
          <div className="role">You (CEO)</div>
          <div className="status"><span className="dot"></span>Online</div>
        </div>
      </div>

      <nav className="group">
        <div className="group-title">Navigation</div>

        {/* Dashboard */}
        <Link className={`item ${isActive('/dashboard') ? 'active' : ''}`} href="/dashboard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Dashboard
        </Link>

        {/* Office View */}
        <Link className={`item ${isActive('/office') ? 'active' : ''}`} href="/office">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>
          </svg>
          Office View
        </Link>

        {/* Tasks */}
        <Link className={`item ${isActive('/tasks') ? 'active' : ''}`} href="/tasks">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 12 2 2 4-4"/>
          </svg>
          Tasks
        </Link>

        {/* Integrations — collapsible */}
        <button
          className={`item ${integrationsActive || integrationsOpen ? 'active' : ''}`}
          onClick={() => setIntegrationsOpen(v => !v)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: 'inherit' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            Integrations
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: integrationsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {integrationsOpen && (
          <div style={{ marginLeft: '12px', borderLeft: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            <Link className={`item ${isActive('/email') ? 'active' : ''}`} href="/email" style={{ paddingLeft: '20px', fontSize: '12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
              Email
            </Link>
            <Link className={`item ${isActive('/calendar') ? 'active' : ''}`} href="/calendar" style={{ paddingLeft: '20px', fontSize: '12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
              Calendar
            </Link>
            <Link className={`item ${isActive('/jobs') ? 'active' : ''}`} href="/jobs" style={{ paddingLeft: '20px', fontSize: '12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
              Job Search
            </Link>
            <Link className={`item ${isActive('/accounts') ? 'active' : ''}`} href="/accounts" style={{ paddingLeft: '20px', fontSize: '12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 20V10M9 20V4M15 20v-7M21 20v-4"/></svg>
              Accounts
            </Link>
            <Link className={`item ${isActive('/notes') ? 'active' : ''}`} href="/notes" style={{ paddingLeft: '20px', fontSize: '12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h11a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16h15"/></svg>
              Notes
            </Link>
          </div>
        )}

        {/* Settings */}
        <Link className={`item ${isActive('/settings') ? 'active' : ''}`} href="/settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </Link>
      </nav>

      <div className="group qa">
        <div className="group-title">Quick Actions</div>
        <Link className="item b1" href="/tasks?new=true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          New Task
        </Link>
        <Link className="item b2" href="/email">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
          Check Email
        </Link>
        <Link className="item b3" href="/office">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>
          Open Office
        </Link>
        <Link className="item b4" href="/assistant">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a8 8 0 0 1-11 7.4L3 21l1.6-7A8 8 0 1 1 21 12z"/></svg>
          Chat AI
        </Link>
      </div>

      <div className="footer">
        <div className="system">
          <div className="label">AI System Status</div>
          <div className="v1"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>All Systems Operational</div>
          <div className="v2"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>12 agent rooms configured</div>
          <div className="spark">
            <span style={{height:'40%'}}></span><span style={{height:'65%'}}></span><span style={{height:'45%'}}></span><span style={{height:'80%'}}></span><span style={{height:'60%'}}></span><span style={{height:'90%'}}></span><span style={{height:'70%'}}></span><span style={{height:'55%'}}></span><span style={{height:'75%'}}></span><span style={{height:'85%'}}></span><span style={{height:'50%'}}></span><span style={{height:'95%'}}></span>
          </div>
        </div>
      </div>
    </aside>
  )
}
