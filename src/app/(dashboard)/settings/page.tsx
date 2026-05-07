'use client'

import { useState, useEffect } from 'react'

interface UsageLog {
  id: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  action: string | null
  createdAt: string
}

interface UsageData {
  logs: UsageLog[]
  totalCost: number
  byProvider: Record<string, { calls: number; cost: number }>
}

export default function SettingsPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [deletingMemory, setDeletingMemory] = useState(false)

  useEffect(() => {
    fetch('/api/settings/usage').then(r => r.json()).then(setUsage)
  }, [])

  const deleteMemory = async () => {
    if (!confirm('Delete all AI memory? This cannot be undone.')) return
    setDeletingMemory(true)
    await fetch('/api/settings/memory', { method: 'DELETE' })
    setDeletingMemory(false)
    alert('Memory cleared.')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>⚙️ Settings</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Configure API keys, view usage, and manage your data.</p>

      {/* API Keys */}
      <div className="mb-6 p-5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>🔑 API Keys</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          API keys are stored in your <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--background)' }}>.env.local</code> file.
          Never share this file or commit it to version control.
        </p>
        {[
          { name: 'OPENAI_API_KEY', label: 'OpenAI', description: 'Used for chat, email drafting, daily briefing' },
          { name: 'GEMINI_API_KEY', label: 'Google Gemini', description: 'Used for email summaries, task extraction' },
          { name: 'ANTHROPIC_API_KEY', label: 'Claude (Anthropic)', description: 'Used for code help, careful reasoning' },
          { name: 'GOOGLE_CLIENT_ID', label: 'Google OAuth Client ID', description: 'Required for Gmail & Calendar access' },
          { name: 'GOOGLE_CLIENT_SECRET', label: 'Google OAuth Client Secret', description: 'Required for Gmail & Calendar access' },
          { name: 'ENCRYPTION_KEY', label: 'Encryption Key', description: 'Used to encrypt OAuth tokens in database' },
        ].map(key => (
          <div key={key.name} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex-1">
              <code className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{key.name}</code>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{key.label} — {key.description}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded mt-0.5" style={{ background: 'var(--background)', color: 'var(--muted)' }}>
              .env.local
            </span>
          </div>
        ))}
      </div>

      {/* AI Usage */}
      {usage && (
        <div className="mb-6 p-5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>📊 AI Usage</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {Object.entries(usage.byProvider).map(([provider, data]) => (
              <div key={provider} className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                <p className="text-xs font-semibold capitalize mb-1" style={{ color: 'var(--foreground)' }}>{provider}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{data.calls}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>calls · ${data.cost.toFixed(4)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Total estimated cost: <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>${usage.totalCost.toFixed(4)}</span>
          </p>
        </div>
      )}

      {/* Privacy */}
      <div className="p-5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>🔒 Privacy & Data</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Delete AI Memory</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Removes all stored AI context and memory entries</p>
            </div>
            <button
              onClick={deleteMemory}
              disabled={deletingMemory}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
            >
              {deletingMemory ? 'Deleting...' : 'Delete Memory'}
            </button>
          </div>
          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              ✅ All data is stored locally (SQLite). Gmail tokens are encrypted at rest. AI never sends emails or creates events without your approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
