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
      SELECT p.id AS "Id", p.nom_prenoms AS "NomPrenoms", p.contact AS "Contact",
             p.email AS "Email", p.adresse AS "Adresse", p.notes AS "Notes",
             p.est_actif AS "EstActif", p.created_at AS "CreatedAt", p.updated_at AS "UpdatedAt",
             COUNT(m.id)::int AS "NbMaisons"
      FROM immogest.proprietaires p
      LEFT JOIN immogest.maisons m ON m.proprietaire_id = p.id
    `;
    const params: any[] = [];

    if (search) {
      sql += ` WHERE LOWER(p.nom_prenoms) LIKE $1 OR LOWER(COALESCE(p.email, '')) LIKE $1 OR LOWER(COALESCE(p.contact, '')) LIKE $1`;
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pageSize, offset);

    const { rows } = await query(sql, params);

    const countRes = await query(`SELECT COUNT(*)::int AS total FROM immogest.proprietaires`);
    const totalCount = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return NextResponse.json({
      Items: rows,
      TotalCount: totalCount,
      Page: page,
      PageSize: pageSize,
      TotalPages: totalPages,
      HasPreviousPage: page > 1,
      HasNextPage: page < totalPages
    });
  } catch (error: any) {
    console.error('Erreur GET /api/proprietaires:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nomPrenoms = (body.NomPrenoms || body.nomPrenoms || '').trim();
    const contact = body.Contact || body.contact || null;
    const email = body.Email || body.email || null;
    const adresse = body.Adresse || body.adresse || null;
    const notes = body.Notes || body.notes || null;
    const estActif = body.EstActif !== undefined ? body.EstActif : true;

    if (!nomPrenoms) {
      return NextResponse.json({ error: 'Le nom et prénoms du propriétaire sont obligatoires.' }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO immogest.proprietaires (nom_prenoms, contact, email, adresse, notes, est_actif)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id AS "Id", nom_prenoms AS "NomPrenoms", contact AS "Contact",
                 email AS "Email", adresse AS "Adresse", notes AS "Notes",
                 est_actif AS "EstActif", created_at AS "CreatedAt", updated_at AS "UpdatedAt"`,
      [nomPrenoms, contact, email, adresse, notes, estActif]
    );

    return NextResponse.json({ ...rows[0], NbMaisons: 0 }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /api/proprietaires:', error);
    return NextResponse.json({ error: error.message || 'Erreur d\'enregistrement en base.' }, { status: 500 });
  }
}
