import React, { useState } from 'react';
import { X, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Meeting, Project } from '../types';
import { useAI } from '../hooks/useAI';

interface EditRecapModalProps {
  meeting: Meeting;
  projects: Project[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Meeting>) => void;
}

export const EditRecapModal: React.FC<EditRecapModalProps> = ({ meeting, projects, onClose, onSave }) => {
  const [who, setWho]     = useState(meeting.person);
  const [type, setType]   = useState<Meeting['type']>(meeting.type);
  const [projId, setProjId] = useState(meeting.projId);
  const [notes, setNotes] = useState(meeting.rawNotes);
  const [aiError, setAiError] = useState(false);

  const { summarize, isProcessing } = useAI();

  const selectCls = `finput appearance-none cursor-pointer bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2211%22_height=%2211%22_viewBox=%220_0_24_24%22_fill=%22none%22_stroke=%22%235a5446%22_stroke-width=%222%22%3E%3Cpath_d=%22M6_9l6_6_6-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] pr-8`;

  // Save metadata only — keeps existing AI-generated fields
  const handleSaveMeta = () => {
    if (!who.trim()) return alert('Who was the meeting with?');
    onSave(meeting.id, { person: who.trim(), type, projId, rawNotes: notes });
    onClose();
  };

  // Re-run AI on updated notes, then save everything
  const handleResummarize = async () => {
    if (!who.trim()) return alert('Who was the meeting with?');
    if (!notes.trim()) return alert('Notes are empty — add content before summarizing.');

    setAiError(false);
    const proj = projects.find(p => p.id === projId);
    const result = await summarize(notes, who, proj?.name || '', []);

    if (!result.aiSucceeded) {
      setAiError(true);
      return;
    }

    onSave(meeting.id, {
      person: who.trim(),
      type,
      projId,
      rawNotes: notes,
      summary: result.summary,
      decisions: result.decisions,
      actions: result.actions,
      commitments: result.commitments.map(t => ({ text: t, done: false })),
      tags: result.tags,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[200] backdrop-blur-[8px] animate-[overlayIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
    >
      <div className="bg-paper3 border border-line2 rounded-[20px] w-[560px] max-w-[96vw] max-h-[90vh] overflow-y-auto custom-scrollbar shadow-card-hover animate-[modalIn_0.22s_cubic-bezier(0.34,1.15,0.64,1)]">

        {/* Header */}
        <div className="p-[22px] px-6 pb-[18px] border-b border-line flex items-center justify-between sticky top-0 bg-paper3 z-10">
          <span className="font-serif text-[21px] font-normal text-ink tracking-[-0.4px]">
            Edit <em className="font-light italic text-ink2">recap</em>
          </span>
          <button
            className="w-7 h-7 rounded-[7px] text-ink3 hover:bg-paper4 hover:text-red flex items-center justify-center transition-colors"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X className="w-[17px] h-[17px]" strokeWidth={2} />
          </button>
        </div>

        <div className="p-[22px] px-6 flex flex-col gap-[18px]">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Who was this with?</label>
              <input
                className="finput"
                value={who}
                onChange={e => setWho(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Meeting type</label>
              <select
                className={selectCls}
                value={type}
                onChange={e => setType(e.target.value as Meeting['type'])}
                disabled={isProcessing}
              >
                <option value="1:1">1:1</option>
                <option value="Team">Team</option>
                <option value="Client">Client call</option>
                <option value="Interview">Interview</option>
                <option value="Standup">Standup</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Project</label>
            <select
              className={selectCls}
              value={projId}
              onChange={e => setProjId(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">
              Notes
              <span className="ml-2 text-ink4 normal-case tracking-normal font-normal">— edit and re-summarize to update the AI analysis</span>
            </label>
            <textarea
              className="finput resize-y min-h-[200px] leading-[1.75] font-mono text-[12.5px]"
              rows={10}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {isProcessing && (
            <div className="flex items-center gap-[9px] p-2.5 px-3.5 bg-lime-bg border border-lime/20 rounded-[10px] text-[12px] text-lime-ink font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Summarizing your notes…
            </div>
          )}

          {aiError && !isProcessing && (
            <div className="flex items-center gap-2 p-2.5 px-3.5 bg-red-bg border border-red/20 rounded-[10px] text-[12px] text-red-ink">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              AI summarization failed. Check your connection and try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-line flex items-center justify-between gap-2.5 sticky bottom-0 bg-paper3">
          <button className="btn btn-outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <div className="flex gap-2.5">
            <button
              className="btn btn-outline flex items-center gap-1.5"
              onClick={handleResummarize}
              disabled={isProcessing || !notes.trim()}
              title="Re-run AI on the edited notes and save"
            >
              <RefreshCw className="w-[13px] h-[13px]" />
              Re-summarize
            </button>
            <button
              className="btn btn-dark"
              onClick={handleSaveMeta}
              disabled={isProcessing}
              title="Save changes without re-running AI"
            >
              Save changes →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
