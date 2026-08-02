import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const offset = (page - 1) * pageSize;

    const sql = `
      SELECT d.id AS "Id", d.type_depense AS "TypeDepense", d.maison_id AS "MaisonId",
             m.idm AS "IdmMaison", d.locataire_id AS "LocataireId", l.nom_prenoms AS "NomLocataire",
             d.date_depense AS "DateDepense", d.article AS "Article", d.quantite AS "Quantite",
             d.prix_unitaire AS "PrixUnitaire", d.montant AS "Montant", d.observation AS "Observation",
             d.piece_justificative AS "PieceJustificative", d.created_at AS "CreatedAt"
      FROM immogest.depenses d
      LEFT JOIN immogest.maisons m ON d.maison_id = m.id
      LEFT JOIN immogest.locataires l ON d.locataire_id = l.id
      ORDER BY d.created_at DESC LIMIT $1 OFFSET $2
    `;

    const { rows } = await query(sql, [pageSize, offset]);
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM immogest.depenses`);
    const totalCount = countRes.rows[0]?.total || 0;

    return NextResponse.json({
      Items: rows,
      TotalCount: totalCount,
      Page: page,
      PageSize: pageSize,
      TotalPages: Math.ceil(totalCount / pageSize) || 1
    });
  } catch (error: any) {
    console.error('Erreur GET /api/depenses:', error);
    return NextResponse.json({ Items: [], TotalCount: 0, Page: 1, PageSize: 20, TotalPages: 1 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const qte = Number(body.Quantite || 1);
    const pu = Number(body.PrixUnitaire || 0);

    const { rows } = await query(
      `INSERT INTO immogest.depenses (type_depense, maison_id, locataire_id, date_depense, article, quantite, prix_unitaire, montant, observation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id AS "Id", article AS "Article", montant AS "Montant"`,
      [body.TypeDepense || 'DepensesGlobales', body.MaisonId || null, body.LocataireId || null, body.DateDepense || new Date().toISOString().split('T')[0], body.Article || 'Dépense générale', qte, pu, qte * pu, body.Observation || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /api/depenses:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la création de la dépense.' }, { status: 500 });
  }
}
