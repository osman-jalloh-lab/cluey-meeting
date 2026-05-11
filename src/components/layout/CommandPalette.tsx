'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Result {
  id: string
  type: 'nav' | 'action' | 'ai'
  label: string
  sub?: string
  icon: React.ReactNode
  href?: string
  color?: string
  onSelect?: () => void
}

const NAV_ITEMS: Result[] = [
  { id: 'nav-dash',     type: 'nav', label: 'Dashboard',        sub: 'Command Center home',   href: '/dashboard',  color: 'var(--c-purple)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg> },
  { id: 'nav-email',    type: 'nav', label: 'Inbox',             sub: 'Email & messages',      href: '/email',      color: 'var(--c-blue)',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg> },
  { id: 'nav-cal',      type: 'nav', label: 'Calendar',          sub: 'Schedule & events',     href: '/calendar',   color: 'var(--c-purple)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg> },
  { id: 'nav-tasks',    type: 'nav', label: 'Tasks',             sub: 'Pending & in-progress', href: '/tasks',      color: 'var(--c-green)',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg> },
  { id: 'nav-jobs',     type: 'nav', label: 'Career / Jobs',     sub: 'Pipeline & leads',      href: '/jobs',       color: 'var(--c-orange)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18v13H3z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> },
  { id: 'nav-notes',    type: 'nav', label: 'School / Notes',    sub: 'Notes & deadlines',     href: '/notes',      color: 'var(--c-cyan)',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5a8 8 0 0 0 12 0v-5"/></svg> },
  { id: 'nav-asst',     type: 'nav', label: 'Assistant / HR',    sub: 'AI chat & compliance',  href: '/assistant',  color: 'var(--c-teal)',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg> },
  { id: 'nav-settings', type: 'nav', label: 'Settings',          sub: 'API keys & accounts',   href: '/settings',   color: 'var(--fg-muted)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

const QUICK_ACTIONS: Result[] = [
  { id: 'act-new-task', type: 'action', label: 'New Task',          sub: 'Add to task queue',    href: '/tasks?new=1',  color: 'var(--c-green)',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
  { id: 'act-briefing', type: 'action', label: 'Daily Briefing',    sub: 'What\'s on today',    href: '/assistant',    color: 'var(--c-purple)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
  { id: 'act-accounts', type: 'action', label: 'Connected Accounts', sub: 'Google & integrations', href: '/accounts',  color: 'var(--fg-muted)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
]

const AI_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setAiResult(null)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Build result list
  const results: Result[] = query.trim() === ''
    ? [
        ...NAV_ITEMS,
        ...QUICK_ACTIONS,
      ]
    : [
        ...NAV_ITEMS.filter(r =>
          r.label.toLowerCase().includes(query.toLowerCase()) ||
          (r.sub ?? '').toLowerCase().includes(query.toLowerCase())
        ),
        ...QUICK_ACTIONS.filter(r =>
          r.label.toLowerCase().includes(query.toLowerCase()) ||
          (r.sub ?? '').toLowerCase().includes(query.toLowerCase())
        ),
        // Always offer AI option when there's a query
        {
          id: 'ai-query',
          type: 'ai' as const,
          label: `Ask the office: "${query}"`,
          sub: 'Send to Chief agent for routing',
          color: 'var(--c-purple)',
          icon: AI_ICON,
        },
      ]

  const clampedActive = Math.min(active, results.length - 1)

  const selectResult = useCallback(async (result: Result) => {
    if (result.type === 'ai') {
      setAiLoading(true)
      setAiResult(null)
      try {
        const res = await fetch('/api/ai/ceo-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: query }),
        })
        const data = await res.json()
        setAiResult(data.response ?? data.message ?? data.result ?? JSON.stringify(data))
      } catch {
        setAiResult('Error reaching the office. Try again.')
      } finally {
        setAiLoading(false)
      }
      return
    }
    onClose()
    if (result.href) router.push(result.href)
    if (result.onSelect) result.onSelect()
  }, [query, onClose, router])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); if (results[clampedActive]) selectResult(results[clampedActive]) }
  }, [results, clampedActive, selectResult, onClose])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${clampedActive}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [clampedActive])

  if (!open) return null

  const grouped = query.trim() === ''
    ? [
        { heading: 'Navigate', items: results.filter(r => r.type === 'nav') },
        { heading: 'Quick actions', items: results.filter(r => r.type === 'action') },
      ]
    : [{ heading: null, items: results }]

  let idx = 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(10,14,26,0.72)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-modal
        aria-label="Command palette"
        onKeyDown={handleKey}
        style={{
          position: 'fixed', top: '18vh', left: '50%', transform: 'translateX(-50%)',
          zIndex: 101,
          width: '100%', maxWidth: '640px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.15)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-faint)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); setAiResult(null) }}
            placeholder="Ask the office — &quot;draft a reply to Kestrel Labs&quot;, &quot;what's due Friday?&quot;"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              font: '400 15px/1 var(--font-sans)', color: 'var(--fg-primary)',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setAiResult(null); inputRef.current?.focus() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-faint)', padding: '2px', display: 'flex' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
          <kbd style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--fg-faint)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '3px 6px' }}>esc</kbd>
        </div>

        {/* AI result */}
        {(aiLoading || aiResult) && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: aiResult ? '8px' : 0 }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(160deg, var(--c-purple), var(--c-blue))', display: 'grid', placeItems: 'center', fontSize: '10px', color: '#fff', fontWeight: 700 }}>CH</span>
              <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Chief · {aiLoading ? 'thinking…' : 'responded'}</span>
              {aiLoading && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--c-purple-2)', animation: 'bk 0.8s infinite', marginLeft: 'auto' }} />}
            </div>
            {aiResult && (
              <p style={{ font: '400 13px/1.55 var(--font-sans)', color: 'var(--fg-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{aiResult}</p>
            )}
          </div>
        )}

        {/* Results list */}
        <div ref={listRef} style={{ overflowY: 'auto', maxHeight: '380px' }}>
          {grouped.map(group => (
            <div key={group.heading ?? 'results'}>
              {group.heading && (
                <div style={{ padding: '8px 16px 4px', font: '600 11px/1 var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                  {group.heading}
                </div>
              )}
              {group.items.map(result => {
                const i = idx++
                const isActive = i === clampedActive
                return (
                  <div
                    key={result.id}
                    data-idx={i}
                    onClick={() => selectResult(result)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr auto',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                      borderLeft: isActive ? `2px solid ${result.color ?? 'var(--c-purple)'}` : '2px solid transparent',
                      transition: 'background 0.08s',
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: isActive
                        ? `color-mix(in srgb, ${result.color ?? 'var(--c-purple)'} 18%, var(--bg-surface-3))`
                        : 'var(--bg-surface-2)',
                      border: '1px solid var(--border-default)',
                      display: 'grid', placeItems: 'center',
                      color: result.color ?? 'var(--fg-muted)',
                      flexShrink: 0,
                    }}>
                      {result.icon}
                    </div>

                    {/* Label */}
                    <div>
                      <div style={{ font: '500 14px/1.2 var(--font-sans)', color: isActive ? 'var(--fg-primary)' : 'var(--fg-secondary)' }}>
                        {result.label}
                      </div>
                      {result.sub && (
                        <div style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-faint)', marginTop: '3px' }}>
                          {result.sub}
                        </div>
                      )}
                    </div>

                    {/* Enter hint */}
                    {isActive && (
                      <kbd style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--fg-faint)', background: 'var(--bg-surface-3)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '3px 6px', whiteSpace: 'nowrap' }}>
                        {result.type === 'ai' ? 'ask ↵' : '↵'}
                      </kbd>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {results.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--fg-faint)', font: '400 13px/1 var(--font-sans)' }}>
              No matches — press Enter to ask the office
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '16px', font: '400 11px/1 var(--font-sans)', color: 'var(--fg-faint)' }}>
          <span><kbd style={{ font: 'inherit', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: '3px', padding: '2px 5px' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ font: 'inherit', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: '3px', padding: '2px 5px' }}>↵</kbd> select</span>
          <span><kbd style={{ font: 'inherit', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: '3px', padding: '2px 5px' }}>esc</kbd> close</span>
          <span style={{ marginLeft: 'auto' }}>type anything to ask the office</span>
        </div>
      </div>
    </>
  )
}
