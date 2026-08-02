import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const offset = (page - 1) * pageSize;

    const sql = `
      SELECT s.id AS "Id", s.ids AS "Ids", s.maison_id AS "MaisonId",
             m.idm AS "IdmMaison", m.ville AS "VilleMaison", m.type_construction AS "TypeConstructionMaison",
             s.locataire_id AS "LocataireId", l.nom_prenoms AS "NomLocataire", l.contact AS "ContactLocataire",
             s.date_souscription AS "DateSouscription", s.date_fin AS "DateFin",
             s.montant_loyer AS "MontantLoyer", s.montant_caution AS "MontantCaution",
             s.montant_avance AS "MontantAvance", s.nb_mois_contrat AS "NbMoisContrat",
             s.statut AS "Statut", s.conditions AS "Conditions",
             s.created_at AS "CreatedAt", s.updated_at AS "UpdatedAt"
      FROM immogest.souscriptions s
      JOIN immogest.maisons m ON s.maison_id = m.id
      JOIN immogest.locataires l ON s.locataire_id = l.id
      ORDER BY s.created_at DESC LIMIT $1 OFFSET $2
    `;

    const { rows } = await query(sql, [pageSize, offset]);
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM immogest.souscriptions`);
    const totalCount = countRes.rows[0]?.total || 0;

    return NextResponse.json({
      Items: rows,
      TotalCount: totalCount,
      Page: page,
      PageSize: pageSize,
      TotalPages: Math.ceil(totalCount / pageSize) || 1
    });
  } catch (error: any) {
    console.error('Erreur GET /api/souscriptions:', error);
    return NextResponse.json({ Items: [], TotalCount: 0, Page: 1, PageSize: 20, TotalPages: 1 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids = body.Ids || `SUB_${Date.now().toString().slice(-6)}`;

    const { rows } = await query(
      `INSERT INTO immogest.souscriptions (ids, maison_id, locataire_id, date_souscription, date_fin, montant_loyer, montant_caution, montant_avance, nb_mois_contrat, statut, conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id AS "Id", ids AS "Ids", maison_id AS "MaisonId", locataire_id AS "LocataireId", statut AS "Statut"`,
      [ids, body.MaisonId, body.LocataireId, body.DateSouscription || new Date().toISOString().split('T')[0], body.DateFin || null, body.MontantLoyer || 0, body.MontantCaution || 0, body.MontantAvance || 0, body.NbMoisContrat || 12, body.Statut || 'Active', body.Conditions || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /api/souscriptions:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la création du contrat.' }, { status: 500 });
  }
}
