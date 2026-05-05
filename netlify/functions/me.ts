/**
 * me.ts
 * Returns the currently authenticated user's profile from the database.
 */

import type { Handler } from '@netlify/functions';
import { parse } from 'cookie';
import { query } from './utils/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const handler: Handler = async (event) => {
  const cookieHeader = event.headers['cookie'] ?? event.headers['Cookie'] ?? '';
  const cookies = parse(cookieHeader);
  const userId = cookies['parawi_user_id'];

  if (!userId) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  try {
    const res = await query('SELECT id, email, name, picture FROM users WHERE id = $1', [userId]);
    
    if (res.rowCount === 0) {
      return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'User not found.' }) };
    }

    const user = res.rows[0];
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }),
    };
  } catch (err) {
    console.error('[me] Error fetching user:', err);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Database error.' }) };
  }
};
