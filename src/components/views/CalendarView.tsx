import React, { useState } from 'react';
import { CalendarDays, Clock, Mail, Send, CheckCircle2, AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useCalendar } from '../../hooks/useCalendar';
import { useAuth } from '../../context/AuthContext';
import type { CalendarEvent } from '../../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function fmtTime(iso: string): string {
  if (!iso.includes('T')) return 'All day';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function groupByDate(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = ev.startTime.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries());
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

function dateLabel(key: string): string {
  if (key === todayStr()) return 'Today';
  if (key === tomorrowStr()) return 'Tomorrow';
  return new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 px-4 py-3 animate-pulse">
      <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3.5 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ─── Event card ──────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const isPast = event.status === 'past';
  return (
    <div
      className={`flex items-start gap-4 px-4 py-3 rounded-xl transition-opacity ${isPast ? 'opacity-50' : 'opacity-100'}`}
      style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: isPast ? 'var(--paper-3)' : 'var(--accent-soft)' }}
      >
        <CalendarDays
          size={16}
          strokeWidth={1.8}
          style={{ color: isPast ? 'var(--ink-4)' : 'var(--accent-ink)' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{
            color: 'var(--ink)',
            textDecoration: isPast ? 'line-through' : 'none',
          }}
        >
          {event.title}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}
          >
            <Clock size={11} strokeWidth={1.6} />
            {fmtTime(event.startTime)}
            {event.endTime && event.endTime !== event.startTime && (
              <> – {fmtTime(event.endTime)}</>
            )}
          </span>
          {event.attendees.length > 0 && (
            <span
              className="text-xs truncate max-w-[160px]"
              style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
            >
              {event.attendees.slice(0, 2).join(', ')}
              {event.attendees.length > 2 && ` +${event.attendees.length - 2}`}
            </span>
          )}
        </div>
        {event.description && (
          <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--ink-3)' }}>
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Create-invite form ──────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '',
  endTime: '',
  attendeeEmail: '',
};

