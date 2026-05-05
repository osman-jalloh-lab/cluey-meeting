/**
 * google-auth.ts
 * Redirects the browser to Google's OAuth 2.0 consent screen.
 * Requests scopes for: profile, Gmail (read + send), and Google Calendar.
 * Env vars required: GOOGLE_CLIENT_ID
 */

import type { Handler } from '@netlify/functions';

const SCOPES = [
  'openid',
  'email',
  'profile',
  // Gmail scopes
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  // Google Calendar scope
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export const handler: Handler = async (event) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const isLocal = process.env.CONTEXT !== 'production' && process.env.NODE_ENV !== 'production';
  const redirectUri = isLocal
    ? 'http://localhost:8888/auth/callback'
    : 'https://parawi.com/auth/callback';

  if (!clientId) {
    console.error('[google-auth] Missing GOOGLE_CLIENT_ID env var');
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'OAuth is not configured on this server.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Pass redirect_uri through so the callback uses the same value
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',          // request refresh_token
    prompt: 'consent',               // always show consent so we always get refresh_token
    include_granted_scopes: 'true',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return {
    statusCode: 302,
    headers: {
      Location: googleAuthUrl,
      'Cache-Control': 'no-store',
    },
    body: '',
  };
};
