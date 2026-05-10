'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your Command Centre AI. I can help you summarize emails, plan your day, draft replies, and manage tasks. What would you like to do?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(scrollToBottom, [messages])

  const send = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, conversationId }),
      })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setConversationId(data.conversationId)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${e instanceof Error ? e.message : 'Unknown error'}. Please check your API key configuration in Settings.`
      }])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    'Summarize my emails today',
    'What are my top priorities?',
    'What\'s on my calendar today?',
    'Help me draft a professional reply',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '780px', margin: '0 auto', padding: '20px' }}>
      {/* Topbar */}
      <div className="pg-topbar" style={{ flexShrink: 0, marginBottom: '16px' }}>
        <div className="pg-topbar-l">
          <h1>🤖 AI Assistant</h1>
          <p style={{ margin: 0, font: '400 12px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>Actions require your approval before execution.</p>
        </div>
        <div className="pg-topbar-r">
          <span className="badge badge-online">online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', minHeight: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-5)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px',
              background: msg.role === 'user' ? 'var(--c-blue)' : 'var(--bg-surface-2)',
              color: 'var(--fg-primary)',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              font: '400 13px/1.65 var(--font-sans)',
              whiteSpace: 'pre-wrap',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-surface-2)', borderRadius: '14px 14px 14px 4px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ font: '400 13px/1 var(--font-mono)', color: 'var(--fg-muted)' }}>thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
        {quickPrompts.map(p => (
          <button
            key={p}
            onClick={() => { setInput(p); }}
            className="btn-ghost"
            style={{ fontSize: '11px', padding: '5px 10px' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about your emails, tasks, or calendar..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--r-3)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', font: '400 13px/1 var(--font-sans)', outline: 'none' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="btn-primary"
          style={{ opacity: (loading || !input.trim()) ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
