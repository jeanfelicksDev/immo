import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. S'assurer que le schéma et la table existent
    await query(`CREATE SCHEMA IF NOT EXISTS immogest`);

    await query(`
      CREATE TABLE IF NOT EXISTS immogest.utilisateurs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom_complet VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        telephone VARCHAR(50),
        mot_de_passe VARCHAR(255),
        role VARCHAR(50) DEFAULT 'Gestionnaire',
        est_actif BOOLEAN DEFAULT TRUE,
        date_fin_essai TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // S'assurer que les colonnes nécessaires existent
    await query(`
      ALTER TABLE immogest.utilisateurs 
      ADD COLUMN IF NOT EXISTS date_fin_essai TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
      ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)
    `);

    // 2. Seeder si la table est vide
    const countCheck = await query(`SELECT COUNT(*) FROM immogest.utilisateurs`);
    if (parseInt(countCheck.rows[0].count, 10) === 0) {
      const defaultPasswordHash = await bcrypt.hash('Admin@2025!', 10);
      await query(
        `INSERT INTO immogest.utilisateurs (nom_complet, email, telephone, role, est_actif, mot_de_passe, date_fin_essai)
         VALUES 
          ('Administrateur Système', 'admin@immogest.com', '+225 07 00 00 00 00', 'Administrateur', TRUE, $1, NOW() + INTERVAL '365 days'),
          ('Jean Felicks (Démo)', 'jeanfelicks@gmail.com', '+225 05 12 34 56 78', 'Gestionnaire', TRUE, $1, NOW() + INTERVAL '14 days'),
          ('Kouassi Marc', 'marc.kouassi@immo.ci', '+225 01 98 76 54 32', 'Agent', FALSE, $1, NOW() + INTERVAL '14 days'),
          ('Toure mamadou', 'toure.mamadou@immogest.ci', '+225 07 89 12 34 56', 'Gestionnaire', TRUE, $1, NOW() + INTERVAL '14 days')
         ON CONFLICT (email) DO NOTHING`,
        [defaultPasswordHash]
      );
    }

    // 3. Récupérer tous les utilisateurs enregistrés en base
    const { rows } = await query(`
      SELECT id AS "Id", nom_complet AS "NomComplet", email AS "Email",
             telephone AS "Telephone", role AS "Role", est_actif AS "EstActif",
             date_fin_essai AS "DateFinEssai", created_at AS "CreatedAt"
      FROM immogest.utilisateurs
      ORDER BY created_at DESC
    `);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Erreur GET /api/utilisateurs:', error);
    return NextResponse.json([]);
  }
}

