import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { rows } = await query(
      `UPDATE immogest.maisons
       SET proprietaire_id = $1, type_construction = $2, nb_pieces = $3, cout_loyer = $4,
           ville = $5, quartier = $6, adresse_complete = $7, description = $8, est_disponible = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING id AS "Id", idm AS "Idm", proprietaire_id AS "ProprietaireId", type_construction AS "TypeConstruction", nb_pieces AS "NbPieces", cout_loyer AS "CoutLoyer", ville AS "Ville", quartier AS "Quartier", est_disponible AS "EstDisponible"`,
      [body.ProprietaireId, body.TypeConstruction, body.NbPieces, body.CoutLoyer, body.Ville, body.Quartier || null, body.AdresseComplete || null, body.Description || null, body.EstDisponible ?? true, id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Bien introuvable.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur PUT /api/maisons/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur de modification.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined') return NextResponse.json({ error: 'ID invalide.' }, { status: 400 });

    // Nettoyage en cascade sécurisé
    await query(`DELETE FROM immogest.depenses WHERE maison_id = $1`, [id]);
    await query(`DELETE FROM immogest.reglements WHERE maison_id = $1`, [id]);
    await query(`DELETE FROM immogest.souscriptions WHERE maison_id = $1`, [id]);
    await query(`DELETE FROM immogest.maisons WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur DELETE /api/maisons/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
