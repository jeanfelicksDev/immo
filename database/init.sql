-- ════════════════════════════════════════════════════════════════
-- ImmoGest SaaS — Script DDL PostgreSQL 16
-- Création complète du schéma de la base de données
-- ════════════════════════════════════════════════════════════════

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ─────────────────────────────────────────────────────────────
-- SCHÉMA : immogest
-- ─────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS immogest;
SET search_path TO immogest, public;

-- ─────────────────────────────────────────────────────────────
-- ÉNUMÉRATIONS (Types PostgreSQL)
-- ─────────────────────────────────────────────────────────────

CREATE TYPE role_utilisateur AS ENUM ('Administrateur', 'Gestionnaire', 'Agent');
CREATE TYPE type_construction AS ENUM ('Maison basse', 'Appartement', 'Villa', 'Studio', 'Duplex', 'Bureau', 'Commerce', 'Entrepôt');
CREATE TYPE type_depense AS ENUM ('Dépenses globales', 'Dépenses d''une maison', 'Imputation Locataire');
CREATE TYPE statut_souscription AS ENUM ('Active', 'Expirée', 'Résiliée', 'En attente');
CREATE TYPE statut_paiement AS ENUM ('En attente', 'Partiel', 'Payé', 'En retard');

-- ═════════════════════════════════════════════════════════════
-- TABLE : utilisateurs (Authentification & Rôles)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE utilisateurs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_complet     VARCHAR(200) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe    TEXT NOT NULL,                          -- Hash bcrypt
    role            role_utilisateur NOT NULL DEFAULT 'Agent',
    est_actif       BOOLEAN NOT NULL DEFAULT TRUE,
    refresh_token   TEXT,
    token_expiry    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
);

COMMENT ON TABLE utilisateurs IS 'Comptes utilisateurs de la plateforme ImmoGest avec gestion des rôles.';
COMMENT ON COLUMN utilisateurs.mot_de_passe IS 'Hash bcrypt du mot de passe. Ne jamais stocker en clair.';

-- ═════════════════════════════════════════════════════════════
-- TABLE : proprietaires
-- ═════════════════════════════════════════════════════════════
CREATE TABLE proprietaires (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_prenoms     VARCHAR(200) NOT NULL,
    contact         VARCHAR(50),
    email           VARCHAR(255),
    adresse         TEXT,
    notes           TEXT,
    est_actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
);

COMMENT ON TABLE proprietaires IS 'Propriétaires des biens immobiliers gérés par l''agence.';

-- Index de recherche
CREATE INDEX idx_proprietaires_nom ON proprietaires USING gin(to_tsvector('french', nom_prenoms));
CREATE INDEX idx_proprietaires_email ON proprietaires(email) WHERE email IS NOT NULL;

-- ═════════════════════════════════════════════════════════════
-- TABLE : maisons (Biens Immobiliers)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE maisons (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idm                 VARCHAR(100) NOT NULL UNIQUE,       -- ex: MB_P3_C80000_...
    proprietaire_id     UUID NOT NULL REFERENCES proprietaires(id) ON DELETE RESTRICT,
    type_construction   type_construction NOT NULL DEFAULT 'Appartement',
    nb_pieces           SMALLINT NOT NULL DEFAULT 1 CHECK (nb_pieces > 0),
    cout_loyer          NUMERIC(12, 2) NOT NULL CHECK (cout_loyer >= 0),
    ville               VARCHAR(100) NOT NULL,
    quartier            VARCHAR(100),
    adresse_complete    TEXT,
    description         TEXT,
    est_disponible      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    updated_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
);

COMMENT ON TABLE maisons IS 'Biens immobiliers gérés par l''agence. IDM = identifiant unique du bien.';
COMMENT ON COLUMN maisons.idm IS 'Identifiant métier unique du bien. Format: MB_P{pieces}_C{cout}_{sequence}';

