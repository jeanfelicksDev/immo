import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { rows } = await query(
      `SELECT id AS "Id", nom_complet AS "NomComplet", email AS "Email",
              role AS "Role", est_actif AS "EstActif", created_at AS "CreatedAt"
       FROM immogest.utilisateurs WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur GET /api/utilisateurs/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'ID utilisateur invalide.' }, { status: 400 });
    }

    const res = await query(
      `DELETE FROM immogest.utilisateurs WHERE id = $1 RETURNING id`,
      [id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Utilisateur supprimé.' });
  } catch (error: any) {
    console.error('Erreur DELETE /api/utilisateurs/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    if (body.DateFinEssai !== undefined) {
      const { rows } = await query(
        `UPDATE immogest.utilisateurs
         SET date_fin_essai = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id AS "Id", nom_complet AS "NomComplet", email AS "Email", role AS "Role", est_actif AS "EstActif", date_fin_essai AS "DateFinEssai"`,
        [body.DateFinEssai, id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    }

    return NextResponse.json({ error: 'Aucune donnée valide fournie.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erreur PUT /api/utilisateurs/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}

