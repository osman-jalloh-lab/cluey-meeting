import React from 'react';
import { Check, CalendarPlus, UserRound, Clock } from 'lucide-react';
import type { Meeting, Task } from '../../types';
import { fmtDate } from '../../utils/dates';
import { buildGCalUrl } from '../../utils/gcal';

interface CommitmentsViewProps {
  meetings: Meeting[];
  onToggle: (meetingId: string, taskId: string) => void;
}

type DueSeverity = 'overdue' | 'soon' | 'normal';

function getDueSeverity(dueDate?: string): DueSeverity | null {
  if (!dueDate) return null;
  const due = new Date(dueDate + 'T23:59:59');
  const diffMs = due.getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return 'normal';
}

const dueCls: Record<DueSeverity, string> = {
  overdue: 'text-red bg-red-bg border-red/20',
  soon:    'text-amber bg-amber-bg border-amber/20',
  normal:  'text-ink3 bg-paper3 border-line2',
};

function fmtDue(dueDate: string): string {
  const d = new Date(dueDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const CommitmentsView: React.FC<CommitmentsViewProps> = ({ meetings, onToggle }) => {
  const items: { m: Meeting; t: Task }[] = [];

  meetings.forEach(m => {
    (m.tasks || []).forEach(t => {
      if (!t.done) items.push({ m, t });
    });
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2.5 text-ink3 p-12 text-center h-full">
        <div className="w-16 h-16 rounded-full border-[1.5px] border-dashed border-line2 flex items-center justify-center mb-1">
          <Check className="w-[22px] h-[22px] text-teal opacity-60" />
        </div>
        <div className="font-serif text-[17px] font-normal text-ink2">All clear!</div>
        <div className="text-[13px] max-w-[260px] leading-[1.65] text-ink3">
          You're on top of everything. No open tasks remaining.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-[12px] text-ink3 mb-1 px-1 font-mono">{items.length} open task{items.length !== 1 && 's'}</div>
      {items.map(({ m, t }, idx) => {
        const severity = getDueSeverity(t.dueDate);
        return (
          <div
            key={`${m.id}-${t.id}`}
            className="bg-paper3 border border-line rounded-[14px] p-4 animate-[cardIn_0.28s_cubic-bezier(0.34,1.15,0.64,1)]"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex items-start gap-3 group">
              <div
                className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-line2 bg-paper2 shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-all hover:border-teal/60 hover:bg-teal-bg"
                onClick={() => onToggle(m.id, t.id)}
              />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="text-[13px] text-ink leading-[1.5]">{t.text}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-ink3 font-mono">
                    {m.person} · {fmtDate(m.createdAt)}
                  </span>
                  {t.assignee && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-ink2 bg-paper2 border border-line2 px-2 py-[2px] rounded-full">
                      <UserRound className="w-[9px] h-[9px] text-ink3" />
                      {t.assignee}
                    </span>
                  )}
                  {t.dueDate && severity && (
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-[2px] rounded-full border ${dueCls[severity]}`}>
                      <Clock className="w-[9px] h-[9px]" />
                      {severity === 'overdue' ? 'Overdue · ' : ''}{fmtDue(t.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={buildGCalUrl({
                  title: `Follow-up with ${m.person}`,
                  details: t.text,
                })}
                target="_blank"
                rel="noopener noreferrer"
                title="Add to Google Calendar"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-ink3 hover:text-lime hover:bg-lime-bg"
                onClick={e => e.stopPropagation()}
              >
                <CalendarPlus className="w-[13px] h-[13px]" />
              </a>
            </div>
          </div>
        );
      })}
    </>
  );
};
