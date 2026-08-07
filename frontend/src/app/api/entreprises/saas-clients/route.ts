import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. S'assurer que la table immogest.entreprises existe
    await query(`
      CREATE TABLE IF NOT EXISTS immogest.entreprises (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        denomination VARCHAR(200) NOT NULL,
        adresse_postale TEXT,
        adresse_physique TEXT,
        telephone VARCHAR(50),
        email_commercial VARCHAR(255),
        rccm_ifu VARCHAR(100),
        logo_url TEXT,
        devise VARCHAR(20) DEFAULT 'FCFA',
        statut_saas VARCHAR(50) DEFAULT 'Essai',
        date_debut_essai TIMESTAMPTZ DEFAULT NOW(),
        date_fin_essai TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
        est_bloque BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. Récupérer les clients existants
    let { rows } = await query(`
      SELECT id AS "Id", denomination AS "Denomination",
             email_commercial AS "EmailCommercial", telephone AS "Telephone",
             statut_saas AS "StatutSaaS", date_fin_essai AS "DateFinEssai",
             est_bloque AS "EstBloque", created_at AS "CreatedAt"
      FROM immogest.entreprises
      ORDER BY created_at DESC
    `);

    // 3. S'il n'y a aucun client, insérer les comptes de démo par défaut
    if (rows.length === 0) {
      await query(`
        INSERT INTO immogest.entreprises (id, denomination, email_commercial, telephone, statut_saas, date_fin_essai, est_bloque)
        VALUES 
          ('11111111-1111-1111-1111-111111111111', 'Agence Immobilière Ivoire Prestige', 'contact@ivoireprestige.com', '+225 07 00 11 22 33', 'Essai', NOW() + INTERVAL '11 days', FALSE),
          ('22222222-2222-2222-2222-222222222222', 'Cabinet Foncier & Habitat Abidjan', 'direction@foncierhabitat.ci', '+225 05 44 55 66 77', 'Actif', NOW() + INTERVAL '300 days', FALSE),
          ('33333333-3333-3333-3333-333333333333', 'Société Immobilière du Littoral (Non Client)', 'info@littoralimmo.ci', '+225 01 22 33 44 55', 'Bloque', NOW() - INTERVAL '5 days', TRUE),
          ('44444444-4444-4444-4444-444444444444', 'Toure mamadou', 'toure.mamadou@immogest.ci', '+225 07 88 99 00 11', 'Actif', NOW() + INTERVAL '120 days', FALSE)
        ON CONFLICT (id) DO NOTHING
      `);

      // Re-sélectionner
      const refetched = await query(`
        SELECT id AS "Id", denomination AS "Denomination",
               email_commercial AS "EmailCommercial", telephone AS "Telephone",
               statut_saas AS "StatutSaaS", date_fin_essai AS "DateFinEssai",
               est_bloque AS "EstBloque", created_at AS "CreatedAt"
        FROM immogest.entreprises
        ORDER BY created_at DESC
      `);
      rows = refetched.rows;
    }

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Erreur GET /api/entreprises/saas-clients:', error);
    return NextResponse.json([]);
  }
}
