-- ════════════════════════════════════════════════════════════════
-- ImmoGest SaaS — Données de test (Seed)
-- ════════════════════════════════════════════════════════════════

SET search_path TO immogest, public;

-- ─────────────────────────────────────────────────────────────
-- Utilisateurs (mot de passe : Admin@2025! hashé en bcrypt)
-- ─────────────────────────────────────────────────────────────
INSERT INTO utilisateurs (id, nom_complet, email, mot_de_passe, role) VALUES
    ('a1b2c3d4-0001-0000-0000-000000000001', 'Administrateur Système', 'admin@immogest.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/F.8zV7Uki', 'Administrateur'),
    ('a1b2c3d4-0002-0000-0000-000000000002', 'Marie Kouassi', 'marie.kouassi@immogest.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/F.8zV7Uki', 'Gestionnaire'),
    ('a1b2c3d4-0003-0000-0000-000000000003', 'Jean-Baptiste Akossi', 'jb.akossi@immogest.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/F.8zV7Uki', 'Agent');

-- ─────────────────────────────────────────────────────────────
-- Propriétaires
-- ─────────────────────────────────────────────────────────────
INSERT INTO proprietaires (id, nom_prenoms, contact, email, adresse, created_by) VALUES
    ('b1000001-0000-0000-0000-000000000001', 'Kouamé Yao Fernand', '+225 07 00 11 22 33', 'fernand.kouame@email.com', 'Abidjan, Cocody Riviera 2', 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('b1000001-0000-0000-0000-000000000002', 'Bamba Mariam Aïcha', '+225 05 44 55 66 77', 'mariam.bamba@email.com', 'Abidjan, Yopougon Selmer', 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('b1000001-0000-0000-0000-000000000003', 'N''Guessan Kofi Albert', '+225 01 78 99 00 11', 'kofi.nguessan@email.com', 'Bouaké, Quartier Commerce', 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('b1000001-0000-0000-0000-000000000004', 'Diabaté Sékou Ibrahim', '+225 07 22 33 44 55', NULL, 'Abidjan, Marcory Zone 4', 'a1b2c3d4-0002-0000-0000-000000000002');

-- ─────────────────────────────────────────────────────────────
-- Maisons
-- ─────────────────────────────────────────────────────────────
INSERT INTO maisons (id, idm, proprietaire_id, type_construction, nb_pieces, cout_loyer, ville, quartier, est_disponible, created_by) VALUES
    ('c1000001-0000-0000-0000-000000000001', 'AP_P3_C80000_ABJ_001', 'b1000001-0000-0000-0000-000000000001', 'Appartement', 3, 80000, 'Abidjan', 'Cocody Riviera 3', FALSE, 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('c1000001-0000-0000-0000-000000000002', 'MB_P4_C120000_ABJ_002', 'b1000001-0000-0000-0000-000000000001', 'Maison basse', 4, 120000, 'Abidjan', 'Marcory Zone 3', FALSE, 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('c1000001-0000-0000-0000-000000000003', 'ST_P1_C45000_ABJ_003', 'b1000001-0000-0000-0000-000000000002', 'Studio', 1, 45000, 'Abidjan', 'Yopougon Selmer', FALSE, 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('c1000001-0000-0000-0000-000000000004', 'VL_P5_C250000_ABJ_004', 'b1000001-0000-0000-0000-000000000003', 'Villa', 5, 250000, 'Abidjan', 'Cocody Angré', TRUE, 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('c1000001-0000-0000-0000-000000000005', 'AP_P2_C60000_BKE_005', 'b1000001-0000-0000-0000-000000000003', 'Appartement', 2, 60000, 'Bouaké', 'Commerce Centre', TRUE, 'a1b2c3d4-0003-0000-0000-000000000003'),
    ('c1000001-0000-0000-0000-000000000006', 'MB_P3_C95000_ABJ_006', 'b1000001-0000-0000-0000-000000000004', 'Maison basse', 3, 95000, 'Abidjan', 'Abobo PK 18', FALSE, 'a1b2c3d4-0003-0000-0000-000000000003');

-- ─────────────────────────────────────────────────────────────
-- Locataires
-- ─────────────────────────────────────────────────────────────
INSERT INTO locataires (id, nom_prenoms, contact, email, adresse, profession, created_by) VALUES
    ('d1000001-0000-0000-0000-000000000001', 'Touré Aminata Fatou', '+225 07 55 66 77 88', 'aminata.toure@gmail.com', 'Abidjan, Cocody', 'Enseignante', 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('d1000001-0000-0000-0000-000000000002', 'Coulibaly Mamadou Dit Mady', '+225 05 99 00 11 22', NULL, 'Abidjan, Yopougon', 'Commerçant', 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('d1000001-0000-0000-0000-000000000003', 'Koffi Eboua René', '+225 01 33 44 55 66', 'rene.koffi@yahoo.fr', 'Abidjan, Marcory', 'Informaticien', 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('d1000001-0000-0000-0000-000000000004', 'Gbagbo Nadia Christelle', '+225 07 77 88 99 00', 'nadia.gbagbo@hotmail.com', 'Abidjan, Abobo', 'Secrétaire', 'a1b2c3d4-0003-0000-0000-000000000003'),
    ('d1000001-0000-0000-0000-000000000005', 'Traoré Oumar Abdoulaye', '+225 05 11 22 33 44', NULL, 'Bouaké, Koko', 'Entrepreneur', 'a1b2c3d4-0001-0000-0000-000000000001');

-- ─────────────────────────────────────────────────────────────
-- Souscriptions (Contrats)
-- ─────────────────────────────────────────────────────────────
INSERT INTO souscriptions (id, ids, maison_id, locataire_id, date_souscription, montant_loyer, montant_caution, montant_avance, nb_mois_contrat, statut, created_by) VALUES
    ('e1000001-0000-0000-0000-000000000001', 'CTR-2024-0001', 'c1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', '2024-01-15', 80000, 160000, 80000, 12, 'Active', 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('e1000001-0000-0000-0000-000000000002', 'CTR-2024-0002', 'c1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000002', '2024-02-01', 120000, 240000, 120000, 24, 'Active', 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('e1000001-0000-0000-0000-000000000003', 'CTR-2024-0003', 'c1000001-0000-0000-0000-000000000003', 'd1000001-0000-0000-0000-000000000003', '2024-03-01', 45000, 90000, 45000, 12, 'Active', 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('e1000001-0000-0000-0000-000000000004', 'CTR-2025-0001', 'c1000001-0000-0000-0000-000000000006', 'd1000001-0000-0000-0000-000000000004', '2025-01-01', 95000, 190000, 95000, 12, 'Active', 'a1b2c3d4-0003-0000-0000-000000000003');

-- ─────────────────────────────────────────────────────────────
-- Règlements (Paiements)
-- ─────────────────────────────────────────────────────────────
INSERT INTO reglements (idr, souscription_id, maison_id, locataire_id, date_paiement, mois_concerne, montant_a_payer, montant_paye, created_by) VALUES
    ('REG-202401-00001', 'e1000001-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', '2024-01-20', '2024-01-01', 80000, 80000, 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('REG-202402-00002', 'e1000001-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', '2024-02-18', '2024-02-01', 80000, 80000, 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('REG-202403-00003', 'e1000001-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', '2024-03-22', '2024-03-01', 80000, 50000, 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('REG-202401-00004', 'e1000001-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000002', '2024-02-05', '2024-02-01', 120000, 120000, 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('REG-202402-00005', 'e1000001-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000002', '2024-03-10', '2024-03-01', 120000, 0, 'a1b2c3d4-0002-0000-0000-000000000002');

-- ─────────────────────────────────────────────────────────────
-- Dépenses
-- ─────────────────────────────────────────────────────────────
INSERT INTO depenses (type_depense, maison_id, locataire_id, date_depense, article, quantite, prix_unitaire, observation, created_by) VALUES
    ('Dépenses globales', NULL, NULL, '2024-01-05', 'Fournitures de bureau', 1, 15000, 'Papier, stylos, classeurs pour l''agence', 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('Dépenses globales', NULL, NULL, '2024-01-10', 'Facture Internet mensuelle', 1, 25000, 'Abonnement fibre optique janvier 2024', 'a1b2c3d4-0001-0000-0000-000000000001'),
    ('Dépenses d''une maison', 'c1000001-0000-0000-0000-000000000001', NULL, '2024-02-15', 'Réparation climatiseur', 1, 45000, 'Remplacement compresseur chambre principale', 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('Dépenses d''une maison', 'c1000001-0000-0000-0000-000000000002', NULL, '2024-03-20', 'Peinture façade extérieure', 25, 3500, 'Peinture anti-humidité, 25 litres utilisés', 'a1b2c3d4-0002-0000-0000-000000000002'),
    ('Imputation Locataire', NULL, 'd1000001-0000-0000-0000-000000000003', '2024-03-25', 'Remplacement serrure porte d''entrée', 1, 18000, 'Serrure perdue par le locataire', 'a1b2c3d4-0003-0000-0000-000000000003');
