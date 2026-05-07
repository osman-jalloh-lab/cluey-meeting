'use client'

import { useState, useEffect } from 'react'
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
  'HR': '👥',
  'I-9': '📋',
  'E-Verify': '✅',
  'Workday': '💼',
  'Immigration': '🛂',
  'Compliance': '⚖️',
  'Onboarding': '🆕',
  'Name Change': '📝',
  'Payroll': '💰',
  'Interview': '🎯',
  'Job Offer': '🎉',
  'Recruiter': '📨',
  'Application Update': '📊',
  'Professor': '🎓',
  'Assignment': '📚',
  'Exam': '📝',
  'Academic Warning': '⚠️',
  'Internship': '🏢',
  'Follow-Up': '🔔',
}

function AlertCard({ alert, inboxType }: {
  alert: { category: string; from: string; subject: string; summary: string; suggestedAction: string; priority: string }
  inboxType: string
}) {
  const icon = categoryIcons[alert.category] ?? (inboxType === 'work' ? '🏛' : '📧')
  return (
    <div
      className="rounded-lg p-3 mb-2"
      style={{
        background: 'var(--card)',
        border: `1px solid ${alert.priority === 'high' ? '#ef4444' : 'var(--border)'}`,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: alert.priority === 'high' ? '#ef444420' : '#f59e0b20', color: priorityColors[alert.priority] ?? '#6b7280' }}
            >
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

function Section({ title, icon, children, badge }: {
  title: string
  icon: string
  children: React.ReactNode
  badge?: number
}) {
  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{title}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#ef444420', color: '#ef4444' }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export default function TodayClient({ initialBriefing, pendingTaskCount, recentAlerts }: TodayClientProps) {
  const [briefing, setBriefing] = useState<DailyBriefingResult | null>(initialBriefing)
  const [loading, setLoading] = useState(false)
  const [autoLoaded, setAutoLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monitoring, setMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState<{ alerts: number; checkedAt: string } | null>(null)

  // Auto-load briefing when Today tab opens — once per page load
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
      const data = await res.json()
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
    } catch {
      // silent
    } finally {
      setMonitoring(false)
    }
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const totalUrgent = briefing
    ? (briefing.workEmailSection.accounts.reduce((a, acc) => a + acc.urgentCount, 0) +
       briefing.studentJobSection.accounts.reduce((a, acc) => a + acc.urgentCount, 0))
    : 0

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
              {briefing?.greeting ?? `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, Osman`}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{dateStr}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runMonitor}
              disabled={monitoring}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: monitoring ? 'var(--border)' : '#6366f120', color: '#6366f1', border: '1px solid #6366f140' }}
            >
              {monitoring ? 'Scanning...' : 'Check Now'}
            </button>
            <button
              onClick={runBriefing}
              disabled={loading}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: loading ? 'var(--border)' : '#6366f1', color: 'white' }}
            >
              {loading ? 'Loading...' : briefing ? 'Refresh' : 'Load Briefing'}
            </button>
          </div>
        </div>

        {monitorResult && (
          <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: '#6366f110', border: '1px solid #6366f140', color: 'var(--foreground)' }}>
            Inbox scan complete. {monitorResult.alerts} new alert{monitorResult.alerts !== 1 ? 's' : ''} detected.
          </div>
        )}

        {error && (
          <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: '#ef444410', border: '1px solid #ef444440', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Overview */}
        {briefing?.overview && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #6366f115, #8b5cf615)', border: '1px solid #6366f130' }}>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{briefing.overview}</p>
          </div>
        )}

        {/* Top Priorities */}
        {briefing?.topPriorities && briefing.topPriorities.length > 0 && (
          <Section title="Top Priorities" icon="🎯" badge={briefing.topPriorities.length}>
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

        {/* Work Email Updates */}
        <Section
          title="Work Email Updates (ACC)"
          icon="🏛"
          badge={briefing?.workEmailSection.accounts.reduce((a, acc) => a + acc.alerts.filter(al => al.priority === 'high').length, 0)}
        >
          {!briefing?.workEmailSection.hasContent ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No ACC work email connected. Connect your @austincc.edu account in Accounts.
            </p>
          ) : (
            <>
              {briefing.workEmailSection.accounts.map(acc => (
                <div key={acc.accountEmail} className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                      {acc.accountLabel}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {acc.unreadCount} unread, {acc.urgentCount} urgent
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{acc.summary}</p>
                  {acc.alerts.length > 0 ? (
                    acc.alerts.map((alert, i) => (
                      <AlertCard key={i} alert={alert} inboxType="work" />
                    ))
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>No flagged emails in this account.</p>
                  )}
                </div>
              ))}
            </>
          )}
          {!briefing && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{loading ? 'Loading your briefing...' : 'No ACC work email connected. Connect your @austincc.edu account in Accounts.'}</p>
          )}
        </Section>

        {/* Student / Job Email Updates */}
        <Section
          title="Student / Job Email Updates"
          icon="📚"
          badge={briefing?.studentJobSection.accounts.reduce((a, acc) => a + acc.alerts.filter(al => al.priority === 'high').length, 0)}
        >
          {!briefing?.studentJobSection.hasContent ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No personal/student email connected. Connect your Gmail account in Accounts.
            </p>
          ) : (
            <>
              {briefing.studentJobSection.accounts.map(acc => (
                <div key={acc.accountEmail} className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                      {acc.accountLabel}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {acc.unreadCount} unread, {acc.urgentCount} urgent
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{acc.summary}</p>
                  {acc.alerts.length > 0 ? (
                    acc.alerts.map((alert, i) => (
                      <AlertCard key={i} alert={alert} inboxType="student_job" />
                    ))
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>No flagged emails in this account.</p>
                  )}
                </div>
              ))}
            </>
          )}
          {!briefing && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{loading ? 'Loading your briefing...' : 'No personal/student email connected. Connect your Gmail account in Accounts.'}</p>
          )}
        </Section>

        {/* Urgent Follow-Ups */}
        {briefing && briefing.urgentFollowUps.length > 0 && (
          <Section title="Urgent Follow-Ups" icon="⚡" badge={briefing.urgentFollowUps.filter(u => u.priority === 'high').length}>
            {briefing.urgentFollowUps.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2"
                style={{ borderBottom: i < briefing.urgentFollowUps.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded mt-0.5"
                  style={{ background: priorityColors[item.priority] + '20', color: priorityColors[item.priority] ?? '#6b7280' }}
                >
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

        {/* Calendar */}
        <Section title="Today's Calendar" icon="📅">
          {!briefing?.todayEvents || briefing.todayEvents.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {briefing ? 'No events today.' : 'Run Morning Briefing to see calendar.'}
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

        {/* Pending Tasks */}
        <Section title="Pending Tasks" icon="✅" badge={pendingTaskCount}>
          <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>
            {briefing?.taskSummary ?? `${pendingTaskCount} open tasks`}
          </p>
          <a href="/tasks" className="text-xs font-medium" style={{ color: '#6366f1' }}>
            View all tasks
          </a>
        </Section>

        {/* Suggested Next Actions */}
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

        {/* Recent Agent Alerts */}
        {recentAlerts.length > 0 && (
          <Section title="Recent Alerts from Inbox Specialist" icon="🔔">
            <div className="space-y-2">
              {recentAlerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg text-sm"
                  style={{ background: '#ef444408', border: '1px solid #ef444420' }}
                >
                  <p style={{ color: 'var(--foreground)' }}>{alert.message}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Hosting Help Banner */}
        <div className="rounded-xl p-4 mt-2" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>Access this from your phone</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Run <code className="px-1 rounded text-xs" style={{ background: 'var(--border)' }}>npx ngrok http 3000</code> in your terminal to get a public URL you can open on any device.
            For permanent hosting, deploy to Vercel and switch DATABASE_URL to Turso (cloud libSQL, compatible with your current setup).
          </p>
        </div>
      </div>
    </div>
  )
}
