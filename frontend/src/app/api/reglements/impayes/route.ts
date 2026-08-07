import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Règlements enregistrés ayant un reliquat dû (montant_a_payer > montant_paye OU statut non soldé)
    const sqlReglements = `
      SELECT r.id AS "Id", r.idr AS "Idr", r.souscription_id AS "SouscriptionId",
             s.ids AS "IdsSouscription", r.maison_id AS "MaisonId", m.idm AS "IdmMaison", m.ville AS "VilleMaison",
             r.locataire_id AS "LocataireId", l.nom_prenoms AS "NomLocataire", l.contact AS "ContactLocataire",
             r.date_paiement AS "DatePaiement", r.mois_concerne AS "MoisConcerne",
             r.montant_a_payer AS "MontantAPayer", r.montant_paye AS "MontantPaye",
             GREATEST(0, r.montant_a_payer - r.montant_paye) AS "ResteAPayer",
             r.statut AS "Statut", r.notes AS "Notes"
      FROM immogest.reglements r
      JOIN immogest.souscriptions s ON r.souscription_id = s.id
      JOIN immogest.maisons m ON r.maison_id = m.id
      JOIN immogest.locataires l ON r.locataire_id = l.id
      WHERE LOWER(COALESCE(r.statut, '')) NOT IN ('regle', 'paye', 'payé')
        AND (r.montant_a_payer - r.montant_paye) > 0
      ORDER BY r.date_paiement DESC
    `;

    const { rows: rowsReg } = await query(sqlReglements);

    // 2. Souscriptions actives pour lesquelles aucun règlement soldé ou partiel n'a été rattaché ce mois-ci
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
        'Loyer du mois en cours à percevoir' AS "Notes"
      FROM immogest.souscriptions s
      JOIN immogest.maisons m ON s.maison_id = m.id
      JOIN immogest.locataires l ON s.locataire_id = l.id
      WHERE (s.statut IS NULL OR LOWER(s.statut) NOT IN ('résiliée', 'resiliee', 'expirée', 'expiree', 'inactif', 'annulée'))
        AND NOT EXISTS (
          SELECT 1 FROM immogest.reglements r
          WHERE r.souscription_id = s.id
            AND DATE_TRUNC('month', r.mois_concerne) = DATE_TRUNC('month', CURRENT_DATE)
            AND LOWER(COALESCE(r.statut, '')) IN ('regle', 'paye', 'payé')
        )
        AND NOT EXISTS (
          SELECT 1 FROM immogest.reglements r
          WHERE r.souscription_id = s.id
            AND LOWER(COALESCE(r.statut, '')) NOT IN ('regle', 'paye', 'payé')
            AND (r.montant_a_payer - r.montant_paye) > 0
        )
      ORDER BY s.created_at DESC
    `;

    const { rows: rowsSous } = await query(sqlSouscriptions);

    // Combiner les créances enregistrées et les loyers du mois en cours à percevoir
    const creances = [...rowsReg, ...rowsSous];

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
