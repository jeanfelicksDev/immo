import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureEntreprisesTable() {
  await query(`CREATE SCHEMA IF NOT EXISTS immogest`);
  await query(`
    CREATE TABLE IF NOT EXISTS immogest.entreprises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      denomination TEXT NOT NULL,
      adresse_postale TEXT,
      adresse_physique TEXT,
      telephone VARCHAR(50),
      email_commercial VARCHAR(255),
      rccm_ifu VARCHAR(100),
      logo_url TEXT,
      signature_url TEXT,
      devise VARCHAR(20) DEFAULT 'FCFA',
      statut_saas VARCHAR(50) DEFAULT 'Essai',
      date_debut_essai TIMESTAMPTZ DEFAULT NOW(),
      date_fin_essai TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
      est_bloque BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Assurer que les colonnes qui stockent des données volumineuses (ex: images Base64) existent et sont au type TEXT
  await query(`
    ALTER TABLE immogest.entreprises 
    ADD COLUMN IF NOT EXISTS signature_url TEXT,
    ALTER COLUMN logo_url TYPE TEXT,
    ALTER COLUMN adresse_postale TYPE TEXT,
    ALTER COLUMN adresse_physique TYPE TEXT,
    ALTER COLUMN denomination TYPE TEXT,
    ALTER COLUMN rccm_ifu TYPE TEXT
  `);
}

export async function GET() {
  try {
    await ensureEntreprisesTable();

    const { rows } = await query(`
      SELECT id AS "Id", denomination AS "Denomination",
             adresse_postale AS "AdressePostale", adresse_physique AS "AdressePhysique",
             telephone AS "Telephone", email_commercial AS "EmailCommercial",
             rccm_ifu AS "RccmIfu", logo_url AS "LogoUrl", signature_url AS "SignatureUrl",
             devise AS "Devise", statut_saas AS "StatutSaaS", date_debut_essai AS "DateDebutEssai",
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
                  rccm_ifu AS "RccmIfu", logo_url AS "LogoUrl", signature_url AS "SignatureUrl",
                  devise AS "Devise", statut_saas AS "StatutSaaS", date_debut_essai AS "DateDebutEssai",
                  date_fin_essai AS "DateFinEssai", est_bloque AS "EstBloque"
      `);
      return NextResponse.json(defaultRes.rows[0]);
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Erreur GET /api/entreprises:', error);
    return NextResponse.json({
      Denomination: 'ImmoGest Agence Pro',
      AdressePostale: '01 BP 4550 Abidjan 01',
      AdressePhysique: 'Boulevard de la République, Abidjan Plateau',
      Telephone: '+225 07 00 11 22 33',
      EmailCommercial: 'contact@immogest.com',
      RccmIfu: 'CI-ABJ-2026-B-88992',
      Devise: 'FCFA',
      StatutSaaS: 'Essai',
      EstBloque: false,
    });
  }
}

export async function POST(req: Request) {
  try {
    await ensureEntreprisesTable();
    const body = await req.json();

    const existing = await query(`SELECT id FROM immogest.entreprises ORDER BY created_at ASC LIMIT 1`);

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      const { rows } = await query(`
        UPDATE immogest.entreprises
        SET denomination = $1, adresse_postale = $2, adresse_physique = $3,
            telephone = $4, email_commercial = $5, rccm_ifu = $6,
            logo_url = $7, signature_url = $8, devise = $9, updated_at = NOW()
        WHERE id = $10
        RETURNING id AS "Id", denomination AS "Denomination",
                  adresse_postale AS "AdressePostale", adresse_physique AS "AdressePhysique",
                  telephone AS "Telephone", email_commercial AS "EmailCommercial",
                  rccm_ifu AS "RccmIfu", logo_url AS "LogoUrl", signature_url AS "SignatureUrl",
                  devise AS "Devise", statut_saas AS "StatutSaaS", date_debut_essai AS "DateDebutEssai",
                  date_fin_essai AS "DateFinEssai", est_bloque AS "EstBloque"`,
        [
          body.Denomination || body.denomination || 'ImmoGest Agence Pro',
          body.AdressePostale || body.adresse_postale || null,
          body.AdressePhysique || body.adresse_physique || null,
          body.Telephone || body.telephone || null,
          body.EmailCommercial || body.email_commercial || null,
          body.RccmIfu || body.rccm_ifu || null,
          body.LogoUrl || body.logo_url || null,
          body.SignatureUrl || body.signature_url || null,
          body.Devise || body.devise || 'FCFA',
          id
        ]
      );
      return NextResponse.json(rows[0]);
    } else {
      const { rows } = await query(`
        INSERT INTO immogest.entreprises (denomination, adresse_postale, adresse_physique, telephone, email_commercial, rccm_ifu, logo_url, signature_url, devise)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id AS "Id", denomination AS "Denomination",
                  adresse_postale AS "AdressePostale", adresse_physique AS "AdressePhysique",
                  telephone AS "Telephone", email_commercial AS "EmailCommercial",
                  rccm_ifu AS "RccmIfu", logo_url AS "LogoUrl", signature_url AS "SignatureUrl",
                  devise AS "Devise", statut_saas AS "StatutSaaS", date_debut_essai AS "DateDebutEssai",
                  date_fin_essai AS "DateFinEssai", est_bloque AS "EstBloque"`,
        [
          body.Denomination || body.denomination || 'ImmoGest Agence Pro',
          body.AdressePostale || body.adresse_postale || null,
          body.AdressePhysique || body.adresse_physique || null,
          body.Telephone || body.telephone || null,
          body.EmailCommercial || body.email_commercial || null,
          body.RccmIfu || body.rccm_ifu || null,
          body.LogoUrl || body.logo_url || null,
          body.SignatureUrl || body.signature_url || null,
          body.Devise || body.devise || 'FCFA'
        ]
      );
      return NextResponse.json(rows[0], { status: 201 });
    }
  } catch (error: any) {
    console.error('Erreur POST /api/entreprises:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur lors de la sauvegarde.' }, { status: 500 });
  }
}


