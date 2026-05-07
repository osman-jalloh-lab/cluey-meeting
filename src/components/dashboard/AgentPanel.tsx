'use client'

import { useState, useRef, useEffect } from 'react'
import { useOllama } from '@/lib/ai/useOllama'

export interface AgentDef {
  id: string
  type: 'email' | 'calendar' | 'hr' | 'job_search' | 'task' | 'briefing' | 'assistant'
  icon: string
  name: string
  role: string
  description: string
  color: string
  placeholder: string
  badge?: string
  quickActions: string[]
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentPanelProps {
  agent: AgentDef | null
  onClose: () => void
}

export default function AgentPanel({ agent, onClose }: AgentPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Smart router: free local Ollama or cloud depending on agent type ──
  const { ask, loading, provider } = useOllama()

  useEffect(() => {
    if (agent) {
      setMessages([])
      setInput('')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [agent?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const send = async (text: string) => {
    if (!agent || !text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')
    setError(null)

    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(updatedMessages)

    try {
      // Pass conversation history so Ollama has context
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const reply = await ask(agent.type, userMsg, history)

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const isEmpty = messages.length === 0

  // Provider badge label
  const providerLabel = provider === 'ollama'
    ? { label: '⚡ Local · Free', color: '#10b981' }
    : provider === 'cloud'
    ? { label: '☁️ Cloud', color: '#6366f1' }
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: agent ? 'rgba(0,0,0,0.45)' : 'transparent',
          pointerEvents: agent ? 'auto' : 'none',
          backdropFilter: agent ? 'blur(6px)' : 'none',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: 'min(500px, 100vw)',
          background: 'var(--background)',
          borderLeft: '1px solid var(--border)',
          transform: agent ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.35)',
        }}
      >
        {agent && (
          <>
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}35` }}
              >
                {agent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-sm leading-tight" style={{ color: 'var(--foreground)' }}>
                    {agent.name}
                  </h2>
                  {agent.badge && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${agent.color}20`, color: agent.color }}
                    >
                      {agent.badge}
                    </span>
                  )}
                  {/* Live provider badge — shows FREE or Cloud */}
                  {providerLabel && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${providerLabel.color}18`, color: providerLabel.color, border: `1px solid ${providerLabel.color}30` }}
                    >
                      {providerLabel.label}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: agent.color, fontWeight: 500 }}>
                  {agent.role}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xl leading-none transition-opacity hover:opacity-60"
                style={{ color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                ×
              </button>
            </div>

            {/* Messages / Empty state */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {isEmpty ? (
                <div className="flex flex-col items-center text-center pt-8 pb-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                    style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}
                  >
                    {agent.icon}
                  </div>
                  <p className="font-semibold text-base mb-1" style={{ color: 'var(--foreground)' }}>
                    {agent.name}
                  </p>
                  <p className="text-xs mb-1" style={{ color: agent.color, fontWeight: 500 }}>
                    {agent.role}
                  </p>
                  <p className="text-xs mb-6 max-w-xs" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                    {agent.description}
                  </p>

                  {/* Free/paid indicator on empty state */}
                  <div
                    className="mb-4 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      background: ['task','briefing','hr','calendar'].includes(agent.type)
                        ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                      color: ['task','briefing','hr','calendar'].includes(agent.type)
                        ? '#10b981' : '#818cf8',
                      border: `1px solid ${['task','briefing','hr','calendar'].includes(agent.type)
                        ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                    }}
                  >
                    {['task','briefing','hr','calendar'].includes(agent.type)
                      ? '⚡ Powered by local Ollama — free'
                      : '☁️ Powered by cloud AI'}
                  </div>

                  {/* Quick-action chips */}
                  <div className="w-full text-left">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      Quick actions
                    </p>
                    <div className="flex flex-col gap-2">
                      {agent.quickActions.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => send(qa)}
                          className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                          style={{
                            background: 'var(--card)',
                            border: `1px solid var(--border)`,
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget
                            el.style.borderColor = `${agent.color}60`
                            el.style.background = `${agent.color}08`
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget
                            el.style.borderColor = 'var(--border)'
                            el.style.background = 'var(--card)'
                          }}
                        >
                          <span style={{ color: agent.color, marginRight: 8 }}>→</span>
                          {qa}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0"
                        style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}30` }}
                      >
                        {agent.icon}
                      </div>
                    )}
                    <div
                      className="max-w-[82%] rounded-2xl px-4 py-3 text-sm"
                      style={
                        msg.role === 'user'
                          ? { background: agent.color, color: '#fff', borderBottomRightRadius: '4px' }
                          : {
                              background: 'var(--card)',
                              color: 'var(--foreground)',
                              border: '1px solid var(--border)',
                              borderBottomLeftRadius: '4px',
                              lineHeight: '1.65',
                              whiteSpace: 'pre-wrap',
                            }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex justify-start items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}30` }}
                  >
                    {agent.icon}
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', borderBottomLeftRadius: '4px' }}
                  >
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: agent.color, animationDelay: `${delay}ms` }}
                      />
                    ))}
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {provider === 'ollama' ? '⚡ Llama thinking...' : '☁️ Agent working...'}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  ❌ {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <div
                className="flex items-end gap-2 rounded-xl px-4 py-3"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={agent.placeholder}
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder-gray-500"
                  style={{ color: 'var(--foreground)', maxHeight: '120px', lineHeight: '1.5' }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    background: input.trim() && !loading ? agent.color : 'var(--border)',
                    color: 'white',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    border: 'none',
                    fontSize: '16px',
                  }}
                >
                  →
                </button>
              </div>
              <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--muted)' }}>
                Enter to send · Shift+Enter newline · Esc to close
              </p>
            </div>
          </>
        )}
      </div>
    </>
  )
}
