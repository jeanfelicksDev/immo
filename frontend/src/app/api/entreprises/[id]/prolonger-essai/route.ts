import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Prolonger la date de fin d'essai de 14 jours
    const { rows } = await query(`
      UPDATE immogest.entreprises
      SET date_fin_essai = COALESCE(date_fin_essai, NOW()) + INTERVAL '14 days',
          statut_saas = 'Essai',
          updated_at = NOW()
      WHERE id = $1
      RETURNING id AS "Id", denomination AS "Denomination", date_fin_essai AS "DateFinEssai", statut_saas AS "StatutSaaS"
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur POST /api/entreprises/[id]/prolonger-essai:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}
