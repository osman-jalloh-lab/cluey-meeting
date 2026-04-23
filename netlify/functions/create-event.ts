/**
 * create-event.ts
 * Creates a Google Calendar event with an attendee invite.
 * Accepts POST { title, description, startTime, endTime, attendeeEmail }
 * Reads the access token from the HttpOnly cookie.
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { parse } from 'cookie';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

interface CreateEventBody {
  title?: string;
  description?: string;
  startTime?: string;  // ISO 8601 datetime string
  endTime?: string;    // ISO 8601 datetime string
  attendeeEmail?: string;
}

interface GoogleCreatedEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  htmlLink?: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// Very light email format validation — full RFC validation belongs server-side too
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const cookieHeader = event.headers['cookie'] ?? event.headers['Cookie'] ?? '';
  const cookies = parse(cookieHeader);
  const accessToken = cookies['parawi_access_token'];

  if (!accessToken) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  // Validate Content-Type
  const contentType = (event.headers['content-type'] ?? '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return { statusCode: 415, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Content-Type must be application/json' }) };
  }

  let body: CreateEventBody;
  try {
    body = JSON.parse(event.body ?? '{}') as CreateEventBody;
  } catch {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const { title, description, startTime, endTime, attendeeEmail } = body;

  // Input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing required field: title' }) };
  }
  if (!startTime || !endTime) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing required fields: startTime and endTime' }) };
  }
  if (!attendeeEmail || !isValidEmail(attendeeEmail)) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing or invalid attendeeEmail' }) };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'startTime and endTime must be valid ISO 8601 datetime strings.' }) };
  }
  if (end <= start) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'endTime must be after startTime.' }) };
  }

  const eventBody = {
    summary: title.trim(),
    description: description?.trim() ?? '',
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    attendees: [{ email: attendeeEmail.trim() }],
    // Send email notifications to attendees
    guestsCanModifyEvent: false,
    reminders: { useDefault: true },
  };

  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    const data = await res.json() as GoogleCreatedEvent;

    if (!res.ok) {
      console.error('[create-event] Google API error:', res.status, data.error?.message);
      if (res.status === 401) {
        return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Token expired. Please log in again.' }) };
      }
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: data.error?.message ?? 'Failed to create event.' }) };
    }

    return {
      statusCode: 201,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        id: data.id,
        title: data.summary,
        description: data.description,
        startTime: data.start?.dateTime ?? data.start?.date,
        endTime: data.end?.dateTime ?? data.end?.date,
        attendees: (data.attendees ?? []).map((a) => a.displayName ?? a.email),
        htmlLink: data.htmlLink,
        status: 'upcoming',
      }),
    };
  } catch (err) {
    console.error('[create-event] Unexpected error:', err);
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to reach Google Calendar API.' }) };
  }
};