CREATE INDEX idx_maisons_proprietaire ON maisons(proprietaire_id);
CREATE INDEX idx_maisons_ville ON maisons(ville);
CREATE INDEX idx_maisons_disponible ON maisons(est_disponible);
CREATE INDEX idx_maisons_idm ON maisons(idm);

-- ═════════════════════════════════════════════════════════════
-- TABLE : locataires
-- ═════════════════════════════════════════════════════════════
CREATE TABLE locataires (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_prenoms     VARCHAR(200) NOT NULL,
    contact         VARCHAR(50),
    email           VARCHAR(255),
    adresse         TEXT,
    piece_identite  VARCHAR(100),                           -- N° CNI / Passeport
    profession      VARCHAR(150),
    notes           TEXT,
    est_actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
);

COMMENT ON TABLE locataires IS 'Personnes physiques ou morales louant les biens gérés par l''agence.';

CREATE INDEX idx_locataires_nom ON locataires USING gin(to_tsvector('french', nom_prenoms));
CREATE INDEX idx_locataires_email ON locataires(email) WHERE email IS NOT NULL;

-- ═════════════════════════════════════════════════════════════
-- TABLE : souscriptions (Contrats de Location)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE souscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ids                 VARCHAR(100) NOT NULL UNIQUE,       -- Identifiant métier du contrat
    maison_id           UUID NOT NULL REFERENCES maisons(id) ON DELETE RESTRICT,
    locataire_id        UUID NOT NULL REFERENCES locataires(id) ON DELETE RESTRICT,
    date_souscription   DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin            DATE,                               -- NULL = durée indéterminée
    montant_loyer       NUMERIC(12, 2) NOT NULL CHECK (montant_loyer > 0),
    montant_caution     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (montant_caution >= 0),
    montant_avance      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (montant_avance >= 0),
    nb_mois_contrat     SMALLINT CHECK (nb_mois_contrat > 0),
    statut              statut_souscription NOT NULL DEFAULT 'Active',
    conditions          TEXT,                               -- Clauses particulières
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    updated_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,

    -- Une maison ne peut avoir qu'un seul contrat actif à la fois
    CONSTRAINT uq_maison_active EXCLUDE USING gist (
        maison_id WITH =,
        daterange(date_souscription, COALESCE(date_fin, '9999-12-31'), '[]') WITH &&
    ) WHERE (statut = 'Active')
);

COMMENT ON TABLE souscriptions IS 'Contrats de location liant un locataire à un bien immobilier.';
COMMENT ON COLUMN souscriptions.ids IS 'Identifiant métier du contrat. Format: CTR-{AAAA}-{sequence}';

CREATE INDEX idx_souscriptions_maison ON souscriptions(maison_id);
CREATE INDEX idx_souscriptions_locataire ON souscriptions(locataire_id);
CREATE INDEX idx_souscriptions_statut ON souscriptions(statut);
CREATE INDEX idx_souscriptions_date ON souscriptions(date_souscription);

-- ═════════════════════════════════════════════════════════════
-- TABLE : reglements (Paiements des Loyers)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE reglements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idr                 VARCHAR(100) NOT NULL UNIQUE,       -- Identifiant métier du règlement
    souscription_id     UUID NOT NULL REFERENCES souscriptions(id) ON DELETE RESTRICT,
    maison_id           UUID NOT NULL REFERENCES maisons(id) ON DELETE RESTRICT,
    locataire_id        UUID NOT NULL REFERENCES locataires(id) ON DELETE RESTRICT,
    date_paiement       DATE NOT NULL DEFAULT CURRENT_DATE,
    mois_concerne       DATE NOT NULL,                      -- Mois pour lequel le loyer est payé (1er du mois)
    montant_a_payer     NUMERIC(12, 2) NOT NULL CHECK (montant_a_payer > 0),
    montant_paye        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (montant_paye >= 0),
    statut              statut_paiement NOT NULL DEFAULT 'En attente',
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    updated_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,

    -- Calcul du reste à payer
    CONSTRAINT chk_montant_paye CHECK (montant_paye <= montant_a_payer)
);

