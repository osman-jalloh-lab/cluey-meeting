import { useState, useEffect } from 'react';
import type { Meeting, Project, Task } from '../types';

function migrateMeetings(raw: Meeting[]): Meeting[] {
  return raw.map(m => {
    if (m.tasks !== undefined) return m;
    return {
      ...m,
      tasks: (m.commitments || []).map((c, i) => ({
        id: `leg-${m.id}-${i}`,
        text: c.text,
        done: c.done,
      })),
    };
  });
}

export function useStorage(userId: string) {
  const meetingKey = `parawi-meetings-${userId}`;
  const projectKey = `parawi-projects-${userId}`;
  // also read legacy keys so existing data isn't lost
  const legacyMeetingKey = `cluey-meetings-${userId}`;
  const legacyProjectKey = `cluey-projects-${userId}`;

  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    try {
      const stored = localStorage.getItem(meetingKey) || localStorage.getItem(legacyMeetingKey);
      return stored ? migrateMeetings(JSON.parse(stored)) : [];
    } catch { return []; }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const stored = localStorage.getItem(projectKey) || localStorage.getItem(legacyProjectKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Persist whenever data changes
  useEffect(() => {
    if (userId) localStorage.setItem(meetingKey, JSON.stringify(meetings));
  }, [meetings, meetingKey, userId]);

  useEffect(() => {
    if (userId) localStorage.setItem(projectKey, JSON.stringify(projects));
  }, [projects, projectKey, userId]);

  const addMeeting    = (m: Meeting) => setMeetings(prev => [m, ...prev]);
  const deleteMeeting = (id: string) => setMeetings(prev => prev.filter(m => m.id !== id));
  const updateMeeting = (id: string, updates: Partial<Meeting>) =>
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));

  const toggleTask = (meetingId: string, taskId: string) => {
    setMeetings(prev => prev.map(m => {
      if (m.id !== meetingId) return m;
      return {
        ...m,
        tasks: (m.tasks || []).map(t =>
          t.id === taskId
            ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined }
            : t
        ),
      };
    }));
  };

  const updateTask = (meetingId: string, taskId: string, updates: Partial<Task>) => {
    setMeetings(prev => prev.map(m => {
      if (m.id !== meetingId) return m;
      return { ...m, tasks: (m.tasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t) };
    }));
  };

  const openTasksCount = meetings.reduce(
    (acc, m) => acc + (m.tasks || []).filter(t => !t.done).length, 0
  );

  const addProject    = (p: Project) => setProjects(prev => [...prev, p]);
  const deleteProject = (id: string) => setProjects(prev => prev.filter(p => p.id !== id));
  const updateProject = (id: string, updates: Partial<Project>) =>
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

  return {
    meetings, addMeeting, deleteMeeting, updateMeeting, toggleTask, updateTask, openTasksCount,
    projects, addProject, deleteProject, updateProject,
  };
}
