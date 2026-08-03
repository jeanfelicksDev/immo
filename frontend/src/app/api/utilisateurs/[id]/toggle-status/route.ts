import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const estActif = body.EstActif !== undefined ? body.EstActif : true;

    const { rows } = await query(
      `UPDATE immogest.utilisateurs
       SET est_actif = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id AS "Id", nom_complet AS "NomComplet", email AS "Email", role AS "Role", est_actif AS "EstActif"`,
      [estActif, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur PUT /api/utilisateurs/[id]/toggle-status:', error);
    return NextResponse.json({ error: 'Erreur lors du changement de statut du compte.' }, { status: 500 });
  }
}
