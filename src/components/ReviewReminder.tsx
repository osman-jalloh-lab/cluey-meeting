import React from 'react';
import { Bell, X } from 'lucide-react';
import type { Project } from '../types';

interface ReviewReminderProps {
  projects: Project[];
  onDismiss: (projectId: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
}

export const ReviewReminder: React.FC<ReviewReminderProps> = ({ projects, onDismiss, onUpdateProject }) => {
  const due = projects.filter(p => {
    if (!p.reviewIntervalDays || p.reviewIntervalDays === 0) return false;
    const last = p.lastReviewedAt ? new Date(p.lastReviewedAt) : new Date(0);
    const daysSince = (Date.now() - last.getTime()) / 86400000;
    return daysSince >= p.reviewIntervalDays;
  });

  if (due.length === 0) return null;

  const p = due[0];

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--paper)', border: '1px solid var(--line)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 'var(--r-md)', padding: '12px 16px',
      boxShadow: 'var(--shadow-pop)', animation: 'toastUp .3s ease',
      maxWidth: '90vw', minWidth: 320,
    }}>
      <Bell size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ font: '500 13px/1.3 var(--font-ui)', color: 'var(--ink)' }}>
          Upcoming review: <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{p.name}</em>
        </div>
        <div style={{ font: '400 11px/1.4 var(--font-mono)', color: 'var(--ink-3)', marginTop: 3 }}>
          Review due every {p.reviewIntervalDays} days
        </div>
      </div>
      <button
        onClick={() => { onUpdateProject(p.id, { lastReviewedAt: new Date().toISOString() }); onDismiss(p.id); }}
        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', font: '500 11px/1 var(--font-ui)', cursor: 'pointer', flexShrink: 0 }}
      >
        Mark reviewed
      </button>
      <button
        onClick={() => onDismiss(p.id)}
        style={{ width: 24, height: 24, borderRadius: 4, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
      >
        <X size={13} />
      </button>
    </div>
  );
};
