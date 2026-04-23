import { useState, useCallback, useEffect } from 'react';
import type { CalendarEvent } from '../types';

interface CreateEventPayload {
  title: string;
  description?: string;
  startTime: string;  // ISO 8601
  endTime: string;    // ISO 8601
  attendeeEmail: string;
}

interface UseCalendarReturn {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  createEvent: (payload: CreateEventPayload) => Promise<CalendarEvent>;
  refetch: () => void;
}

export function useCalendar(isAuthenticated: boolean): UseCalendarReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/calendar-events', {
        credentials: 'include',
      });
      if (res.status === 401) {
        setError('Session expired. Please sign in again.');
        setEvents([]);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch calendar events.');
      }
      const data = await res.json() as CalendarEvent[];
      setEvents(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching events';
      console.error('[useCalendar]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Re-fetch when the window regains focus (user switches back from Google Calendar)
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleFocus = () => fetchEvents();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, fetchEvents]);

  const createEvent = useCallback(async (payload: CreateEventPayload): Promise<CalendarEvent> => {
    const res = await fetch('/.netlify/functions/create-event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
      throw new Error(errBody.error ?? 'Failed to create event.');
    }

    const created = await res.json() as CalendarEvent;
    // Optimistically add to local state
    setEvents((prev) => [...prev, created].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return created;
  }, []);

  return { events, loading, error, createEvent, refetch: fetchEvents };
}
