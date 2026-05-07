'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface AgentTask {
  id: string
  title: string
  description?: string | null
  assignedTo: string
  createdBy: string
  priority: string
  status: string
  source?: string | null
  carryForward: boolean
  requiresApproval: boolean
  result?: string | null
  agentNotes?: string | null
  createdAt: string
  updatedAt: string
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  normal: '#6366f1',
  low: '#64748b',
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: 'Open' },
  working: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'Working' },
  blocked: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Blocked' },
  completed: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Done' },
  cancelled: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Cancelled' },
}

function OutputDrawer({ task, onClose }: { task: AgentTask; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-t-2xl p-5"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{task.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{task.assignedTo}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: STATUS_STYLES[task.status]?.bg, color: STATUS_STYLES[task.status]?.color }}
              >
                {STATUS_STYLES[task.status]?.label ?? task.status}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatRelativeTime(task.createdAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {/* Task description */}
        {task.description && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>TASK</p>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{task.description}</p>
          </div>
        )}

        {/* Output / Result */}
        {task.result ? (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#34d399' }}>OUTPUT</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)', lineHeight: 1.6 }}>{task.result}</p>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px dashed var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {task.status === 'open' || task.status === 'working'
                ? 'Agent is working on this. Output will appear here when done.'
                : 'No output recorded for this task.'}
            </p>
          </div>
        )}

        {/* Agent notes */}
        {task.agentNotes && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#818cf8' }}>AGENT NOTES</p>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{task.agentNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentTaskBoard() {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'completed' | 'carry'>('open')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)

  const load = useCallback(async () => {
    try {
      const params = filter === 'carry'
        ? '?carryForward=true'
        : `?status=${filter}`
      const res = await fetch(`/api/agent-tasks${params}`)
      if (res.ok) setTasks((await res.json()).tasks)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    await fetch('/api/agent-tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    setUpdatingId(null)
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/agent-tasks?id=${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
    if (selectedTask?.id === id) setSelectedTask(null)
  }

  const openCount = tasks.filter(t => ['open', 'working', 'blocked'].includes(t.status)).length
  const carryCount = tasks.filter(t => t.carryForward).length

  return (
    <>
      <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Agent Tasks</h3>
          <div className="flex gap-1">
            {([
              { key: 'open', label: `Active (${openCount})` },
              { key: 'carry', label: `Carried (${carryCount})` },
              { key: 'completed', label: 'Done' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: filter === f.key ? 'var(--primary)' : 'var(--background)',
                  color: filter === f.key ? 'white' : 'var(--muted)',
                  border: filter === f.key ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2" style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {loading ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {filter === 'open' ? 'No active tasks. Run a command to create one.' : 'Nothing here.'}
              </p>
            </div>
          ) : (
            tasks.map(task => {
              const ss = STATUS_STYLES[task.status] ?? STATUS_STYLES.open
              const pc = PRIORITY_COLORS[task.priority] ?? '#6366f1'
              const hasOutput = !!(task.result || task.agentNotes)
              return (
                <div
                  key={task.id}
                  className="p-3 rounded-xl"
                  style={{
                    background: 'var(--background)',
                    border: task.carryForward ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: pc, minWidth: '6px' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-medium leading-tight" style={{ color: 'var(--foreground)' }}>
                          {task.title}
                        </p>
                        {task.carryForward && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                            Carried
                          </span>
                        )}
                        {task.requiresApproval && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                            Needs Approval
                          </span>
                        )}
                        {hasOutput && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                            Has Output
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>→ {task.assignedTo}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: ss.bg, color: ss.color }}>
                          {ss.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          {formatRelativeTime(task.createdAt)}
                        </span>
                      </div>

                      {/* Result preview — first 80 chars */}
                      {task.result && (
                        <p className="text-xs mt-1.5 px-2 py-1 rounded truncate"
                           style={{ background: 'rgba(16,185,129,0.08)', color: '#34d399' }}>
                          {task.result.slice(0, 80)}{task.result.length > 80 ? '…' : ''}
                        </p>
                      )}

                      <p className="text-xs mt-1" style={{ color: 'rgba(99,102,241,0.6)' }}>
                        Tap to see full output
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => updateStatus(task.id, 'completed')}
                          disabled={updatingId === task.id}
                          className="text-xs px-1.5 py-1 rounded"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', cursor: 'pointer', border: 'none' }}
                          title="Mark done"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-xs px-1.5 py-1 rounded"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', border: 'none' }}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Output drawer — slides up when a task is selected */}
      {selectedTask && (
        <OutputDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  )
}
