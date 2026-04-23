/**
 * calendar-events.ts
 * Fetches the next 20 upcoming events from the user's primary Google Calendar.
 * Reads the access token from the HttpOnly cookie.
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { parse } from 'cookie';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

interface GoogleCalendarEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarAttendee {
  email: string;
  displayName?: string;
  self?: boolean;
  responseStatus?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
  attendees?: GoogleCalendarAttendee[];
  status?: string;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarEvent[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const cookieHeader = event.headers['cookie'] ?? event.headers['Cookie'] ?? '';
  const cookies = parse(cookieHeader);
  const accessToken = cookies['parawi_access_token'];

  if (!accessToken) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  try {
    const now = new Date();
    now.setSeconds(0, 0);
    const timeMin = now.toISOString();
    // Fetch events for the next 30 days
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '20',
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await res.json() as GoogleCalendarListResponse;

    if (!res.ok) {
      console.error('[calendar-events] Google API error:', res.status, data.error?.message);
      if (res.status === 401) {
        return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Token expired. Please log in again.' }) };
      }
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to fetch calendar events.' }) };
    }

    const nowDate = new Date();
    const events = (data.items ?? []).map((item) => {
      const startRaw = item.start?.dateTime ?? item.start?.date ?? '';
      const endRaw = item.end?.dateTime ?? item.end?.date ?? '';
      const endDate = new Date(endRaw);
      const status: 'past' | 'upcoming' = endDate < nowDate ? 'past' : 'upcoming';

      const attendees = (item.attendees ?? [])
        .filter((a) => !a.self && (a.displayName || a.email))
        .map((a) => a.displayName ?? a.email);

      return {
        id: item.id,
        title: item.summary ?? 'Untitled Event',
        description: item.description ?? undefined,
        location: item.location ?? undefined,
        startTime: startRaw,
        endTime: endRaw,
        attendees,
        status,
      };
    });

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(events),
    };
  } catch (err) {
    console.error('[calendar-events] Unexpected error:', err);
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to reach Google Calendar API.' }) };
  }
};
