'use client'

import { useState, useEffect, useCallback } from 'react'
import { DailyBriefingResult } from '@/lib/agents/dailyBriefingAgent'

interface TodayClientProps {
  initialBriefing: DailyBriefingResult | null
  pendingTaskCount: number
  recentAlerts: Array<{ id: string; message: string; createdAt: string; messageType: string }>
}

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
}

const categoryIcons: Record<string, string> = {
  'HR': '👥', 'I-9': '📋', 'E-Verify': '✅', 'Workday': '💼',
  'Immigration': '🛂', 'Compliance': '⚖️', 'Onboarding': '🆕',
  'Name Change': '📝', 'Payroll': '💰', 'Interview': '🎯',
  'Job Offer': '🎉', 'Recruiter': '📨', 'Application Update': '📊',
  'Professor': '🎓', 'Assignment': '📚', 'Exam': '📝',
  'Academic Warning': '⚠️', 'Internship': '🏢', 'Follow-Up': '🔔',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon, children, badge, action }: {
  title: string
  icon: string
  children: React.ReactNode
  badge?: number
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{title}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#ef444420', color: '#ef4444' }}>
            {badge}
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  )
}

function AlertCard({ alert, inboxType, delay = 0 }: {
  alert: { category: string; from: string; subject: string; summary: string; suggestedAction: string; priority: string }
  inboxType: string
  delay?: number
}) {
  const icon = categoryIcons[alert.category] ?? (inboxType === 'work' ? '🏛' : '📧')
  return (
    <div className="rounded-lg p-3 mb-2"
      style={{ background: 'var(--card)', border: `1px solid ${alert.priority === 'high' ? '#ef4444' : 'var(--border)'}`, animation: 'slidein 0.22s ease-out backwards', animationDelay: `${delay}ms` }}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: alert.priority === 'high' ? '#ef444420' : '#f59e0b20', color: priorityColors[alert.priority] ?? '#6b7280' }}>
              {alert.category}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{alert.from}</span>
          </div>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{alert.subject}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{alert.summary}</p>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs font-medium" style={{ color: '#6366f1' }}>Next step:</span>
            <span className="text-xs" style={{ color: 'var(--foreground)' }}>{alert.suggestedAction}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyCard({ reply, onDraft }: {
  reply: NonNullable<DailyBriefingResult['suggestedReplies']>[number]
  onDraft: (emailId: string, tone: string) => Promise<string | null>
}) {
  const [tone, setTone] = useState(reply.suggestedTone ?? 'professional')
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleDraft() {
    setLoading(true)
    const result = await onDraft(reply.emailId, tone)
    setDraft(result)
    setLoading(false)
  }

  function copy() {
    if (draft) {
      navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="rounded-lg p-3 mb-2" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{reply.subject}</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>From {reply.from} · {reply.accountEmail}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={tone}
            onChange={e => setTone(e.target.value)}
            className="text-xs rounded px-1.5 py-1"
            style={{ background: 'var(--border)', color: 'var(--foreground)', border: 'none' }}
          >
            <option value="professional">Professional</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
          </select>
          <button
            onClick={handleDraft}
            disabled={loading}
            className="text-xs px-2 py-1 rounded font-medium"
            style={{ background: loading ? 'var(--border)' : '#6366f120', color: '#6366f1', border: '1px solid #6366f140' }}
          >
            {loading ? 'Drafting...' : draft ? 'Re-draft' : 'Draft Reply'}
          </button>
        </div>
      </div>

      {draft && (
        <div className="draft-area mt-2">
          <textarea
            readOnly
            value={draft}
            rows={5}
            className="w-full text-xs p-2 rounded resize-none"
            style={{ background: '#0f172a', color: '#cbd5e1', border: '1px solid var(--border)', fontFamily: 'inherit' }}
          />
          <div className="flex gap-2 mt-1">
            <button
              key={copied ? 'copied' : 'copy'}
              onClick={copy}
              className={`text-xs px-2 py-1 rounded font-medium${copied ? ' copy-feedback' : ''}`}
              style={{ background: copied ? '#22c55e20' : '#6366f120', color: copied ? '#22c55e' : '#6366f1', border: `1px solid ${copied ? '#22c55e40' : '#6366f140'}`, transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease' }}
            >
              {copied ? 'Copied!' : 'Copy Draft'}
            </button>
            <span className="text-xs self-center" style={{ color: 'var(--muted)' }}>
              Review before sending. Do not send automatically.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TodayClient({ initialBriefing, pendingTaskCount, recentAlerts }: TodayClientProps) {
  const [briefing, setBriefing] = useState<DailyBriefingResult | null>(initialBriefing)
  const [loading, setLoading] = useState(false)
  const [autoLoaded, setAutoLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monitoring, setMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState<{ alerts: number; checkedAt: string } | null>(null)

  // Auto-load on first visit
  useEffect(() => {
    if (initialBriefing || autoLoaded) return
    setAutoLoaded(true)
    runBriefing()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runBriefing() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/daily-briefing', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to generate briefing')
      }
      const data: DailyBriefingResult = await res.json()
      setBriefing(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function runMonitor() {
    setMonitoring(true)
    try {
      const res = await fetch('/api/ai/monitor', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setMonitorResult({ alerts: data.alerts?.length ?? 0, checkedAt: data.checkedAt })
      }
    } catch { /* silent */ } finally {
      setMonitoring(false)
    }
  }

  const generateDraft = useCallback(async (emailId: string, tone: string): Promise<string | null> => {
    if (!briefing) return null
    const reply = briefing.suggestedReplies?.find(r => r.emailId === emailId)
    if (!reply) return null

    try {
      const res = await fetch('/api/gmail/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: reply.accountId,
          originalEmail: {
            from: reply.from,
            subject: reply.subject,
            body: `Email from ${reply.from} with subject: ${reply.subject}. Please draft an appropriate reply.`,
            accountEmail: reply.accountEmail,
          },
          tone,
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.body ?? null
    } catch {
      return null
    }
  }, [briefing])

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const highUrgentCount = briefing
    ? briefing.urgentFollowUps.filter(u => u.priority === 'high').length
    : 0

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
              {briefing?.greeting ?? `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, Osman`}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{dateStr}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={runMonitor} disabled={monitoring}
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: monitoring ? 'var(--border)' : '#6366f120', color: '#6366f1', border: '1px solid #6366f140' }}>
              {monitoring ? 'Scanning...' : 'Check Now'}
            </button>
            <button onClick={runBriefing} disabled={loading}
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: loading ? 'var(--border)' : '#6366f1', color: 'white' }}>
              {loading ? 'Loading...' : briefing ? 'Refresh' : 'Load Brief'}
            </button>
          </div>
        </div>

        {monitorResult && (
          <div className="rounded-lg p-3 mb-4 text-sm"
            style={{ background: '#6366f110', border: '1px solid #6366f140', color: 'var(--foreground)' }}>
            Inbox scan complete. {monitorResult.alerts} new alert{monitorResult.alerts !== 1 ? 's' : ''} detected.
          </div>
        )}

        {error && (
          <div className="rounded-lg p-3 mb-4 text-sm"
            style={{ background: '#ef444410', border: '1px solid #ef444440', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* ── Overview ── */}
        {briefing?.overview && (
          <div className="rounded-xl p-4 mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f115, #8b5cf615)', border: '1px solid #6366f130' }}>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{briefing.overview}</p>
          </div>
        )}

        {/* ── Top Priorities ── */}
        {briefing?.topPriorities && briefing.topPriorities.length > 0 && (
          <Section title="Top Priorities Today" icon="🎯" badge={briefing.topPriorities.length}>
            <ol className="space-y-2">
              {briefing.topPriorities.map((p, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-xs font-bold mt-0.5 w-4 shrink-0" style={{ color: '#6366f1' }}>{i + 1}</span>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{p}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* ── Work Email (ACC) ── */}
        <Section
          title="Work Email Updates (ACC)"
          icon="🏛"
          badge={briefing?.workEmailSection.accounts.reduce((a, acc) => a + acc.alerts.filter(al => al.priority === 'high').length, 0)}
        >
          {!briefing?.workEmailSection.hasContent ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {loading ? 'Loading...' : 'No ACC email connected. Connect your @austincc.edu account in Accounts.'}
            </p>
          ) : (
            briefing.workEmailSection.accounts.map(acc => (
              <div key={acc.accountEmail} className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                    {acc.accountLabel}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {acc.urgentCount} urgent
                  </span>
                </div>
                <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{acc.summary}</p>
                {acc.alerts.length > 0
                  ? acc.alerts.map((alert, i) => <AlertCard key={i} alert={alert} inboxType="work" delay={i * 55} />)
                  : <p className="text-xs" style={{ color: 'var(--muted)' }}>No flagged emails.</p>
                }
              </div>
            ))
          )}
        </Section>

        {/* ── Student / Job Email ── */}
        <Section
          title="Student / Job Email Updates"
          icon="📚"
          badge={briefing?.studentJobSection.accounts.reduce((a, acc) => a + acc.alerts.filter(al => al.priority === 'high').length, 0)}
        >
          {!briefing?.studentJobSection.hasContent ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {loading ? 'Loading...' : 'No personal/student email connected. Connect your Gmail in Accounts.'}
            </p>
          ) : (
            briefing.studentJobSection.accounts.map(acc => (
              <div key={acc.accountEmail} className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                    {acc.accountLabel}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {acc.urgentCount} urgent
                  </span>
                </div>
                <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{acc.summary}</p>
                {acc.alerts.length > 0
                  ? acc.alerts.map((alert, i) => <AlertCard key={i} alert={alert} inboxType="student_job" delay={i * 55} />)
                  : <p className="text-xs" style={{ color: 'var(--muted)' }}>No flagged emails.</p>
                }
              </div>
            ))
          )}
        </Section>

        {/* ── Urgent Follow-Ups ── */}
        {briefing && briefing.urgentFollowUps.length > 0 && (
          <Section title="Urgent Follow-Ups" icon="⚡" badge={highUrgentCount}>
            {briefing.urgentFollowUps.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2"
                style={{ borderBottom: i < briefing.urgentFollowUps.length - 1 ? '1px solid var(--border)' : 'none', animation: 'slidein 0.22s ease-out backwards', animationDelay: `${i * 50}ms` }}>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded mt-0.5"
                  style={{ background: (priorityColors[item.priority] ?? '#6b7280') + '20', color: priorityColors[item.priority] ?? '#6b7280' }}>
                  {item.priority.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{item.subject}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>From {item.from} via {item.source}</p>
                  <p className="text-xs mt-1" style={{ color: '#6366f1' }}>{item.suggestedAction}</p>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* ── Suggested Replies ── */}
        {briefing?.suggestedReplies && briefing.suggestedReplies.length > 0 && (
          <Section title="Suggested Replies" icon="✉️" badge={briefing.suggestedReplies.length}>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
              Draft, review, and copy — never sent automatically.
            </p>
            {briefing.suggestedReplies.map(reply => (
              <ReplyCard key={reply.emailId} reply={reply} onDraft={generateDraft} />
            ))}
          </Section>
        )}

        {/* ── Job Update ── */}
        {briefing?.jobUpdate && (
          <Section title="Job Search Update" icon="💼">
            <div className="flex gap-4 mb-3">
              {[
                { label: 'To Review', value: briefing.jobUpdate.toReview, color: '#f59e0b' },
                { label: 'Ready to Apply', value: briefing.jobUpdate.readyToApply, color: '#22c55e' },
                { label: 'Follow-ups Due', value: briefing.jobUpdate.followUpsDue, color: '#ef4444' },
              ].map(stat => (
                <div key={stat.label} className="text-center flex-1 rounded-lg p-2"
                  style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}30` }}>
                  <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{briefing.jobUpdate.summary}</p>
            {briefing.jobUpdate.actions.length > 0 && (
              <ol className="space-y-1 mt-2">
                {briefing.jobUpdate.actions.slice(0, 3).map((action, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-xs font-bold mt-0.5 w-4 shrink-0" style={{ color: '#22c55e' }}>{i + 1}</span>
                    <span className="text-xs" style={{ color: 'var(--foreground)' }}>{action}</span>
                  </li>
                ))}
              </ol>
            )}
            <a href="/jobs" className="inline-block mt-3 text-xs font-medium" style={{ color: '#6366f1' }}>
              View job tracker →
            </a>
          </Section>
        )}

        {/* ── Calendar ── */}
        <Section title="Today's Calendar" icon="📅">
          {!briefing?.todayEvents || briefing.todayEvents.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {briefing ? 'No events today.' : 'Run briefing to see calendar.'}
            </p>
          ) : (
            <div className="space-y-2">
              {briefing.todayEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-16 shrink-0" style={{ color: '#6366f1' }}>
                    {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{event.summary}</span>
                </div>
              ))}
            </div>
          )}
          {briefing?.calendarSummary && (
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{briefing.calendarSummary}</p>
          )}
        </Section>

        {/* ── Pending Tasks ── */}
        <Section title="Pending Tasks" icon="✅" badge={pendingTaskCount}>
          <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>
            {briefing?.taskSummary ?? `${pendingTaskCount} open tasks`}
          </p>
          <a href="/tasks" className="text-xs font-medium" style={{ color: '#6366f1' }}>View all tasks →</a>
        </Section>

        {/* ── Suggested Next Actions ── */}
        {briefing && briefing.suggestedNextActions.length > 0 && (
          <Section title="Suggested Next Actions" icon="🚀">
            <ol className="space-y-2">
              {briefing.suggestedNextActions.map((action, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-xs font-bold mt-0.5 w-4 shrink-0" style={{ color: '#6366f1' }}>{i + 1}</span>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{action}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* ── Recent Agent Alerts ── */}
        {recentAlerts.length > 0 && (
          <Section title="Recent Alerts from Inbox Specialist" icon="🔔">
            <div className="space-y-2">
              {recentAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="p-3 rounded-lg text-sm"
                  style={{ background: '#ef444408', border: '1px solid #ef444420' }}>
                  <p style={{ color: 'var(--foreground)' }}>{alert.message}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Access tip ── */}
        <div className="rounded-xl p-4 mt-2" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>Access from your phone</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Run <code className="px-1 rounded text-xs" style={{ background: 'var(--border)' }}>npx ngrok http 3000</code> for a public URL.
            For permanent hosting, deploy to Vercel and switch DATABASE_URL to Turso.
          </p>
        </div>

      </div>
    </div>
  )
}
