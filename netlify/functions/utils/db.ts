import pg from 'pg';
const { Pool } = pg;

// Use a Pool for better performance in serverless environments
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon in some environments
  }
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
