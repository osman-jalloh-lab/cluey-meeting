import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Project } from '../types';

const PALETTE = ['#c8f048', '#5b9cf6', '#f05040', '#e8a040', '#48c490', '#a78bfa', '#e0609a'];

interface ProjectModalProps {
  onClose: () => void;
  onSave: (p: Project) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, onSave }) => {
  const [name, setName]   = useState('');
  const [color, setColor] = useState(PALETTE[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: Date.now().toString(), name: name.trim(), color });
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[200] backdrop-blur-[8px] animate-[overlayIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-paper3 border border-line2 rounded-[20px] w-[400px] max-w-[96vw] shadow-card-hover animate-[modalIn_0.22s_cubic-bezier(0.34,1.15,0.64,1)]">

        <div className="p-[22px] px-6 pb-[18px] border-b border-line flex items-center justify-between">
          <span className="font-serif text-[21px] font-normal text-ink tracking-[-0.4px]">
            New <em className="font-light italic text-ink2">project</em>
          </span>
          <button
            className="w-7 h-7 rounded-[7px] text-ink3 hover:bg-paper4 hover:text-red flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <X className="w-[17px] h-[17px]" strokeWidth={2} />
          </button>
        </div>

        <div className="p-[22px] px-6 flex flex-col gap-[18px]">
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Project name</label>
            <input
              className="finput"
              placeholder="e.g. Website redesign, Q3 planning"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Color</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {PALETTE.map(c => (
                <div
                  key={c}
                  className={`w-[26px] h-[26px] rounded-full cursor-pointer transition-all duration-150
                    ${color === c ? 'scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-paper3' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 px-6 border-t border-line flex justify-end gap-2.5">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handleSave}>Create project</button>
        </div>
      </div>
    </div>
  );
};
