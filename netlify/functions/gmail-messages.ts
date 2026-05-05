/**
 * gmail-messages.ts
 * Fetches the user's recent Gmail inbox messages (last 20).
 * Reads the access token from the HttpOnly cookie set by google-callback.ts.
 * Env vars required: none (uses token from cookie)
 *
 * GET /.netlify/functions/gmail-messages
 * Returns: { messages: GmailMessage[] }
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { parse } from 'cookie';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface GmailMessageMeta {
  id: string;
  threadId: string;
}

interface GmailListResponse {
  messages?: GmailMessageMeta[];
  error?: { code: number; message: string; status: string };
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPayload {
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
  mimeType?: string;
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailPayload;
  labelIds?: string[];
  error?: { code: number; message: string };
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function extractBody(payload?: GmailPayload): string {
  if (!payload) return '';

  // Prefer text/plain part
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Recurse into parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  // Fallback: top-level body data
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return '';
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

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  try {
    // Step 1: List recent messages from INBOX
    const maxResults = event.queryStringParameters?.maxResults ?? '20';
    const listRes = await fetch(
      `${GMAIL_BASE}/messages?labelIds=INBOX&maxResults=${maxResults}&orderBy=internalDate`,
      { headers: authHeader }
    );

    const listData = await listRes.json() as GmailListResponse;

    if (!listRes.ok) {
      if (listRes.status === 401) {
        return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Token expired. Please log in again.' }) };
      }
      console.error('[gmail-messages] List error:', listData.error?.message);
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to list Gmail messages.' }) };
    }

    const messageIds = listData.messages ?? [];

    if (messageIds.length === 0) {
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ messages: [] }) };
    }

    // Step 2: Fetch each message's details in parallel (metadata + snippet)
    const detailPromises = messageIds.map((msg) =>
      fetch(`${GMAIL_BASE}/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: authHeader,
      }).then((r) => r.json() as Promise<GmailMessageDetail>)
    );

    const details = await Promise.all(detailPromises);

    const messages = details
      .filter((d) => !d.error)
      .map((d) => {
        const headers = d.payload?.headers ?? [];
        return {
          id: d.id,
          threadId: d.threadId,
          subject: getHeader(headers, 'Subject') || '(No Subject)',
          from: getHeader(headers, 'From'),
          to: getHeader(headers, 'To'),
          date: getHeader(headers, 'Date'),
          snippet: d.snippet ?? '',
          isUnread: d.labelIds?.includes('UNREAD') ?? false,
          internalDate: d.internalDate ? new Date(Number(d.internalDate)).toISOString() : undefined,
        };
      });

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ messages }),
    };
  } catch (err) {
    console.error('[gmail-messages] Unexpected error:', err);
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to reach Gmail API.' }) };
  }
};
