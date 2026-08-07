import { Pool } from 'pg';

// ════════════════════════════════════════════════════════════════
// Pool PostgreSQL — ImmoGest (Neon Cloud via pg)
// ════════════════════════════════════════════════════════════════

const connectionString = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ap5ozqnMg7NJ@ep-divine-dust-a2cycplf-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Singleton pool : réutilisé entre les invocations sur le même container
const globalForPg = globalThis as unknown as { _immoPool?: Pool };

function getPool(): Pool {
  if (!globalForPg._immoPool) {
    globalForPg._immoPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,                       // Limite pour ne pas saturer Neon Free
      idleTimeoutMillis: 10000,     // Libère rapidement les connexions inactives
      connectionTimeoutMillis: 8000,
    });
    globalForPg._immoPool.on('error', (err) => {
      console.error('[Pool Error]:', err.message);
    });
  }
  return globalForPg._immoPool;
}

// ════════════════════════════════════════════════════════════════
// Fonction query — Sans vérification DDL lente à chaque appel
// ════════════════════════════════════════════════════════════════

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    // Fallback si table introuvable dans immogest → essaie dans public
    if (err.code === '42P01' && text.includes('immogest.')) {
      const fallback = text.replace(/immogest\./g, 'public.');
      return pool.query(fallback, params);
    }
    throw err;
  }
}

// Export du pool pour compatibilité
export const pool = getPool();
