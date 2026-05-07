'use client'

import { useState, useEffect } from 'react'
import { getAccountColor } from '@/lib/utils'

interface Account {
  id: string
  emailAddress: string
  accountLabel: string
  isActive: boolean
  createdAt: string
  tokenExpiresAt?: string | null
  scopes?: string | null
  gmailConnected: boolean
  calendarConnected: boolean
  needsReconnect: boolean
  isMcp: boolean
}

function ScopeBadge({ granted, label }: { granted: boolean; label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: granted ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
        color: granted ? '#10b981' : '#ef4444',
        border: `1px solid ${granted ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`,
      }}
    >
      {granted ? '✓' : '✕'} {label}
    </span>
  )
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null) // accountId or 'new'
  const [newLabel, setNewLabel] = useState('Personal')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'connected') setSuccess('Account connected. You now have Gmail + Calendar access.')
    if (params.get('success') === 'reconnected') setSuccess('Account reconnected. Calendar access has been granted.')
    if (params.get('error')) setError(`Connection failed: ${params.get('error')}`)
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts')
      const data = await res.json()
      setAccounts(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const connectAccount = async () => {
    setConnecting('new')
    setError(null)
    try {
      const res = await fetch('/api/accounts/connect/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountLabel: newLabel }),
      })
      const data = await res.json()
      if (data.authUrl) window.location.href = data.authUrl
      else throw new Error(data.error ?? 'Failed to get auth URL')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
      setConnecting(null)
    }
  }

  const reconnectAccount = async (account: Account) => {
    setConnecting(account.id)
    setError(null)
    try {
      const res = await fetch('/api/accounts/connect/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountLabel: account.accountLabel,
          reconnectAccountId: account.id,
        }),
      })
      const data = await res.json()
      if (data.authUrl) window.location.href = data.authUrl
      else throw new Error(data.error ?? 'Failed to get auth URL')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reconnect failed')
      setConnecting(null)
    }
  }

  const toggleAccount = async (id: string, isActive: boolean) => {
    await fetch(`/api/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, isActive: !isActive } : a))
  }

  const disconnectAccount = async (id: string) => {
    if (!confirm('Disconnect this account? This will remove all cached emails for this account.')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>🔗 Connected Accounts</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Connect your Gmail accounts. Each account needs Calendar access for the Today tab and briefings.
      </p>

      {success && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          ❌ {error}
        </div>
      )}

      {/* Connect new account */}
      <div className="mb-6 p-5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Add Google Account</h2>
        <div className="flex gap-3">
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Personal, Work, Student)"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
          <button
            onClick={connectAccount}
            disabled={connecting === 'new' || !newLabel.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: connecting === 'new' ? 'not-allowed' : 'pointer' }}
          >
            {connecting === 'new' ? 'Opening...' : '+ Connect Account'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
          Grants Gmail + Calendar access. Tokens are encrypted at rest.
        </p>
      </div>

      {/* Accounts list */}
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading accounts...</p>
      ) : accounts.length === 0 ? (
        <div className="text-center p-8 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No accounts connected yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account, i) => (
            <div
              key={account.id}
              className="p-4 rounded-xl"
              style={{
                background: 'var(--card)',
                border: account.needsReconnect
                  ? '1px solid rgba(245,158,11,0.5)'
                  : '1px solid var(--border)',
                opacity: account.isActive ? 1 : 0.6,
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${getAccountColor(i)}`}>
                  {account.accountLabel[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{account.accountLabel}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{account.emailAddress}</p>

                  {/* Scope badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {account.isMcp ? (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }}>
                        MCP
                      </span>
                    ) : (
                      <>
                        <ScopeBadge granted={account.gmailConnected} label="Gmail" />
                        <ScopeBadge granted={account.calendarConnected} label="Calendar" />
                      </>
                    )}
                  </div>

                  {/* Reconnect warning */}
                  {account.needsReconnect && (
                    <p className="text-xs mt-1.5" style={{ color: '#f59e0b' }}>
                      Reconnect this account to enable Calendar access.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {account.needsReconnect && (
                    <button
                      onClick={() => reconnectAccount(account)}
                      disabled={connecting === account.id}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', cursor: connecting === account.id ? 'not-allowed' : 'pointer' }}
                    >
                      {connecting === account.id ? 'Opening...' : 'Reconnect'}
                    </button>
                  )}
                  {!account.needsReconnect && !account.isMcp && account.calendarConnected && (
                    <button
                      onClick={() => reconnectAccount(account)}
                      disabled={connecting === account.id}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
                      title="Reconnect to refresh tokens"
                    >
                      {connecting === account.id ? 'Opening...' : 'Refresh'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleAccount(account.id, account.isActive)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: account.isActive ? 'rgba(16,185,129,0.1)' : 'var(--background)',
                      color: account.isActive ? '#10b981' : 'var(--muted)',
                      border: `1px solid ${account.isActive ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {account.isActive ? '● Active' : '○ Disabled'}
                  </button>
                  <button
                    onClick={() => disconnectAccount(account.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help section */}
      <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>How to get Calendar access on existing accounts</h3>
        <ol className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
          <li>1. Click <strong>Reconnect</strong> on any account showing ✕ Calendar.</li>
          <li>2. Google will ask you to sign in and approve the new Calendar permissions.</li>
          <li>3. After approval, the account updates automatically — no data is lost.</li>
          <li>4. Calendar events from all reconnected accounts will appear in Today and Briefings.</li>
        </ol>
      </div>
    </div>
  )
}
