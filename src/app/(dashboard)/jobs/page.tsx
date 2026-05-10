'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface JobLead {
  id: string
  title: string
  company: string
  location: string | null
  source: string | null
  jobUrl: string | null
  matchScore: number
  recommendation: string | null
  matchReason: string | null
  missingSkills: string | null
  resumeKeywords: string | null
  resumeAngle: string | null
  workAuthNotes: string | null
  sponsorshipRequired: boolean
  clearanceRequired: boolean
  status: string
  nextAction: string | null
  notes: string | null
  appliedAt: string | null
  followUpDate: string | null
  followUpCount: number
  interviewDate: string | null
  interviewPrep: string | null
  companyResearch: string | null
  createdAt: string
}

interface FollowUpStatus {
  urgency: 'overdue' | 'due-today' | 'due-soon' | 'waiting' | 'cold'
  message: string
  daysUntilDue: number | null
}

interface LeadWithFollowUp extends JobLead {
  followUp: FollowUpStatus
}

interface Pipeline {
  [status: string]: number
}

const PIPELINE_TABS = ['All', 'Found', 'Evaluated', 'Applying', 'Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Rejected'] as const
type PipelineTab = (typeof PIPELINE_TABS)[number]

// ── Score helpers ──────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#6366f1'
  if (score >= 40) return '#f59e0b'
  return '#6b7280'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'rgba(16,185,129,0.12)'
  if (score >= 60) return 'rgba(99,102,241,0.12)'
  if (score >= 40) return 'rgba(245,158,11,0.12)'
  return 'rgba(107,114,128,0.12)'
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Strong match'
  if (score >= 60) return 'Good match'
  if (score >= 40) return 'Partial match'
  return 'Weak match'
}

