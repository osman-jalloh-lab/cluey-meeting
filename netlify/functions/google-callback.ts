/**
 * google-callback.ts
 * Handles the OAuth 2.0 callback at /auth/callback.
 * Exchanges authorization code for tokens and stores them in HttpOnly cookies.
 * Env vars required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { serialize } from 'cookie';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Cookie is valid for 55 minutes (Google access tokens last 60 min)
const ACCESS_TOKEN_MAX_AGE = 55 * 60;
// Refresh token is long-lived — 30 days rolling
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

function makeCookieOptions(maxAge: number, isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export const handler: Handler = async (event) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = 'https://parawi.com/auth/callback';
  const isProduction = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';

  if (!clientId || !clientSecret) {
    console.error('[google-callback] Missing required env vars');
    return { statusCode: 503, headers: JSON_HEADERS, body: JSON.stringify({ error: 'OAuth not configured.' }) };
  }

  const code = event.queryStringParameters?.code;
  const errorParam = event.queryStringParameters?.error;

  if (errorParam) {
    // User denied consent
    return {
      statusCode: 302,
      headers: { Location: '/?auth_error=access_denied', 'Cache-Control': 'no-store' },
      body: '',
    };
  }

  if (!code) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing authorization code.' }) };
  }

  // Exchange code for tokens
  let tokenData: TokenResponse;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    tokenData = await tokenRes.json() as TokenResponse;

    if (!tokenRes.ok || tokenData.error) {
      console.error('[google-callback] Token exchange failed:', tokenData.error_description || tokenData.error);
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Token exchange failed.' }) };
    }
  } catch (err) {
    console.error('[google-callback] Token exchange network error:', err);
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to reach Google token endpoint.' }) };
  }

  const cookieOpts = makeCookieOptions(ACCESS_TOKEN_MAX_AGE, isProduction);
  const accessTokenCookie = serialize('parawi_access_token', tokenData.access_token, cookieOpts);

  const setCookies: string[] = [accessTokenCookie];

  if (tokenData.refresh_token) {
    const refreshCookie = serialize('parawi_refresh_token', tokenData.refresh_token, makeCookieOptions(REFRESH_TOKEN_MAX_AGE, isProduction));
    setCookies.push(refreshCookie);
  }

  return {
    statusCode: 302,
    headers: {
      Location: '/',
      'Cache-Control': 'no-store',
      // Netlify supports multiple Set-Cookie headers via multiValueHeaders
    },
    multiValueHeaders: {
      'Set-Cookie': setCookies,
    },
    body: '',
  };
};
