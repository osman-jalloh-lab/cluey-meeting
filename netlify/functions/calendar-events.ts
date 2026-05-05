/**
 * calendar-events.ts
 * Aggregates upcoming calendar events from ALL linked Google accounts.
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { parse } from 'cookie';
import { query } from './utils/db';
import { getValidAccessToken } from './utils/google-refresh';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const handler: Handler = async (event) => {
  const cookieHeader = event.headers['cookie'] ?? event.headers['Cookie'] ?? '';
  const cookies = parse(cookieHeader);
  const userId = cookies['parawi_user_id'];

  if (!userId) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  try {
    const accountsRes = await query(
      'SELECT id, email, access_token, refresh_token, expires_at FROM google_accounts WHERE user_id = $1',
      [userId]
    );

    if (accountsRes.rowCount === 0) {
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify([]) };
    }

    const allEventsPromises = accountsRes.rows.map(async (acc) => {
      try {
        const token = await getValidAccessToken(acc.id, acc.access_token, acc.refresh_token, acc.expires_at);
        
        const now = new Date();
        now.setSeconds(0, 0);
        const timeMin = now.toISOString();
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
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json() as any;
        if (!res.ok) return [];

        const nowDate = new Date();
        return (data.items ?? []).map((item: any) => {
          const startRaw = item.start?.dateTime ?? item.start?.date ?? '';
          const endRaw = item.end?.dateTime ?? item.end?.date ?? '';
          const endDate = new Date(endRaw);
          const status = endDate < nowDate ? 'past' : 'upcoming';

          const attendees = (item.attendees ?? [])
            .filter((a: any) => !a.self && (a.displayName || a.email))
            .map((a: any) => a.displayName ?? a.email);

          return {
            id: item.id,
            title: item.summary ?? 'Untitled Event',
            description: item.description ?? undefined,
            location: item.location ?? undefined,
            startTime: startRaw,
            endTime: endRaw,
            attendees,
            status,
            htmlLink: item.htmlLink,
            meetLink: item.hangoutLink,
            accountEmail: acc.email
          };
        });
      } catch (err) {
        console.error(`[calendar-events] Error for ${acc.email}:`, err);
        return [];
      }
    });

    const results = await Promise.all(allEventsPromises);
    const flattened = results.flat();

    // Sort by start time ascending
    const sorted = flattened.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(sorted),
    };
  } catch (err) {
    console.error('[calendar-events] Aggregation error:', err);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to aggregate calendar.' }) };
  }
};
