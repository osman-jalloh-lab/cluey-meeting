import React from 'react';
import { Plus, ListTodo, Users, FolderPlus, Hexagon, Calendar as CalendarIcon, ChevronRight, Check } from 'lucide-react';
import type { Project, ViewType, CalendarEvent } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  view: ViewType;
  setView: (v: ViewType) => void;
  projects: Project[];
  selectedProjId: string | null;
  setSelectedProjId: (id: string | null) => void;
  openCommitmentsCount: number;
  totalMeetingsCount: number;
  onNewRecap: () => void;
  onAddProject: () => void;
  calendarEvents: CalendarEvent[];
  onRecapEvent: (e: CalendarEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  view, setView, projects, selectedProjId, setSelectedProjId,
  openCommitmentsCount, totalMeetingsCount, onNewRecap, onAddProject,
  calendarEvents, onRecapEvent
}) => {
  const { user, logout } = useAuth();
  
  const isAll     = view === 'all';
  const isPeople  = view === 'people';
  const isCommits = view === 'commitments';

  const selectProj = (id: string) => { setView('project'); setSelectedProjId(id); };

  const navItem = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number) => (
    <div
      className={`flex items-center gap-2 px-2.5 py-[7px] rounded-[8px] cursor-pointer text-[13px] duration-150 mb-px select-none transition-all
        ${active
          ? 'bg-paper3 text-ink font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'text-ink3 hover:bg-paper3/60 hover:text-ink2'
        }`}
      onClick={onClick}
    >
      <span className={`shrink-0 transition-opacity ${active ? 'opacity-90' : 'opacity-40'}`}>{icon}</span>
      <span className="flex-1 leading-none">{label}</span>
      {badge !== undefined && (
        <span className={`text-[10px] font-mono font-medium px-[7px] py-[1px] rounded-full tabular-nums
          ${active ? 'bg-paper4 text-ink2' : 'bg-paper3 text-ink3'}`}>
          {badge}
        </span>
      )}
    </div>
  );

  const formatShortTime = (iso: string) => {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).toLowerCase();
  };

  return (
    <aside className="w-[248px] min-w-[248px] bg-paper border-r border-line flex flex-col h-full overflow-hidden z-10">
      {/* Logo */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-[9px] mb-[18px]">
          <div className="w-[30px] h-[30px] bg-lime rounded-lg flex items-center justify-center shrink-0 shadow-lime-glow">
            <Hexagon className="w-3.5 h-3.5 text-paper stroke-[2.5px]" />
          </div>
          <span className="font-serif text-[19px] tracking-[-0.5px] leading-none text-ink">
            Clue<em className="font-light italic text-ink2">y</em>
          </span>
        </div>

        <button
          className="btn btn-dark w-full flex items-center justify-center gap-2 text-[13px]"
          onClick={onNewRecap}
        >
          <Plus className="w-[14px] h-[14px]" strokeWidth={2.5} />
          New recap
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 custom-scrollbar">
        <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink4 px-2 py-3 pb-1.5 font-mono">
          Views
        </div>

        {navItem(isAll, () => { setView('all'); setSelectedProjId(null); },
          <ListTodo className="w-3.5 h-3.5" />, 'All meetings', totalMeetingsCount)}

        {navItem(isPeople, () => setView('people'),
          <Users className="w-3.5 h-3.5" />, 'People')}

        {navItem(isCommits, () => setView('commitments'),
          <Check className="w-3.5 h-3.5" />, 'Commitments', openCommitmentsCount || 0)}

        {/* Calendar Section */}
        <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink4 px-2 py-3 pb-1.5 mt-1.5 font-mono flex items-center gap-1.5">
          <CalendarIcon className="w-3 h-3 text-ink4/60" />
          Today's Schedule
        </div>
        
        <div className="flex flex-col gap-1 mt-1">
          {calendarEvents.length === 0 ? (
            <div className="text-[12px] text-ink3 px-3 py-1.5 italic">No events today.</div>
          ) : (
            calendarEvents.map(e => (
              <div key={e.id} className="group flex flex-col relative px-3 py-2 rounded-[8px] hover:bg-paper3 transition-colors text-[12px]">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="font-medium text-ink2 group-hover:text-ink transition-colors line-clamp-1 pr-6">{e.title}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-ink4 font-mono">
                   <span className={e.status === 'past' ? 'text-ink3' : ''}>
                     {formatShortTime(e.startTime)}
                   </span>
                   {e.status === 'past' && (
                     <button 
                       onClick={() => onRecapEvent(e)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 text-lime opacity-0 group-hover:opacity-100 transition-opacity bg-lime-bg px-1.5 py-0.5 rounded-[4px] border border-lime/20 flex items-center font-sans tracking-wide"
                     >
                       Recap <ChevronRight className="w-3 h-3" />
                     </button>
                   )}
                   {e.status === 'upcoming' && (
                     <button 
                       onClick={() => onRecapEvent(e)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-ink flex items-center font-sans tracking-wide"
                     >
                       Recap 
                     </button>
                   )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink4 px-2 py-3 pb-1.5 mt-1.5 font-mono">
          Projects
        </div>

        {projects.map(p => {
          const isSel = view === 'project' && selectedProjId === p.id;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-2.5 py-[7px] rounded-[8px] cursor-pointer text-[13px] duration-150 mb-px select-none transition-all
                ${isSel ? 'bg-paper3 text-ink font-medium' : 'text-ink3 hover:bg-paper3/60 hover:text-ink2'}`}
              onClick={() => selectProj(p.id)}
            >
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0 ring-1 ring-white/10"
                style={{ background: p.color }}
              />
              {p.name}
            </div>
          );
        })}

        <div
          className="flex items-center gap-2 px-2.5 py-[7px] rounded-[8px] cursor-pointer text-[13px] duration-150 mb-px select-none text-ink3 mt-[2px] hover:bg-paper3/60 hover:text-ink2 transition-all"
          onClick={onAddProject}
        >
          <FolderPlus className="w-3.5 h-3.5 shrink-0 opacity-50" />
          Add project
        </div>
      </nav>

      {/* Footer Profile */}
      <div className="p-3 border-t border-line glass flex items-center justify-between group">
        <div className="flex items-center gap-2.5 px-2">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-paper3/50 ring-1 ring-line2 flex items-center justify-center shrink-0">
               <span className="text-[10px] text-ink2">{user?.name?.charAt(0) || '?'}</span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
             <span className="text-[12px] font-medium text-ink leading-tight truncate max-w-[120px]">{user?.name}</span>
             <span className="text-[10px] text-ink3 leading-tight truncate max-w-[120px]">{user?.email}</span>
          </div>
        </div>
        <button 
          onClick={logout}
          className="px-2 py-1 text-[11px] text-ink3 hover:text-red hover:bg-red/10 rounded-[6px] transition-colors font-medium opacity-0 group-hover:opacity-100"
        >
          Log out
        </button>
      </div>
    </aside>
  );
};
