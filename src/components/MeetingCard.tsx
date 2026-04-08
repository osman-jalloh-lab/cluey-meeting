import React from 'react';
import { CheckCircle2, ChevronRight, Mic, Trash2 } from 'lucide-react';
import type { Meeting, Project } from '../types';
import { avaColor, initials } from '../utils/avatar';
import { fmtDate } from '../utils/dates';

interface MeetingCardProps {
  meeting: Meeting;
  project?: Project;
  isSelected?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  index: number;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, project, isSelected, onClick, onDelete, index }) => {
  const openCount = meeting.commitments.filter(c => !c.done).length;
  const { bg, fg } = avaColor(meeting.person);
  const ini = initials(meeting.person);

  const firstAction     = meeting.actions?.[0];
  const firstCommitment = meeting.commitments?.filter(c => !c.done)[0]?.text;
  const firstDecision   = meeting.decisions?.[0];

  return (
    <div
      className={`bg-paper3 rounded-[14px] p-[18px] pb-4 cursor-pointer transition-all duration-200 relative overflow-hidden
        before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-r-[3px] before:transition-all before:duration-200
        animate-[cardIn_0.3s_cubic-bezier(0.34,1.15,0.64,1)_both]
        ${isSelected
          ? 'shadow-lime-glow border border-lime/20 before:bg-lime'
          : 'border border-line hover:border-line2 hover:shadow-card-hover hover:-translate-y-[1px] before:bg-transparent hover:before:bg-ink4'
        }`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      {/* Person row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-semibold font-sans text-[11px] shrink-0 ring-1 ring-white/10"
            style={{ background: bg, color: fg }}
          >
            {ini || '?'}
          </div>
          <div>
            <div className="text-[14px] font-medium text-ink mb-[2px] tracking-[-0.15px]">{meeting.person}</div>
            <div className="text-[11px] text-ink3 flex items-center gap-1.5 font-mono">
              <span>{fmtDate(meeting.createdAt)}</span>
              <span className="text-ink4">·</span>
              <span>{meeting.type || '1:1'}</span>
              {meeting.isVoice && (
                <>
                  <span className="text-ink4">·</span>
                  <span className="flex items-center gap-[3px] text-lime/60">
                    <Mic className="w-2.5 h-2.5" /> Voice
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {project && (
          <span
            className="text-[11px] font-medium px-2.5 py-[3px] rounded-full whitespace-nowrap shrink-0 font-sans tracking-[-0.1px] ring-1 ring-white/5"
            style={{ background: project.color + '22', color: project.color }}
          >
            {project.name}
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="text-[13px] text-ink2 leading-[1.65] mb-3 line-clamp-3">
        {meeting.summary}
      </div>

      {/* Chips */}
      {(firstAction || firstCommitment || firstDecision) && (
        <div className="flex gap-1.5 flex-wrap mb-3.5">
          {firstAction && (
            <span className="text-[11px] font-medium px-2.5 py-[3px] rounded-full flex items-center gap-1 font-sans bg-amber-bg text-amber-ink ring-1 ring-amber/10">
              <ChevronRight className="w-2.5 h-2.5" />
              {firstAction.length > 42 ? firstAction.slice(0, 42) + '…' : firstAction}
            </span>
          )}
          {firstCommitment && (
            <span className="text-[11px] font-medium px-2.5 py-[3px] rounded-full flex items-center gap-1 font-sans bg-blue-bg text-blue-ink ring-1 ring-blue/10">
              {firstCommitment.length > 42 ? firstCommitment.slice(0, 42) + '…' : firstCommitment}
            </span>
          )}
          {firstDecision && (
            <span className="text-[11px] font-medium px-2.5 py-[3px] rounded-full flex items-center gap-1 font-sans bg-teal-bg text-teal-ink ring-1 ring-teal/10">
              {firstDecision.length > 42 ? firstDecision.slice(0, 42) + '…' : firstDecision}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-line">
        <div className={`text-[11px] flex items-center gap-1.5 font-mono ${openCount ? 'text-red/80' : 'text-teal/80'}`}>
          {openCount ? (
            <><div className="w-[10px] h-[10px] rounded-full border-[1.5px] border-current" /> {openCount} open</>
          ) : (
            <><CheckCircle2 className="w-[11px] h-[11px]" /> All done</>
          )}
        </div>
        <button
          className="w-7 h-7 rounded-[6px] bg-transparent border-none text-ink4 hover:bg-paper4 hover:text-red flex items-center justify-center cursor-pointer transition-colors"
          onClick={onDelete}
        >
          <Trash2 className="w-[13px] h-[13px]" />
        </button>
      </div>
    </div>
  );
};
