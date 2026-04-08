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
      const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`,
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
        const status = endDate < now ? 'past' : 'upcoming';
        
        const attendees = (item.attendees || [])
          .filter((a: any) => !a.self && a.displayName)
          .map((a: any) => a.displayName || a.email);

        return {
          id: item.id,
          title: item.summary || 'Untitled Event',
          attendees,
          startTime: start,
          endTime: end,
          status,
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

  return {
    events,
    isLoading,
    error,
    refreshFn: () => accessToken && fetchEvents(accessToken)
  };
}
