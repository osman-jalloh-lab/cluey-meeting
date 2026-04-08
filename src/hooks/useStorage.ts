import { useState, useEffect } from 'react';
import type { Meeting, Project } from '../types';

export function useStorage(userId: string) {
  const meetingKey = `cluey-meetings-${userId}`;
  const projectKey = `cluey-projects-${userId}`;

  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    try {
      const stored = localStorage.getItem(meetingKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const stored = localStorage.getItem(projectKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Re-sync if userId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(meetingKey);
      setMeetings(stored ? JSON.parse(stored) : []);
    } catch { setMeetings([]); }
    
    try {
      const p = localStorage.getItem(projectKey);
      setProjects(p ? JSON.parse(p) : []);
    } catch { setProjects([]); }
  }, [userId, meetingKey, projectKey]);

  useEffect(() => {
    if (userId) localStorage.setItem(meetingKey, JSON.stringify(meetings));
  }, [meetings, meetingKey, userId]);

  useEffect(() => {
    if (userId) localStorage.setItem(projectKey, JSON.stringify(projects));
  }, [projects, projectKey, userId]);

  const addMeeting = (m: Meeting) => setMeetings([m, ...meetings]);
  const deleteMeeting = (id: string) => setMeetings(meetings.filter(m => m.id !== id));
  const updateMeeting = (id: string, updates: Partial<Meeting>) =>
    setMeetings(meetings.map(m => m.id === id ? { ...m, ...updates } : m));

  const addProject = (p: Project) => setProjects([...projects, p]);

  return {
    meetings,
    addMeeting,
    deleteMeeting,
    updateMeeting,
    projects,
    addProject
  };
}
