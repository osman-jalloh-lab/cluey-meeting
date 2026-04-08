import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { MeetingFeed } from './components/MeetingFeed';
import { DetailPanel } from './components/DetailPanel';
import { PeopleView } from './components/PeopleView';
import { CommitmentsView } from './components/CommitmentsView';
import { ProjectModal } from './components/ProjectModal';
import { NewRecapModal } from './components/NewRecapModal';
import { useStorage } from './hooks/useStorage';
import { useCalendar } from './hooks/useCalendar';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import type { ViewType, Meeting, CalendarEvent } from './types';
import { Search, Loader2 } from 'lucide-react';

function MainApp({ userId, accessToken }: { userId: string, accessToken: string | null }) {
  const { meetings, projects, addMeeting, updateMeeting, deleteMeeting, addProject } = useStorage(userId);

  const [view, setView] = useState<ViewType>('all');
  const [selectedProjId, setSelectedProjId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const [isNewRecapOpen, setIsNewRecapOpen] = useState(false);
  const [newRecapPrefill, setNewRecapPrefill] = useState<{person: string, title: string} | undefined>(undefined);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { events: calendarEvents } = useCalendar(accessToken);

  const openCommitmentsCount = meetings.flatMap(m => m.commitments).filter(c => !c.done).length;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleCommitment = (meetingId: string, index: number) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const newCommitments = [...meeting.commitments];
    newCommitments[index] = { ...newCommitments[index], done: !newCommitments[index].done };
    updateMeeting(meetingId, { commitments: newCommitments });
  };

  let filteredMeetings = meetings;
  let viewTitleText = 'meetings';
  let viewTitlePrefix = 'All';
  let viewSubtitle = '';

  if (view === 'project' && selectedProjId) {
    filteredMeetings = filteredMeetings.filter(m => m.projId === selectedProjId);
    const p = projects.find(x => x.id === selectedProjId);
    viewTitlePrefix = '';
    viewTitleText = p?.name || 'Project';
    viewSubtitle = `${filteredMeetings.length} meeting${filteredMeetings.length !== 1 ? 's' : ''}`;
  } else if (view === 'people') {
    viewTitlePrefix = '';
    viewTitleText = 'People';
  } else if (view === 'commitments') {
    viewTitlePrefix = 'Open';
    viewTitleText = 'commitments';
  }

  if (searchQ) {
    const q = searchQ.toLowerCase();
    filteredMeetings = filteredMeetings.filter(m =>
      m.person.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      (m.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-ink font-sans relative z-[1]">
      <Sidebar
        view={view}
        setView={setView}
        projects={projects}
        selectedProjId={selectedProjId}
        setSelectedProjId={setSelectedProjId}
        openCommitmentsCount={openCommitmentsCount}
        totalMeetingsCount={meetings.length}
        onNewRecap={() => { setNewRecapPrefill(undefined); setIsNewRecapOpen(true); }}
        onAddProject={() => setIsProjModalOpen(true)}
        calendarEvents={calendarEvents}
        onRecapEvent={(e) => {
          setNewRecapPrefill({ person: e.attendees.join(', ') || 'Someone', title: e.title });
          setIsNewRecapOpen(true);
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-paper2 relative z-0">
        {/* Header */}
        <header className="px-7 h-[60px] border-b border-line flex items-center justify-between shrink-0 glass z-10 sticky top-0">
          <div className="flex flex-col">
            <h1 className="font-serif text-[20px] font-normal text-ink tracking-[-0.4px] leading-[1.1]">
              {viewTitlePrefix && <span className="text-ink3 font-light">{viewTitlePrefix} </span>}
              <em className="font-light italic">{viewTitleText}</em>
            </h1>
            <span className="text-[11px] text-ink3 mt-px h-3.5 block font-mono">{viewSubtitle}</span>
          </div>

          {/* Search */}
          <div className="flex items-center gap-[7px] bg-paper3 border border-line2 rounded-[10px] px-[13px] py-2 w-[210px] transition-all duration-150 focus-within:border-lime/40 focus-within:ring-[3px] focus-within:ring-lime/8">
            <Search className="w-[13px] h-[13px] text-ink3 shrink-0" />
            <input
              type="text"
              placeholder="Search…"
              className="bg-transparent border-none outline-none font-sans text-[13px] text-ink w-full placeholder:text-ink3"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-2.5 custom-scrollbar relative">
          {view === 'people' ? (
            <PeopleView meetings={filteredMeetings} onView={(id) => { setView('all'); setSelectedMeetingId(id); }} />
          ) : view === 'commitments' ? (
            <CommitmentsView meetings={filteredMeetings} onToggle={handleToggleCommitment} />
          ) : (
            <MeetingFeed
              meetings={filteredMeetings}
              projects={projects}
              selectedId={selectedMeetingId}
              onSelect={setSelectedMeetingId}
              onDelete={(id) => { deleteMeeting(id); showToast('Recap deleted'); if (selectedMeetingId === id) setSelectedMeetingId(null); }}
            />
          )}
        </div>
      </main>

      <DetailPanel
        meetingId={selectedMeetingId}
        meetings={meetings}
        projects={projects}
        onClose={() => setSelectedMeetingId(null)}
        onDelete={(id) => { deleteMeeting(id); showToast('Recap deleted'); setSelectedMeetingId(null); }}
        onToggleCommitment={handleToggleCommitment}
      />

      {isProjModalOpen && <ProjectModal onClose={() => setIsProjModalOpen(false)} onSave={(p) => { addProject(p); setIsProjModalOpen(false); showToast('Project created'); }} />}
      {isNewRecapOpen && <NewRecapModal prefillData={newRecapPrefill} history={meetings} projects={projects} onClose={() => { setIsNewRecapOpen(false); setNewRecapPrefill(undefined); }} onSave={(m) => { addMeeting(m); showToast('Recap saved'); }} />}

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
}

export default function App() {
  const { user, accessToken, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper text-ink">
        <Loader2 className="w-6 h-6 animate-spin text-ink3" />
      </div>
    );
  }
  
  if (!user) {
    return <LoginPage />;
  }
  
  return <MainApp userId={user.sub} accessToken={accessToken} />;
}
