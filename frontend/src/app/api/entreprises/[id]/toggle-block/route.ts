import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Inverser l'état de blocage
    const { rows } = await query(`
      UPDATE immogest.entreprises
      SET est_bloque = NOT est_bloque,
          statut_saas = CASE WHEN est_bloque THEN 'Actif' ELSE 'Bloque' END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id AS "Id", denomination AS "Denomination", est_bloque AS "EstBloque", statut_saas AS "StatutSaaS"
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur POST /api/entreprises/[id]/toggle-block:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}
