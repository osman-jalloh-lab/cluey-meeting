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
    <div className="flex flex-col h-full max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-1 flex-shrink-0" style={{ color: 'var(--foreground)' }}>🤖 AI Assistant</h1>
      <p className="text-sm mb-4 flex-shrink-0" style={{ color: 'var(--muted)' }}>Powered by OpenAI. Actions require your approval before execution.</p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 mb-4 min-h-0 rounded-xl p-4"
           style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[80%] px-4 py-3 rounded-xl text-sm"
              style={{
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--card-hover)',
                color: 'var(--foreground)',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--card-hover)' }}>
              <span className="animate-pulse" style={{ color: 'var(--muted)' }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 mb-3 flex-wrap flex-shrink-0">
        {quickPrompts.map(p => (
          <button
            key={p}
            onClick={() => { setInput(p); }}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3 flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about your emails, tasks, or calendar..."
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
