'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface JobLead {
  id: string
  title: string
  company: string
  location?: string | null
  source?: string | null
  jobUrl?: string | null
  matchScore: number
  matchReason?: string | null
  requiredSkills?: string | null
  matchedSkills?: string | null
  missingSkills?: string | null
  workAuthNotes?: string | null
  status: string
  resumeVersion?: string | null
  coverLetterVersion?: string | null
  requiresApproval: boolean
  nextAction?: string | null
  deadline?: string | null
  createdAt: string
  updatedAt: string
}

const JOB_STATUSES = [
  'Found',
  'Recommended',
  'Resume Ready',
  'Cover Letter Ready',
  'Needs Review',
  'Ready to Apply',
  'Applied',
  'Follow-up Needed',
  'Rejected',
  'Interview',
  'Offer',
]

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'Found':              { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  'Recommended':        { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  'Resume Ready':       { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  'Cover Letter Ready': { bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa' },
  'Needs Review':       { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  'Ready to Apply':     { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  'Applied':            { bg: 'rgba(6,182,212,0.15)',   color: '#22d3ee' },
  'Follow-up Needed':   { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  'Rejected':           { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  'Interview':          { bg: 'rgba(16,185,129,0.2)',   color: '#10b981' },
  'Offer':              { bg: 'rgba(245,158,11,0.25)',  color: '#f59e0b' },
}

function MatchBar({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold flex-shrink-0" style={{ color, minWidth: '28px' }}>{score}%</span>
    </div>
  )
}

export default function RecommendedJobs() {
  const [leads, setLeads] = useState<JobLead[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'active' | 'applied' | 'all'>('active')
  const [addingLead, setAddingLead] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCompany, setNewCompany] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/job-leads')
      if (res.ok) setLeads((await res.json()).leads)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    await fetch('/api/job-leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    setUpdatingId(null)
  }

  const addLead = async () => {
    if (!newTitle.trim() || !newCompany.trim()) return
    setUpdatingId('new')
    try {
      const res = await fetch('/api/job-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          company: newCompany.trim(),
          status: 'Found',
          matchScore: 0,
          createdBy: 'CEO',
        }),
      })
      if (res.ok) {
        const { lead } = await res.json()
        setLeads(prev => [lead, ...prev])
        setNewTitle('')
        setNewCompany('')
        setAddingLead(false)
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const ACTIVE_STATUSES = new Set(['Found', 'Recommended', 'Resume Ready', 'Cover Letter Ready', 'Needs Review', 'Ready to Apply', 'Follow-up Needed', 'Interview'])
  const APPLIED_STATUSES = new Set(['Applied', 'Rejected', 'Offer'])

  const filtered = leads.filter(l => {
    if (filterStatus === 'active') return ACTIVE_STATUSES.has(l.status)
    if (filterStatus === 'applied') return APPLIED_STATUSES.has(l.status)
    return true
  })

  const interviewCount = leads.filter(l => l.status === 'Interview').length
  const offerCount = leads.filter(l => l.status === 'Offer').length
  const activeCount = leads.filter(l => ACTIVE_STATUSES.has(l.status)).length

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>💼 Job Pipeline</h3>
          {interviewCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
              {interviewCount} Interview{interviewCount > 1 ? 's' : ''}
            </span>
          )}
          {offerCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              {offerCount} Offer{offerCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {([
              { key: 'active', label: `Active (${activeCount})` },
              { key: 'applied', label: 'Applied' },
              { key: 'all', label: 'All' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: filterStatus === f.key ? 'var(--primary)' : 'var(--background)',
                  color: filterStatus === f.key ? 'white' : 'var(--muted)',
                  border: filterStatus === f.key ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddingLead(v => !v)}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', cursor: 'pointer' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Add lead inline form */}
      {addingLead && (
        <div className="mb-3 p-3 rounded-xl flex gap-2 items-end" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
          <div className="flex-1">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Job title"
              className="w-full text-xs rounded-lg px-2.5 py-1.5 mb-1.5 outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <input
              value={newCompany}
              onChange={e => setNewCompany(e.target.value)}
              placeholder="Company"
              onKeyDown={e => e.key === 'Enter' && addLead()}
              className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={addLead}
              disabled={!newTitle.trim() || !newCompany.trim() || updatingId === 'new'}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Save
            </button>
            <button
              onClick={() => { setAddingLead(false); setNewTitle(''); setNewCompany('') }}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Job list */}
      <div className="space-y-2" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {loading ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>Loading pipeline...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {filterStatus === 'active' ? 'No active leads. Run "Find cybersecurity internships" to start.' : 'Nothing here yet.'}
            </p>
          </div>
        ) : (
          filtered.map(lead => {
            const ss = STATUS_STYLES[lead.status] ?? STATUS_STYLES['Found']
            const isExpanded = expanded === lead.id
            return (
              <div
                key={lead.id}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--background)',
                  border: lead.status === 'Interview' ? '1px solid rgba(16,185,129,0.4)' :
                           lead.status === 'Offer' ? '1px solid rgba(245,158,11,0.4)' :
                           '1px solid var(--border)',
                }}
              >
                {/* Card header */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : lead.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-medium leading-tight" style={{ color: 'var(--foreground)' }}>
                          {lead.title}
                        </p>
                        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: ss.bg, color: ss.color }}>
                          {lead.status}
                        </span>
                        {lead.requiresApproval && lead.status !== 'Applied' && lead.status !== 'Rejected' && (
                          <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                            Needs Approval
                          </span>
                        )}
                      </div>
                      <p className="text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
                        {lead.company}{lead.location ? ` · ${lead.location}` : ''}{lead.source ? ` · ${lead.source}` : ''}
                      </p>
                      {lead.matchScore > 0 && <MatchBar score={lead.matchScore} />}
                    </div>
                    <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded detail + actions */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Match reason */}
                    {lead.matchReason && (
                      <p className="text-xs pt-2" style={{ color: 'var(--muted)', lineHeight: '1.5' }}>
                        {lead.matchReason}
                      </p>
                    )}

                    {/* Skills */}
                    {(lead.matchedSkills || lead.missingSkills) && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {lead.matchedSkills && (
                          <div>
                            <p className="font-medium mb-1" style={{ color: '#34d399' }}>Matched</p>
                            <p style={{ color: 'var(--muted)', lineHeight: '1.5' }}>{lead.matchedSkills}</p>
                          </div>
                        )}
                        {lead.missingSkills && (
                          <div>
                            <p className="font-medium mb-1" style={{ color: '#f87171' }}>Missing</p>
                            <p style={{ color: 'var(--muted)', lineHeight: '1.5' }}>{lead.missingSkills}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Work auth note */}
                    {lead.workAuthNotes && (
                      <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', color: '#fbbf24' }}>
                        Work Auth: {lead.workAuthNotes}
                      </p>
                    )}

                    {/* Versions + next action */}
                    {(lead.resumeVersion || lead.coverLetterVersion || lead.nextAction) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {lead.resumeVersion && (
                          <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                            Resume: {lead.resumeVersion}
                          </span>
                        )}
                        {lead.coverLetterVersion && (
                          <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                            CL: {lead.coverLetterVersion}
                          </span>
                        )}
                        {lead.nextAction && (
                          <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                            Next: {lead.nextAction}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Status workflow buttons */}
                    <div>
                      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Update status</p>
                      <div className="flex flex-wrap gap-1">
                        {JOB_STATUSES.filter(s => s !== lead.status).map(s => {
                          const st = STATUS_STYLES[s] ?? STATUS_STYLES['Found']
                          return (
                            <button
                              key={s}
                              onClick={() => updateStatus(lead.id, s)}
                              disabled={updatingId === lead.id}
                              className="text-xs px-2 py-0.5 rounded transition-all"
                              style={{ background: st.bg, color: st.color, border: 'none', cursor: 'pointer' }}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {lead.jobUrl && (
                        <a
                          href={lead.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', textDecoration: 'none' }}
                        >
                          View Job →
                        </a>
                      )}
                      <button
                        onClick={() => updateStatus(lead.id, 'Resume Ready')}
                        disabled={updatingId === lead.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'none', cursor: 'pointer' }}
                      >
                        Generate Resume
                      </button>
                      <button
                        onClick={() => updateStatus(lead.id, 'Cover Letter Ready')}
                        disabled={updatingId === lead.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: 'none', cursor: 'pointer' }}
                      >
                        Generate Cover Letter
                      </button>
                      <button
                        onClick={() => updateStatus(lead.id, 'Applied')}
                        disabled={updatingId === lead.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'none', cursor: 'pointer' }}
                      >
                        Mark Applied
                      </button>
                      <button
                        onClick={() => updateStatus(lead.id, 'Rejected')}
                        disabled={updatingId === lead.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
                      >
                        Not Interested
                      </button>
                    </div>

                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Added {formatRelativeTime(lead.createdAt)}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
