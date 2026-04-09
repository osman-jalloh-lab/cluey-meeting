import React, { useState } from 'react';
import { X, Mic, Square, Loader2, Trash, FileText } from 'lucide-react';
import type { Meeting, Project } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { useAI } from '../hooks/useAI';

interface NewRecapModalProps {
  projects: Project[];
  history: Meeting[];
  prefillData?: { person: string; title: string };
  onClose: () => void;
  onSave: (m: Meeting) => void;
}

export const NewRecapModal: React.FC<NewRecapModalProps> = ({ projects, history, prefillData, onClose, onSave }) => {
  const [who, setWho]     = useState(prefillData?.person || '');
  const [type, setType]   = useState<Meeting['type']>('1:1');
  const [projId, setProjId] = useState('');
  const TEMPLATE = `## What was discussed\n- \n\n## Key decisions\n- \n\n## Action items\n- \n\n## Follow-ups / Commitments\n- `;
  const [notes, setNotes] = useState(prefillData?.title ? `## What was discussed\n- ${prefillData.title}\n\n## Key decisions\n- \n\n## Action items\n- \n\n## Follow-ups / Commitments\n- ` : '');

  const { isRecording, transcript, setTranscript, interim, seconds, isSupported, toggleRec, reset } = useSpeech();
  const { summarize, isProcessing } = useAI();

  const handleSave = async () => {
    if (!who.trim()) return alert('Who was the meeting with?');
    const finalRaw = notes.trim() || transcript.trim();
    if (!finalRaw) return alert('Add notes or record your voice');
    if (isRecording) toggleRec();

    const proj = projects.find(p => p.id === projId);
    const personHistory = history.filter(h => h.person.toLowerCase() === who.toLowerCase());
    const result = await summarize(finalRaw, who, proj?.name || '', personHistory);

    if (result) {
      onSave({
        id: Date.now().toString(),
        person: who.trim(),
        projId,
        type,
        rawNotes: finalRaw,
        summary: result.summary,
        decisions: result.decisions,
        actions: result.actions,
        commitments: result.commitments.map(t => ({ text: t, done: false })),
        tags: result.tags,
        isVoice: !!transcript.trim(),
        createdAt: new Date().toISOString()
      });
      reset();
      onClose();
    }
  };

  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const selectCls = `finput appearance-none cursor-pointer bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2211%22_height=%2211%22_viewBox=%220_0_24_24%22_fill=%22none%22_stroke=%22%235a5446%22_stroke-width=%222%22%3E%3Cpath_d=%22M6_9l6_6_6-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] pr-8`;

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[200] backdrop-blur-[8px] animate-[overlayIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-paper3 border border-line2 rounded-[20px] w-[580px] max-w-[96vw] max-h-[92vh] overflow-y-auto custom-scrollbar shadow-card-hover animate-[modalIn_0.22s_cubic-bezier(0.34,1.15,0.64,1)]">

        {/* Header */}
        <div className="p-[22px] px-6 pb-[18px] border-b border-line flex items-center justify-between sticky top-0 bg-paper3 z-10">
          <div className="flex items-center gap-3">
             <span className="font-serif text-[21px] font-normal text-ink tracking-[-0.4px]">
               New <em className="font-light italic text-ink2">recap</em>
             </span>
             {prefillData && (
                <span className="px-2.5 py-1 rounded-full bg-blue-bg/40 border border-blue/20 text-blue-ink text-[10px] uppercase tracking-wider font-semibold font-mono">
                  From Calendar
                </span>
             )}
          </div>
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
              <input className="finput" placeholder="Anna, Marcus…" value={who} onChange={e => setWho(e.target.value)} disabled={isProcessing} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Meeting type</label>
              <select className={selectCls} value={type} onChange={e => setType(e.target.value as Meeting['type'])} disabled={isProcessing}>
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
            <select className={selectCls} value={projId} onChange={e => setProjId(e.target.value)} disabled={isProcessing}>
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Record or type your recap</label>

            <div className={`bg-paper2 border-[1.5px] border-dashed rounded-[14px] p-[18px] flex flex-col gap-3.5 transition-colors duration-200
              ${isRecording ? 'border-ink3/40 bg-paper4' : 'border-line2'}`}>

              {!isSupported && (
                <div className="bg-amber-bg border border-amber/20 text-amber-ink rounded-[8px] p-2.5 px-3 text-[12px] leading-[1.6]">
                  Your browser doesn't support voice. Use Chrome or Edge, or just type below.
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-[1.5px] font-sans text-[13px] font-medium cursor-pointer transition-all duration-150 tracking-[-0.1px]
                    ${isRecording
                      ? 'bg-paper text-ink border-ink3/50 hover:bg-paper3'
                      : 'bg-paper3 border-line2 text-ink hover:border-ink3 hover:bg-paper4'
                    }`}
                  onClick={toggleRec}
                  disabled={!isSupported || isProcessing}
                >
                  {isRecording ? (
                    <>
                      <div className="w-[8px] h-[8px] rounded-full bg-current shrink-0 animate-[pulseDot_1s_ease_infinite]" />
                      <Square className="w-[12px] h-[12px]" /> Stop
                    </>
                  ) : (
                    <>
                      <div className="w-[8px] h-[8px] rounded-full bg-lime shrink-0" />
                      <Mic className="w-[12px] h-[12px]" /> Record
                    </>
                  )}
                </button>
                {isRecording && (
                  <span className="text-[12px] text-ink4 font-mono tabular-nums">{formatTime(seconds)}</span>
                )}
                {!isRecording && transcript && (
                  <button 
                    onClick={reset}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-line2 hover:border-red/40 hover:bg-red-bg/50 text-red-ink/90 hover:text-red transition-colors font-sans text-[12px] font-medium ml-auto"
                  >
                    <Trash className="w-[14px] h-[14px] opacity-70" /> Discard
                  </button>
                )}
              </div>

              <textarea 
                className={`w-full min-h-[64px] bg-paper3 border border-line rounded-[10px] p-3 px-3.5 text-[13px] leading-[1.65] transition-colors resize-y outline-none focus:border-ink3/50
                  ${(transcript || interim) ? 'text-ink' : 'text-ink3 italic'}`}
                value={isRecording && interim ? transcript + ' ' + interim : transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={isRecording || isProcessing}
                placeholder="Tap record and speak — your words appear here in real time. Pause to edit them."
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-[11px] text-ink4 tracking-[0.06em] my-3.5 font-mono
              before:content-[''] before:flex-1 before:h-px before:bg-line
              after:content-[''] after:flex-1 after:h-px after:bg-line">
              or type
            </div>

            {/* Template button */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-ink3 font-mono tracking-wider uppercase">Notes</span>
              {!notes && (
                <button
                  type="button"
                  onClick={() => setNotes(TEMPLATE)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-[11px] font-medium font-mono text-ink3 hover:text-lime border border-line2 hover:border-lime/30 px-2.5 py-1 rounded-[7px] transition-all duration-150"
                >
                  <FileText className="w-[11px] h-[11px]" />
                  Use template
                </button>
              )}
              {notes && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-[11px] font-medium font-mono text-ink4 hover:text-red-ink border border-transparent hover:border-red/20 px-2.5 py-1 rounded-[7px] transition-all duration-150"
                >
                  <Trash className="w-[11px] h-[11px]" />
                  Clear
                </button>
              )}
            </div>

            <textarea
              className="finput resize-y min-h-[200px] leading-[1.75] font-mono text-[12.5px]"
              placeholder="Click \"Use template\" above to get started, or write freely here…"
              rows={8}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {isProcessing && (
            <div className="flex items-center gap-[9px] p-2.5 px-3.5 bg-lime-bg border border-lime/20 rounded-[10px] text-[12px] text-lime-ink font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Claude is reading your notes…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-line flex justify-end gap-2.5 sticky bottom-0 bg-paper3">
          <button className="btn btn-outline" onClick={onClose} disabled={isProcessing}>Cancel</button>
          <button className="btn btn-dark" onClick={handleSave} disabled={isProcessing}>Save & summarize →</button>
        </div>
      </div>
    </div>
  );
};
