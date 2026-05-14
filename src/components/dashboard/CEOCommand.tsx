'use client'

import { useState } from 'react'

interface CEOCommandProps {
  onTaskCreated: (task: AgentTask, message: string, agent: string) => void
}

export interface AgentTask {
  id: string
  title: string
  assignedTo: string
  priority: string
  status: string
  source?: string | null
  createdAt: string
}

const QUICK_COMMANDS = [
  'Plan my day',
  'Check Gmail',
  'Find cybersecurity internships',
  'Show unfinished tasks',
  'Morning briefing',
  'HR updates',
  'Check schedule',
  'What should I focus on?',
]

export default function CEOCommand({ onTaskCreated }: CEOCommandProps) {
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastAck, setLastAck] = useState<{ message: string; agent: string } | null>(null)

  const submit = async (cmd: string) => {
    const text = cmd || command
    if (!text.trim() || loading) return
    setCommand('')
    setLoading(true)
    setLastAck(null)

    try {
      const res = await fetch('/api/ai/ceo-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setLastAck({ message: data.message, agent: data.routing.agent })
        onTaskCreated(data.task, data.message, data.routing.agent)
      }
    } catch {
      setLastAck({ message: 'Something went wrong. Try again.', agent: 'System' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-4 mb-5"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
        border: '1px solid rgba(99,102,241,0.25)',
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>⚡ CEO Command</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
          Routes to the right agent automatically
        </span>
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 mb-3"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(99,102,241,0.3)' }}
      >
        <span className="text-sm" style={{ color: '#818cf8' }}>$</span>
        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit(command)}
          placeholder='Type a command — "Find internships", "Plan my day", "Check Gmail"...'
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--foreground)' }}
          autoComplete="off"
        />
        <button
          onClick={() => submit(command)}
          disabled={!command.trim() || loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: command.trim() && !loading ? '#6366f1' : 'rgba(99,102,241,0.2)',
            color: command.trim() && !loading ? 'white' : '#818cf8',
            border: 'none',
            cursor: command.trim() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? <span className="run-spinner">⟳</span> : 'Run'}
        </button>
      </div>

      {/* Ack */}
      {lastAck && (
        <div
          key={lastAck.message}
          className="ack-message mb-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <span className="font-medium">{lastAck.agent}:</span> {lastAck.message}
        </div>
      )}

      {/* Quick commands */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_COMMANDS.map(qc => (
          <button
            key={qc}
            onClick={() => submit(qc)}
            disabled={loading}
            className="quick-cmd-btn text-xs px-2.5 py-1 rounded-lg"
          >
            {qc}
          </button>
        ))}
      </div>
    </div>
  )
}
