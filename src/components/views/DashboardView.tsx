import React from 'react';
import { Calendar, Mail, CheckCircle2, ArrowRight, ExternalLink, Sparkles, Clock, User } from 'lucide-react';
import type { Meeting, Project, CalendarEvent } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useGmail } from '../../hooks/useGmail';

interface DashboardViewProps {
  meetings: Meeting[];
  projects: Project[];
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  onViewMeeting: (id: string) => void;
  onRecapEvent: (e: CalendarEvent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  meetings,
  projects,
  calendarEvents,
  calendarLoading,
  onViewMeeting,
  onRecapEvent
}) => {
  const { user } = useAuth();
  const { messages: gmailMessages, loading: gmailLoading } = useGmail(!!user);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Get next upcoming meeting
  const nextMeeting = calendarEvents.find(e => e.status === 'upcoming');
  
  // Get recent meetings that need recaps
  const needsRecap = calendarEvents
    .filter(e => e.status === 'past')
    .slice(0, 3);

  // Get open tasks
  const openTasks = meetings.flatMap(m => (m.tasks || []).filter(t => !t.done)).slice(0, 5);

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header section */}
      <header style={{ marginBottom: 48, display: 'flex', alignItems: 'center', gap: 20 }}>
        {user?.picture ? (
          <img src={user.picture} alt="" style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--paper-3)' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' }}>
            <User size={32} style={{ color: 'var(--accent-ink)' }} />
          </div>
        )}
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
            {greeting}, {firstName} <Sparkles size={24} style={{ color: 'var(--accent)' }} />
          </h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 16 }}>Here's what's happening across your workspace today.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
        
        {/* Next Meeting Card (Featured) */}
        <div style={{ gridColumn: 'span 8', gridRow: 'span 1' }}>
          <div style={{ background: 'var(--ink)', borderRadius: 24, padding: 32, color: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 200, height: 200, background: 'var(--accent)', borderRadius: '50%', opacity: 0.1, filter: 'blur(40px)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Up Next
              </span>
              <Clock size={20} style={{ opacity: 0.5 }} />
            </div>

            {nextMeeting ? (
              <>
                <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12, lineHeight: 1.2 }}>
                  <a href={nextMeeting.htmlLink} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {nextMeeting.title}
                  </a>
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.8, marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={16} /> 
                    <span>Today, {new Date(nextMeeting.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={16} />
                    <span>{nextMeeting.attendees.length} people</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={() => onRecapEvent(nextMeeting)}
                    style={{ background: 'var(--paper)', color: 'var(--ink)', border: 0, padding: '12px 24px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    Prepare Recap <ArrowRight size={18} />
                  </button>
                  {nextMeeting.meetLink && (
                    <a 
                      href={nextMeeting.meetLink} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ background: '#4285F4', color: 'white', textDecoration: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      Join Meet <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <p style={{ fontSize: 18, opacity: 0.7 }}>No more meetings scheduled for today. Enjoy the focus time!</p>
              </div>
            )}
          </div>
        </div>

        {/* Tasks/Commitments Column */}
        <div style={{ gridColumn: 'span 4', gridRow: 'span 2' }}>
          <div style={{ background: 'var(--paper-2)', borderRadius: 24, padding: 24, border: '1px solid var(--line)', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>Commitments</h3>
            </div>
            
            {openTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {openTasks.map(task => (
                  <div key={task.id} style={{ padding: 16, background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--line)' }}>
                    <p style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.4 }}>{task.text}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                        Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Soon'}
                      </span>
                      <ArrowRight size={14} style={{ color: 'var(--ink-4)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-4)' }}>
                <CheckCircle2 size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>All caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Gmail Section */}
        <div style={{ gridColumn: 'span 8' }}>
          <div style={{ background: 'var(--paper)', borderRadius: 24, padding: 24, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={20} style={{ color: '#EA4335' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>Recent Inbound</h3>
              </div>
              <button style={{ background: 'transparent', border: 0, color: 'var(--accent)', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
                View All
              </button>
            </div>

            {gmailLoading ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-4)' }}>Loading messages...</div>
            ) : gmailMessages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {gmailMessages.slice(0, 4).map(msg => (
                  <div key={msg.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--line)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--paper-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <User size={20} style={{ color: 'var(--ink-3)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{msg.from.split('<')[0]}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink-2)', marginBottom: 2 }}>{msg.subject}</div>
                      <p style={{ fontSize: 12, color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.snippet}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
                No recent messages found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
