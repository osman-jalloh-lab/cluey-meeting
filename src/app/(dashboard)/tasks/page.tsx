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
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'done' && t.status !== 'cancelled'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>✅ Tasks</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Manage tasks extracted from emails or added manually.</p>

      {/* Add task */}
      <div className="flex gap-3 mb-5">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
        <select
          value={newPriority}
          onChange={e => setNewPriority(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer' }}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={addTask}
          disabled={adding || !newTitle.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Add
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-lg text-xs capitalize transition-all"
            style={{
              background: filter === f ? 'var(--primary)' : 'var(--card)',
              color: filter === f ? 'white' : 'var(--muted)',
              border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs self-center" style={{ color: 'var(--muted)' }}>{filtered.length} tasks</span>
      </div>

      {/* Task list */}
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center p-8 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
          <p className="text-2xl mb-2">✨</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No tasks here. Generate a daily briefing to extract tasks from emails.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div
              key={task.id}
              className="p-4 rounded-xl flex items-start gap-3 transition-all"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                opacity: task.status === 'done' ? 0.6 : 1,
              }}
            >
              <button
                onClick={() => updateStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                className="w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                style={{
                  border: task.status === 'done' ? 'none' : '2px solid var(--border)',
                  background: task.status === 'done' ? 'var(--secondary)' : 'transparent',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                {task.status === 'done' && '✓'}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through')}
                   style={{ color: 'var(--foreground)' }}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Due {formatDate(task.dueDate)}</span>
                  )}
                  {task.sourceType && task.sourceType !== 'manual' && (
                    <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                      from {task.sourceType}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="text-xs opacity-0 group-hover:opacity-100 transition-all p-1 rounded"
                style={{ color: 'var(--muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
