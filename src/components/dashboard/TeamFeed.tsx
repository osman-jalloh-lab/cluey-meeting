'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface FeedMessage {
  id: string
  fromAgent: string
  toAgent?: string | null
  message: string
  messageType: string
  status: string
  createdAt: string
  task?: { title: string; status: string } | null
}

const AGENT_COLORS: Record<string, string> = {
  'Inbox Specialist': '#6366f1',
  'HR Compliance Specialist': '#10b981',
  'Career Advisor': '#f59e0b',
  'Schedule Manager': '#3b82f6',
  'Ops Manager': '#8b5cf6',
  'Daily Briefing Officer': '#ec4899',
  'Learning Advisor': '#06b6d4',
  'CEO Controller Agent': '#f97316',
  'CEO': '#f97316',
  'System': '#64748b',
}

const TYPE_ICONS: Record<string, string> = {
  update: '💬',
  alert: '🔴',
  handoff: '→',
  complete: '✅',
  question: '❓',
}

export default function TeamFeed() {
  const [messages, setMessages] = useState<FeedMessage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Poll every 30 seconds
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Team Feed</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>
          {messages.length} messages
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0" style={{ maxHeight: '320px' }}>
        {loading ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>Loading feed...</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📡</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No messages yet.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Run a command or assign a task to see agent activity here.</p>
          </div>
        ) : (
          messages.map(msg => {
            const color = AGENT_COLORS[msg.fromAgent] ?? '#6366f1'
            return (
              <div
                key={msg.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                {/* Agent avatar */}
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
                >
                  {msg.fromAgent.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-xs font-semibold" style={{ color }}>
                      {msg.fromAgent}
                    </span>
                    {msg.toAgent && (
                      <>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>→</span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: AGENT_COLORS[msg.toAgent] ?? 'var(--primary)' }}
                        >
                          {msg.toAgent}
                        </span>
                      </>
                    )}
                    <span className="ml-auto text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)', opacity: 0.85 }}>
                    {TYPE_ICONS[msg.messageType] ?? '•'} {msg.message}
                  </p>

                  {msg.task && (
                    <span
                      className="inline-block mt-1 text-xs px-2 py-0.5 rounded"
                      style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}
                    >
                      Task: {msg.task.title}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
