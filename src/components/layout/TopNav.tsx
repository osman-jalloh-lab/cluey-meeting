'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'

const NAV_TABS = [
  { href: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { href: '/email',     icon: '✉️', label: 'Email' },
  { href: '/calendar',  icon: '📅', label: 'Calendar' },
  { href: '/jobs',      icon: '💼', label: 'Jobs' },
  { href: '/tasks',     icon: '✅', label: 'Tasks' },
  { href: '/assistant', icon: '🤖', label: 'Assistant' },
]

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)' }

interface TopNavProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export default function TopNav({ user }: TopNavProps) {
  const pathname = usePathname()
  const [clock, setClock] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      const hh = n.getHours().toString().padStart(2, '0')
      const mm = n.getMinutes().toString().padStart(2, '0')
      const ss = n.getSeconds().toString().padStart(2, '0')
      setClock(`${hh}:${mm}:${ss}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const initials = user.name
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'OJ'

  return (
    <nav style={{
      height: 42,
      background: '#07090e',
      borderBottom: '1px solid #18222e',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      gap: 0,
      flexShrink: 0,
      zIndex: 300,
      position: 'relative',
    }}>
      {/* Brand */}
      <div style={{ ...MONO, display: 'flex', alignItems: 'center', gap: 7, paddingRight: 16, borderRight: '1px solid #18222e', marginRight: 6, whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: 2 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', animation: 'ledpulse 2s ease-in-out infinite', flexShrink: 0 }} />
        ⚡ CMD
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>
        {NAV_TABS.map(tab => {
          const active = pathname === tab.href
          return (
            <Link key={tab.href} href={tab.href} style={{
              ...MONO,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 12px', height: 42,
              fontSize: 10, letterSpacing: '.5px',
              color: active ? 'var(--teal)' : '#4a6878',
              borderBottom: active ? '2px solid var(--teal)' : '2px solid transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all .15s',
              background: active ? 'var(--teal-g)' : 'transparent',
            }}>
              {tab.icon} {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Right: clock + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, borderLeft: '1px solid #18222e', flexShrink: 0 }}>
        <span style={{ ...MONO, fontSize: 10, color: '#243040', letterSpacing: 1 }}>{clock}</span>
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setMenuOpen(v => !v)}
            style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', cursor: 'pointer', ...MONO }}
          >
            {initials}
          </div>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 32, background: '#0c0f16', border: '1px solid #18222e', borderRadius: 4, minWidth: 140, zIndex: 500, padding: 4 }}>
              <div style={{ padding: '6px 10px 4px', borderBottom: '1px solid #18222e' }}>
                <div style={{ fontSize: 11, color: 'var(--text-1)', fontWeight: 500, ...MONO }}>{user.name ?? 'Osman J.'}</div>
                <div style={{ fontSize: 9, color: 'var(--text-2)', ...MONO }}>CEO · F-1 CPT</div>
              </div>
              <Link href="/accounts" style={{ display: 'block', padding: '6px 10px', fontSize: 10, color: '#4a6878', textDecoration: 'none', ...MONO }} onClick={() => setMenuOpen(false)}>
                🔗 Accounts
              </Link>
              <Link href="/settings" style={{ display: 'block', padding: '6px 10px', fontSize: 10, color: '#4a6878', textDecoration: 'none', ...MONO }} onClick={() => setMenuOpen(false)}>
                ⚙️ Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 10, color: '#E24B4A', background: 'none', border: 'none', cursor: 'pointer', ...MONO }}
              >
                ↩ Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
