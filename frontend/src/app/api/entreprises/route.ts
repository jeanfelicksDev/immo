import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Assurer que la table entreprises existe
async function ensureEntrepriseTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS immogest.entreprises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        denomination VARCHAR(300) NOT NULL DEFAULT 'ImmoGest Agence',
        adresse_postale TEXT,
        adresse_physique TEXT,
        telephone VARCHAR(50),
        email_commercial VARCHAR(255),
        rccm_ifu VARCHAR(100),
        logo_url TEXT,
        devise VARCHAR(10) NOT NULL DEFAULT 'FCFA',
        statut_saas VARCHAR(50) NOT NULL DEFAULT 'Essai',
        date_debut_essai TIMESTAMPTZ DEFAULT NOW(),
        date_fin_essai TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
        est_bloque BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.warn('[Entreprise table init]:', e);
  }
}

export async function GET() {
  try {
    await ensureEntrepriseTable();

    const { rows } = await query(`
      SELECT id AS "Id", denomination AS "Denomination",
             adresse_postale AS "AdressePostale", adresse_physique AS "AdressePhysique",
             telephone AS "Telephone", email_commercial AS "EmailCommercial",
             rccm_ifu AS "RccmIfu", logo_url AS "LogoUrl", devise AS "Devise",
             statut_saas AS "StatutSaaS", date_debut_essai AS "DateDebutEssai",
             date_fin_essai AS "DateFinEssai", est_bloque AS "EstBloque",
             created_at AS "CreatedAt"
      FROM immogest.entreprises
      ORDER BY created_at ASC LIMIT 1
    `);

    if (rows.length === 0) {
      // Créer un profil par défaut si inexistant
      const defaultRes = await query(`
        INSERT INTO immogest.entreprises (denomination, adresse_postale, adresse_physique, telephone, email_commercial, rccm_ifu, devise)
        VALUES ('ImmoGest Agence Pro', '01 BP 4550 Abidjan 01', 'Boulevard de la République, Abidjan Plateau', '+225 07 00 11 22 33', 'contact@immogest.com', 'CI-ABJ-2026-B-88992', 'FCFA')
        RETURNING id AS "Id", denomination AS "Denomination",
                  adresse_postale AS "AdressePostale", adresse_physique AS "AdressePhysique",
                  telephone AS "Telephone", email_commercial AS "EmailCommercial",
                  rccm_ifu AS "RccmIfu", logo_url AS "LogoUrl", devise AS "Devise",
                  statut_saas AS "StatutSaaS", date_debut_essai AS "DateDebutEssai",
                  date_fin_essai AS "DateFinEssai", est_bloque AS "EstBloque"
      `);
      return NextResponse.json(defaultRes.rows[0]);
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur GET /api/entreprises:', error);
    return NextResponse.json({
      Denomination: 'ImmoGest Agence Pro',
      Devise: 'FCFA',
      StatutSaaS: 'Essai',
      EstBloque: false,
    });
  }
}

export async function POST(req: Request) {
  try {
    await ensureEntrepriseTable();
    const body = await req.json();

    // Upsert — met à jour ou crée le profil
    const existing = await query(`SELECT id FROM immogest.entreprises ORDER BY created_at ASC LIMIT 1`);

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      const { rows } = await query(`
        UPDATE immogest.entreprises
        SET denomination = $1, adresse_postale = $2, adresse_physique = $3,
            telephone = $4, email_commercial = $5, rccm_ifu = $6,
            logo_url = $7, devise = $8, updated_at = NOW()
        WHERE id = $9
        RETURNING id AS "Id", denomination AS "Denomination", devise AS "Devise"`,
        [
          body.Denomination || 'ImmoGest',
          body.AdressePostale || null,
          body.AdressePhysique || null,
          body.Telephone || null,
          body.EmailCommercial || null,
          body.RccmIfu || null,
          body.LogoUrl || null,
          body.Devise || 'FCFA',
          id
        ]
      );
      return NextResponse.json(rows[0]);
    } else {
      const { rows } = await query(`
        INSERT INTO immogest.entreprises (denomination, adresse_postale, adresse_physique, telephone, email_commercial, rccm_ifu, logo_url, devise)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id AS "Id", denomination AS "Denomination", devise AS "Devise"`,
        [
          body.Denomination || 'ImmoGest',
          body.AdressePostale || null,
          body.AdressePhysique || null,
          body.Telephone || null,
          body.EmailCommercial || null,
          body.RccmIfu || null,
          body.LogoUrl || null,
          body.Devise || 'FCFA'
        ]
      );
      return NextResponse.json(rows[0], { status: 201 });
    }
  } catch (error: any) {
    console.error('Erreur POST /api/entreprises:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}
