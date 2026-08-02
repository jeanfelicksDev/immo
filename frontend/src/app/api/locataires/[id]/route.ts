import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { rows } = await query(
      `UPDATE immogest.locataires
       SET nom_prenoms = COALESCE($1, nom_prenoms), contact = $2, email = $3, adresse = $4,
           piece_identite = $5, profession = $6, notes = $7, est_actif = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING id AS "Id", nom_prenoms AS "NomPrenoms", contact AS "Contact", email AS "Email", adresse AS "Adresse", piece_identite AS "PieceIdentite", profession AS "Profession", notes AS "Notes", est_actif AS "EstActif"`,
      [body.NomPrenoms, body.Contact || null, body.Email || null, body.Adresse || null, body.PieceIdentite || null, body.Profession || null, body.Notes || null, body.EstActif ?? true, id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Locataire introuvable.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur PUT /api/locataires/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur de modification.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined') return NextResponse.json({ error: 'ID invalide.' }, { status: 400 });

    await query(`DELETE FROM immogest.depenses WHERE locataire_id = $1`, [id]);
    await query(`DELETE FROM immogest.reglements WHERE locataire_id = $1`, [id]);
    await query(`DELETE FROM immogest.souscriptions WHERE locataire_id = $1`, [id]);
    await query(`DELETE FROM immogest.locataires WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur DELETE /api/locataires/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
