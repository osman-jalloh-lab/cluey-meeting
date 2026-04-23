/**
 * me.ts
 * Returns the authenticated user's profile by reading the access token cookie
 * and calling Google's userinfo endpoint.
 */

import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { parse } from 'cookie';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  picture: string;
  email_verified?: boolean;
}

interface GoogleErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export const handler: Handler = async (event) => {
  const cookieHeader = event.headers['cookie'] ?? event.headers['Cookie'] ?? '';
  const cookies = parse(cookieHeader);
  const accessToken = cookies['parawi_access_token'];

  if (!accessToken) {
    return {
      statusCode: 401,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated.' }),
    };
  }

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json() as GoogleUserInfo & GoogleErrorResponse;

    if (!res.ok) {
      console.warn('[me] Google userinfo returned', res.status, data);
      return {
        statusCode: 401,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Invalid or expired token.' }),
      };
    }

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        sub: data.sub,
        name: data.name,
        email: data.email,
        picture: data.picture,
      }),
    };
  } catch (err) {
    console.error('[me] Failed to fetch userinfo:', err);
    return {
      statusCode: 502,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Failed to reach Google.' }),
    };
  }
};
