import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ap5ozqnMg7NJ@ep-divine-dust-a2cycplf-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const globalForPg = globalThis as unknown as { pool: Pool };

export const pool = globalForPg.pool || new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}