function InviteForm({ onSuccess }: { onSuccess: () => void }) {
  const { isGuest, login } = useAuth();
  const { createEvent } = useCalendar(!isGuest);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (isGuest) {
    return (
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
        style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent-soft)' }}
        >
          <LogIn size={20} strokeWidth={1.8} style={{ color: 'var(--accent-ink)' }} />
        </div>
        <div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>
            Sign in to send meeting invites
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            Please sign in with Google to create Google Calendar events and send invites to attendees.
          </p>
        </div>
        <button
          onClick={login}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink)'; }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!form.title.trim()) return setFormError('Meeting title is required.');
    if (!form.date) return setFormError('Date is required.');
    if (!form.startTime) return setFormError('Start time is required.');
    if (!form.endTime) return setFormError('End time is required.');
    if (!form.attendeeEmail.trim()) return setFormError('Invitee email is required.');

    const startISO = `${form.date}T${form.startTime}:00`;
    const endISO = `${form.date}T${form.endTime}:00`;

    if (new Date(endISO) <= new Date(startISO)) {
      return setFormError('End time must be after start time.');
    }

    setSubmitting(true);
    try {
      await createEvent({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startTime: startISO,
        endTime: endISO,
        attendeeEmail: form.attendeeEmail.trim(),
      });
      setSuccessMsg(`Invite sent to ${form.attendeeEmail.trim()}! They'll receive a Google Calendar invitation.`);
      setForm(EMPTY_FORM);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send invite.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid var(--line)',
    background: 'var(--paper)',
    color: 'var(--ink)',
    font: '400 13px/1.4 var(--font-ui)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    marginBottom: 5,
    fontFamily: 'var(--font-mono)',
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label style={labelStyle} htmlFor="cal-title">Meeting Title</label>
        <input
          id="cal-title"
          type="text"
          value={form.title}
          onChange={set('title')}
          placeholder="e.g. Product sync with Sarah"
          style={inputStyle}
          disabled={submitting}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle} htmlFor="cal-desc">Description <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
        <textarea
          id="cal-desc"
          value={form.description}
          onChange={set('description')}
          placeholder="Agenda, topics to cover…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          disabled={submitting}
        />
      </div>

      {/* Date */}
      <div>
        <label style={labelStyle} htmlFor="cal-date">Date</label>
        <input
          id="cal-date"
          type="date"
          value={form.date}
          onChange={set('date')}
          style={inputStyle}
          disabled={submitting}
        />
      </div>

      {/* Start / End time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle} htmlFor="cal-start">Start Time</label>
          <input
            id="cal-start"
            type="time"
            value={form.startTime}
            onChange={set('startTime')}
            style={inputStyle}
            disabled={submitting}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="cal-end">End Time</label>
          <input
            id="cal-end"
            type="time"
            value={form.endTime}
            onChange={set('endTime')}
            style={inputStyle}
            disabled={submitting}
          />
        </div>
      </div>

      {/* Invitee email */}
      <div>
        <label style={labelStyle} htmlFor="cal-email">
          <span className="flex items-center gap-1.5">
            <Mail size={10} strokeWidth={2} /> Invitee Email
          </span>
        </label>
        <input
          id="cal-email"
          type="email"
          value={form.attendeeEmail}
          onChange={set('attendeeEmail')}
          placeholder="colleague@example.com"
          style={inputStyle}
          disabled={submitting}
        />
        <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
          They'll receive a Google Calendar invite via email.
        </p>
      </div>

      {/* Error */}
      {formError && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: 'var(--danger-bg, #fff1f2)', color: 'var(--danger-ink, #be123c)', border: '1px solid color-mix(in oklch, #be123c 25%, transparent)' }}
        >
          <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
          {formError}
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)' }}
        >
          <CheckCircle2 size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
          {successMsg}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        id="cal-send-invite-btn"
        disabled={submitting}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
        style={{
          background: 'var(--accent, #a3e635)',
          color: 'var(--accent-ink, #1a1a1a)',
          border: 'none',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? (
          <><Loader2 size={14} strokeWidth={2} className="animate-spin" /> Sending…</>
        ) : (
          <><Send size={14} strokeWidth={2} /> Send Invite</>
        )}
      </button>
    </form>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export const CalendarView: React.FC = () => {
  const { isGuest, user } = useAuth();
  const isAuthenticated = !!user && !isGuest;
  const { events, loading, error, refetch } = useCalendar(isAuthenticated);

  const grouped = groupByDate(events.filter(e => e.status === 'upcoming'));

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--paper)', overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Calendar
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {isGuest ? 'Sign in to sync your Google Calendar' : 'Your upcoming meetings'}
          </p>
        </div>
      </div>

      {/* Body — two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: event list */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{ borderRight: '1px solid var(--line)', minWidth: 0 }}
        >
          {loading ? (
            <div className="py-4">
              {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-8 text-center">
              <AlertCircle size={28} strokeWidth={1.4} style={{ color: 'var(--ink-4)' }} />
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{error}</p>
              {!isGuest && (
                <button
                  onClick={refetch}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', color: 'var(--ink-3)', cursor: 'pointer' }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : isGuest ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-8 text-center">
              <CalendarDays size={36} strokeWidth={1.2} style={{ color: 'var(--ink-4)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                No calendar connected
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                Sign in with Google to see your upcoming meetings here.
              </p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-8 text-center">
              <CalendarDays size={36} strokeWidth={1.2} style={{ color: 'var(--ink-4)' }} />
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                No upcoming events in the next 30 days.
              </p>
            </div>
          ) : (
            <div className="py-4 px-4 flex flex-col gap-6">
              {grouped.map(([dateKey, dayEvents]) => (
                <section key={dateKey}>
                  <h2
                    className="px-1 mb-2 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
                  >
                    {dateLabel(dateKey)}
                    <span className="ml-2 font-normal normal-case tracking-normal" style={{ color: 'var(--ink-4)' }}>
                      {fmtDate(dateKey)}
                    </span>
                  </h2>
                  <div className="flex flex-col gap-2">
                    {dayEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Right: invite form */}
        <div
          className="w-80 shrink-0 overflow-y-auto custom-scrollbar"
          style={{ minWidth: 300, maxWidth: 340 }}
        >
          <div className="p-6">
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              Send Meeting Invite
            </h2>
            <p className="text-xs mb-5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              Create a Google Calendar event and invite someone via email.
            </p>
            <InviteForm onSuccess={refetch} />
          </div>
        </div>

      </div>
    </div>
  );
};
