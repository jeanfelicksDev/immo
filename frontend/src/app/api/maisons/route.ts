import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const offset = (page - 1) * pageSize;

    let sql = `
      SELECT m.id AS "Id", m.idm AS "Idm", m.proprietaire_id AS "ProprietaireId",
             p.nom_prenoms AS "NomProprietaire", m.type_construction AS "TypeConstruction",
             m.nb_pieces AS "NbPieces", m.cout_loyer AS "CoutLoyer", m.ville AS "Ville",
             m.quartier AS "Quartier", m.adresse_complete AS "AdresseComplete",
             m.description AS "Description", m.est_disponible AS "EstDisponible",
             m.created_at AS "CreatedAt", m.updated_at AS "UpdatedAt"
      FROM immogest.maisons m
      JOIN immogest.proprietaires p ON m.proprietaire_id = p.id
    `;
    const params: any[] = [];

    if (search) {
      sql += ` WHERE LOWER(m.idm) LIKE $1 OR LOWER(m.ville) LIKE $1 OR LOWER(p.nom_prenoms) LIKE $1`;
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pageSize, offset);

    const { rows } = await query(sql, params);
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM immogest.maisons`);
    const totalCount = countRes.rows[0]?.total || 0;

    return NextResponse.json({
      Items: rows,
      TotalCount: totalCount,
      Page: page,
      PageSize: pageSize,
      TotalPages: Math.ceil(totalCount / pageSize) || 1
    });
  } catch (error: any) {
    console.error('Erreur GET /api/maisons:', error);
    return NextResponse.json({ Items: [], TotalCount: 0, Page: 1, PageSize: 20, TotalPages: 1 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idm = body.Idm || `MB_P${body.NbPieces || 1}_C${Math.round(body.CoutLoyer || 0)}_${(body.Ville || 'ABJ').substring(0, 3).toUpperCase()}_${Date.now().toString().slice(-3)}`;

    const { rows } = await query(
      `INSERT INTO immogest.maisons (idm, proprietaire_id, type_construction, nb_pieces, cout_loyer, ville, quartier, adresse_complete, description, est_disponible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id AS "Id", idm AS "Idm", proprietaire_id AS "ProprietaireId", type_construction AS "TypeConstruction", nb_pieces AS "NbPieces", cout_loyer AS "CoutLoyer", ville AS "Ville", quartier AS "Quartier", est_disponible AS "EstDisponible"`,
      [idm, body.ProprietaireId, body.TypeConstruction || 'Appartement', body.NbPieces || 1, body.CoutLoyer || 0, body.Ville || 'Abidjan', body.Quartier || null, body.AdresseComplete || null, body.Description || null, body.EstDisponible !== undefined ? body.EstDisponible : true]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /api/maisons:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la création du bien.' }, { status: 500 });
  }
}
