import React from 'react';
import { Mic, Trash2, CheckCircle2, Clock } from 'lucide-react';
import type { Meeting, Project } from '../../types';
import { initials } from '../../utils/avatar';
import { fmtDate } from '../../utils/dates';

interface MeetingCardProps {
  meeting: Meeting;
  project?: Project;
  isSelected?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  index: number;
}

function hueFor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const h = hueFor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `oklch(0.88 0.06 ${h})`, color: `oklch(0.3 0.1 ${h})`,
      display: 'grid', placeItems: 'center',
      font: `500 ${Math.round(size * 0.38)}px/1 var(--font-ui)`,
      letterSpacing: 0.5,
    }}>
      {initials(name)}
    </div>
  );
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, project, isSelected, onClick, onDelete }) => {
  const openCount = meeting.commitments.filter(c => !c.done).length;
  const openTasks = (meeting.tasks || []).filter(t => !t.done).length;
  const totalOpen = openCount + openTasks;
  const borderColor = project?.color || 'var(--ink-3)';

  return (
    <article
      onClick={onClick}
      style={{
        background: 'var(--paper-2)',
        border: `1px solid ${isSelected ? 'color-mix(in oklch, var(--accent) 35%, transparent)' : 'var(--line)'}`,
        borderLeft: `3px solid ${isSelected ? 'var(--accent)' : borderColor}`,
        borderRadius: 'var(--r-md)',
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'transform .12s, border-color .15s, box-shadow .15s',
        boxShadow: isSelected ? '0 0 0 3px var(--accent-ring)' : 'none',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.transform = 'none';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar name={meeting.person} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '500 14px/1.2 var(--font-ui)', color: 'var(--ink)' }}>{meeting.person}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {project && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: project.color, display: 'inline-block' }} />
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>
              {project?.name && `${project.name} · `}{meeting.type} · {fmtDate(meeting.createdAt)}
            </span>
          </div>
        </div>
        {meeting.isVoice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Mic size={11} /> Voice
          </div>
        )}
      </header>

      {/* Summary — Fraunces display type */}
      <p style={{
        margin: 0,
        fontFamily: 'var(--font-display)', fontWeight: 300,
        fontSize: 15.5, lineHeight: 1.55,
        color: 'var(--ink-2)',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        letterSpacing: '-0.05px',
      }}>
        {meeting.summary}
      </p>

      {/* Footer */}
      <footer style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        {meeting.decisions.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12 }}>
            <CheckCircle2 size={13} style={{ color: 'var(--accent)' }} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{meeting.decisions.length}</span>
            <span style={{ color: 'var(--ink-4)' }}>{meeting.decisions.length === 1 ? 'decision' : 'decisions'}</span>
          </span>
        )}
        {totalOpen > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12 }}>
            <Clock size={13} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalOpen}</span>
            <span style={{ color: 'var(--ink-4)' }}>open</span>
          </span>
        )}
        {totalOpen === 0 && meeting.decisions.length === 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ok-ink)', fontSize: 12 }}>
            <CheckCircle2 size={13} /> All done
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button
          onClick={onDelete}
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center', transition: 'color .15s, background .15s, border-color .15s' }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.color = 'var(--late-ink)'; el.style.background = 'var(--late-bg)'; el.style.borderColor = 'color-mix(in oklch, var(--late-ink) 30%, transparent)'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.color = 'var(--ink-4)'; el.style.background = 'transparent'; el.style.borderColor = 'transparent'; }}
        >
          <Trash2 size={13} />
        </button>
      </footer>
    </article>
  );
};
