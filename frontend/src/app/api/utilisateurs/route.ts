import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // S'assurer que la colonne date_fin_essai existe
    await query(`
      ALTER TABLE immogest.utilisateurs 
      ADD COLUMN IF NOT EXISTS date_fin_essai TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days'
    `);

    // Initialiser les valeurs par défaut si null
    await query(`
      UPDATE immogest.utilisateurs
      SET date_fin_essai = NOW() + INTERVAL '14 days'
      WHERE date_fin_essai IS NULL
    `);

    const { rows } = await query(`
      SELECT id AS "Id", nom_complet AS "NomComplet", email AS "Email",
             telephone AS "Telephone", role AS "Role", est_actif AS "EstActif",
             date_fin_essai AS "DateFinEssai", created_at AS "CreatedAt"
      FROM immogest.utilisateurs
      ORDER BY created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Erreur GET /api/utilisateurs:', error);
    return NextResponse.json([]);
  }
}
