/**
 * google-callback.ts
 * Handles the OAuth 2.0 callback at /auth/callback.
 * Saves/Updates user and account info in the database.
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { serialize, parse } from 'cookie';
import { query } from './utils/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
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
  
  const host = event.headers.host || event.headers.Host || 'parawi.com';
  const isProduction = !host.includes('localhost');
  const protocol = isProduction ? 'https' : 'http';
  const redirectUri = `${protocol}://${host}/auth/callback`;

  if (!clientId || !clientSecret) {
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
    // 1. Exchange code for token
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
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Token exchange failed.' }) };
    }

    // 2. Fetch user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userInfo = await userRes.json() as GoogleUserInfo;

    // 3. Handle Database persistence
    const cookieHeader = event.headers['cookie'] ?? event.headers['Cookie'] ?? '';
    const cookies = parse(cookieHeader);
    const existingUserId = cookies['parawi_user_id'];

    let userId = existingUserId || userInfo.id;

    // If new user, create them
    if (!existingUserId) {
      await query(
        `INSERT INTO users (id, email, name, picture) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (id) DO UPDATE SET name = $3, picture = $4`,
        [userInfo.id, userInfo.email, userInfo.name, userInfo.picture]
      );
    }

    // Link/Update the Google account
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    
    // We update the refresh_token only if it's provided (Google only sends it on the first auth)
    if (tokenData.refresh_token) {
      await query(
        `INSERT INTO google_accounts (user_id, google_id, email, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, email) DO UPDATE SET 
            access_token = $4, 
            refresh_token = $5, 
            expires_at = $6`,
        [userId, userInfo.id, userInfo.email, tokenData.access_token, tokenData.refresh_token, expiresAt]
      );
    } else {
      await query(
        `INSERT INTO google_accounts (user_id, google_id, email, access_token, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, email) DO UPDATE SET 
            access_token = $4, 
            expires_at = $5`,
        [userId, userInfo.id, userInfo.email, tokenData.access_token, expiresAt]
      );
    }

    // 4. Set session cookies
    const cookieOpts = makeCookieOptions(SESSION_MAX_AGE, isProduction);
    const userIdCookie = serialize('parawi_user_id', userId, cookieOpts);
    
    // We also keep the specific access token for the current session for compatibility
    const accessTokenCookie = serialize('parawi_access_token', tokenData.access_token, makeCookieOptions(tokenData.expires_in, isProduction));

    return {
      statusCode: 302,
      headers: {
        Location: '/?auth_success=' + Date.now(),
        'Cache-Control': 'no-store',
      },
      multiValueHeaders: {
        'Set-Cookie': [userIdCookie, accessTokenCookie],
      },
      body: '',
    };
  } catch (err) {
    console.error('[google-callback] Error:', err);
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Authentication failed.' }) };
  }
};
