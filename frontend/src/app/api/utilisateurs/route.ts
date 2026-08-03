import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query(`
      SELECT id AS "Id", nom_complet AS "NomComplet", email AS "Email",
             role AS "Role", est_actif AS "EstActif", created_at AS "CreatedAt"
      FROM immogest.utilisateurs
      ORDER BY created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Erreur GET /api/utilisateurs:', error);
    return NextResponse.json([]);
  }
}
