'use client'

import { useState, useEffect } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    fetch('/api/notes').then(r => r.json()).then(setNotes)
  }, [])

  const newNote = () => {
    setSelected(null)
    setTitle('')
    setContent('')
    setIsNew(true)
  }

  const selectNote = (note: Note) => {
    setSelected(note)
    setTitle(note.title)
    setContent(note.content)
    setIsNew(false)
  }

  const save = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)

    if (isNew) {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setSelected(note)
      setIsNew(false)
    } else if (selected) {
      await fetch(`/api/notes/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      setNotes(prev => prev.map(n => n.id === selected.id ? { ...n, title, content } : n))
    }
    setSaving(false)
  }

  const extractTasks = async () => {
    if (!selected) return
    const res = await fetch('/api/notes/extract-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId: selected.id }),
    })
    const data = await res.json()
    if (data.tasks?.length > 0) {
      alert(`✅ Extracted ${data.tasks.length} tasks! Check the Tasks page.`)
    } else {
      alert('No actionable tasks found in this note.')
    }
  }

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selected?.id === id) { setSelected(null); setTitle(''); setContent('') }
  }

  return (
    <div className="flex h-full p-6 gap-4 max-w-5xl mx-auto">
      {/* Note list */}
      <div className="w-56 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>📝 Notes</h1>
          <button
            onClick={newNote}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            +
          </button>
        </div>
        <div className="space-y-1">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => selectNote(note)}
              className="p-3 rounded-lg cursor-pointer transition-all group relative"
              style={{
                background: selected?.id === note.id ? 'rgba(99,102,241,0.1)' : 'var(--card)',
                border: `1px solid ${selected?.id === note.id ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
              }}
            >
              <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{note.title}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>{note.content.slice(0, 60)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{formatRelativeTime(note.updatedAt)}</p>
              <button
                onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                className="absolute top-2 right-2 w-5 h-5 rounded opacity-0 group-hover:opacity-100 text-xs flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {isNew || selected ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Note title..."
                className="flex-1 text-sm font-semibold outline-none bg-transparent"
                style={{ color: 'var(--foreground)' }}
              />
              {selected && (
                <button
                  onClick={extractTasks}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }}
                >
                  ✅ Extract Tasks
                </button>
              )}
              <button
                onClick={save}
                disabled={saving || !title.trim() || !content.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing..."
              className="flex-1 p-4 text-sm outline-none resize-none bg-transparent"
              style={{ color: 'var(--foreground)', lineHeight: '1.7' }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Select a note or create a new one</p>
              <button
                onClick={newNote}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                + New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
