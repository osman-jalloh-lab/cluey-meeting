import React, { useState } from 'react';
import { X, Mic, Square, Loader2, Trash, FileText, AlertTriangle, RefreshCw, Plus, UserRound, Mail, CalendarDays, ArrowLeft } from 'lucide-react';
import type { Meeting, Project, Task } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { useAI, type AIResult } from '../hooks/useAI';
import { useAuth } from '../context/AuthContext';
import { sendTaskCreatedEmail } from '../utils/emailjs';

interface NewRecapModalProps {
  projects: Project[];
  history: Meeting[];
  prefillData?: { person: string; title: string };
  onClose: () => void;
  onSave: (m: Meeting) => void;
}

interface PendingSave {
  who: string;
  finalRaw: string;
  type: Meeting['type'];
  projId: string;
  result: AIResult;
  isVoice: boolean;
}

interface TaskDraft {
  id: string;
  text: string;
  assignee: string;
  email: string;
  dueDate: string;
}

const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

export const NewRecapModal: React.FC<NewRecapModalProps> = ({ projects, history, prefillData, onClose, onSave }) => {
  const { user } = useAuth();

  const [who, setWho] = useState(prefillData?.person || '');
  const [type, setType] = useState<Meeting['type']>('1:1');
  const [projId, setProjId] = useState('');
  const TEMPLATE = `WHAT WAS DISCUSSED\n——————————————————\n• \n\nKEY DECISIONS\n——————————————————\n• \n\nACTION ITEMS\n——————————————————\n• \n\nFOLLOW-UPS & COMMITMENTS\n——————————————————\n• `;
  const [notes, setNotes] = useState(prefillData?.title ? `## What was discussed\n- ${prefillData.title}\n\n## Key decisions\n- \n\n## Action items\n- \n\n## Follow-ups / Commitments\n- ` : '');

  const [aiError, setAiError] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  // Step 2 — task review
  const [taskStep, setTaskStep] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { isRecording, transcript, setTranscript, interim, seconds, isSupported, error: speechError, toggleRec, reset } = useSpeech();
  const { summarize, isProcessing } = useAI();

  const buildMeeting = (save: PendingSave, tasks: Task[]): Meeting => ({
    id: Date.now().toString(),
    person: save.who,
    projId: save.projId,
    type: save.type,
    rawNotes: save.finalRaw,
    summary: save.result.summary,
    decisions: save.result.decisions,
    actions: save.result.actions,
    commitments: save.result.commitments.map(t => ({ text: t, done: false })),
    tasks,
    tags: save.result.tags,
    isVoice: save.isVoice,
    createdAt: new Date().toISOString(),
  });

  const doSave = (save: PendingSave, tasks: Task[] = []) => {
    onSave(buildMeeting(save, tasks));
    reset();
    onClose();
  };

  const handleSummarize = async () => {
    if (!who.trim()) return alert('Who was the meeting with?');
    const finalRaw = notes.trim() || transcript.trim();
    if (!finalRaw) return alert('Add notes or record your voice');
    if (isRecording) toggleRec();

    setAiError(false);
    setPendingSave(null);

    const proj = projects.find(p => p.id === projId);
    const personHistory = history.filter(h => h.person.toLowerCase() === who.toLowerCase());
    const result = await summarize(finalRaw, who, proj?.name || '', personHistory);

    const save: PendingSave = {
      who: who.trim(),
      finalRaw,
      type,
      projId,
      result,
      isVoice: !!transcript.trim(),
    };

    if (!result.aiSucceeded) {
      setAiError(true);
      setPendingSave(save);
      return;
    }

    // Combine actions + commitments as task drafts for step 2
    const drafts: TaskDraft[] = [
      ...result.actions.map(text => ({ id: uid(), text, assignee: who.trim(), email: '', dueDate: '' })),
      ...result.commitments.map(text => ({ id: uid(), text, assignee: who.trim(), email: '', dueDate: '' })),
    ];
    setPendingSave(save);
    setTaskDrafts(drafts);
    setTaskStep(true);
  };

  const handleFinalSave = async () => {
    if (!pendingSave) return;
    setIsSaving(true);

    const tasks: Task[] = taskDrafts.map(d => ({
      id: d.id,
      text: d.text.trim(),
      done: false,
      assignee: d.assignee.trim() || undefined,
      assigneeEmail: d.email.trim() || undefined,
      dueDate: d.dueDate || undefined,
    }));

    // Fire task creation emails (fire-and-forget, don't block save)
    const meetingDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    for (const t of tasks) {
      if (t.assigneeEmail) {
        sendTaskCreatedEmail({
          to_name: t.assignee || 'Team',
          to_email: t.assigneeEmail,
          from_name: user?.name || 'Someone',
          task_text: t.text,
          meeting_with: pendingSave.who,
          due_date: t.dueDate ? new Date(t.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date',
          meeting_date: meetingDate,
        });
      }
    }

    doSave(pendingSave, tasks);
    setIsSaving(false);
  };

  const updateDraft = (id: string, field: keyof TaskDraft, value: string) =>
    setTaskDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

  const removeDraft = (id: string) =>
    setTaskDrafts(prev => prev.filter(d => d.id !== id));

  const addDraft = () =>
    setTaskDrafts(prev => [...prev, { id: uid(), text: '', assignee: who.trim(), email: '', dueDate: '' }]);

  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const selectCls = `finput appearance-none cursor-pointer bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2211%22_height=%2211%22_viewBox=%220_0_24_24%22_fill=%22none%22_stroke=%22%235a5446%22_stroke-width=%222%22%3E%3Cpath_d=%22M6_9l6_6_6-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] pr-8`;

  // ─── Step 2: Task Review ────────────────────────────────────────────────────
  if (taskStep && pendingSave) {
    return (
      <div
        className="fixed inset-0 bg-black/75 flex items-center justify-center z-[200] backdrop-blur-[8px] animate-[overlayIn_0.2s_ease]"
        onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
      >
        <div className="bg-paper3 border border-line2 rounded-[20px] w-[580px] max-w-[96vw] max-h-[92vh] flex flex-col shadow-card-hover animate-[modalIn_0.22s_cubic-bezier(0.34,1.15,0.64,1)]">
          {/* Header */}
          <div className="p-[22px] px-6 pb-[18px] border-b border-line flex items-center justify-between shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="font-serif text-[21px] font-normal text-ink tracking-[-0.4px]">
                Review <em className="font-light italic text-ink2">tasks</em>
              </span>
              <span className="text-[11px] text-ink3 font-mono">Edit, assign, and set due dates before saving</span>
            </div>
            <button
              className="w-7 h-7 rounded-[7px] text-ink3 hover:bg-paper4 hover:text-red flex items-center justify-center transition-colors"
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="w-[17px] h-[17px]" strokeWidth={2} />
            </button>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto p-[22px] px-6 flex flex-col gap-3 custom-scrollbar">
            {taskDrafts.length === 0 && (
              <div className="text-center py-8 text-ink3 text-[13px]">
                No tasks extracted — add one manually or save without tasks.
              </div>
            )}

            {taskDrafts.map((draft, idx) => (
              <div
                key={draft.id}
                className="bg-paper2 border border-line rounded-[12px] p-3.5 flex flex-col gap-2.5 animate-[cardIn_0.2s_ease]"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Task text + remove */}
                <div className="flex items-start gap-2">
                  <textarea
                    className="flex-1 bg-transparent text-[13px] text-ink leading-[1.6] resize-none outline-none min-h-[40px]"
                    value={draft.text}
                    onChange={e => updateDraft(draft.id, 'text', e.target.value)}
                    rows={2}
                    disabled={isSaving}
                  />
                  <button
                    onClick={() => removeDraft(draft.id)}
                    className="w-6 h-6 rounded-[6px] text-ink3 hover:bg-red-bg hover:text-red flex items-center justify-center transition-colors shrink-0 mt-0.5"
                    disabled={isSaving}
                  >
                    <X className="w-[13px] h-[13px]" />
                  </button>
                </div>

                {/* Assignee + due date */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <UserRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-ink3 pointer-events-none" />
                    <input
                      className="finput pl-7 text-[12px]"
                      placeholder="Assigned to"
                      value={draft.assignee}
                      onChange={e => updateDraft(draft.id, 'assignee', e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="relative">
                    <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-ink3 pointer-events-none" />
                    <input
                      type="date"
                      className="finput pl-7 text-[12px]"
                      value={draft.dueDate}
                      onChange={e => updateDraft(draft.id, 'dueDate', e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-ink3 pointer-events-none" />
                  <input
                    type="email"
                    className="finput pl-7 text-[12px]"
                    placeholder="Assignee email — sends a notification (optional)"
                    value={draft.email}
                    onChange={e => updateDraft(draft.id, 'email', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addDraft}
              disabled={isSaving}
              className="flex items-center gap-2 text-[12px] text-ink3 hover:text-lime border border-dashed border-line2 hover:border-lime/30 rounded-[10px] px-4 py-3 transition-all duration-150 font-medium"
            >
              <Plus className="w-[13px] h-[13px]" />
              Add task
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-line flex items-center justify-between shrink-0 bg-paper3">
            <button
              className="flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors font-medium"
              onClick={() => setTaskStep(false)}
              disabled={isSaving}
            >
              <ArrowLeft className="w-[14px] h-[14px]" />
              Back
            </button>
            <div className="flex gap-2.5">
              <button
                className="btn btn-outline text-[12px]"
                onClick={() => doSave(pendingSave, [])}
                disabled={isSaving}
              >
                Skip tasks
              </button>
              <button
                className="btn btn-dark flex items-center gap-2"
                onClick={handleFinalSave}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save recap{taskDrafts.some(d => d.email) ? ' & notify' : ''} →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 1: Notes Input ────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[200] backdrop-blur-[8px] animate-[overlayIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
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
                  Your browser doesn't support voice recording. Use Chrome or Edge, or type your notes below.
                </div>
              )}
              {speechError && (
                <div className="bg-red-bg border border-red/20 text-red-ink rounded-[8px] p-2.5 px-3 text-[12px] leading-[1.6] flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
                  {speechError}
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

            <div className="flex items-center gap-3 text-[11px] text-ink4 tracking-[0.06em] my-3.5 font-mono
              before:content-[''] before:flex-1 before:h-px before:bg-line
              after:content-[''] after:flex-1 after:h-px after:bg-line">
              or type
            </div>

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
              placeholder="Use the template button above, or write freely here..."
              rows={8}
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

          {aiError && pendingSave && !isProcessing && (
            <div className="flex flex-col gap-2.5 p-3 px-3.5 bg-red-bg border border-red/20 rounded-[10px]">
              <div className="flex items-start gap-2 text-[12px] text-red-ink">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
                <span>AI summarization failed — check your connection or API key. Your notes are safe.</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-paper2 border border-line2 text-ink2 text-[12px] font-medium hover:border-ink3/40 transition-colors"
                  onClick={() => { setAiError(false); setPendingSave(null); handleSummarize(); }}
                >
                  <RefreshCw className="w-[12px] h-[12px]" />
                  Retry
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-paper2 border border-line2 text-ink3 text-[12px] font-medium hover:border-ink3/40 transition-colors"
                  onClick={() => doSave(pendingSave, [])}
                >
                  Save anyway (no AI summary)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-line flex justify-end gap-2.5 sticky bottom-0 bg-paper3">
          <button className="btn btn-outline" onClick={onClose} disabled={isProcessing}>Cancel</button>
          <button className="btn btn-dark" onClick={handleSummarize} disabled={isProcessing || !!aiError}>
            {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" />Summarizing…</> : 'Review tasks →'}
          </button>
        </div>
      </div>
    </div>
  );
};