COMMENT ON TABLE reglements IS 'Enregistrement des paiements de loyers par période (mois).';
COMMENT ON COLUMN reglements.mois_concerne IS 'Premier jour du mois pour lequel le loyer est réglé.';

CREATE INDEX idx_reglements_souscription ON reglements(souscription_id);
CREATE INDEX idx_reglements_locataire ON reglements(locataire_id);
CREATE INDEX idx_reglements_maison ON reglements(maison_id);
CREATE INDEX idx_reglements_date ON reglements(date_paiement);
CREATE INDEX idx_reglements_mois ON reglements(mois_concerne);
CREATE INDEX idx_reglements_statut ON reglements(statut);

-- ═════════════════════════════════════════════════════════════
-- TABLE : depenses
-- ═════════════════════════════════════════════════════════════
CREATE TABLE depenses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_depense        type_depense NOT NULL,
    maison_id           UUID REFERENCES maisons(id) ON DELETE RESTRICT,    -- Optionnel (dépenses maison)
    locataire_id        UUID REFERENCES locataires(id) ON DELETE RESTRICT,  -- Optionnel (imputation locataire)
    date_depense        DATE NOT NULL DEFAULT CURRENT_DATE,
    article             VARCHAR(300) NOT NULL,               -- Libellé / intitulé de la charge
    quantite            NUMERIC(10, 3) NOT NULL DEFAULT 1 CHECK (quantite > 0),
    prix_unitaire       NUMERIC(12, 2) NOT NULL CHECK (prix_unitaire >= 0),
    montant             NUMERIC(12, 2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
    observation         TEXT,
    piece_justificative VARCHAR(500),                       -- Chemin ou référence du fichier
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    updated_by          UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,

    -- Contraintes de cohérence métier
    CONSTRAINT chk_depense_maison
        CHECK (type_depense != 'Dépenses d''une maison' OR maison_id IS NOT NULL),
    CONSTRAINT chk_depense_locataire
        CHECK (type_depense != 'Imputation Locataire' OR locataire_id IS NOT NULL)
);

COMMENT ON TABLE depenses IS 'Gestion des dépenses : globales, par bien, ou imputées à un locataire.';
COMMENT ON COLUMN depenses.montant IS 'Colonne calculée automatiquement : quantite × prix_unitaire.';

CREATE INDEX idx_depenses_type ON depenses(type_depense);
CREATE INDEX idx_depenses_maison ON depenses(maison_id) WHERE maison_id IS NOT NULL;
CREATE INDEX idx_depenses_locataire ON depenses(locataire_id) WHERE locataire_id IS NOT NULL;
CREATE INDEX idx_depenses_date ON depenses(date_depense);

-- ═════════════════════════════════════════════════════════════
-- TABLE : audit_logs (Traçabilité des actions)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID NOT NULL,
    action          VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values      JSONB,
    new_values      JSONB,
    changed_by      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      INET,
    user_agent      TEXT
);

COMMENT ON TABLE audit_logs IS 'Journal d''audit de toutes les modifications sur les données critiques.';
CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_changed_at ON audit_logs(changed_at);
CREATE INDEX idx_audit_user ON audit_logs(changed_by);

-- ═════════════════════════════════════════════════════════════
-- VUES UTILES
-- ═════════════════════════════════════════════════════════════

