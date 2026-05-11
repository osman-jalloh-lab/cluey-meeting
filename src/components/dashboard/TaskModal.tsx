'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const AGENTS = [
  'Inbox Specialist',
  'HR Compliance Specialist',
  'Career Advisor',
  'Schedule Manager',
  'Ops Manager',
  'Daily Briefing Officer',
  'Learning Advisor',
  'CEO Controller Agent',
]

interface TaskModalProps {
  open: boolean
  defaultAgent?: string
  onClose: () => void
  onCreated: (task: { id: string; title: string; assignedTo: string; priority: string }) => void
}

export default function TaskModal({ open, defaultAgent, onClose, onCreated }: TaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState(defaultAgent ?? AGENTS[0])
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [source, setSource] = useState('manual')
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, assignedTo, priority, source, requiresApproval, createdBy: 'CEO' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data.task)
      setTitle('')
      setDescription('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal-container"
            className="fixed z-50 rounded-2xl p-6 w-full"
            style={{
              top: '50%',
              left: '50%',
              x: '-50%',
              y: '-50%',
              maxWidth: '480px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
            initial={{ opacity: 0, y: 'calc(-50% + 16px)', filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: '-50%', filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 'calc(-50% - 10px)', filter: 'blur(4px)' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>Assign Task</h2>
              <button onClick={onClose} style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Task Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Reply to recruiter email from Ferrovial"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What needs to happen and why it matters..."
                  rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Agent + Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'urgent')}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Source</label>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                >
                  <option value="manual">Manual</option>
                  <option value="gmail">Gmail</option>
                  <option value="calendar">Calendar</option>
                  <option value="job-search">Job Search</option>
                  <option value="hr">HR / Compliance</option>
                  <option value="briefing">Morning Brief</option>
                  <option value="learning">Learning</option>
                </select>
              </div>

              {/* Approval toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <div>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>Requires my approval</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Agent must wait before taking action</p>
                </div>
                <button
                  onClick={() => setRequiresApproval(!requiresApproval)}
                  className="w-10 h-6 rounded-full transition-all relative flex-shrink-0"
                  style={{ background: requiresApproval ? '#6366f1' : 'var(--border)', cursor: 'pointer', border: 'none' }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full transition-all"
                    style={{ background: 'white', left: requiresApproval ? '22px' : '2px' }}
                  />
                </button>
              </div>

              {error && <p className="text-xs" style={{ color: '#ef4444' }}>❌ {error}</p>}

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!title.trim() || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: title.trim() && !loading ? '#6366f1' : 'rgba(99,102,241,0.3)',
                    color: 'white',
                    border: 'none',
                    cursor: title.trim() && !loading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {loading ? 'Creating...' : 'Assign Task'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
