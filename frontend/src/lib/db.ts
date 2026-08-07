import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ap5ozqnMg7NJ@ep-divine-dust-a2cycplf-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const globalForPg = globalThis as unknown as { pool: Pool; isInitialized?: boolean };

export const pool = globalForPg.pool || new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

let initPromise: Promise<void> | null = null;

async function ensureTablesExist() {
  if (globalForPg.isInitialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      const client = await pool.connect();
      try {
        // Fast-path : vérification ultra-rapide si les tables existent déjà dans la DB
        const check = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'immogest' AND table_name = 'utilisateurs' LIMIT 1;");
        if (check.rows && check.rows.length > 0) {
          globalForPg.isInitialized = true;
          return;
        }

        await client.query(`
          CREATE SCHEMA IF NOT EXISTS immogest;
          SET search_path TO immogest, public;

          CREATE TABLE IF NOT EXISTS immogest.utilisateurs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              nom_complet VARCHAR(200) NOT NULL,
              email VARCHAR(255) NOT NULL UNIQUE,
              mot_de_passe TEXT NOT NULL,
              role VARCHAR(50) NOT NULL DEFAULT 'Agent',
              est_actif BOOLEAN NOT NULL DEFAULT TRUE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS immogest.proprietaires (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              nom_prenoms VARCHAR(200) NOT NULL,
              contact VARCHAR(50),
              email VARCHAR(255),
              adresse TEXT,
              notes TEXT,
              est_actif BOOLEAN NOT NULL DEFAULT TRUE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS immogest.maisons (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              idm VARCHAR(100) NOT NULL UNIQUE,
              proprietaire_id UUID NOT NULL REFERENCES immogest.proprietaires(id) ON DELETE RESTRICT,
              type_construction VARCHAR(50) NOT NULL DEFAULT 'Appartement',
              nb_pieces SMALLINT NOT NULL DEFAULT 1,
              cout_loyer NUMERIC(12, 2) NOT NULL DEFAULT 0,
              ville VARCHAR(100) NOT NULL,
              quartier VARCHAR(100),
              adresse_complete TEXT,
              description TEXT,
              est_disponible BOOLEAN NOT NULL DEFAULT TRUE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS immogest.locataires (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              nom_prenoms VARCHAR(200) NOT NULL,
              contact VARCHAR(50),
              email VARCHAR(255),
              adresse TEXT,
              piece_identite VARCHAR(100),
              profession VARCHAR(150),
              notes TEXT,
              est_actif BOOLEAN NOT NULL DEFAULT TRUE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS immogest.souscriptions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              ids VARCHAR(100) NOT NULL UNIQUE,
              maison_id UUID NOT NULL REFERENCES immogest.maisons(id) ON DELETE RESTRICT,
              locataire_id UUID NOT NULL REFERENCES immogest.locataires(id) ON DELETE RESTRICT,
              date_souscription DATE NOT NULL DEFAULT CURRENT_DATE,
              date_fin DATE,
              montant_loyer NUMERIC(12, 2) NOT NULL DEFAULT 0,
              montant_caution NUMERIC(12, 2) NOT NULL DEFAULT 0,
              montant_avance NUMERIC(12, 2) NOT NULL DEFAULT 0,
              nb_mois_contrat SMALLINT,
              statut VARCHAR(50) NOT NULL DEFAULT 'Active',
              conditions TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS immogest.reglements (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              idr VARCHAR(100) NOT NULL UNIQUE,
              souscription_id UUID NOT NULL REFERENCES immogest.souscriptions(id) ON DELETE RESTRICT,
              maison_id UUID NOT NULL REFERENCES immogest.maisons(id) ON DELETE RESTRICT,
              locataire_id UUID NOT NULL REFERENCES immogest.locataires(id) ON DELETE RESTRICT,
              date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
              mois_concerne DATE NOT NULL DEFAULT CURRENT_DATE,
              montant_a_payer NUMERIC(12, 2) NOT NULL DEFAULT 0,
              montant_paye NUMERIC(12, 2) NOT NULL DEFAULT 0,
              statut VARCHAR(50) NOT NULL DEFAULT 'En attente',
              notes TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS immogest.depenses (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              type_depense VARCHAR(50) NOT NULL,
              maison_id UUID REFERENCES immogest.maisons(id) ON DELETE RESTRICT,
              locataire_id UUID REFERENCES immogest.locataires(id) ON DELETE RESTRICT,
              date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
              article VARCHAR(300) NOT NULL,
              quantite NUMERIC(10, 3) NOT NULL DEFAULT 1,
              prix_unitaire NUMERIC(12, 2) NOT NULL DEFAULT 0,
              montant NUMERIC(12, 2) DEFAULT 0,
              observation TEXT,
              piece_justificative VARCHAR(500),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          -- Migration automatique vers ON DELETE CASCADE pour immogest
          DO $$
          BEGIN
            ALTER TABLE immogest.maisons DROP CONSTRAINT IF EXISTS maisons_proprietaire_id_fkey;
            ALTER TABLE immogest.maisons ADD CONSTRAINT maisons_proprietaire_id_fkey 
              FOREIGN KEY (proprietaire_id) REFERENCES immogest.proprietaires(id) ON DELETE CASCADE;

            ALTER TABLE immogest.souscriptions DROP CONSTRAINT IF EXISTS souscriptions_maison_id_fkey;
            ALTER TABLE immogest.souscriptions ADD CONSTRAINT souscriptions_maison_id_fkey 
              FOREIGN KEY (maison_id) REFERENCES immogest.maisons(id) ON DELETE CASCADE;

            ALTER TABLE immogest.souscriptions DROP CONSTRAINT IF EXISTS souscriptions_locataire_id_fkey;
            ALTER TABLE immogest.souscriptions ADD CONSTRAINT souscriptions_locataire_id_fkey 
              FOREIGN KEY (locataire_id) REFERENCES immogest.locataires(id) ON DELETE CASCADE;

            ALTER TABLE immogest.reglements DROP CONSTRAINT IF EXISTS reglements_souscription_id_fkey;
            ALTER TABLE immogest.reglements ADD CONSTRAINT reglements_souscription_id_fkey 
              FOREIGN KEY (souscription_id) REFERENCES immogest.souscriptions(id) ON DELETE CASCADE;

            ALTER TABLE immogest.reglements DROP CONSTRAINT IF EXISTS reglements_maison_id_fkey;
            ALTER TABLE immogest.reglements ADD CONSTRAINT reglements_maison_id_fkey 
              FOREIGN KEY (maison_id) REFERENCES immogest.maisons(id) ON DELETE CASCADE;

            ALTER TABLE immogest.reglements DROP CONSTRAINT IF EXISTS reglements_locataire_id_fkey;
            ALTER TABLE immogest.reglements ADD CONSTRAINT reglements_locataire_id_fkey 
              FOREIGN KEY (locataire_id) REFERENCES immogest.locataires(id) ON DELETE CASCADE;

            ALTER TABLE immogest.depenses DROP CONSTRAINT IF EXISTS depenses_maison_id_fkey;
            ALTER TABLE immogest.depenses ADD CONSTRAINT depenses_maison_id_fkey 
              FOREIGN KEY (maison_id) REFERENCES immogest.maisons(id) ON DELETE CASCADE;

            ALTER TABLE immogest.depenses DROP CONSTRAINT IF EXISTS depenses_locataire_id_fkey;
            ALTER TABLE immogest.depenses ADD CONSTRAINT depenses_locataire_id_fkey 
              FOREIGN KEY (locataire_id) REFERENCES immogest.locataires(id) ON DELETE CASCADE;
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END $$;
        `);
        globalForPg.isInitialized = true;
      } catch (e) {
        console.warn('[Auto-Init Table Warning]:', e);
      } finally {
        client.release();
      }
    })();
  }
  await initPromise;
}

export async function query(text: string, params?: any[]) {
  await ensureTablesExist();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err: any) {
    if (err.code === '42P01' && text.includes('immogest.')) {
      const fallbackText = text.replace(/immogest\./g, 'public.');
      const res = await pool.query(fallbackText, params);
      return res;
    }
    throw err;
  }
}
