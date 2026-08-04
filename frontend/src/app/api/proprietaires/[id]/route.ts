import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { rows } = await query(
      `UPDATE immogest.proprietaires
       SET nom_prenoms = COALESCE($1, nom_prenoms),
           contact = $2, email = $3, adresse = $4, notes = $5, est_actif = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING id AS "Id", nom_prenoms AS "NomPrenoms", contact AS "Contact",
                 email AS "Email", adresse AS "Adresse", notes AS "Notes",
                 est_actif AS "EstActif", created_at AS "CreatedAt", updated_at AS "UpdatedAt"`,
      [body.NomPrenoms, body.Contact, body.Email, body.Adresse, body.Notes, body.EstActif ?? true, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Propriétaire introuvable.' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur PUT /api/proprietaires/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la modification.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'ID de propriétaire invalide.' }, { status: 400 });
    }

    // 1. Supprimer les dépenses liées aux maisons du propriétaire
    await query(`
      DELETE FROM immogest.depenses 
      WHERE maison_id IN (SELECT id FROM immogest.maisons WHERE proprietaire_id = $1)
    `, [id]);

    // 2. Supprimer tous les règlements liés aux maisons OU aux souscriptions du propriétaire
    await query(`
      DELETE FROM immogest.reglements 
      WHERE maison_id IN (SELECT id FROM immogest.maisons WHERE proprietaire_id = $1)
         OR souscription_id IN (SELECT id FROM immogest.souscriptions WHERE maison_id IN (SELECT id FROM immogest.maisons WHERE proprietaire_id = $1))
    `, [id]);

    // 3. Supprimer les souscriptions liées aux maisons du propriétaire
    await query(`
      DELETE FROM immogest.souscriptions 
      WHERE maison_id IN (SELECT id FROM immogest.maisons WHERE proprietaire_id = $1)
    `, [id]);

    // 4. Supprimer les maisons du propriétaire
    await query(`DELETE FROM immogest.maisons WHERE proprietaire_id = $1`, [id]);

    // 5. Supprimer le propriétaire
    const res = await query(`DELETE FROM immogest.proprietaires WHERE id = $1 RETURNING id`, [id]);

    if (res.rowCount === 0) {
      await query(`DELETE FROM public.depenses WHERE maison_id IN (SELECT id FROM public.maisons WHERE proprietaire_id = $1)`, [id]);
      await query(`DELETE FROM public.reglements WHERE maison_id IN (SELECT id FROM public.maisons WHERE proprietaire_id = $1) OR souscription_id IN (SELECT id FROM public.souscriptions WHERE maison_id IN (SELECT id FROM public.maisons WHERE proprietaire_id = $1))`, [id]);
      await query(`DELETE FROM public.souscriptions WHERE maison_id IN (SELECT id FROM public.maisons WHERE proprietaire_id = $1)`, [id]);
      await query(`DELETE FROM public.maisons WHERE proprietaire_id = $1`, [id]);
      await query(`DELETE FROM public.proprietaires WHERE id = $1`, [id]);
    }

    return NextResponse.json({ success: true, message: 'Propriétaire supprimé.' });
  } catch (error: any) {
    console.error('Erreur DELETE /api/proprietaires/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur SQL lors de la suppression.' }, { status: 500 });
  }
}
