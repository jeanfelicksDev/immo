import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Règlements enregistrés en base ayant un reliquat non soldé (statut non réglé ET montant_a_payer > montant_paye)
    const sqlReglements = `
      SELECT r.id AS "Id", r.idr AS "Idr", r.souscription_id AS "SouscriptionId",
             s.ids AS "IdsSouscription", r.maison_id AS "MaisonId", m.idm AS "IdmMaison", m.ville AS "VilleMaison",
             r.locataire_id AS "LocataireId", l.nom_prenoms AS "NomLocataire", l.contact AS "ContactLocataire",
             r.date_paiement AS "DatePaiement", r.mois_concerne AS "MoisConcerne",
             COALESCE(r.montant_a_payer, s.montant_loyer, 0) AS "MontantAPayer",
             COALESCE(r.montant_paye, 0) AS "MontantPaye",
             GREATEST(0, COALESCE(r.montant_a_payer, s.montant_loyer, 0) - COALESCE(r.montant_paye, 0)) AS "ResteAPayer",
             r.statut AS "Statut", r.notes AS "Notes"
      FROM immogest.reglements r
      JOIN immogest.souscriptions s ON r.souscription_id = s.id
      JOIN immogest.maisons m ON r.maison_id = m.id
      JOIN immogest.locataires l ON r.locataire_id = l.id
      WHERE (COALESCE(r.montant_a_payer, 0) - COALESCE(r.montant_paye, 0)) > 0
        AND LOWER(COALESCE(r.statut, '')) NOT IN ('regle', 'paye', 'payé')
      ORDER BY r.date_paiement DESC
    `;

    const { rows: rowsReg } = await query(sqlReglements);

    // Identifiants des souscriptions déjà répertoriées avec un règlement partiel
    const subIdsInReg = new Set(rowsReg.map(r => r.SouscriptionId));

    // 2. Baux et souscriptions actives : déduire la somme de TOUS les encaissements déjà effectués ce mois-ci
    const sqlSouscriptions = `
      SELECT 
        NULL AS "Id",
        'ATT_MOIS' AS "Idr",
        s.id AS "SouscriptionId",
        s.ids AS "IdsSouscription",
        m.id AS "MaisonId",
        m.idm AS "IdmMaison",
        m.ville AS "VilleMaison",
        l.id AS "LocataireId",
        l.nom_prenoms AS "NomLocataire",
        l.contact AS "ContactLocataire",
        CURRENT_DATE AS "DatePaiement",
        DATE_TRUNC('month', CURRENT_DATE) AS "MoisConcerne",
        s.montant_loyer AS "MontantAPayer",
        COALESCE(p.total_paye, 0) AS "MontantPaye",
        GREATEST(0, s.montant_loyer - COALESCE(p.total_paye, 0)) AS "ResteAPayer",
        'En attente' AS "Statut",
        'Loyer mensuel à encaisser' AS "Notes"
      FROM immogest.souscriptions s
      JOIN immogest.maisons m ON s.maison_id = m.id
      JOIN immogest.locataires l ON s.locataire_id = l.id
      LEFT JOIN (
        SELECT souscription_id, SUM(montant_paye) AS total_paye
        FROM immogest.reglements
        WHERE DATE_TRUNC('month', mois_concerne) = DATE_TRUNC('month', CURRENT_DATE)
           OR DATE_TRUNC('month', date_paiement) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY souscription_id
      ) p ON p.souscription_id = s.id
      WHERE (s.statut IS NULL OR LOWER(s.statut) NOT IN ('résiliée', 'resiliee', 'expirée', 'expiree', 'inactif', 'annulée'))
      ORDER BY s.created_at DESC
    `;

    const { rows: rowsSous } = await query(sqlSouscriptions);

    // Conserver uniquement les souscriptions n'ayant pas de reçu partiel actif ET avec un ResteAPayer > 0
    const rowsSousFiltered = rowsSous.filter(s => !subIdsInReg.has(s.SouscriptionId) && Number(s.ResteAPayer || 0) > 0);

    const creances = [...rowsReg, ...rowsSousFiltered];

    return NextResponse.json({
      Items: creances,
      TotalCount: creances.length,
      TotalResteAPayer: creances.reduce((acc, curr) => acc + Number(curr.ResteAPayer || 0), 0)
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reglements/impayes:', error);
    return NextResponse.json({ Items: [], TotalCount: 0, TotalResteAPayer: 0 }, { status: 500 });
  }
}
