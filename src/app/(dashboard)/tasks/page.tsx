'use client'

import { useState, useEffect } from 'react'
import { getPriorityColor, formatDate, cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  dueDate: string | null
  sourceType: string | null
  createdAt: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { loadTasks() }, [])

  const loadTasks = async () => {
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(data)
    setLoading(false)
  }

  const addTask = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, priority: newPriority }),
    })
    const task = await res.json()
    setTasks(prev => [task, ...prev])
    setNewTitle('')
    setAdding(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
    setOutputs(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const runTask = async (task: Task) => {
    setRunningId(task.id)
    setExpanded(prev => ({ ...prev, [task.id]: true }))
    setOutputs(prev => ({ ...prev, [task.id]: '' }))
    try {
      const command = task.description ? `${task.title}: ${task.description}` : task.title
      const res = await fetch('/api/ai/ceo-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const data = await res.json()
      const output = data.result ?? data.error ?? 'No output returned.'
      setOutputs(prev => ({ ...prev, [task.id]: output }))
    } catch {
      setOutputs(prev => ({ ...prev, [task.id]: 'Failed to run — check your connection.' }))
    } finally {
      setRunningId(null)
    }
  }

  const copyOutput = async (id: string) => {
    const text = outputs[id]
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1800)
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'done' && t.status !== 'cancelled'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  return (
    <div className="pg-wrap">
      {/* Page topbar */}
      <div className="pg-topbar">
        <div className="pg-topbar-l">
          <h1>✅ Tasks</h1>
          <p style={{ margin: 0, font: '400 12px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>Manage tasks extracted from emails or added manually.</p>
        </div>
      </div>

      {/* Add task */}
      <div className="pg-panel" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', padding: '14px 18px' }}>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 'var(--r-3)',
              background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)',
              color: 'var(--fg-primary)', font: '400 13px/1 var(--font-sans)', outline: 'none',
            }}
          />
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 'var(--r-3)',
              background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)',
              color: 'var(--fg-primary)', font: '400 13px/1 var(--font-sans)', cursor: 'pointer',
            }}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={addTask}
            disabled={adding || !newTitle.trim()}
            className="btn-primary"
            style={{ opacity: (adding || !newTitle.trim()) ? 0.5 : 1, cursor: (adding || !newTitle.trim()) ? 'not-allowed' : 'pointer' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Filter + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'pending', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 14px', borderRadius: 'var(--r-pill)',
              background: filter === f ? 'var(--c-blue-2)' : 'var(--bg-surface)',
              color: filter === f ? '#fff' : 'var(--fg-muted)',
              border: filter === f ? 'none' : '1px solid var(--border-default)',
              font: '600 11px/1 var(--font-sans)', textTransform: 'capitalize', cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', font: '500 11px/1 var(--font-mono)', color: 'var(--fg-muted)' }}>{filtered.length} tasks</span>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="pg-panel">
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height: '56px', margin: '8px', borderRadius: 'var(--r-3)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="pg-panel">
          <div className="empty-state">
            <div className="icon">✨</div>
            <p className="msg">No tasks here.</p>
            <p className="hint">Generate a daily briefing to extract tasks from emails.</p>
          </div>
        </div>
      ) : (
        <div className="pg-panel">
          {filtered.map((task, i) => {
            const isRunning = runningId === task.id
            const output = outputs[task.id]
            const isOpen = expanded[task.id]
            const isDone = task.status === 'done'

            return (
              <div key={task.id} style={{ animation: 'slidein 0.2s ease-out backwards', animationDelay: `${i * 40}ms` }}>
                <div
                  className="pg-row"
                  style={{ opacity: isDone ? 0.55 : 1, alignItems: 'flex-start', paddingTop: '12px', paddingBottom: '12px' }}
                >
                  {/* Done checkbox */}
                  <button
                    onClick={() => updateStatus(task.id, isDone ? 'pending' : 'done')}
                    style={{
                      width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                      border: isDone ? 'none' : '2px solid var(--border-strong)',
                      background: isDone ? 'var(--c-teal-2)' : 'transparent',
                      cursor: 'pointer', color: 'white', font: '700 11px/1 var(--font-sans)',
                      display: 'grid', placeItems: 'center',
                    }}
                  >
                    {isDone && '✓'}
                  </button>

                  {/* Body */}
                  <div className="body" style={{ flex: 1 }}>
                    <p className="ttl" style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                      {task.title}
                    </p>
                    {task.description && <p className="sub">{task.description}</p>}
                    <div className="ftr">
                      <span className={cn('tag-chip', getPriorityColor(task.priority))}>{task.priority}</span>
                      {task.dueDate && <span className="tag-chip">Due {formatDate(task.dueDate)}</span>}
                      {task.sourceType && task.sourceType !== 'manual' && (
                        <span className="tag-chip" style={{ color: 'var(--c-blue-2)', borderColor: 'rgba(99,153,255,0.3)' }}>
                          from {task.sourceType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {!isDone && (
                      <button
                        onClick={() => runTask(task)}
                        disabled={isRunning || runningId !== null}
                        style={{
                          padding: '4px 10px', borderRadius: 'var(--r-2)',
                          background: isRunning ? 'var(--bg-surface-2)' : 'var(--c-blue-2)',
                          color: isRunning ? 'var(--fg-muted)' : '#fff',
                          border: 'none', font: '600 11px/1 var(--font-sans)',
                          cursor: (isRunning || runningId !== null) ? 'not-allowed' : 'pointer',
                          opacity: (!isRunning && runningId !== null) ? 0.4 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isRunning ? '⏳ Running…' : '▶ Run'}
                      </button>
                    )}
                    {output && (
                      <button
                        onClick={() => setExpanded(prev => ({ ...prev, [task.id]: !isOpen }))}
                        style={{
                          padding: '4px 8px', borderRadius: 'var(--r-2)',
                          background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)',
                          color: 'var(--fg-muted)', font: '600 11px/1 var(--font-sans)', cursor: 'pointer',
                        }}
                      >
                        {isOpen ? '▲ Hide' : '▼ Output'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{ color: 'var(--fg-faint)', cursor: 'pointer', background: 'transparent', border: 'none', font: '400 12px/1 var(--font-sans)', padding: '4px', borderRadius: 'var(--r-2)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-faint)')}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Output panel */}
                {isRunning && !output && (
                  <div style={{
                    margin: '0 16px 12px', padding: '12px 14px', borderRadius: 'var(--r-3)',
                    background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)',
                    font: '400 12px/1.6 var(--font-mono)', color: 'var(--fg-muted)',
                  }}>
                    Agent working…
                  </div>
                )}

                {output && isOpen && (
                  <div style={{
                    margin: '0 16px 12px', borderRadius: 'var(--r-3)',
                    border: '1px solid var(--border-default)', overflow: 'hidden',
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'var(--bg-surface-2)',
                      borderBottom: '1px solid var(--border-default)',
                    }}>
                      <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>Agent Output</span>
                      <button
                        onClick={() => copyOutput(task.id)}
                        style={{
                          padding: '3px 8px', borderRadius: 'var(--r-2)',
                          background: copied === task.id ? 'var(--c-teal-2)' : 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          color: copied === task.id ? '#fff' : 'var(--fg-muted)',
                          font: '600 10px/1 var(--font-sans)', cursor: 'pointer',
                        }}
                      >
                        {copied === task.id ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre style={{
                      margin: 0, padding: '12px 14px',
                      font: '400 12px/1.65 var(--font-mono)', color: 'var(--fg-primary)',
                      background: 'var(--bg-base)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: '300px', overflowY: 'auto',
                    }}>
                      {output}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
