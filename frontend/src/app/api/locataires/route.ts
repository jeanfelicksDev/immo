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
      SELECT l.id AS "Id", l.nom_prenoms AS "NomPrenoms", l.contact AS "Contact",
             l.email AS "Email", l.adresse AS "Adresse", l.piece_identite AS "PieceIdentite",
             l.profession AS "Profession", l.notes AS "Notes", l.est_actif AS "EstActif",
             l.created_at AS "CreatedAt", l.updated_at AS "UpdatedAt",
             COUNT(s.id)::int AS "NbContrats"
      FROM immogest.locataires l
      LEFT JOIN immogest.souscriptions s ON s.locataire_id = l.id
    `;
    const params: any[] = [];

    if (search) {
      sql += ` WHERE LOWER(l.nom_prenoms) LIKE $1 OR LOWER(COALESCE(l.email, '')) LIKE $1 OR LOWER(COALESCE(l.contact, '')) LIKE $1`;
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += ` GROUP BY l.id ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pageSize, offset);

    const { rows } = await query(sql, params);
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM immogest.locataires`);
    const totalCount = countRes.rows[0]?.total || 0;

    return NextResponse.json({
      Items: rows,
      TotalCount: totalCount,
      Page: page,
      PageSize: pageSize,
      TotalPages: Math.ceil(totalCount / pageSize) || 1
    });
  } catch (error: any) {
    console.error('Erreur GET /api/locataires:', error);
    return NextResponse.json({ Items: [], TotalCount: 0, Page: 1, PageSize: 20, TotalPages: 1 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rows } = await query(
      `INSERT INTO immogest.locataires (nom_prenoms, contact, email, adresse, piece_identite, profession, notes, est_actif)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id AS "Id", nom_prenoms AS "NomPrenoms", contact AS "Contact",
                 email AS "Email", adresse AS "Adresse", piece_identite AS "PieceIdentite",
                 profession AS "Profession", notes AS "Notes", est_actif AS "EstActif",
                 created_at AS "CreatedAt", updated_at AS "UpdatedAt"`,
      [body.NomPrenoms, body.Contact || null, body.Email || null, body.Adresse || null, body.PieceIdentite || null, body.Profession || null, body.Notes || null, body.EstActif !== undefined ? body.EstActif : true]
    );

    return NextResponse.json({ ...rows[0], NbContrats: 0 }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /api/locataires:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la création du locataire.' }, { status: 500 });
  }
}
