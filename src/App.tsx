import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/ui/Sidebar';
import { Toast } from './components/ui/Toast';
import { MeetingFeed } from './components/views/MeetingFeed';
import { DetailPanel } from './components/ui/DetailPanel';
import { PeopleView } from './components/views/PeopleView';
import { CommitmentsView } from './components/views/CommitmentsView';
import { CalendarView } from './components/views/CalendarView';
import { DashboardView } from './components/views/DashboardView';
import { ProjectModal } from './components/modals/ProjectModal';
import { NewRecapModal } from './components/modals/NewRecapModal';
import { EditRecapModal } from './components/modals/EditRecapModal';
import { InviteModal } from './components/modals/InviteModal';
import { AskParawi } from './components/ui/AskParawi';
import { ReviewReminder } from './components/ui/ReviewReminder';
import { useStorage } from './hooks/useStorage';
import { useCalendar } from './hooks/useCalendar';
import { useAuth } from './context/AuthContext';
import { useIsMobile } from './hooks/useIsMobile';
import { LoginPage } from './components/views/LoginPage';
import { sendTaskDoneEmail } from './utils/emailjs';
import { Loader2, Menu } from 'lucide-react';
import type { ViewType, Meeting, CalendarEvent } from './types';

function MainApp({ userId }: { userId: string }) {
  const { user, isGuest } = useAuth();
  const { meetings, projects, addMeeting, updateMeeting, deleteMeeting, openTasksCount, addProject, updateProject, deleteProject } = useStorage(userId);
  const isMobile = useIsMobile();

  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedProjId, setSelectedProjId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null);
  const [isNewRecapOpen, setIsNewRecapOpen] = useState(false);
  const [newRecapPrefill, setNewRecapPrefill] = useState<{ person: string; title: string; notes?: string; calendarEventId?: string } | undefined>(undefined);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);
  const [showAsk, setShowAsk] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dark mode — persisted
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('parawi-theme') as 'light' | 'dark') || 'light'; }
    catch { return 'light'; }
  });

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('parawi-theme', t); } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Calendar — cookie-based auth, no accessToken needed
  const isAuthenticated = !!user && !isGuest;
  const { events: calendarEvents, loading: calendarLoading, refetch: refreshCalendar } = useCalendar(isAuthenticated);

  const recappedEventIds = React.useMemo(
    () => new Set(meetings.map(m => m.calendarEventId).filter((id): id is string => !!id)),
    [meetings]
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setNewRecapPrefill(undefined); setIsNewRecapOpen(true); }
    };
    const cmdK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowAsk(a => !a); }
    };
    window.addEventListener('keydown', h);
    window.addEventListener('keydown', cmdK);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('keydown', cmdK); };
  }, []);

  const handleToggleTask = async (meetingId: string, taskId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const task = (meeting.tasks || []).find(t => t.id === taskId);
    if (!task) return;
    const nowDone = !task.done;
    const completedAt = nowDone ? new Date().toISOString() : undefined;
    let completionSent = task.completionSent;
    if (nowDone && task.assignedByEmail) {
      const sent = await sendTaskDoneEmail({
        to_name: task.assignee || 'Team',
        to_email: task.assignedByEmail,
        completer_name: user?.name || 'Someone',
        task_text: task.text,
        completed_at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      });
      if (sent) completionSent = true;
    }
    const newTasks = (meeting.tasks || []).map(t =>
      t.id === taskId ? { ...t, done: nowDone, completedAt, completionSent } : t
    );
    updateMeeting(meetingId, { tasks: newTasks });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), meetings, projects }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `parawi-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Data exported');
  };

  let filteredMeetings = meetings;
  if (view === 'project' && selectedProjId) filteredMeetings = filteredMeetings.filter(m => m.projId === selectedProjId);

  const editMeeting = editMeetingId ? meetings.find(m => m.id === editMeetingId) : null;
  const openMeeting = (id: string) => { setSelectedMeetingId(id); setShowAsk(false); };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--paper)' }}>
      {/* Mobile backdrop — closes sidebar when tapping outside */}
      {isMobile && mobileSidebarOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <Sidebar
        view={view}
        setView={(v) => { setView(v); setSelectedMeetingId(null); if (isMobile) setMobileSidebarOpen(false); }}
        projects={projects}
        selectedProjId={selectedProjId}
        setSelectedProjId={setSelectedProjId}
        openCommitmentsCount={openTasksCount}
        totalMeetingsCount={meetings.length}
        onNewRecap={() => { setNewRecapPrefill(undefined); setIsNewRecapOpen(true); if (isMobile) setMobileSidebarOpen(false); }}
        onAddProject={() => setIsProjModalOpen(true)}
        onInviteProject={(id) => setInviteProjectId(id)}
        onAsk={() => { setShowAsk(true); if (isMobile) setMobileSidebarOpen(false); }}
        calendarEvents={calendarEvents}
        calendarLoading={calendarLoading}
        onRecapEvent={(e: CalendarEvent) => {
          setNewRecapPrefill({
            person: e.attendees.join(', ') || 'Someone',
            title: e.title,
            notes: e.description,
            calendarEventId: e.id,
          });
          setIsNewRecapOpen(true);
          if (isMobile) setMobileSidebarOpen(false);
        }}
        onRefreshCalendar={refreshCalendar}
        recappedEventIds={recappedEventIds}
        onExport={handleExport}
        theme={theme}
        setTheme={setTheme}
        isMobile={isMobile}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <main className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', background: 'var(--paper)', minWidth: 0 }}>
        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.4px' }}>parawi</span>
          </div>
        )}
        {view === 'calendar' ? (
          <CalendarView />
        ) : view === 'people' ? (
          <PeopleView meetings={filteredMeetings} onView={openMeeting} />
        ) : view === 'commitments' ? (
          <CommitmentsView meetings={filteredMeetings} onToggle={handleToggleTask} />
        ) : view === 'dashboard' ? (
          <DashboardView 
            meetings={meetings}
            projects={projects}
            calendarEvents={calendarEvents}
            calendarLoading={calendarLoading}
            onViewMeeting={openMeeting}
            onRecapEvent={(e) => {
              setNewRecapPrefill({
                person: e.attendees.join(', ') || 'Someone',
                title: e.title,
                notes: e.description,
                calendarEventId: e.id,
              });
              setIsNewRecapOpen(true);
            }}
          />
        ) : (
          <MeetingFeed
            meetings={filteredMeetings}
            allMeetings={meetings}
            projects={projects}
            selectedId={selectedMeetingId}
            onSelect={openMeeting}
            onNewRecap={() => { setNewRecapPrefill(undefined); setIsNewRecapOpen(true); }}
            onAsk={() => setShowAsk(true)}
            userName={user?.name || 'there'}
            onDelete={(id) => { deleteMeeting(id); showToast('Recap deleted'); if (selectedMeetingId === id) setSelectedMeetingId(null); }}
          />
        )}
      </main>

      {view !== 'calendar' && (
        <DetailPanel
          meetingId={selectedMeetingId}
          meetings={meetings}
          projects={projects}
          onClose={() => setSelectedMeetingId(null)}
          onDelete={(id) => { deleteMeeting(id); showToast('Recap deleted'); setSelectedMeetingId(null); }}
          onEdit={(id) => setEditMeetingId(id)}
          onToggleTask={handleToggleTask}
        />
      )}

      {isProjModalOpen && (
        <ProjectModal
          onClose={() => setIsProjModalOpen(false)}
          onSave={(p) => { addProject(p); setIsProjModalOpen(false); showToast('Project created'); }}
        />
      )}

      {inviteProjectId && (() => {
        const proj = projects.find(p => p.id === inviteProjectId);
        return proj ? (
          <InviteModal
            project={proj}
            onClose={() => setInviteProjectId(null)}
            onSave={(id, updates) => { updateProject(id, updates); showToast('Members saved'); setInviteProjectId(null); }}
          />
        ) : null;
      })()}

      {isNewRecapOpen && (
        <NewRecapModal
          prefillData={newRecapPrefill}
          history={meetings}
          projects={projects}
          onClose={() => { setIsNewRecapOpen(false); setNewRecapPrefill(undefined); }}
          onSave={(m) => { addMeeting(m); showToast('Recap saved'); }}
        />
      )}

      {editMeeting && (
        <EditRecapModal
          meeting={editMeeting}
          projects={projects}
          onClose={() => setEditMeetingId(null)}
          onSave={(id, updates) => { updateMeeting(id, updates); showToast('Recap updated'); setEditMeetingId(null); }}
        />
      )}

      {showAsk && (
        <AskParawi
          meetings={meetings}
          projects={projects}
          onClose={() => setShowAsk(false)}
          onOpenMeeting={openMeeting}
        />
      )}

      <ReviewReminder
        projects={projects.filter(p => !dismissedReminders.has(p.id))}
        onDismiss={(id) => setDismissedReminders(prev => new Set([...prev, id]))}
        onUpdateProject={updateProject}
      />

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--ink-3)' }} />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <MainApp userId={user.sub} />;
}
