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
    <div className="pg-wrap">
      {/* Page topbar */}
      <div className="pg-topbar">
        <div className="pg-topbar-l">
          <h1>✉️ Email</h1>
          <p style={{ margin: 0, font: '400 12px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>Inbox across all connected accounts</p>
        </div>
        {selectedAccountInfo && (
          <div className="pg-topbar-r">
            <button
              onClick={summarize}
              disabled={summarizing}
              className="btn-primary"
              style={{ opacity: summarizing ? 0.6 : 1, cursor: summarizing ? 'not-allowed' : 'pointer' }}
            >
              {summarizing ? '⟳ Analyzing...' : '⚡ AI Summarize'}
            </button>
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="pg-panel">
          <div className="empty-state">
            <div className="icon">📭</div>
            <p className="msg">No Gmail accounts connected.</p>
            <p className="hint"><a href="/accounts">Connect an account →</a></p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Account sidebar */}
          <div style={{ width: '200px', flexShrink: 0 }}>
            <div className="pg-panel">
              <div className="pg-panel-head">
                <div className="l"><h3>Accounts</h3></div>
                <span className="count">{accounts.length}</span>
              </div>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                    borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                    background: selectedAccount === acc.id ? 'rgba(99,153,255,0.08)' : 'transparent',
                    borderLeft: selectedAccount === acc.id ? '2px solid var(--c-blue-2)' : '2px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <p style={{ margin: '0 0 2px', font: '600 12px/1 var(--font-sans)', color: selectedAccount === acc.id ? 'var(--c-blue-2)' : 'var(--fg-primary)' }}>
                    {acc.accountLabel}
                  </p>
                  <p style={{ margin: 0, font: '400 11px/1 var(--font-mono)', color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.emailAddress}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* AI Summary */}
            {summary && (
              <div className="pg-panel" style={{ marginBottom: '16px', borderColor: 'rgba(99,153,255,0.25)' }}>
                <div className="pg-panel-head">
                  <div className="l"><h3>⚡ AI Summary</h3></div>
                  <span className="badge badge-online">live</span>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  <p style={{ margin: '0 0 12px', font: '400 13px/1.6 var(--font-sans)', color: 'var(--fg-primary)' }}>{summary.summary}</p>
                  {summary.urgentEmails.length > 0 && (
                    <>
                      <p style={{ margin: '0 0 6px', font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>URGENT</p>
                      {summary.urgentEmails.map((e, i) => (
                        <div key={i} className="pg-row" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '8px 0' }}>
                          <span className="badge badge-error" style={{ flexShrink: 0 }}>urgent</span>
                          <div className="body" style={{ flex: 1, marginLeft: '10px' }}>
                            <p className="ttl">{e.from}</p>
                            <p className="sub">{e.reason}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Email list */}
            <div className="pg-panel">
              <div className="pg-panel-head">
                <div className="l">
                  <h3>{selectedAccountInfo?.accountLabel ?? 'Inbox'}</h3>
                  {!loadingEmails && <span className="count">{emails.length}</span>}
                </div>
              </div>

              {loadingEmails ? (
                <div style={{ padding: '20px 18px' }}>
                  {[1,2,3].map(i => (
                    <div key={i} className="skel" style={{ height: '56px', marginBottom: '8px', borderRadius: 'var(--r-3)' }} />
                  ))}
                </div>
              ) : emails.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📭</div>
                  <p className="msg">No cached emails yet.</p>
                  <p className="hint">Click "AI Summarize" above to fetch and analyze this inbox.</p>
                </div>
              ) : (
                emails.map(email => (
                  <div key={email.id} className="pg-row" style={{ borderLeft: email.isUnread ? '3px solid var(--c-blue-2)' : '3px solid transparent' }}>
                    <div className="ic" style={{ background: email.isUnread ? 'rgba(99,153,255,0.12)' : 'var(--bg-surface-2)', color: email.isUnread ? 'var(--c-blue-2)' : 'var(--fg-muted)', fontSize: '14px' }}>
                      ✉️
                    </div>
                    <div className="body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p className="ttl" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.from}</p>
                        {email.isImportant && <span style={{ fontSize: '12px' }}>⭐</span>}
                        {email.needsReply && <span className="badge badge-review">reply needed</span>}
                      </div>
                      <p className="sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: email.isUnread ? 'var(--fg-primary)' : 'var(--fg-secondary)' }}>
                        {email.subject ?? '(no subject)'}
                      </p>
                      {email.snippet && (
                        <p style={{ margin: '2px 0 0', font: '400 11px/1.4 var(--font-sans)', color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {email.snippet}
                        </p>
                      )}
                    </div>
                    <span className="ts">{formatRelativeTime(email.receivedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
