'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/today', label: 'Today', icon: '🌅' },
  { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/email', label: 'Email', icon: '✉️' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/jobs', label: 'Job Board', icon: '💼' },
  { href: '/tasks', label: 'Tasks', icon: '✅' },
  { href: '/notes', label: 'Notes', icon: '📝' },
  { href: '/assistant', label: 'Assistant', icon: '🤖' },
  { href: '/accounts', label: 'Accounts', icon: '🔗' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex flex-col py-4 px-3 shrink-0"
      style={{ background: 'var(--card)', borderRight: '1px solid var(--border)', height: '100vh' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
             style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          ⚡
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>Command Centre</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
              pathname === item.href
                ? 'font-medium'
                : 'hover:opacity-80'
            )}
            style={{
              color: pathname === item.href ? 'var(--primary)' : 'var(--muted)',
              background: pathname === item.href ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          {user.image ? (
            <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                 style={{ background: 'var(--primary)' }}>
              {user.name?.[0] ?? 'U'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{user.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
          style={{ color: 'var(--muted)' }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
