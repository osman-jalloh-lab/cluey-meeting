import React from 'react';
import { Plus, FolderPlus, Download, ChevronRight, Moon, Sun, Sparkles } from 'lucide-react';
import type { Project, ViewType, CalendarEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/avatar';

interface SidebarProps {
  view: ViewType;
  setView: (v: ViewType) => void;
  projects: Project[];
  selectedProjId: string | null;
  setSelectedProjId: (id: string | null) => void;
  openCommitmentsCount: number;
  totalMeetingsCount: number;
  onNewRecap: () => void;
  onAddProject: () => void;
  onAsk: () => void;
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  onRecapEvent: (e: CalendarEvent) => void;
  onExport: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12a5 5 0 0 1 8 0"/>
      <path d="M5 8a9 9 0 0 1 14 0"/>
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

const NAV: Array<{ id: ViewType; label: string; icon: React.ReactNode }> = [
  { id: 'all',         label: 'Feed',        icon: <><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></> },
  { id: 'people',      label: 'People',      icon: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15c2.5 0 4.5 1.5 5 4"/></> },
  { id: 'commitments', label: 'Commitments', icon: <polyline points="4,12 10,18 20,6"/> },
];

function NavSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).toLowerCase();
}

export const Sidebar: React.FC<SidebarProps> = ({
  view, setView, projects, selectedProjId, setSelectedProjId,
  openCommitmentsCount, totalMeetingsCount, onNewRecap, onAddProject, onAsk,
  calendarEvents, calendarLoading, onRecapEvent, onExport,
  theme, setTheme,
}) => {
  const { user, logout } = useAuth();
  const isGuest = user?.email === 'guest@cluey.app';

  return (
    <aside style={{
      width: 252, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--line)', background: 'var(--paper-2)',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Wordmark */}
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--ink)', color: 'var(--paper)', display: 'grid', placeItems: 'center' }}>
          <LogoIcon />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'italic', fontSize: 22, letterSpacing: '-0.5px', color: 'var(--ink)' }}>
          cluey
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          style={{ background: 'transparent', border: '1px solid var(--line)', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
        >
          {theme === 'dark' ? <Sun size={14} strokeWidth={1.6} /> : <Moon size={14} strokeWidth={1.6} />}
        </button>
      </div>

      {/* New recap */}
      <div style={{ padding: '0 14px 12px' }}>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onNewRecap}>
          <Plus size={14} strokeWidth={2.2} /> New recap
        </button>
      </div>

      {/* Ask cluey */}
      <div style={{ padding: '0 14px 10px' }}>
        <button
          onClick={onAsk}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 8px 11px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper)', color: 'var(--ink-3)', font: '400 13px/1 var(--font-ui)', cursor: 'pointer', transition: 'border-color .15s, color .15s' }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--ink-2)'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--line)'; el.style.color = 'var(--ink-3)'; }}
        >
          <Sparkles size={14} strokeWidth={1.6} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>Ask cluey…</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      {isGuest && (
        <div style={{ margin: '0 14px 10px', padding: '10px 12px', background: 'var(--warn-bg)', border: '1px solid color-mix(in oklch, var(--warn-ink) 25%, transparent)', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--warn-ink)' }}>
            Guest mode — data saved in this browser only.
          </p>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '4px 10px' }}>
        {NAV.map(item => {
          const active = view === item.id;
          const badge = item.id === 'commitments' ? openCommitmentsCount : item.id === 'all' ? totalMeetingsCount : 0;
          return (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedProjId(null); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', border: 0, background: active ? 'var(--paper-3)' : 'transparent', color: active ? 'var(--ink)' : 'var(--ink-2)', borderRadius: 7, font: '500 13px/1 var(--font-ui)', cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}
            >
              <NavSvg>{item.icon}</NavSvg>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge > 0 && (
                <span style={{ font: '500 10px/1 var(--font-mono)', color: active ? 'var(--ink)' : 'var(--ink-4)', background: active ? 'var(--paper-4)' : 'transparent', padding: '2px 6px', borderRadius: 20 }}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Projects */}
      <div style={{ padding: '18px 18px 6px' }}>
        <div className="label">Projects</div>
      </div>
      <div style={{ padding: '0 10px' }}>
        {projects.map(p => {
          const sel = view === 'project' && selectedProjId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { setView('project'); setSelectedProjId(p.id); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', border: 0, background: sel ? 'var(--paper-3)' : 'transparent', color: sel ? 'var(--ink)' : 'var(--ink-2)', borderRadius: 6, font: '400 13px/1 var(--font-ui)', cursor: 'pointer', textAlign: 'left', marginBottom: 1 }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: `0 0 0 3px ${p.color}26` }} />
              <span style={{ flex: 1 }}>{p.name}</span>
            </button>
          );
        })}
        <button
          onClick={onAddProject}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', border: 0, background: 'transparent', color: 'var(--ink-4)', borderRadius: 6, font: '400 13px/1 var(--font-ui)', cursor: 'pointer', textAlign: 'left' }}
        >
          <FolderPlus size={13} strokeWidth={1.5} style={{ opacity: 0.6 }} /> Add project
        </button>
      </div>

      {/* Calendar */}
      <div style={{ padding: '20px 18px 6px' }}>
        <div className="label">Today · {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
      </div>
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {calendarLoading ? (
          [1, 2].map(i => (
            <div key={i} style={{ padding: '8px 10px', marginBottom: 2, display: 'flex', gap: 8 }}>
              <div style={{ height: 10, width: 34, borderRadius: 4, background: 'var(--paper-3)' }} />
              <div style={{ flex: 1, height: 10, borderRadius: 4, background: 'var(--paper-3)' }} />
            </div>
          ))
        ) : calendarEvents.length === 0 ? (
          <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>No events today.</div>
        ) : (
          calendarEvents.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 10px', borderRadius: 6, opacity: ev.status === 'past' ? 0.65 : 1, marginBottom: 1 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', paddingTop: 1, minWidth: 36, flexShrink: 0, textDecoration: ev.status === 'past' ? 'line-through' : 'none' }}>
                {fmtTime(ev.startTime)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: ev.status === 'past' ? 'line-through' : 'none' }}>
                  {ev.title}
                </div>
                {ev.status === 'upcoming' && ev.attendees.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 3 }}>
                    {ev.attendees.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
              {ev.status === 'past' && (
                <button
                  onClick={() => onRecapEvent(ev)}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 4, background: 'var(--accent-soft)', color: 'var(--accent-ink)', border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)', font: '500 10px/1 var(--font-ui)', cursor: 'pointer', flexShrink: 0 }}
                >
                  Recap <ChevronRight size={10} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {user?.picture ? (
          <img src={user.picture} alt={user.name} style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'var(--paper-3)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '500 10px/1 var(--font-ui)', color: 'var(--ink-3)' }}>
            {initials(user?.name || '?')}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
        </div>
        <button onClick={onExport} title="Export" style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center' }}>
          <Download size={12} />
        </button>
        <button onClick={logout} style={{ padding: '4px 7px', borderRadius: 5, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', font: '500 11px/1 var(--font-ui)' }}>
          Out
        </button>
      </div>
    </aside>
  );
};
