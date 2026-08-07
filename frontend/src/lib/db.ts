import { Pool } from 'pg';

// ════════════════════════════════════════════════════════════════
// Pool PostgreSQL — ImmoGest (Neon Cloud)
// Optimisé pour Vercel Serverless : réutilisation du pool entre invocations
// ════════════════════════════════════════════════════════════════

const connectionString = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ap5ozqnMg7NJ@ep-divine-dust-a2cycplf-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Singleton pool : réutilisé entre les invocations Lambda sur le même container
const globalForPg = globalThis as unknown as { _immoPool?: Pool };

function getPool(): Pool {
  if (!globalForPg._immoPool) {
    globalForPg._immoPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,                       // Limite pour ne pas saturer Neon Free
      idleTimeoutMillis: 10000,     // Libère rapidement les connexions inactives
      connectionTimeoutMillis: 8000,
    });
    globalForPg._immoPool.on('error', (err) => {
      console.error('[Pool Error]:', err.message);
    });
  }
  return globalForPg._immoPool;
}

// ════════════════════════════════════════════════════════════════
// Initialisation des Tables (une seule fois, jamais à chaque requête)
// ════════════════════════════════════════════════════════════════

let tablesReady = false;

export async function initDatabase(): Promise<void> {
  if (tablesReady) return;
  const pool = getPool();
  const client = await pool.connect();
  try {
    // Fast-path : les tables existent déjà (cas normal en prod)
    const check = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema='immogest' AND table_name='utilisateurs' LIMIT 1"
    );
    if (check.rows.length > 0) {
      tablesReady = true;
      return;
    }

    // Création initiale du schéma (uniquement si tables absentes)
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS immogest;

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
        proprietaire_id UUID NOT NULL REFERENCES immogest.proprietaires(id) ON DELETE CASCADE,
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
        maison_id UUID NOT NULL REFERENCES immogest.maisons(id) ON DELETE CASCADE,
        locataire_id UUID NOT NULL REFERENCES immogest.locataires(id) ON DELETE CASCADE,
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
        souscription_id UUID NOT NULL REFERENCES immogest.souscriptions(id) ON DELETE CASCADE,
        maison_id UUID NOT NULL REFERENCES immogest.maisons(id) ON DELETE CASCADE,
        locataire_id UUID NOT NULL REFERENCES immogest.locataires(id) ON DELETE CASCADE,
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
        maison_id UUID REFERENCES immogest.maisons(id) ON DELETE CASCADE,
        locataire_id UUID REFERENCES immogest.locataires(id) ON DELETE CASCADE,
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
      );
    `);

    tablesReady = true;
  } catch (err) {
    console.warn('[DB Init Warning]:', err);
    tablesReady = true; // Permet les requêtes même si erreur (tables déjà existantes)
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════
// Fonction query — Directe, sans vérification DDL à chaque appel
// C'est la clé de la performance : plus de 10-20s de délai par requête
// ════════════════════════════════════════════════════════════════

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    // Fallback si table introuvable dans immogest → essaie dans public
    if (err.code === '42P01' && text.includes('immogest.')) {
      const fallback = text.replace(/immogest\./g, 'public.');
      return pool.query(fallback, params);
    }
    throw err;
  }
}

// Export du pool pour compatibilité
export const pool = getPool();
