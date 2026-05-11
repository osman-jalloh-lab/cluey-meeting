'use client'

import { useState, useEffect } from 'react'
import CommandPalette from './CommandPalette'

interface Props {
  user: { name?: string | null; email?: string | null }
}

export default function CommandTopBar({ user }: Props) {
  const [cost, setCost] = useState<number | null>(null)
  const [tgLinked, setTgLinked] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const initials = user.name
    ? user.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'OJ'

  useEffect(() => {
    fetch('/api/settings/usage')
      .then(r => r.json())
      .then(d => {
        if (d.totalCost !== undefined) setCost(d.totalCost)
      })
      .catch(() => {})

    setTgLinked(true)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="cmd-topbar">
        <div className="top-brand">
          <div className="brand-glyph" />
          <div>
            <div className="brand-name">Parawi</div>
            <div className="brand-sub">Command Center</div>
          </div>
        </div>

        <div className="top-search">
          <div
            className="cmdbar"
            role="button"
            tabIndex={0}
            aria-label="Open command palette"
            onClick={() => setPaletteOpen(true)}
            onKeyDown={e => e.key === 'Enter' && setPaletteOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-faint)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <span className="cmd-placeholder">
              Ask the office — <b>&ldquo;draft a reply to Kestrel Labs&rdquo;</b>, <b>&ldquo;what&rsquo;s due Friday?&rdquo;</b>
            </span>
            <span className="cmd-kbd">
              <span>⌘</span><span>K</span>
            </span>
          </div>
        </div>

        <div className="top-meta">
          <div className="api-cost-chip">
            <span className="chip-dot" />
            API ·{' '}
            <strong>
              {cost !== null ? `$${cost.toFixed(2)}` : '…'}
            </strong>
            <span style={{ opacity: 0.6 }}>/ $50</span>
          </div>

          {tgLinked && (
            <div className="tg-status-chip">
              <span className="chip-dot" />
              Telegram · linked
            </div>
          )}

          <div className="user-me" title={user.name ?? user.email ?? ''}>
            {initials}
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
