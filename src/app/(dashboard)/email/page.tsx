'use client'

import { useState, useEffect } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface Account {
  id: string
  emailAddress: string
  accountLabel: string
  isActive: boolean
}

interface Email {
  id: string
  from: string
  subject: string | null
  snippet: string | null
  receivedAt: string | null
  isUnread: boolean
  isImportant: boolean
  priority: string | null
  needsReply: boolean
}

interface AccountSummary {
  accountEmail: string
  accountLabel: string
  summary: string
  urgentEmails: Array<{ from: string; subject: string; reason: string; suggestedAction: string; priority: string }>
  emailsNeedingReply: Array<{ from: string; subject: string; emailId: string; suggestedReplyTone: string }>
  unreadCount: number
}

export default function EmailPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [summarizing, setSummarizing] = useState(false)

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then((data: Account[]) => {
      setAccounts(data.filter(a => a.isActive))
      if (data.length > 0) setSelectedAccount(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedAccount) return
    setLoadingEmails(true)
    setSummary(null)
    fetch(`/api/gmail/${selectedAccount}/messages`)
      .then(r => r.json())
      .then(data => { setEmails(data); setLoadingEmails(false) })
      .catch(() => setLoadingEmails(false))
  }, [selectedAccount])

  const summarize = async () => {
    if (!selectedAccount) return
    setSummarizing(true)
    const res = await fetch(`/api/gmail/${selectedAccount}/summarize`, { method: 'POST' })
    const data = await res.json()
    setSummary(data)
    setSummarizing(false)
    // Refresh emails list
    fetch(`/api/gmail/${selectedAccount}/messages`).then(r => r.json()).then(setEmails)
  }

  const selectedAccountInfo = accounts.find(a => a.id === selectedAccount)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>✉️ Email</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>View and summarize emails across all connected accounts.</p>

      {accounts.length === 0 ? (
        <div className="text-center p-8 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>No Gmail accounts connected.</p>
          <a href="/accounts" className="text-sm" style={{ color: 'var(--primary)' }}>Connect an account →</a>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Account tabs */}
          <div className="w-48 flex-shrink-0">
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Accounts</p>
            <div className="space-y-1">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: selectedAccount === acc.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: selectedAccount === acc.id ? 'var(--primary)' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <p className="font-medium">{acc.accountLabel}</p>
                  <p className="text-xs truncate">{acc.emailAddress}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {selectedAccountInfo && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  {selectedAccountInfo.accountLabel}
                  <span className="ml-2 font-normal" style={{ color: 'var(--muted)' }}>
                    {selectedAccountInfo.emailAddress}
                  </span>
                </h2>
                <button
                  onClick={summarize}
                  disabled={summarizing}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: summarizing ? 'not-allowed' : 'pointer' }}
                >
                  {summarizing ? '⟳ Analyzing...' : '⚡ AI Summarize'}
                </button>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-sm mb-3" style={{ color: 'var(--foreground)' }}>{summary.summary}</p>
                {summary.urgentEmails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>URGENT</p>
                    {summary.urgentEmails.map((e, i) => (
                      <div key={i} className="text-xs mb-1 p-2 rounded" style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <span style={{ color: '#ef4444' }}>🔴</span>{' '}
                        <span style={{ color: 'var(--foreground)' }}>{e.from}</span>{' '}
                        <span style={{ color: 'var(--muted)' }}>— {e.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Email list */}
            {loadingEmails ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading emails...</p>
            ) : emails.length === 0 ? (
              <div className="text-center p-8 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No cached emails. Click "AI Summarize" to fetch and analyze this inbox.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {emails.map(email => (
                  <div
                    key={email.id}
                    className="p-3 rounded-xl"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderLeft: email.isUnread ? '3px solid var(--primary)' : '1px solid var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{email.from}</p>
                      {email.isImportant && <span className="text-xs">⭐</span>}
                      {email.needsReply && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>reply needed</span>
                      )}
                      <span className="ml-auto text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                        {formatRelativeTime(email.receivedAt)}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate" style={{ color: email.isUnread ? 'var(--foreground)' : 'var(--muted)' }}>
                      {email.subject ?? '(no subject)'}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>{email.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
