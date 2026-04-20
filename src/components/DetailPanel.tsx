import React, { useState } from 'react';
import { X, Check, CalendarPlus, Send, Download, Pencil, Copy, CheckCheck, Clock, Bell, UserRound } from 'lucide-react';
import type { Meeting, Project } from '../types';
import { initials } from '../utils/avatar';
import { fmtDate } from '../utils/dates';
import { buildGCalUrl } from '../utils/gcal';

interface DetailPanelProps {
  meetingId: string | null;
  meetings: Meeting[];
  projects: Project[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleTask: (meetingId: string, taskId: string) => void;
}

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function buildPlainText(meeting: Meeting, projName: string): string {
  let txt = `MEETING RECAP: ${meeting.person}\n${'─'.repeat(40)}\nDate: ${fmtDate(meeting.createdAt)}  |  Type: ${meeting.type}${projName ? `  |  Project: ${projName}` : ''}\n\nSUMMARY\n${meeting.summary}\n`;
  if (meeting.decisions?.length) { txt += `\nDECISIONS\n`; meeting.decisions.forEach(d => txt += `• ${d}\n`); }
  if (meeting.actions?.length) { txt += `\nACTION ITEMS\n`; meeting.actions.forEach(a => txt += `• ${a}\n`); }
  if (meeting.tasks?.length) { txt += `\nTASKS\n`; meeting.tasks.forEach(t => txt += `[${t.done ? 'x' : ' '}] ${t.text}${t.assignee ? ` — ${t.assignee}` : ''}${t.dueDate ? ` (due ${t.dueDate})` : ''}\n`); }
  if (meeting.tags?.length) { txt += `\nTOPICS: ${meeting.tags.join(', ')}\n`; }
  return txt;
}

function handleDownload(meeting: Meeting, projName: string) {
  const blob = new Blob([buildPlainText(meeting, projName)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `recap-${meeting.person.replace(/\s+/g, '-').toLowerCase()}-${meeting.createdAt.slice(0, 10)}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

function handleSendEmail(meeting: Meeting, projName: string) {
  const subject = encodeURIComponent(`Meeting Recap: ${meeting.person} — ${fmtDate(meeting.createdAt)}`);
  const body = encodeURIComponent(buildPlainText(meeting, projName));
  window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
}

function fmtDue(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

function getDueSeverity(d?: string): 'overdue' | 'soon' | 'normal' | null {
  if (!d) return null;
  const days = (new Date(d + 'T23:59:59').getTime() - Date.now()) / 86400000;
  if (days < 0) return 'overdue'; if (days <= 3) return 'soon'; return 'normal';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="label" style={{ marginBottom: 12 }}>{children}</div>;
}

function hueFor(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }

export const DetailPanel: React.FC<DetailPanelProps> = ({ meetingId, meetings, projects, onClose, onDelete, onEdit, onToggleTask }) => {
  const [copied, setCopied] = useState(false);

  const meeting = meetings.find(m => m.id === meetingId);
  const isOpen = !!meeting;
  const proj = meeting ? projects.find(p => p.id === meeting.projId) : undefined;
  const projName = proj?.name || '';

  const hist = meeting ? meetings.filter(x => x.id !== meetingId && x.person.toLowerCase() === meeting.person.toLowerCase()).slice(0, 4) : [];

  const h = meeting ? hueFor(meeting.person) : 0;

  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'color-mix(in oklch, var(--ink) 30%, transparent)', backdropFilter: 'blur(2px)', zIndex: 40, animation: 'overlayIn .2s ease' }}
      />
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(560px, 90vw)',
          background: 'var(--paper)',
          borderLeft: '1px solid var(--line)',
          boxShadow: 'var(--shadow-pop)',
          zIndex: 41,
          display: 'flex', flexDirection: 'column',
          animation: 'cardIn .28s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {/* Header */}
        <header style={{ padding: '18px 22px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `oklch(0.88 0.06 ${h})`, color: `oklch(0.3 0.1 ${h})`, display: 'grid', placeItems: 'center', font: '500 13px/1 var(--font-ui)' }}>
            {initials(meeting!.person)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '500 15px/1.2 var(--font-ui)', color: 'var(--ink)' }}>{meeting!.person}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {proj && <span style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color, display: 'inline-block' }} />}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                {projName && `${projName} · `}{meeting!.type} · {new Date(meeting!.createdAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onEdit(meeting!.id)} title="Edit" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <Pencil size={14} />
            </button>
            <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            <a
              href={buildGCalUrl({ title: `Follow-up: ${meeting!.person}`, details: `Follow-up from ${fmtDate(meeting!.createdAt)}.\n\n${meeting!.summary}` })}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)', color: 'var(--accent-ink)', font: '500 12px/1 var(--font-ui)', textDecoration: 'none', transition: 'border-color .15s' }}
            >
              <CalendarPlus size={13} /> Follow-up
            </a>
            <button
              onClick={() => handleSendEmail(meeting!, projName)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 'var(--r-md)', background: 'var(--paper-2)', border: '1px solid var(--line)', color: 'var(--ink-2)', font: '500 12px/1 var(--font-ui)', cursor: 'pointer' }}
            >
              <Send size={13} /> Send
            </button>
            <button
              onClick={() => handleDownload(meeting!, projName)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 'var(--r-md)', background: 'var(--paper-2)', border: '1px solid var(--line)', color: 'var(--ink-2)', font: '500 12px/1 var(--font-ui)', cursor: 'pointer' }}
            >
              <Download size={13} /> Download
            </button>
          </div>

          {/* Summary */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <SectionLabel>Summary</SectionLabel>
              <button
                onClick={() => { navigator.clipboard.writeText(meeting!.summary).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, font: '400 10.5px/1 var(--font-mono)', color: copied ? 'var(--ok-ink)' : 'var(--ink-4)', background: 'transparent', border: 0, cursor: 'pointer', padding: '3px 6px', borderRadius: 4 }}
              >
                {copied ? <><CheckCheck size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 18, lineHeight: 1.55, letterSpacing: '-0.15px', color: 'var(--ink)' }}>
              {meeting!.summary}
            </p>
            {meeting!.tags && meeting!.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {meeting!.tags.map(t => (
                  <span key={t} style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--ink-3)', padding: '3px 8px', border: '1px solid var(--line)', borderRadius: 4, background: 'var(--paper-2)' }}>#{t}</span>
                ))}
              </div>
            )}
          </section>

          {/* Decisions */}
          {meeting!.decisions?.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionLabel>Decisions</SectionLabel>
              {meeting!.decisions.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i === 0 ? '1px solid var(--line)' : 'none', borderBottom: '1px solid var(--line)' }}>
                  <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="9"/><polyline points="8,12 11,15 16,9"/>
                  </svg>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>{d}</div>
                </div>
              ))}
            </section>
          )}

          {/* Action items */}
          {meeting!.actions?.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionLabel>Action items</SectionLabel>
              {meeting!.actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderTop: i === 0 ? '1px solid var(--line)' : 'none', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                  <span style={{ font: '500 10.5px/1 var(--font-mono)', color: 'var(--ink-3)', padding: '4px 7px', background: 'var(--paper-3)', borderRadius: 4, whiteSpace: 'nowrap', marginTop: 1 }}>→</span>
                  <div style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>{a}</div>
                </div>
              ))}
            </section>
          )}

          {/* Tasks */}
          {meeting!.tasks && meeting!.tasks.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <SectionLabel>Tasks</SectionLabel>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                  {meeting!.tasks.filter(t => t.done).length}/{meeting!.tasks.length} done
                </span>
              </div>
              {meeting!.tasks.map(t => {
                const sev = getDueSeverity(t.dueDate);
                const dueCls = sev === 'overdue' ? { bg: 'var(--late-bg)', fg: 'var(--late-ink)' } : sev === 'soon' ? { bg: 'var(--warn-bg)', fg: 'var(--warn-ink)' } : { bg: 'var(--paper-3)', fg: 'var(--ink-3)' };
                return (
                  <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <div
                      onClick={() => onToggleTask(meeting!.id, t.id)}
                      style={{ width: 18, height: 18, marginTop: 1, borderRadius: 5, border: t.done ? 'none' : '1.5px solid var(--line-2)', background: t.done ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .15s', color: '#fff' }}
                    >
                      {t.done && <Check size={11} strokeWidth={2.8} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, lineHeight: 1.5, color: t.done ? 'var(--ink-4)' : 'var(--ink)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {t.assignee && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                            <UserRound size={9} /> {t.assignee}
                          </span>
                        )}
                        {t.dueDate && sev && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, background: dueCls.bg, color: dueCls.fg, fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
                            <Clock size={9} /> {fmtDue(t.dueDate)}
                          </span>
                        )}
                        {t.done && t.completedAt && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
                            {new Date(t.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {!t.done && (
                      <a
                        href={buildGCalUrl({ title: `Follow-up with ${meeting!.person}`, details: t.text })}
                        target="_blank" rel="noopener noreferrer"
                        title="Add to Calendar"
                        style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', flexShrink: 0, marginTop: 1 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <CalendarPlus size={13} />
                      </a>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* Commitments */}
          {meeting!.commitments?.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <SectionLabel>Your commitments</SectionLabel>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                  {meeting!.commitments.filter(c => c.done).length}/{meeting!.commitments.length} done
                </span>
              </div>
              {meeting!.commitments.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'default' }}>
                  <div style={{ width: 18, height: 18, marginTop: 1, borderRadius: 5, border: c.done ? 'none' : '1.5px solid var(--line-2)', background: c.done ? 'var(--ok-ink)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0, color: '#fff' }}>
                    {c.done && <Check size={11} strokeWidth={2.8} />}
                  </div>
                  <div style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: c.done ? 'var(--ink-4)' : 'var(--ink)', textDecoration: c.done ? 'line-through' : 'none' }}>
                    {c.text}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Past meetings with this person */}
          {hist.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionLabel>More with {meeting!.person}</SectionLabel>
              {hist.map(hm => {
                const hp = projects.find(p => p.id === hm.projId);
                return (
                  <div key={hm.id} style={{ padding: '12px 14px', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', marginBottom: 8 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 6 }}>
                      {fmtDate(hm.createdAt)}{hp ? ` · ${hp.name}` : ''}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {hm.summary}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
              saved with parawi
            </span>
            <button
              onClick={() => { if (window.confirm('Delete this recap?')) onDelete(meeting!.id); }}
              style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', border: '1px solid color-mix(in oklch, var(--late-ink) 25%, transparent)', background: 'var(--late-bg)', color: 'var(--late-ink)', font: '500 12px/1 var(--font-ui)', cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
