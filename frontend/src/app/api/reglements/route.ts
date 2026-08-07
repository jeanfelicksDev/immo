import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const offset = (page - 1) * pageSize;

    const sql = `
      SELECT r.id AS "Id", r.idr AS "Idr", r.souscription_id AS "SouscriptionId",
             s.ids AS "IdsSouscription", r.maison_id AS "MaisonId", m.idm AS "IdmMaison",
             r.locataire_id AS "LocataireId", l.nom_prenoms AS "NomLocataire",
             r.date_paiement AS "DatePaiement", r.mois_concerne AS "MoisConcerne",
             r.montant_a_payer AS "MontantAPayer", r.montant_paye AS "MontantPaye",
             r.statut AS "Statut", r.notes AS "Notes",
             r.created_at AS "CreatedAt", r.updated_at AS "UpdatedAt"
      FROM immogest.reglements r
      JOIN immogest.souscriptions s ON r.souscription_id = s.id
      JOIN immogest.maisons m ON r.maison_id = m.id
      JOIN immogest.locataires l ON r.locataire_id = l.id
      ORDER BY r.created_at DESC LIMIT $1 OFFSET $2
    `;

    const { rows } = await query(sql, [pageSize, offset]);
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM immogest.reglements`);
    const totalCount = countRes.rows[0]?.total || 0;

    return NextResponse.json({
      Items: rows,
      TotalCount: totalCount,
      Page: page,
      PageSize: pageSize,
      TotalPages: Math.ceil(totalCount / pageSize) || 1
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reglements:', error);
    return NextResponse.json({ Items: [], TotalCount: 0, Page: 1, PageSize: 20, TotalPages: 1 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idr = body.Idr || `REG_${Date.now().toString().slice(-6)}`;

    let maisonId = body.MaisonId;
    let locataireId = body.LocataireId;

    // Resoudre maison_id et locataire_id a partir de la souscription si non fournies
    if ((!maisonId || !locataireId) && body.SouscriptionId) {
      const sRes = await query(
        `SELECT maison_id, locataire_id FROM immogest.souscriptions WHERE id = $1`,
        [body.SouscriptionId]
      );
      if (sRes.rows.length > 0) {
        if (!maisonId) maisonId = sRes.rows[0].maison_id;
        if (!locataireId) locataireId = sRes.rows[0].locataire_id;
      }
    }

    if (!maisonId || !locataireId) {
      return NextResponse.json({ error: 'Contrat de souscription introuvable ou invalide.' }, { status: 400 });
    }

    const datePaiement = body.DatePaiement ? new Date(body.DatePaiement).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const moisConcerne = body.MoisConcerne ? new Date(body.MoisConcerne).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const { rows } = await query(
      `INSERT INTO immogest.reglements (idr, souscription_id, maison_id, locataire_id, date_paiement, mois_concerne, montant_a_payer, montant_paye, statut, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id AS "Id", idr AS "Idr", date_paiement AS "DatePaiement", mois_concerne AS "MoisConcerne", montant_paye AS "MontantPaye", statut AS "Statut"`,
      [idr, body.SouscriptionId, maisonId, locataireId, datePaiement, moisConcerne, body.MontantAPayer || 0, body.MontantPaye || 0, body.Statut || 'Regle', body.Notes || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /api/reglements:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors du règlement.' }, { status: 500 });
  }
}
