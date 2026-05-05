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

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code;
  const error = event.queryStringParameters?.error;

  if (error) {
    console.error('[google-callback] Google Error:', error);
    return { statusCode: 400, body: `Auth error: ${error}` };
  }

  if (!code) {
    return { statusCode: 400, body: 'Missing code' };
  }

  try {
    const { HOST, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
    const protocol = event.headers['x-forwarded-proto'] || 'http';
    const host = event.headers.host || 'localhost:8888';
    const redirectUri = `${protocol}://${host}/.netlify/functions/google-callback`;

    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as GoogleTokenResponse;
    if (!tokenRes.ok) {
      console.error('[google-callback] Token exchange failed:', tokens);
      return { statusCode: 401, body: 'Token exchange failed' };
    }

    // 2. Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json() as GoogleUserInfo;
    if (!userRes.ok) {
      console.error('[google-callback] User info fetch failed:', userInfo);
      return { statusCode: 401, body: 'Failed to fetch user info' };
    }

    // 3. Database operations
    const cookieHeader = event.headers['cookie'] ?? event.headers['Cookie'] ?? '';
    const cookies = parse(cookieHeader);
    const existingUserId = cookies['parawi_user_id'];
    
    // Determine the main user record
    // If logged in, we link to existing user. If not, we use this google account as the main ID.
    let targetUserId = existingUserId || userInfo.id;

    // Ensure User exists
    await query(
      `INSERT INTO users (id, email, name, picture) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (id) DO UPDATE SET name = $3, picture = $4`,
      [targetUserId, userInfo.email, userInfo.name, userInfo.picture]
    );

    // Ensure Account is linked
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    if (tokens.refresh_token) {
      await query(
        `INSERT INTO google_accounts (user_id, email, access_token, refresh_token, expires_at) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (user_id, email) DO UPDATE SET 
            access_token = $3, 
            refresh_token = $4, 
            expires_at = $5`,
        [targetUserId, userInfo.email, tokens.access_token, tokens.refresh_token, expiresAt]
      );
    } else {
      // If no refresh token (user already authorized), just update access token
      await query(
        `INSERT INTO google_accounts (user_id, email, access_token, expires_at) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id, email) DO UPDATE SET 
            access_token = $3, 
            expires_at = $4`,
        [targetUserId, userInfo.email, tokens.access_token, expiresAt]
      );
    }

    // 4. Set cookies and redirect
    const userCookie = serialize('parawi_user_id', targetUserId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    const finalRedirect = `${protocol}://${host}/?auth_success=${Date.now()}`;

    return {
      statusCode: 302,
      headers: {
        'Set-Cookie': userCookie,
        Location: finalRedirect,
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  } catch (err) {
    console.error('[google-callback] Critical Error:', err);
    return { 
      statusCode: 500, 
      headers: JSON_HEADERS, 
      body: JSON.stringify({ error: 'Database or Network Error', details: (err as Error).message }) 
    };
  }
};
