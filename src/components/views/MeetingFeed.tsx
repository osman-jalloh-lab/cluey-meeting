import React from 'react';
import { MeetingCard } from './MeetingCard';
import type { Meeting, Project } from '../../types';
import { Mic } from 'lucide-react';

interface MeetingFeedProps {
  meetings: Meeting[];
  allMeetings: Meeting[];
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewRecap: () => void;
  onAsk: () => void;
  userName: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ label, value, sub, tone, onClick }: { label: string; value: string | number; sub: string; tone?: 'accent' | 'late' | 'neutral'; onClick?: () => void }) {
  const isAccent = tone === 'accent';
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        padding: '12px 14px',
        background: isAccent ? 'var(--accent-soft)' : 'var(--paper-2)',
        border: `1px solid ${isAccent ? 'color-mix(in oklch, var(--accent) 30%, transparent)' : 'var(--line)'}`,
        borderRadius: 'var(--r-md)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s, border-color .15s',
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)')}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLElement).style.transform = 'none')}
    >
      <div className="label" style={{ color: isAccent ? 'var(--accent-ink)' : 'var(--ink-3)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1, marginTop: 8, color: isAccent ? 'var(--accent-ink)' : 'var(--ink)', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tone === 'late' ? 'var(--late-ink)' : isAccent ? 'var(--accent-ink)' : 'var(--ink-3)', marginTop: 7, letterSpacing: '0.02em', opacity: isAccent ? 0.8 : 1 }}>
        {sub}
      </div>
    </div>
  );
}

export const MeetingFeed: React.FC<MeetingFeedProps> = ({ meetings, allMeetings, projects, selectedId, onSelect, onDelete, onNewRecap, onAsk, userName }) => {
  const firstName = userName.split(' ')[0];
  const now = Date.now();
  const thisWeek = allMeetings.filter(m => now - new Date(m.createdAt).getTime() < 7 * 86400e3).length;
  const openCommits = allMeetings.reduce((n, m) => n + m.commitments.filter(c => !c.done).length, 0);
  const openTasks = allMeetings.reduce((n, m) => n + (m.tasks || []).filter(t => !t.done).length, 0);
  const openTotal = openCommits + openTasks;

  const sorted = meetings.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const dayName = new Date().toLocaleDateString('en', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' });

  if (allMeetings.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1.5px dashed var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Mic size={22} style={{ opacity: 0.4, color: 'var(--ink-3)' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 300, color: 'var(--ink-2)', marginBottom: 10 }}>No meetings yet</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, maxWidth: 280, margin: '0 auto 24px' }}>
          Hit "New recap" to capture your first meeting — type or record with your voice.
        </div>
        <button className="btn btn-primary" onClick={onNewRecap}>New recap</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 28px 60px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <div className="label" style={{ marginBottom: 10 }}>{dayName} · {dateStr}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 'clamp(24px, 3vw, 34px)', lineHeight: 1.1, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>
          {getGreeting()}, {firstName}.{' '}
          <em style={{ color: 'var(--ink-3)', fontWeight: 300 }}>Here's where things stand.</em>
        </h1>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
          <StatCard label="Meetings this week" value={thisWeek} sub={`${allMeetings.length} total`} />
          <StatCard label="Open items" value={openTotal} sub={openTotal === 0 ? 'All clear!' : `${openCommits} commits · ${openTasks} tasks`} tone={openTotal > 0 ? 'neutral' : 'neutral'} />
          <StatCard label="Ask parawi" value="⌘K" sub="Try 'what did we decide?'" tone="accent" onClick={onAsk} />
        </div>
      </div>

      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, letterSpacing: '-0.3px', margin: 0, color: 'var(--ink)' }}>
          {meetings === allMeetings ? 'Recent recaps' : `Filtered recaps`}
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{sorted.length} recaps</span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sorted.map((m, i) => (
          <div key={m.id} style={{ animation: `cardIn .4s ${i * 0.04}s both` }}>
            <MeetingCard
              meeting={m}
              index={i}
              project={projects.find(p => p.id === m.projId)}
              isSelected={selectedId === m.id}
              onClick={() => onSelect(m.id)}
              onDelete={(e) => { e.stopPropagation(); if (window.confirm('Delete this recap?')) onDelete(m.id); }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
