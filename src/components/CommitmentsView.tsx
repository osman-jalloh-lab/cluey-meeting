import React from 'react';
import { Check, CalendarPlus } from 'lucide-react';
import type { Meeting, Commitment } from '../types';
import { fmtDate } from '../utils/dates';
import { buildGCalUrl } from '../utils/gcal';

interface CommitmentsViewProps {
  meetings: Meeting[];
  onToggle: (meetingId: string, commitmentIndex: number) => void;
}

export const CommitmentsView: React.FC<CommitmentsViewProps> = ({ meetings, onToggle }) => {
  const items: { m: Meeting; c: Commitment; i: number }[] = [];

  meetings.forEach(m => {
    (m.commitments || []).forEach((c, i) => {
      if (!c.done) items.push({ m, c, i });
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
          You're on top of everything. No open commitments remaining.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-[12px] text-ink3 mb-1 px-1 font-mono">{items.length} open item{items.length !== 1 && 's'}</div>
      {items.map(({ m, c, i }, idx) => (
        <div
          key={`${m.id}-${i}`}
          className="bg-paper3 border border-line rounded-[14px] p-4 animate-[cardIn_0.28s_cubic-bezier(0.34,1.15,0.64,1)]"
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          <div className="flex items-start gap-3 group">
            <div
              className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-line2 bg-paper2 shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-all hover:border-teal/60 hover:bg-teal-bg"
              onClick={() => onToggle(m.id, i)}
            />
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[13px] text-ink leading-[1.5]">{c.text}</div>
              <div className="text-[11px] text-ink3 font-mono">
                With {m.person} · {fmtDate(m.createdAt)}
              </div>
            </div>
            <a
              href={buildGCalUrl({
                title: `Follow-up with ${m.person}`,
                details: c.text,
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
      ))}
    </>
  );
};
