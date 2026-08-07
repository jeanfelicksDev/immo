import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await query(`
      SELECT id AS "Id", denomination AS "Denomination",
             email_commercial AS "EmailCommercial", telephone AS "Telephone",
             statut_saas AS "StatutSaaS", date_fin_essai AS "DateFinEssai",
             est_bloque AS "EstBloque", created_at AS "CreatedAt"
      FROM immogest.entreprises
      ORDER BY created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Erreur GET /api/entreprises/saas-clients:', error);
    return NextResponse.json([]);
  }
}