-- Vue : KPIs Dashboard
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
    (SELECT COUNT(*) FROM proprietaires WHERE est_actif = TRUE)                    AS total_proprietaires,
    (SELECT COUNT(*) FROM locataires WHERE est_actif = TRUE)                       AS total_locataires,
    (SELECT COUNT(*) FROM maisons)                                                  AS total_maisons,
    (SELECT COUNT(*) FROM souscriptions WHERE statut = 'Active')                   AS total_souscriptions_actives,
    (SELECT COALESCE(SUM(montant_caution), 0) FROM souscriptions WHERE statut = 'Active') AS total_caution,
    (SELECT COALESCE(SUM(montant_avance), 0) FROM souscriptions WHERE statut = 'Active')  AS total_avance,
    (SELECT COALESCE(SUM(montant_loyer), 0) FROM souscriptions WHERE statut = 'Active')   AS total_loyer_mensuel,
    (SELECT COALESCE(SUM(montant_a_payer - montant_paye), 0)
     FROM reglements
     WHERE statut IN ('En attente', 'Partiel', 'En retard'))                        AS total_reste_recouvrir;

COMMENT ON VIEW v_dashboard_kpis IS 'KPIs consolidés pour le tableau de bord.';

-- Vue : Situation complète des souscriptions
CREATE OR REPLACE VIEW v_souscriptions_detail AS
SELECT
    s.id,
    s.ids,
    m.idm,
    m.ville,
    m.type_construction,
    m.nb_pieces,
    p.nom_prenoms AS nom_proprietaire,
    l.nom_prenoms AS nom_locataire,
    l.contact     AS contact_locataire,
    s.date_souscription,
    s.date_fin,
    s.montant_loyer,
    s.montant_caution,
    s.montant_avance,
    s.nb_mois_contrat,
    s.statut,
    -- Calcul du nombre de mois écoulés
    EXTRACT(YEAR FROM AGE(COALESCE(s.date_fin, CURRENT_DATE), s.date_souscription)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(s.date_fin, CURRENT_DATE), s.date_souscription)) AS mois_ecoules,
    -- Total payé et impayés
    COALESCE(r.total_paye, 0)        AS total_paye,
    COALESCE(r.total_impaye, 0)      AS total_impaye,
    s.created_at,
    s.updated_at
FROM souscriptions s
JOIN maisons m       ON s.maison_id    = m.id
JOIN proprietaires p ON m.proprietaire_id = p.id
JOIN locataires l    ON s.locataire_id = l.id
LEFT JOIN (
    SELECT
        souscription_id,
        SUM(montant_paye)                  AS total_paye,
        SUM(montant_a_payer - montant_paye) AS total_impaye
    FROM reglements
    GROUP BY souscription_id
) r ON r.souscription_id = s.id;

COMMENT ON VIEW v_souscriptions_detail IS 'Vue consolidée des contrats avec indicateurs financiers.';

-- Vue : État des paiements par locataire
CREATE OR REPLACE VIEW v_reglements_detail AS
SELECT
    r.id,
    r.idr,
    m.idm,
    m.ville,
    l.nom_prenoms   AS nom_locataire,
    l.contact       AS contact_locataire,
    r.date_paiement,
    r.mois_concerne,
    r.montant_a_payer,
    r.montant_paye,
    (r.montant_a_payer - r.montant_paye) AS reste_a_payer,
    r.statut,
    r.notes,
    r.created_at
FROM reglements r
JOIN maisons m    ON r.maison_id   = m.id
JOIN locataires l ON r.locataire_id = l.id;

-- ═════════════════════════════════════════════════════════════
-- FONCTIONS ET TRIGGERS
-- ═════════════════════════════════════════════════════════════

-- Fonction : Mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application du trigger updated_at sur toutes les tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['utilisateurs','proprietaires','maisons','locataires','souscriptions','reglements','depenses']
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()', t, t);
    END LOOP;
END;
$$;

-- Fonction : Mise à jour automatique du statut des règlements
CREATE OR REPLACE FUNCTION trigger_update_reglement_statut()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.montant_paye = 0 THEN
        NEW.statut = 'En attente';
    ELSIF NEW.montant_paye >= NEW.montant_a_payer THEN
        NEW.statut = 'Payé';
    ELSE
        NEW.statut = 'Partiel';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reglements_statut
BEFORE INSERT OR UPDATE ON reglements
FOR EACH ROW EXECUTE FUNCTION trigger_update_reglement_statut();

