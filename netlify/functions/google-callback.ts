/**
 * google-callback.ts
 * Handles the OAuth 2.0 callback at /auth/callback.
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { serialize } from 'cookie';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const ACCESS_TOKEN_MAX_AGE = 55 * 60;
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
  
  // Robust host detection
  const host = event.headers.host || event.headers.Host || 'parawi.com';
  const isProduction = !host.includes('localhost');
  const protocol = isProduction ? 'https' : 'http';
  const redirectUri = `${protocol}://${host}/auth/callback`;

  console.log(`[google-callback] Using redirectUri: ${redirectUri}`);

  if (!clientId || !clientSecret) {
    console.error('[google-callback] Missing required env vars');
    return { statusCode: 503, headers: JSON_HEADERS, body: JSON.stringify({ error: 'OAuth not configured.' }) };
  }

  const code = event.queryStringParameters?.code;
  const errorParam = event.queryStringParameters?.error;

  if (errorParam) {
    return {
      statusCode: 302,
      headers: { Location: '/?auth_error=access_denied', 'Cache-Control': 'no-store' },
      body: '',
    };
  }

  if (!code) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing authorization code.' }) };
  }

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

    const tokenData = await tokenRes.json() as TokenResponse;

    if (!tokenRes.ok || tokenData.error) {
      console.error('[google-callback] Token exchange failed:', tokenData.error_description || tokenData.error);
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Token exchange failed.' }) };
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
        Location: '/?auth_success=' + Date.now(),
        'Cache-Control': 'no-store',
      },
      multiValueHeaders: {
        'Set-Cookie': setCookies,
      },
      body: '',
    };
  } catch (err) {
    console.error('[google-callback] Token exchange error:', err);
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to reach Google token endpoint.' }) };
  }
};
