/**
 * logout.ts
 * Clears the auth cookies by expiring them and returns { ok: true }.
 */

import type { Handler } from '@netlify/functions';
import { serialize } from 'cookie';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const handler: Handler = async () => {
  const expiredCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };

  const clearAccess = serialize('parawi_access_token', '', expiredCookieOptions);
  const clearRefresh = serialize('parawi_refresh_token', '', expiredCookieOptions);

  return {
    statusCode: 200,
    headers: JSON_HEADERS,
    multiValueHeaders: {
      'Set-Cookie': [clearAccess, clearRefresh],
    },
    body: JSON.stringify({ ok: true }),
  };
};
