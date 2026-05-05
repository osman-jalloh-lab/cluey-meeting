import fetch from 'node-fetch';
import { query } from './db';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export async function getValidAccessToken(accountId: number, currentAccessToken: string, refreshToken: string, expiresAt: string): Promise<string> {
  const isExpired = new Date(expiresAt).getTime() < Date.now() + 60000; // 1 min buffer
  
  if (!isExpired) return currentAccessToken;

  console.log(`[refresh] Token expired for account ${accountId}. Refreshing...`);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken) throw new Error('No refresh token available');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await res.json() as TokenResponse;

  if (!res.ok) {
    throw new Error('Failed to refresh token');
  }

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await query(
    'UPDATE google_accounts SET access_token = $1, expires_at = $2 WHERE id = $3',
    [data.access_token, newExpiresAt, accountId]
  );

  return data.access_token;
}