-- Fonction : Disponibilité automatique de la maison lors de la clôture d'un contrat
CREATE OR REPLACE FUNCTION trigger_maison_disponibilite()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.statut IN ('Expirée', 'Résiliée') AND OLD.statut = 'Active' THEN
        UPDATE maisons SET est_disponible = TRUE WHERE id = NEW.maison_id;
    ELSIF NEW.statut = 'Active' AND OLD.statut != 'Active' THEN
        UPDATE maisons SET est_disponible = FALSE WHERE id = NEW.maison_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_souscriptions_maison_dispo
AFTER UPDATE ON souscriptions
FOR EACH ROW EXECUTE FUNCTION trigger_maison_disponibilite();

CREATE TRIGGER trg_souscriptions_insert_dispo
AFTER INSERT ON souscriptions
FOR EACH ROW
WHEN (NEW.statut = 'Active')
EXECUTE FUNCTION trigger_maison_disponibilite();

-- Fonction : Génération de l'IDM automatique
CREATE OR REPLACE FUNCTION generer_idm(
    p_type type_construction,
    p_pieces INT,
    p_loyer NUMERIC,
    p_ville VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR;
    v_sequence INT;
    v_idm VARCHAR;
BEGIN
    -- Préfixe basé sur le type de construction
    v_prefix := CASE p_type
        WHEN 'Maison basse'  THEN 'MB'
        WHEN 'Appartement'   THEN 'AP'
        WHEN 'Villa'         THEN 'VL'
        WHEN 'Studio'        THEN 'ST'
        WHEN 'Duplex'        THEN 'DX'
        WHEN 'Bureau'        THEN 'BU'
        WHEN 'Commerce'      THEN 'CO'
        WHEN 'Entrepôt'      THEN 'EN'
        ELSE 'BI'
    END;

    -- Séquence basée sur le nombre de maisons existantes
    SELECT COUNT(*) + 1 INTO v_sequence FROM maisons;

    -- Format : MB_P3_C80000_ABJ_001
    v_idm := format('%s_P%s_C%s_%s_%s',
        v_prefix,
        p_pieces,
        ROUND(p_loyer)::TEXT,
        UPPER(LEFT(REGEXP_REPLACE(p_ville, '[^a-zA-Z]', '', 'g'), 3)),
        LPAD(v_sequence::TEXT, 3, '0')
    );

    RETURN v_idm;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Génération de l'IDS (contrat)
CREATE OR REPLACE FUNCTION generer_ids() RETURNS VARCHAR AS $$
DECLARE
    v_sequence INT;
BEGIN
    SELECT COUNT(*) + 1 INTO v_sequence FROM souscriptions;
    RETURN format('CTR-%s-%s', EXTRACT(YEAR FROM NOW())::TEXT, LPAD(v_sequence::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql;

-- Fonction : Génération de l'IDR (règlement)
CREATE OR REPLACE FUNCTION generer_idr() RETURNS VARCHAR AS $$
DECLARE
    v_sequence INT;
BEGIN
    SELECT COUNT(*) + 1 INTO v_sequence FROM reglements;
    RETURN format('REG-%s%s-%s',
        EXTRACT(YEAR FROM NOW())::TEXT,
        LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0'),
        LPAD(v_sequence::TEXT, 5, '0')
    );
END;
$$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════
-- PERMISSIONS (Sécurité au niveau base de données)
-- ═════════════════════════════════════════════════════════════
-- Révoquer les accès publics
REVOKE ALL ON SCHEMA immogest FROM PUBLIC;

-- Accorder les droits à l'utilisateur applicatif
GRANT USAGE ON SCHEMA immogest TO immogest_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA immogest TO immogest_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA immogest TO immogest_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA immogest TO immogest_user;

-- Permissions par défaut pour les futurs objets
ALTER DEFAULT PRIVILEGES IN SCHEMA immogest
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO immogest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA immogest
    GRANT USAGE, SELECT ON SEQUENCES TO immogest_user;