function urgencyColor(urgency: string): string {
  if (urgency === 'overdue') return '#ef4444'
  if (urgency === 'due-today') return '#f59e0b'
  if (urgency === 'due-soon') return '#6366f1'
  return '#6b7280'
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function relativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [leads, setLeads] = useState<JobLead[]>([])
  const [pipeline, setPipeline] = useState<Pipeline>({})
  const [followUps, setFollowUps] = useState<LeadWithFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PipelineTab>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showEvaluate, setShowEvaluate] = useState(false)

  // Evaluate form state
  const [evalTitle, setEvalTitle] = useState('')
  const [evalCompany, setEvalCompany] = useState('')
  const [evalJD, setEvalJD] = useState('')
  const [evalLoading, setEvalLoading] = useState(false)
  const [evalResult, setEvalResult] = useState<string | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [leadsRes, followsRes] = await Promise.all([
        fetch('/api/job-leads?limit=100'),
        fetch('/api/jobs/followups'),
      ])
      if (!leadsRes.ok) throw new Error('Failed to load leads')
      const leadsData = await leadsRes.json()
      setLeads(leadsData.leads ?? [])
      setPipeline(leadsData.pipeline ?? {})

      if (followsRes.ok) {
        const followsData = await followsRes.json()
        setFollowUps(followsData.actionable ?? [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const markFollowUpSent = async (id: string) => {
    await fetch('/api/jobs/followups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/job-leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const deleteLead = async (id: string) => {
    if (!confirm('Delete this job lead?')) return
    await fetch(`/api/job-leads?id=${id}`, { method: 'DELETE' })
    load()
  }

  const runEvaluate = async () => {
    if (!evalTitle.trim() || !evalCompany.trim() || evalJD.trim().length < 50) return
    setEvalLoading(true)
    setEvalResult(null)
    setEvalError(null)
    try {
      const res = await fetch('/api/jobs/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: evalTitle,
          company: evalCompany,
          jobDescription: evalJD,
          saveToTracker: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Evaluation failed')
      const ev = data.evaluation
      setEvalResult(
        `Score: ${ev.score}/5 — ${ev.recommendation}\n\nWhy it matches: ${ev.whyItMatches}\n\nGaps: ${ev.gaps?.join(', ') || 'None'}\n\nResume angle: ${ev.resumeAngle}\n\nKeywords: ${ev.resumeKeywords?.join(', ')}\n\nNext action: ${ev.nextAction}${data.savedToTracker ? '\n\nSaved to tracker.' : ''}`
      )
      if (data.savedToTracker) {
        load()
        setEvalTitle('')
        setEvalCompany('')
        setEvalJD('')
      }
    } catch (e) {
      setEvalError(e instanceof Error ? e.message : 'Evaluation failed')
    } finally {
      setEvalLoading(false)
    }
  }

  const filtered = activeTab === 'All' ? leads : leads.filter(l => l.status === activeTab)
  const total = leads.length

  return (
    <div className="pg-wrap">

      {/* Page topbar */}
      <div className="pg-topbar">
        <div className="pg-topbar-l">
          <h1>Job Tracker</h1>
          <p style={{ margin: 0, font: '400 12px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>
            {total} lead{total !== 1 ? 's' : ''} tracked · scored by Nova
          </p>
        </div>
        <div className="pg-topbar-r">
          <button
            onClick={() => { setShowEvaluate(v => !v); setEvalResult(null) }}
            className={showEvaluate ? 'btn-ghost' : 'btn-primary'}
          >
            {showEvaluate ? 'Close' : '+ Evaluate Job'}
          </button>
        </div>
      </div>

      {/* Evaluate panel */}
      {showEvaluate && (
        <div className="pg-panel" style={{ marginBottom: '16px' }}>
          <div className="pg-panel-head">
            <div className="l"><h3>⚡ Evaluate a Job</h3></div>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: 0, font: '400 12px/1.4 var(--font-sans)', color: 'var(--fg-secondary)' }}>
              Paste a job description — Nova will score it and save it if it scores 3+/5.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                value={evalTitle}
                onChange={e => setEvalTitle(e.target.value)}
                placeholder="Job title"
                style={{ padding: '8px 12px', borderRadius: 'var(--r-3)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', font: '400 13px/1 var(--font-sans)', outline: 'none' }}
              />
              <input
                value={evalCompany}
                onChange={e => setEvalCompany(e.target.value)}
                placeholder="Company"
                style={{ padding: '8px 12px', borderRadius: 'var(--r-3)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', font: '400 13px/1 var(--font-sans)', outline: 'none' }}
              />
            </div>
            <textarea
              value={evalJD}
              onChange={e => setEvalJD(e.target.value)}
              placeholder="Paste the full job description here (min 50 characters)..."
              rows={6}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--r-3)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', font: '400 13px/1.6 var(--font-sans)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={runEvaluate}
                disabled={evalLoading || !evalTitle.trim() || !evalCompany.trim() || evalJD.length < 50}
                className="btn-primary"
                style={{ opacity: (!evalTitle.trim() || !evalCompany.trim() || evalJD.length < 50 || evalLoading) ? 0.5 : 1, cursor: evalLoading ? 'not-allowed' : 'pointer' }}
              >
                {evalLoading ? 'Evaluating...' : 'Evaluate'}
              </button>
              {evalJD.length > 0 && evalJD.length < 50 && (
                <span style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--fg-muted)' }}>{50 - evalJD.length} more chars needed</span>
              )}
            </div>
            {evalError && <p style={{ margin: 0, font: '400 12px/1 var(--font-sans)', color: '#F87171' }}>{evalError}</p>}
            {evalResult && (
              <pre style={{ margin: 0, padding: '12px', borderRadius: 'var(--r-3)', background: 'rgba(99,153,255,0.07)', border: '1px solid rgba(99,153,255,0.2)', color: 'var(--fg-primary)', font: '400 11px/1.7 var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                {evalResult}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Follow-ups due */}
      {followUps.length > 0 && (
        <div className="pg-panel" style={{ marginBottom: '16px', borderColor: 'rgba(245,158,11,0.35)' }}>
          <div className="pg-panel-head">
            <div className="l"><h3>Follow-ups Due</h3></div>
            <span className="badge badge-review">{followUps.length}</span>
          </div>
          {followUps.map(lead => (
            <div key={lead.id} className="pg-row">
              <div className="body">
                <p className="ttl">{lead.title} <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>at {lead.company}</span></p>
                <div className="ftr">
                  <span style={{ padding: '2px 8px', borderRadius: 'var(--r-pill)', background: `${urgencyColor(lead.followUp.urgency)}20`, color: urgencyColor(lead.followUp.urgency), font: '600 10px/1.4 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {lead.followUp.urgency}
                  </span>
                </div>
              </div>
              <button
                onClick={() => markFollowUpSent(lead.id)}
                className="btn-ghost"
                style={{ fontSize: '11px', padding: '5px 10px', color: '#FBBF24', borderColor: 'rgba(245,158,11,0.3)' }}
              >
                Mark sent
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {PIPELINE_TABS.map(tab => {
          const count = tab === 'All' ? total : (pipeline[tab] ?? 0)
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--r-pill)',
                background: active ? 'var(--c-blue-2)' : 'var(--bg-surface)',
                color: active ? '#fff' : 'var(--fg-muted)',
                border: active ? 'none' : '1px solid var(--border-default)',
                font: '600 11px/1 var(--font-sans)', cursor: 'pointer',
              }}
            >
              {tab}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* Error / Loading */}
      {error && (
        <div className="approval-strip" style={{ marginBottom: '16px', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}>
          <div className="ic" style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>✕</div>
          <div className="body"><p className="ttl">{error}</p></div>
          <button onClick={load} className="btn-ghost" style={{ fontSize: '11px' }}>Retry</button>
        </div>
      )}

      {loading && (
        <div className="pg-panel">
          {[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: '72px', margin: '8px', borderRadius: 'var(--r-3)' }} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="pg-panel">
          <div className="empty-state">
            <div className="icon">📭</div>
            <p className="msg">{activeTab === 'All' ? 'No job leads yet' : `No leads in ${activeTab}`}</p>
            <p className="hint">{activeTab === 'All' ? 'Use "Evaluate Job" above to add your first scored lead.' : 'Switch tabs or add leads via evaluation.'}</p>
          </div>
        </div>
      )}

      {/* Lead cards */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(lead => {
            const expanded = expandedId === lead.id
            const score = lead.matchScore
            const hasSponsor = lead.sponsorshipRequired
            const hasClearance = lead.clearanceRequired

            return (
              <div
                key={lead.id}
                style={{ background: 'var(--bg-surface)', border: `1px solid ${score >= 60 ? 'rgba(99,153,255,0.25)' : 'var(--border-default)'}`, borderRadius: 'var(--r-5)', overflow: 'hidden' }}
              >
                {/* Card header */}
                <div
                  style={{ padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => setExpandedId(expanded ? null : lead.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-primary)' }}>
                          {lead.title}
                        </h3>
                        {score > 0 && (
                          <span className="tag-chip" style={{ background: scoreBg(score), color: scoreColor(score), borderColor: `${scoreColor(score)}30` }}>
                            {score}/100 · {scoreLabel(score)}
                          </span>
                        )}
                        {hasSponsor && <span className="tag-chip" style={{ color: '#F87171', borderColor: 'rgba(239,68,68,0.3)' }}>Sponsorship req.</span>}
                        {hasClearance && <span className="tag-chip" style={{ color: '#F87171', borderColor: 'rgba(239,68,68,0.3)' }}>Clearance req.</span>}
                      </div>

                      {/* Company + meta */}
                      <p style={{ margin: '0 0 6px', font: '400 12px/1 var(--font-sans)', color: 'var(--fg-secondary)' }}>
                        {lead.company}
                        {lead.location && <span style={{ color: 'var(--fg-muted)' }}> · {lead.location}</span>}
                      </p>

                      {/* Status + dates */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <StatusBadge status={lead.status} />
                        {lead.appliedAt && <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--fg-muted)' }}>Applied {formatDate(lead.appliedAt)}</span>}
                        {lead.interviewDate && <span style={{ font: '500 11px/1 var(--font-mono)', color: '#10b981' }}>Interview {formatDate(lead.interviewDate)}</span>}
                        {lead.followUpDate && <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--fg-muted)' }}>Follow-up {formatDate(lead.followUpDate)}</span>}
                        <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--fg-faint)' }}>Added {relativeDate(lead.createdAt)}</span>
                      </div>

                      {/* Next action */}
                      {lead.nextAction && (
                        <p style={{ margin: '6px 0 0', font: '400 12px/1 var(--font-sans)', color: 'var(--c-blue-2)' }}>
                          → {lead.nextAction}
                        </p>
                      )}
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                      {lead.recommendation && (
                        <span style={{ font: '400 11px/1.3 var(--font-sans)', color: 'var(--fg-muted)', textAlign: 'right', maxWidth: '120px' }}>
                          {lead.recommendation}
                        </span>
                      )}
                      {lead.jobUrl && (
                        <a
                          href={lead.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--c-blue-2)', textDecoration: 'none' }}
                        >
                          View posting →
                        </a>
                      )}
                      <span style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--fg-faint)' }}>
                        {expanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div
                    style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px' }}
                  >
                    {/* Why it matches */}
                    {lead.matchReason && (
                      <Detail label="Why it matches" value={lead.matchReason} />
                    )}

                    {/* Gaps */}
                    {lead.missingSkills && (
                      <Detail label="Gaps" value={lead.missingSkills} accent="#f59e0b" />
                    )}

                    {/* Resume angle */}
                    {lead.resumeAngle && (
                      <Detail label="Resume angle" value={lead.resumeAngle} accent="#6366f1" />
                    )}

                    {/* Keywords */}
                    {lead.resumeKeywords && (
                      <div>
                        <p style={{ margin: '0 0 6px', font: '600 10px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>ATS keywords</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {lead.resumeKeywords.split(',').map(kw => kw.trim()).filter(Boolean).map(kw => (
                            <span key={kw} className="tag-chip" style={{ color: 'var(--c-blue-2)', borderColor: 'rgba(99,153,255,0.25)' }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work auth */}
                    {lead.workAuthNotes && (
                      <Detail label="Work auth" value={lead.workAuthNotes} accent={hasSponsor ? '#ef4444' : undefined} />
                    )}

                    {/* Notes */}
                    {lead.notes && <Detail label="Notes" value={lead.notes} />}

                    {/* Interview prep preview */}
                    {lead.interviewPrep && (
                      <div>
                        <p style={{ margin: '0 0 3px', font: '600 10px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#4ADE80' }}>Interview prep</p>
                        <p style={{ margin: 0, font: '400 12px/1.6 var(--font-sans)', color: 'var(--fg-secondary)' }}>
                          {lead.interviewPrep.slice(0, 300)}{lead.interviewPrep.length > 300 ? '...' : ''}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <StatusSelect currentStatus={lead.status} onChange={s => updateStatus(lead.id, s)} />
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="btn-ghost"
                        style={{ fontSize: '11px', color: '#F87171', borderColor: 'rgba(239,68,68,0.3)', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                      {lead.source && (
                        <span style={{ marginLeft: 'auto', font: '400 11px/1 var(--font-mono)', color: 'var(--fg-faint)' }}>
                          via {lead.source}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p style={{ textAlign: 'center', marginTop: '20px', font: '400 11px/1 var(--font-mono)', color: 'var(--fg-faint)' }}>
          {filtered.length} lead{filtered.length !== 1 ? 's' : ''} · scored by Nova · evaluate new roles with the button above
        </p>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Found:      { bg: 'rgba(134,147,176,0.12)', color: '#B7C0D6' },
    Evaluated:  { bg: 'rgba(99,153,255,0.14)',  color: '#60A5FA' },
    Applying:   { bg: 'rgba(245,158,11,0.14)',  color: '#FBBF24' },
    Applied:    { bg: 'rgba(59,130,246,0.14)',  color: '#60A5FA' },
    Screening:  { bg: 'rgba(139,92,246,0.16)',  color: '#C4B5FD' },
    Interview:  { bg: 'rgba(16,185,129,0.14)',  color: '#4ADE80' },
    Offer:      { bg: 'rgba(16,185,129,0.2)',   color: '#4ADE80' },
    Accepted:   { bg: 'rgba(16,185,129,0.2)',   color: '#4ADE80' },
    Rejected:   { bg: 'rgba(239,68,68,0.14)',   color: '#F87171' },
    Skipped:    { bg: 'rgba(134,147,176,0.1)',  color: '#8693B0' },
  }
  const c = colors[status] ?? { bg: 'rgba(134,147,176,0.1)', color: '#8693B0' }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 'var(--r-pill)', background: c.bg, color: c.color, font: '600 10px/1.4 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {status}
    </span>
  )
}

function Detail({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 3px', font: '600 10px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{label}</p>
      <p style={{ margin: 0, font: '400 12px/1.6 var(--font-sans)', color: accent ?? 'var(--fg-secondary)' }}>
        {value}
      </p>
    </div>
  )
}

const STATUSES = ['Found', 'Evaluated', 'Applying', 'Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Skipped']

function StatusSelect({ currentStatus, onChange }: { currentStatus: string; onChange: (s: string) => void }) {
  return (
    <select
      value={currentStatus}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '5px 10px', borderRadius: 'var(--r-3)',
        background: 'var(--bg-surface-2)', color: 'var(--fg-primary)',
        border: '1px solid var(--border-default)', font: '500 11px/1 var(--font-sans)', cursor: 'pointer',
      }}
    >
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}
