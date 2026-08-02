import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { rows } = await query(
      `UPDATE immogest.reglements
       SET souscription_id = $1, maison_id = $2, locataire_id = $3, date_paiement = $4,
           mois_concerne = $5, montant_a_payer = $6, montant_paye = $7, statut = $8, notes = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING id AS "Id", idr AS "Idr", montant_paye AS "MontantPaye", statut AS "Statut"`,
      [body.SouscriptionId, body.MaisonId, body.LocataireId, body.DatePaiement, body.MoisConcerne, body.MontantAPayer, body.MontantPaye, body.Statut || 'Regle', body.Notes || null, id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Règlement introuvable.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur PUT /api/reglements/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur de modification.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined') return NextResponse.json({ error: 'ID invalide.' }, { status: 400 });

    await query(`DELETE FROM immogest.reglements WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur DELETE /api/reglements/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
