import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { MeetingFeed } from './components/MeetingFeed';
import { DetailPanel } from './components/DetailPanel';
import { PeopleView } from './components/PeopleView';
import { CommitmentsView } from './components/CommitmentsView';
import { ProjectModal } from './components/ProjectModal';
import { NewRecapModal } from './components/NewRecapModal';
import { EditRecapModal } from './components/EditRecapModal';
import { AskCluey } from './components/AskCluey';
import { ReviewReminder } from './components/ReviewReminder';
import { useStorage } from './hooks/useStorage';
import { useCalendar } from './hooks/useCalendar';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { sendTaskDoneEmail } from './utils/emailjs';
import { Loader2 } from 'lucide-react';
import type { ViewType, Meeting, CalendarEvent } from './types';

function MainApp({ userId, accessToken }: { userId: string; accessToken: string | null }) {
  const { user } = useAuth();
  const { meetings, projects, addMeeting, updateMeeting, deleteMeeting, openTasksCount, addProject, updateProject, deleteProject } = useStorage(userId);

  const [view, setView] = useState<ViewType>('all');
  const [selectedProjId, setSelectedProjId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null);
  const [isNewRecapOpen, setIsNewRecapOpen] = useState(false);
  const [newRecapPrefill, setNewRecapPrefill] = useState<{ person: string; title: string } | undefined>(undefined);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());

  // Dark mode — persisted
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('cluey-theme') as 'light' | 'dark') || 'light'; }
    catch { return 'light'; }
  });

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('cluey-theme', t); } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const { events: calendarEvents, isLoading: calendarLoading } = useCalendar(accessToken);

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
    a.href = url; a.download = `cluey-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Data exported');
  };

  let filteredMeetings = meetings;
  if (view === 'project' && selectedProjId) filteredMeetings = filteredMeetings.filter(m => m.projId === selectedProjId);

  const editMeeting = editMeetingId ? meetings.find(m => m.id === editMeetingId) : null;
  const openMeeting = (id: string) => { setSelectedMeetingId(id); setShowAsk(false); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--paper)' }}>
      <Sidebar
        view={view}
        setView={(v) => { setView(v); setSelectedMeetingId(null); }}
        projects={projects}
        selectedProjId={selectedProjId}
        setSelectedProjId={setSelectedProjId}
        openCommitmentsCount={openTasksCount}
        totalMeetingsCount={meetings.length}
        onNewRecap={() => { setNewRecapPrefill(undefined); setIsNewRecapOpen(true); }}
        onAddProject={() => setIsProjModalOpen(true)}
        onAsk={() => setShowAsk(true)}
        calendarEvents={calendarEvents}
        calendarLoading={calendarLoading}
        onRecapEvent={(e: CalendarEvent) => {
          setNewRecapPrefill({ person: e.attendees.join(', ') || 'Someone', title: e.title });
          setIsNewRecapOpen(true);
        }}
        onExport={handleExport}
        theme={theme}
        setTheme={setTheme}
      />

      <main className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', background: 'var(--paper)' }}>
        {view === 'people' ? (
          <PeopleView meetings={filteredMeetings} onView={openMeeting} />
        ) : view === 'commitments' ? (
          <CommitmentsView meetings={filteredMeetings} onToggle={handleToggleTask} />
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

      <DetailPanel
        meetingId={selectedMeetingId}
        meetings={meetings}
        projects={projects}
        onClose={() => setSelectedMeetingId(null)}
        onDelete={(id) => { deleteMeeting(id); showToast('Recap deleted'); setSelectedMeetingId(null); }}
        onEdit={(id) => setEditMeetingId(id)}
        onToggleTask={handleToggleTask}
      />

      {isProjModalOpen && (
        <ProjectModal
          onClose={() => setIsProjModalOpen(false)}
          onSave={(p) => { addProject(p); setIsProjModalOpen(false); showToast('Project created'); }}
        />
      )}

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
        <AskCluey
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
  const { user, accessToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--ink-3)' }} />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <MainApp userId={user.sub} accessToken={accessToken} />;
}
