import React from 'react';
import type { Meeting } from '../types';
import { avaColor, initials } from '../utils/avatar';

interface PeopleViewProps {
  meetings: Meeting[];
  onView: (id: string) => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ meetings, onView }) => {
  const map: Record<string, { name: string; list: Meeting[] }> = {};
  meetings.forEach(m => {
    const k = m.person.toLowerCase();
    if (!map[k]) map[k] = { name: m.person, list: [] };
    map[k].list.push(m);
  });

  const keys = Object.keys(map);

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2.5 text-ink3 p-12 text-center h-full">
        <div className="font-serif text-[17px] font-normal text-ink2">No people yet</div>
        <div className="text-[13px] max-w-[260px] leading-[1.65] text-ink3">
          Meetings grouped by person will appear here.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-[12px] text-ink3 mb-1 px-1 font-mono">{keys.length} people</div>
      {keys.map((k, idx) => {
        const p = map[k];
        const { bg, fg } = avaColor(p.name);
        const ini = initials(p.name);
        const open = p.list.flatMap(m => m.commitments).filter(c => !c.done).length;

        return (
          <div
            key={k}
            className="bg-paper3 border border-line rounded-[14px] p-4 flex items-center justify-between gap-3 animate-[cardIn_0.28s_cubic-bezier(0.34,1.15,0.64,1)] hover:border-line2 transition-colors"
            style={{ animationDelay: `${idx * 35}ms` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-[38px] h-[38px] rounded-full flex items-center justify-center font-semibold font-sans text-[11px] shrink-0 ring-1 ring-white/10"
                style={{ background: bg, color: fg }}
              >
                {ini || '?'}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[14px] font-medium text-ink tracking-[-0.1px]">{p.name}</div>
                <div className="text-[12px] text-ink3 font-mono">
                  {p.list.length} meeting{p.list.length !== 1 && 's'}
                  {open > 0 && <span className="text-red/70"> · {open} open</span>}
                </div>
              </div>
            </div>

            <button
              className="btn btn-outline py-1.5 px-3.5 text-[12px]"
              onClick={() => onView(p.list[0].id)}
            >
              View →
            </button>
          </div>
        );
      })}
    </>
  );
};
