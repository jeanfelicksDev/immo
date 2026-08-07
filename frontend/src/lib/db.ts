import { neon, neonConfig } from '@neondatabase/serverless';

// ════════════════════════════════════════════════════════════════
// Driver Neon Serverless — ImmoGest
// Utilise HTTP au lieu de TCP/SSL → jusqu'à 10x plus rapide sur Vercel
// ════════════════════════════════════════════════════════════════

// Cache la connexion HTTP entre les invocations Lambda sur le même container
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ap5ozqnMg7NJ@ep-divine-dust-a2cycplf-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Instance SQL singleton (réutilisée entre invocations sur le même container)
const globalForNeon = globalThis as unknown as { _neonSql?: ReturnType<typeof neon> };

function getSql() {
  if (!globalForNeon._neonSql) {
    globalForNeon._neonSql = neon(connectionString);
  }
  return globalForNeon._neonSql;
}

// ════════════════════════════════════════════════════════════════
// Fonction query — Compatible avec l'API pg (rows + rowCount)
// ════════════════════════════════════════════════════════════════

export async function query(text: string, params?: any[]) {
  const sql = getSql();
  try {
    const result = await sql(text, params || [], { fullResults: true });
    return result as any;
  } catch (err: any) {
    // Fallback si table introuvable dans immogest → essaie dans public
    if (err.code === '42P01' && text.includes('immogest.')) {
      const fallback = text.replace(/immogest\./g, 'public.');
      return sql(fallback, params || [], { fullResults: true }) as any;
    }
    throw err;
  }
}

// Export de compatibilité (pour les routes qui importent `pool`)
export const pool = { query } as any;
