/**
 * google-auth.ts
 * Redirects the browser to Google's OAuth 2.0 consent screen.
 * Env vars required: GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI
 */

import type { Handler } from '@netlify/functions';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export const handler: Handler = async (_event) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('[google-auth] Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI env var');
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
    access_type: 'offline',   // request refresh_token
    prompt: 'consent',         // always show consent so we always get refresh_token
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
