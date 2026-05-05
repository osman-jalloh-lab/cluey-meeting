/**
 * gmail-messages.ts
 * Aggregates recent emails from ALL linked Google accounts for the current user.
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
    // 1. Fetch all linked accounts
    const accountsRes = await query(
      'SELECT id, email, access_token, refresh_token, expires_at FROM google_accounts WHERE user_id = $1',
      [userId]
    );

    if (accountsRes.rowCount === 0) {
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify([]) };
    }

    // 2. Fetch messages from each account in parallel
    const allMessagesPromises = accountsRes.rows.map(async (acc) => {
      try {
        const token = await getValidAccessToken(acc.id, acc.access_token, acc.refresh_token, acc.expires_at);
        
        const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json() as any;
        if (!res.ok) return [];

        const detailsPromises = (data.messages || []).map(async (m: any) => {
          const mres = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const mdata = await mres.json() as any;
          
          const headers = mdata.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

          return {
            id: mdata.id,
            threadId: mdata.threadId,
            snippet: mdata.snippet,
            from,
            subject,
            date: new Date(date).toISOString(),
            accountEmail: acc.email // Tag the email so we know which account it's from
          };
        });

        return Promise.all(detailsPromises);
      } catch (err) {
        console.error(`[gmail-messages] Error fetching for ${acc.email}:`, err);
        return [];
      }
    });

    const results = await Promise.all(allMessagesPromises);
    const flattened = results.flat();

    // 3. Sort by date descending
    const sorted = flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(sorted.slice(0, 10)),
    };
  } catch (err) {
    console.error('[gmail-messages] Aggregation error:', err);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to aggregate emails.' }) };
  }
};
