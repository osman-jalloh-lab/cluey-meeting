import { useState, useCallback, useEffect } from 'react';
import type { CalendarEvent } from '../types';

export function useCalendar(accessToken: string | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = today.toISOString();
      // Fetch events for the next 7 days
      const endTime = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endTime)}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch calendar events.');
      }

      const data = await res.json();
      const now = new Date();

      const parsedEvents: CalendarEvent[] = (data.items || []).map((item: any) => {
        const start = item.start?.dateTime || item.start?.date;
        const end = item.end?.dateTime || item.end?.date;
        const endDate = new Date(end);
        const status: 'past' | 'upcoming' = endDate < now ? 'past' : 'upcoming';

        const attendees = (item.attendees || [])
          .filter((a: any) => !a.self && (a.displayName || a.email))
          .map((a: any) => a.displayName || a.email);

        return {
          id: item.id,
          title: item.summary || 'Untitled Event',
          attendees,
          startTime: start,
          endTime: end,
          status,
          description: item.description || undefined,
          location: item.location || undefined,
        };
      });

      setEvents(parsedEvents);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchEvents(accessToken);
    } else {
      setEvents([]);
    }
  }, [accessToken, fetchEvents]);

  // Refresh when the window regains focus (e.g. user switches back from Google Calendar)
  useEffect(() => {
    if (!accessToken) return;
    const handleFocus = () => fetchEvents(accessToken);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [accessToken, fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refreshFn: () => { if (accessToken) fetchEvents(accessToken); },
  };
}
