import React from 'react';
import { X, Check, CalendarPlus } from 'lucide-react';
import type { Meeting, Project } from '../types';
import { avaColor, initials } from '../utils/avatar';
import { fmtDate } from '../utils/dates';
import { buildGCalUrl } from '../utils/gcal';

interface DetailPanelProps {
  meetingId: string | null;
  meetings: Meeting[];
  projects: Project[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleCommitment: (meetingId: string, index: number) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ meetingId, meetings, projects, onClose, onDelete, onToggleCommitment }) => {
  const meeting = meetings.find(m => m.id === meetingId);
  const isOpen = !!meeting;

  const proj = meeting ? projects.find(p => p.id === meeting.projId) : undefined;
  const hist = meeting
    ? meetings.filter(x => x.id !== meetingId && x.person.toLowerCase() === meeting.person.toLowerCase()).slice(0, 5)
    : [];
  const { bg, fg } = meeting ? avaColor(meeting.person) : { bg: '', fg: '' };
  const ini = meeting ? initials(meeting.person) : '';

  return (
    <aside className={`bg-paper border-l flex flex-col overflow-hidden transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'w-[360px] min-w-[360px] border-line' : 'w-0 min-w-0 border-transparent'}`}>
      {meeting && (
        <>
          <div className="p-4 px-[18px] border-b border-line flex items-center justify-between shrink-0 glass z-10 sticky top-0">
            <div className="flex items-center gap-[9px]">
              <div className="w-[30px] h-[30px] text-[10px] rounded-full flex items-center justify-center border-[1.5px] border-black/5" style={{ background: bg, color: fg }}>
                {ini}
              </div>
              <div>
                <div className="text-[14px] font-medium text-ink tracking-[-0.1px] leading-tight">{meeting.person}</div>
                <div className="text-[11px] text-ink3 mt-[2px]">{fmtDate(meeting.createdAt)}{proj ? ` · ${proj.name}` : ''}</div>
              </div>
            </div>
            <button className="w-7 h-7 rounded-[6px] text-ink3 hover:bg-paper2 hover:text-red flex items-center justify-center transition-colors" onClick={onClose}>
              <X className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-[18px] custom-scrollbar">
            <div className="mb-[22px]">
              <div className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink3 mb-[9px]">Summary</div>
              <div className="text-[13px] text-ink2 leading-[1.7] space-y-2 whitespace-pre-wrap">
                {meeting.summary}
              </div>
            </div>

            {proj && (
              <div className="mb-[22px]">
                <div className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink3 mb-[9px]">Project</div>
                <span className="px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: proj.color + '18', color: proj.color }}>
                  {proj.name}
                </span>
              </div>
            )}

            {meeting.decisions && meeting.decisions.length > 0 && (
              <div className="mb-[22px]">
                <div className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink3 mb-[9px]">Decisions</div>
                {meeting.decisions.map((d, i) => (
                  <div key={i} className="flex items-start gap-[9px] py-1.5 border-b border-line last:border-none text-[13px]">
                    <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-px text-[9px] bg-teal-bg text-teal font-bold">✓</div>
                    <div className="text-ink2 leading-[1.55] flex-1">{d}</div>
                  </div>
                ))}
              </div>
            )}

            {meeting.actions && meeting.actions.length > 0 && (
              <div className="mb-[22px]">
                <div className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink3 mb-[9px]">Action items</div>
                {meeting.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-[9px] py-1.5 border-b border-line last:border-none text-[13px]">
                    <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-px text-[11px] bg-amber-bg text-amber font-bold">→</div>
                    <div className="text-amber-ink leading-[1.55] flex-1">{a}</div>
                  </div>
                ))}
              </div>
            )}

            {meeting.commitments && meeting.commitments.length > 0 && (
              <div className="mb-[22px]">
                <div className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink3 mb-[9px]">Commitments & follow-ups</div>
                {meeting.commitments.map((c, i) => (
                  <div key={i} className="flex items-start gap-[9px] py-2 border-b border-line last:border-none group">
                    <div
                      className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] shrink-0 mt-px cursor-pointer flex items-center justify-center transition-all bg-paper hover:border-teal ${c.done ? 'bg-teal border-teal' : 'border-paper4'}`}
                      onClick={() => onToggleCommitment(meeting.id, i)}
                    >
                      {c.done && <Check className="w-[11px] h-[11px] stroke-[3px] text-white" />}
                    </div>
                    <div className={`text-[13px] leading-[1.55] flex-1 transition-colors ${c.done ? 'line-through text-ink3' : 'text-ink2'}`}>
                      {c.text}
                    </div>
                    {!c.done && (
                      <a
                        href={buildGCalUrl({
                          title: `Follow-up with ${meeting.person}`,
                          details: c.text,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Add to Google Calendar"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-px w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-ink3 hover:text-lime hover:bg-lime-bg"
                        onClick={e => e.stopPropagation()}
                      >
                        <CalendarPlus className="w-[13px] h-[13px]" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hist.length > 0 && (
              <div className="mb-[22px]">
                <div className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink3 mb-[9px]">Past meetings with {meeting.person}</div>
                {hist.map(h => {
                  const hp = projects.find(p => p.id === h.projId);
                  return (
                    <div key={h.id} className="bg-paper2 border border-line rounded-[10px] p-[11px] px-[13px] mb-1.5">
                      <div className="text-[11px] text-ink3 mb-1">{fmtDate(h.createdAt)}{hp ? ` · ${hp.name}` : ''}</div>
                      <div className="text-[12px] text-ink2 leading-[1.6] line-clamp-2">{h.summary}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {meeting.tags && meeting.tags.length > 0 && (
              <div className="mb-[22px]">
                <div className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink3 mb-[9px]">Topics</div>
                {meeting.tags.map((t, i) => (
                  <span key={i} className="inline-block text-[11px] px-2.5 py-[3px] rounded-full bg-paper2 border border-line2 text-ink2 mr-1 mb-1">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <button className="btn btn-del w-full mt-4 bg-red-bg text-red-ink hover:bg-[#f5d8d5]" onClick={() => {
              if (window.confirm('Delete this recap?')) onDelete(meeting.id);
            }}>
              Delete this recap
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
