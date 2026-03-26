import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: {
    rejectUnauthorized: false
  }
});

db.on('connect', () => {
  console.log('Connected to Supabase PostgreSQL');
});

export async function testConnection(): Promise<void> {
  const client = await db.connect();
  await client.query('SELECT 1');
  client.release();
}
