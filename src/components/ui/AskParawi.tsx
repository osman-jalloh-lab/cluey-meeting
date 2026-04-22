import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import type { Meeting, Project } from '../../types';
import { fmtDate } from '../../utils/dates';

interface AskParawiProps {
  meetings: Meeting[];
  projects: Project[];
  onClose: () => void;
  onOpenMeeting: (id: string) => void;
}

function searchMeetings(q: string, meetings: Meeting[], projects: Project[]) {
  if (!q.trim()) return [];
  const lower = q.toLowerCase();
  return meetings
    .filter(m =>
      m.person.toLowerCase().includes(lower) ||
      m.summary.toLowerCase().includes(lower) ||
      m.decisions.some(d => d.toLowerCase().includes(lower)) ||
      m.actions.some(a => a.toLowerCase().includes(lower)) ||
      m.commitments.some(c => c.text.toLowerCase().includes(lower)) ||
      m.tags.some(t => t.toLowerCase().includes(lower))
    )
    .slice(0, 6);
}

export const AskParawi: React.FC<AskParawiProps> = ({ meetings, projects, onClose, onOpenMeeting }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Meeting[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    setResults(searchMeetings(query, meetings, projects));
  }, [query, meetings, projects]);

  const suggestions = ['What did Anna commit to?', 'Open action items', 'Decisions this week', 'Pricing discussions'];

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'color-mix(in oklch, var(--ink) 40%, transparent)', backdropFilter: 'blur(4px)', zIndex: 60, animation: 'overlayIn .2s' }}
      />
      <div
        role="dialog" aria-modal="true"
        style={{
          position: 'fixed', top: '18%', left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(580px, 92vw)',
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-pop)',
          zIndex: 61,
          animation: 'modalIn .25s cubic-bezier(.2,.8,.2,1)',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: query || results.length > 0 ? '1px solid var(--line)' : 'none' }}>
          <Sparkles size={16} strokeWidth={1.6} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search meetings, people, decisions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', font: '400 16px/1 var(--font-ui)', color: 'var(--ink)' }}
          />
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center' }}>
            <X size={13} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }} className="custom-scrollbar">
            {results.map(m => {
              const proj = projects.find(p => p.id === m.projId);
              return (
                <button
                  key={m.id}
                  onClick={() => { onOpenMeeting(m.id); onClose(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {proj && <span style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color, flexShrink: 0, marginTop: 7 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '500 13px/1.3 var(--font-ui)', color: 'var(--ink)', marginBottom: 4 }}>
                      {m.person}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 8 }}>
                        {proj?.name && `${proj.name} · `}{fmtDate(m.createdAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.summary}
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--ink-4)', flexShrink: 0, marginTop: 4 }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Suggestions (empty state) */}
        {!query && (
          <div style={{ padding: '16px 20px 20px' }}>
            <div className="label" style={{ marginBottom: 10 }}>Try asking</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', font: '400 13px/1 var(--font-ui)', cursor: 'pointer', textAlign: 'left', transition: 'border-color .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                >
                  <Sparkles size={13} strokeWidth={1.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {query && results.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No meetings matched "{query}"
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>ESC to close</span>
        </div>
      </div>
    </>
  );
};
