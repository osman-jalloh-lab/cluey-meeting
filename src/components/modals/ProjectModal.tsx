import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Project } from '../../types';

const PALETTE = ['#c45a3a', '#5b9cf6', '#48c490', '#a78bfa', '#e8a040', '#e0609a', '#3b82f6'];

const INTERVALS = [
  { label: 'No review', value: 0 },
  { label: 'Every week', value: 7 },
  { label: 'Every 2 weeks', value: 14 },
  { label: 'Every month', value: 30 },
];

interface ProjectModalProps {
  onClose: () => void;
  onSave: (p: Project) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, onSave }) => {
  const [name, setName]         = useState('');
  const [description, setDesc]  = useState('');
  const [color, setColor]       = useState(PALETTE[0]);
  const [interval, setInterval] = useState(0);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: Date.now().toString(),
      name: name.trim(),
      color,
      description: description.trim() || undefined,
      reviewIntervalDays: interval || undefined,
      lastReviewedAt: interval ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'color-mix(in oklch, var(--ink) 40%, transparent)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'overlayIn .2s' }}
    >
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', width: 440, maxWidth: '94vw', boxShadow: 'var(--shadow-pop)', animation: 'modalIn .22s cubic-bezier(.34,1.15,.64,1)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'italic', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
            New project
          </span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="label" style={{ marginBottom: 7 }}>Project name</div>
            <input
              className="finput"
              placeholder="e.g. Website redesign, Q3 planning"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div>
            <div className="label" style={{ marginBottom: 7 }}>Description (optional)</div>
            <textarea
              className="finput"
              placeholder="What is this project about?"
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <div className="label" style={{ marginBottom: 10 }}>Color</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: color === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer', outline: color === c ? '2px solid var(--paper)' : 'none', outlineOffset: -4, transform: color === c ? 'scale(1.15)' : 'none', transition: 'transform .1s' }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 10 }}>Review reminder</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {INTERVALS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setInterval(opt.value)}
                  style={{ padding: '6px 12px', borderRadius: 'var(--r-md)', border: `1px solid ${interval === opt.value ? 'var(--accent)' : 'var(--line)'}`, background: interval === opt.value ? 'var(--accent-soft)' : 'var(--paper-2)', color: interval === opt.value ? 'var(--accent-ink)' : 'var(--ink-2)', font: '500 12px/1 var(--font-ui)', cursor: 'pointer', transition: 'all .1s' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {interval > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                You'll be reminded to review this project every {interval} days.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>Create project</button>
        </div>
      </div>
    </div>
  );
};
