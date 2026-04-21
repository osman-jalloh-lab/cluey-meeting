import React, { useState } from 'react';
import { Plus, FolderPlus, Download, ChevronRight, Moon, Sun, Sparkles, RefreshCw, Check, UserPlus } from 'lucide-react';
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
  onInviteProject: (id: string) => void;
  onAsk: () => void;
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  onRecapEvent: (e: CalendarEvent) => void;
  onRefreshCalendar: () => void;
  recappedEventIds: Set<string>;
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
  if (!iso.includes('T')) return 'all day';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).toLowerCase();
}

const todayKey = new Date().toISOString().slice(0, 10);
const tomorrowKey = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function dayLabel(dateKey: string) {
  if (dateKey === todayKey) return `Today · ${new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
  if (dateKey === tomorrowKey) return 'Tomorrow';
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function groupByDay(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = ev.startTime.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries());
}

export const Sidebar: React.FC<SidebarProps> = ({
  view, setView, projects, selectedProjId, setSelectedProjId,
  openCommitmentsCount, totalMeetingsCount, onNewRecap, onAddProject, onInviteProject, onAsk,
  calendarEvents, calendarLoading, onRecapEvent, onRefreshCalendar, recappedEventIds, onExport,
  theme, setTheme,
}) => {
  const { user, logout, login } = useAuth();
  const isGuest = user?.email === 'guest@cluey.app';
  const [hoveredProjId, setHoveredProjId] = useState<string | null>(null);

  return (
    <aside style={{
      width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--line)', background: 'var(--paper-2)',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Wordmark */}
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--ink)', color: 'var(--paper)', display: 'grid', placeItems: 'center' }}>
          <LogoIcon />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'italic', fontSize: 22, letterSpacing: '-0.5px', color: 'var(--ink)' }}>
          parawi
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
          <span style={{ flex: 1, textAlign: 'left' }}>Ask parawi…</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      {isGuest && (
        <div style={{ margin: '0 14px 10px', padding: '10px 12px', background: 'var(--warn-bg)', border: '1px solid color-mix(in oklch, var(--warn-ink) 25%, transparent)', borderRadius: 8 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, lineHeight: 1.5, color: 'var(--warn-ink)' }}>
            Guest mode — data saved in this browser only.
          </p>
          <button
            onClick={() => login()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--line)', font: '500 11px/1 var(--font-ui)', cursor: 'pointer', color: 'var(--ink-2)', width: '100%', justifyContent: 'center' }}
          >
            <GoogleG /> Sign in with Google
          </button>
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
          const hovered = hoveredProjId === p.id;
          const memberCount = p.members?.length ?? 0;
          return (
            <div
              key={p.id}
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}
              onMouseEnter={() => setHoveredProjId(p.id)}
              onMouseLeave={() => setHoveredProjId(null)}
            >
              <button
                onClick={() => { setView('project'); setSelectedProjId(p.id); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', border: 0, background: sel ? 'var(--paper-3)' : 'transparent', color: sel ? 'var(--ink)' : 'var(--ink-2)', borderRadius: 6, font: '400 13px/1 var(--font-ui)', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: `0 0 0 3px ${p.color}26` }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {memberCount > 0 && (
                  <span style={{ font: '500 9px/1 var(--font-mono)', color: 'var(--ink-4)', background: 'var(--paper-3)', padding: '2px 5px', borderRadius: 10, flexShrink: 0 }}>
                    {memberCount}
                  </span>
                )}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onInviteProject(p.id); }}
                title="Invite people"
                style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center', flexShrink: 0, opacity: hovered ? 1 : 0, transition: 'opacity .1s, background .1s, color .1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent-ink)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'; }}
              >
                <UserPlus size={12} strokeWidth={1.8} />
              </button>
            </div>
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
      <div style={{ padding: '20px 18px 6px', display: 'flex', alignItems: 'center' }}>
        <div className="label" style={{ flex: 1 }}>Calendar</div>
        <button
          onClick={onRefreshCalendar}
          title="Refresh calendar"
          disabled={calendarLoading}
          style={{ background: 'transparent', border: 0, cursor: calendarLoading ? 'default' : 'pointer', color: 'var(--ink-4)', padding: 2, borderRadius: 4, display: 'grid', placeItems: 'center' }}
        >
          <RefreshCw size={11} strokeWidth={1.8} style={{ opacity: calendarLoading ? 0.4 : 1, animation: calendarLoading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {isGuest ? (
          <div style={{ padding: '6px 10px 10px' }}>
            <button
              onClick={() => login()}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--line)', cursor: 'pointer', font: '500 12px/1.4 var(--font-ui)', color: 'var(--ink-2)', textAlign: 'left' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
            >
              <GoogleG />
              <span>Connect Google Calendar</span>
            </button>
            <p style={{ margin: '8px 2px 0', fontSize: 10.5, color: 'var(--ink-4)', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
              See your meetings and recap them in one click.
            </p>
          </div>
        ) : calendarLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{ padding: '8px 10px', marginBottom: 2, display: 'flex', gap: 8 }}>
              <div style={{ height: 10, width: 34, borderRadius: 4, background: 'var(--paper-3)' }} />
              <div style={{ flex: 1, height: 10, borderRadius: 4, background: 'var(--paper-3)' }} />
            </div>
          ))
        ) : calendarEvents.length === 0 ? (
          <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>No events in the next 7 days.</div>
        ) : (
          groupByDay(calendarEvents).map(([dateKey, dayEvents]) => (
            <div key={dateKey}>
              <div style={{ padding: '8px 10px 4px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dayLabel(dateKey)}
              </div>
              {dayEvents.map(ev => {
                const isRecapped = recappedEventIds.has(ev.id);
                return (
                  <div key={ev.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 10px', borderRadius: 6, opacity: ev.status === 'past' ? 0.6 : 1, marginBottom: 1 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', paddingTop: 1, minWidth: 36, flexShrink: 0, textDecoration: ev.status === 'past' && !isRecapped ? 'line-through' : 'none' }}>
                      {fmtTime(ev.startTime)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: isRecapped ? 'var(--ink-4)' : 'var(--ink-2)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: ev.status === 'past' && !isRecapped ? 'line-through' : 'none' }}>
                        {ev.title}
                      </div>
                      {ev.status === 'upcoming' && ev.attendees.length > 0 && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                          {ev.attendees.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                    {isRecapped ? (
                      <span title="Recapped" style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-soft)', flexShrink: 0 }}>
                        <Check size={10} strokeWidth={2.5} style={{ color: 'var(--accent-ink)' }} />
                      </span>
                    ) : ev.status === 'past' ? (
                      <button
                        onClick={() => onRecapEvent(ev)}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 4, background: 'var(--accent-soft)', color: 'var(--accent-ink)', border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)', font: '500 10px/1 var(--font-ui)', cursor: 'pointer', flexShrink: 0 }}
                      >
                        Recap <ChevronRight size={10} />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
        {isGuest ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => login()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, background: 'var(--ink)', border: '1px solid var(--ink)', cursor: 'pointer', font: '500 12px/1 var(--font-ui)', color: 'var(--paper)', width: '100%' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)'; }}
            >
              <GoogleG /> Sign in with Google
            </button>
            <button
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--line)', cursor: 'pointer', font: '400 11px/1 var(--font-ui)', color: 'var(--ink-4)', width: '100%' }}
            >
              Exit guest mode
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <button onClick={onExport} title="Export data" style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center' }}>
              <Download size={12} />
            </button>
            <button onClick={logout} title="Sign out" style={{ padding: '4px 7px', borderRadius: 5, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', font: '500 11px/1 var(--font-ui)' }}>
              Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
