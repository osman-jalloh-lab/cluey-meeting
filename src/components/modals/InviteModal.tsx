import React, { useState } from 'react';
import { X, Mail, UserPlus, Trash2, Send, Check, Loader2 } from 'lucide-react';
import type { Project, ProjectMember } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { sendProjectInviteEmail } from '../../utils/emailjs';

interface InviteModalProps {
  project: Project;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Project>) => void;
}

const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

interface Draft {
  id: string;
  name: string;
  email: string;
  sendInvite: boolean;
}

export const InviteModal: React.FC<InviteModalProps> = ({ project, onClose, onSave }) => {
  const { user } = useAuth();

  const [members, setMembers] = useState<ProjectMember[]>(project.members || []);
  const [drafts, setDrafts] = useState<Draft[]>([
    { id: uid(), name: '', email: '', sendInvite: true },
  ]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const updateDraft = (id: string, field: keyof Draft, value: string | boolean) =>
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

  const removeDraft = (id: string) =>
    setDrafts(prev => prev.filter(d => d.id !== id));

  const addDraftRow = () =>
    setDrafts(prev => [...prev, { id: uid(), name: '', email: '', sendInvite: true }]);

  const removeMember = (email: string) =>
    setMembers(prev => prev.filter(m => m.email !== email));

  const handleSave = async () => {
    const validDrafts = drafts.filter(d => d.name.trim() && d.email.trim());
    const newMembers: ProjectMember[] = validDrafts.map(d => ({
      name: d.name.trim(),
      email: d.email.trim(),
      invitedAt: new Date().toISOString(),
    }));

    // Merge with existing, avoid duplicates by email
    const existingEmails = new Set(members.map(m => m.email.toLowerCase()));
    const deduped = newMembers.filter(m => !existingEmails.has(m.email.toLowerCase()));
    const allMembers = [...members, ...deduped];

    onSave(project.id, { members: allMembers });

    // Send invite emails
    const toInvite = validDrafts.filter(d => d.sendInvite && d.email.trim());
    if (toInvite.length > 0) {
      setIsSending(true);
      let sent = 0;
      for (const d of toInvite) {
        const ok = await sendProjectInviteEmail({
          to_name: d.name.trim(),
          to_email: d.email.trim(),
          from_name: user?.name || 'Someone',
          project_name: project.name,
          project_description: project.description || '',
          message: message.trim(),
        });
        if (ok) sent++;
      }
      setSentCount(sent);
      setIsSending(false);
    }

    onClose();
  };

  const hasValidDrafts = drafts.some(d => d.name.trim() && d.email.trim());

  return (
    <div
      onClick={e => e.target === e.currentTarget && !isSending && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'color-mix(in oklch, var(--ink) 45%, transparent)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'overlayIn .2s' }}
    >
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', width: 500, maxWidth: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-pop)', animation: 'modalIn .22s cubic-bezier(.34,1.15,.64,1)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontStyle: 'italic', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              Invite to project
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: project.color, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{project.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Existing members */}
          {members.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 10 }}>Current members</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.map(m => (
                  <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--paper-2)', border: '1px solid var(--line)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--paper-3)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0, font: '600 11px/1 var(--font-ui)', color: 'var(--ink-3)' }}>
                      {m.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    </div>
                    {m.invitedAt && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--ok-ink)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        <Check size={10} /> invited
                      </span>
                    )}
                    <button
                      onClick={() => removeMember(m.email)}
                      disabled={isSending}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all .1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--late-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--late-ink)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new members */}
          <div>
            <div className="label" style={{ marginBottom: 10 }}>
              {members.length > 0 ? 'Add more people' : 'Add people'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drafts.map((draft, idx) => (
                <div key={draft.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="finput"
                    placeholder="Name"
                    value={draft.name}
                    onChange={e => updateDraft(draft.id, 'name', e.target.value)}
                    disabled={isSending}
                    style={{ flex: '0 0 160px' }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Mail size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none' }} />
                    <input
                      className="finput"
                      type="email"
                      placeholder="Email address"
                      value={draft.email}
                      onChange={e => updateDraft(draft.id, 'email', e.target.value)}
                      disabled={isSending}
                      style={{ width: '100%', paddingLeft: 30 }}
                    />
                  </div>
                  {/* Send invite toggle */}
                  <button
                    onClick={() => updateDraft(draft.id, 'sendInvite', !draft.sendInvite)}
                    title={draft.sendInvite ? 'Will send invite email' : 'No invite email'}
                    disabled={isSending}
                    style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${draft.sendInvite ? 'color-mix(in oklch, var(--accent) 40%, transparent)' : 'var(--line)'}`, background: draft.sendInvite ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', color: draft.sendInvite ? 'var(--accent-ink)' : 'var(--ink-4)', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all .1s' }}
                  >
                    <Send size={12} />
                  </button>
                  {drafts.length > 1 && (
                    <button
                      onClick={() => removeDraft(draft.id)}
                      disabled={isSending}
                      style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--late-ink)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'; }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addDraftRow}
              disabled={isSending}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--ink-4)', font: '400 12px/1 var(--font-ui)', cursor: 'pointer', transition: 'border-color .1s, color .1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-3)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'; }}
            >
              <UserPlus size={13} /> Add another
            </button>
          </div>

          {/* Personal message */}
          {drafts.some(d => d.sendInvite && d.email.trim()) && (
            <div>
              <div className="label" style={{ marginBottom: 7 }}>Personal message (optional)</div>
              <textarea
                className="finput"
                placeholder="Add a note to your invitation…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                disabled={isSending}
                style={{ resize: 'vertical' }}
              />
              <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                Sent via email · powered by EmailJS
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isSending}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSending || (!hasValidDrafts && members.length === (project.members?.length ?? 0))}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {isSending
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
              : drafts.some(d => d.sendInvite && d.name.trim() && d.email.trim())
                ? <><Send size={13} /> Send invites</>
                : 'Save members'
            }
          </button>
        </div>
      </div>
    </div>
  );
};
