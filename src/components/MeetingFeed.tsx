import React from 'react';
import { MeetingCard } from './MeetingCard';
import type { Meeting, Project } from '../types';
import { Mic } from 'lucide-react';

interface MeetingFeedProps {
  meetings: Meeting[];
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MeetingFeed: React.FC<MeetingFeedProps> = ({ meetings, projects, selectedId, onSelect, onDelete }) => {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2.5 text-ink3 p-12 text-center h-full">
        <div className="w-16 h-16 rounded-full border-[1.5px] border-dashed border-line2 flex items-center justify-center mb-1">
          <Mic className="w-[22px] h-[22px] opacity-40" />
        </div>
        <div className="font-serif text-[17px] font-normal text-ink2">No meetings yet</div>
        <div className="text-[13px] max-w-[260px] leading-[1.65]">
          Hit "New recap" to capture your first meeting — type or record with your voice.
        </div>
      </div>
    );
  }

  return (
    <>
      {meetings.map((m, i) => (
        <MeetingCard
          key={m.id}
          meeting={m}
          index={i}
          project={projects.find(p => p.id === m.projId)}
          isSelected={selectedId === m.id}
          onClick={() => onSelect(m.id)}
          onDelete={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete this recap?')) onDelete(m.id);
          }}
        />
      ))}
    </>
  );
};
