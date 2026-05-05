/**
 * google-auth.ts
 * Redirects the browser to Google's OAuth 2.0 consent screen.
 */

import type { Handler } from '@netlify/functions';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export const handler: Handler = async (event) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  // Robust way to get the current host
  const host = event.headers.host || event.headers.Host || 'parawi.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/auth/callback`;

  console.log(`[google-auth] Using redirectUri: ${redirectUri}`);

  if (!clientId) {
    console.error('[google-auth] Missing GOOGLE_CLIENT_ID env var');
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'OAuth is not configured on this server.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
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
