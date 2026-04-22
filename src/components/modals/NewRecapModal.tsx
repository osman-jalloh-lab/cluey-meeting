import React, { useState } from 'react';
import { X, Loader2, AlertTriangle, RefreshCw, Plus, UserRound, Mail, CalendarDays, ArrowLeft } from 'lucide-react';
import type { Meeting, Project, Task } from '../../types';
import { useAI, type AIResult } from '../../hooks/useAI';
import { useAuth } from '../../context/AuthContext';
import { sendTaskCreatedEmail } from '../../utils/emailjs';

interface NewRecapModalProps {
  projects: Project[];
  history: Meeting[];
  prefillData?: { person: string; title: string; notes?: string; calendarEventId?: string };
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
  calendarEventId?: string;
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
  const [discussions, setDiscussions] = useState(() => {
    if (!prefillData) return '';
    const parts = [prefillData.title].filter(Boolean);
    if (prefillData.notes) parts.push(prefillData.notes);
    return parts.join('\n\n');
  });
  const [actionItems, setActionItems] = useState('');
  const [followups, setFollowups] = useState('');

  const [aiError, setAiError] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  // Step 2 — task review
  const [taskStep, setTaskStep] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { summarize, isProcessing } = useAI();

  const buildRawNotes = () => {
    const parts: string[] = [];
    if (who.trim()) parts.push(`TOPIC: ${who.trim()}`);
    if (discussions.trim()) parts.push(`KEY DISCUSSIONS:\n${discussions.trim()}`);
    if (actionItems.trim()) parts.push(`ACTION ITEMS:\n${actionItems.trim()}`);
    if (followups.trim()) parts.push(`FOLLOW-UPS:\n${followups.trim()}`);
    return parts.join('\n\n');
  };

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
    calendarEventId: save.calendarEventId,
  });

  const doSave = (save: PendingSave, tasks: Task[] = []) => {
    onSave(buildMeeting(save, tasks));
    onClose();
  };

  const buildBasicSave = (): PendingSave => {
    const finalRaw = buildRawNotes();
    return {
      who: who.trim(),
      finalRaw,
      type,
      projId,
      result: { summary: finalRaw, decisions: [], actions: [], commitments: [], tags: [], aiSucceeded: false },
      isVoice: false,
      calendarEventId: prefillData?.calendarEventId,
    };
  };

  const handleSaveDirect = () => {
    if (!who.trim()) return alert('Add a course / topic first');
    const finalRaw = buildRawNotes();
    if (!discussions.trim() && !actionItems.trim() && !followups.trim()) {
      return alert('Add notes in at least one section');
    }
    doSave({ ...buildBasicSave(), result: { summary: finalRaw, decisions: [], actions: [], commitments: [], tags: [], aiSucceeded: false } }, []);
  };

  const handleSummarize = async () => {
    if (!who.trim()) return alert('Add a course / topic first');
    const finalRaw = buildRawNotes();
    if (!finalRaw.trim() || (!discussions.trim() && !actionItems.trim() && !followups.trim())) {
      return alert('Add notes in at least one section');
    }

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
      isVoice: false,
      calendarEventId: prefillData?.calendarEventId,
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
              onClick={() => { if (pendingSave) doSave(pendingSave, taskDrafts.filter(d => d.text.trim()).map(d => ({ id: d.id, text: d.text.trim(), done: false, assignee: d.assignee.trim() || undefined, dueDate: d.dueDate || undefined }))); else onClose(); }}
              disabled={isSaving}
              title="Save and close"
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
              <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Course / Topic</label>
              <input className="finput" placeholder="e.g. Biology 101, Project kickoff…" value={who} onChange={e => setWho(e.target.value)} disabled={isProcessing} />
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

          {/* Structured notes */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Key Discussions</label>
              <textarea
                className="finput resize-y leading-[1.75] font-mono text-[12.5px]"
                placeholder="What was covered in this meeting?"
                rows={4}
                value={discussions}
                onChange={e => setDiscussions(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Action Items</label>
              <textarea
                className="finput resize-y leading-[1.75] font-mono text-[12.5px]"
                placeholder="• One item per line"
                rows={3}
                value={actionItems}
                onChange={e => setActionItems(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink3 mb-[7px] font-mono">Follow-ups</label>
              <textarea
                className="finput resize-y leading-[1.75] font-mono text-[12.5px]"
                placeholder="• Follow-ups and commitments"
                rows={3}
                value={followups}
                onChange={e => setFollowups(e.target.value)}
                disabled={isProcessing}
              />
            </div>
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
        <div className="p-4 px-6 border-t border-line flex justify-between gap-2.5 sticky bottom-0 bg-paper3">
          <button className="btn btn-outline" onClick={onClose} disabled={isProcessing}>Cancel</button>
          <div className="flex gap-2.5">
            <button
              className="btn btn-outline text-[12px]"
              onClick={handleSaveDirect}
              disabled={isProcessing}
              title="Save notes as-is without AI summarization"
            >
              Save notes
            </button>
            <button className="btn btn-dark" onClick={handleSummarize} disabled={isProcessing || !!aiError}>
              {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" />Summarizing…</> : 'AI Review →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
