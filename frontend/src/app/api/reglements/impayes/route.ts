import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Règlements enregistrés en base où le reliquat est supérieur à 0
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
         OR LOWER(COALESCE(r.statut, '')) NOT IN ('regle', 'paye', 'payé')
      ORDER BY r.date_paiement DESC
    `;

    const { rows: rowsReg } = await query(sqlReglements);

    // 2. Toutes les souscriptions de baux actives dans la base
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
        0 AS "MontantPaye",
        s.montant_loyer AS "ResteAPayer",
        'En attente' AS "Statut",
        'Loyer mensuel à encaisser' AS "Notes"
      FROM immogest.souscriptions s
      JOIN immogest.maisons m ON s.maison_id = m.id
      JOIN immogest.locataires l ON s.locataire_id = l.id
      ORDER BY s.created_at DESC
    `;

    const { rows: rowsSous } = await query(sqlSouscriptions);

    // Identifiants des souscriptions déjà représentées dans les règlements
    const subIdsInReg = new Set(rowsReg.map(r => r.SouscriptionId));

    // Conserver les souscriptions qui n'ont pas encore de règlement partiel ou d'impayé déjà listé
    const rowsSousFiltered = rowsSous.filter(s => !subIdsInReg.has(s.SouscriptionId));

    // Fusionner et garder uniquement les éléments avec un ResteAPayer > 0
    const creances = [...rowsReg, ...rowsSousFiltered].filter(c => Number(c.ResteAPayer || 0) > 0);

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
