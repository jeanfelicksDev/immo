import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { rows } = await query(
      `UPDATE immogest.souscriptions
       SET maison_id = $1, locataire_id = $2, date_souscription = $3, date_fin = $4,
           montant_loyer = $5, montant_caution = $6, montant_avance = $7, nb_mois_contrat = $8,
           statut = $9, conditions = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING id AS "Id", ids AS "Ids", maison_id AS "MaisonId", locataire_id AS "LocataireId", statut AS "Statut"`,
      [body.MaisonId, body.LocataireId, body.DateSouscription, body.DateFin || null, body.MontantLoyer, body.MontantCaution, body.MontantAvance, body.NbMoisContrat || null, body.Statut || 'Active', body.Conditions || null, id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Souscription introuvable.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur PUT /api/souscriptions/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la modification.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined') return NextResponse.json({ error: 'ID invalide.' }, { status: 400 });

    await query(`DELETE FROM immogest.reglements WHERE souscription_id = $1`, [id]);
    const res = await query(`DELETE FROM immogest.souscriptions WHERE id = $1 RETURNING id`, [id]);

    if (res.rowCount === 0) {
      await query(`DELETE FROM public.reglements WHERE souscription_id = $1`, [id]);
      await query(`DELETE FROM public.souscriptions WHERE id = $1`, [id]);
    }

    return NextResponse.json({ success: true, message: 'Souscription supprimée.' });
  } catch (error: any) {
    console.error('Erreur DELETE /api/souscriptions/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
