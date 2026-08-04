import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { rows } = await query(
      `UPDATE immogest.depenses
       SET type_depense = $1, maison_id = $2, locataire_id = $3, date_depense = $4,
           article = $5, quantite = $6, prix_unitaire = $7, montant = $8, observation = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING id AS "Id", article AS "Article", montant AS "Montant"`,
      [body.TypeDepense, body.MaisonId || null, body.LocataireId || null, body.DateDepense, body.Article, body.Quantite || 1, body.PrixUnitaire || 0, (body.Quantite || 1) * (body.PrixUnitaire || 0), body.Observation || null, id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Dépense introuvable.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur PUT /api/depenses/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur de modification.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined') return NextResponse.json({ error: 'ID invalide.' }, { status: 400 });

    const res = await query(`DELETE FROM immogest.depenses WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) {
      await query(`DELETE FROM public.depenses WHERE id = $1`, [id]);
    }

    return NextResponse.json({ success: true, message: 'Dépense supprimée.' });
  } catch (error: any) {
    console.error('Erreur DELETE /api/depenses/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
