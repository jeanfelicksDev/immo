import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Nombre total de propriétaires
    const props = await query(`
      SELECT COUNT(*)::int AS total 
      FROM immogest.proprietaires 
      WHERE est_actif = TRUE OR est_actif IS NULL
    `);

    // 2. Nombre total de locataires
    const locs = await query(`
      SELECT COUNT(*)::int AS total 
      FROM immogest.locataires 
      WHERE est_actif = TRUE OR est_actif IS NULL
    `);

    // 3. Biens gérés et biens occupés
    const maisons = await query(`SELECT COUNT(*)::int AS total FROM immogest.maisons`);
    const maisOcc = await query(`
      SELECT COUNT(DISTINCT s.maison_id)::int AS occupees
      FROM immogest.souscriptions s
      WHERE LOWER(COALESCE(s.statut, '')) IN ('active', 'actif', 'en_cours', 'en cours')
    `);

    // 4. Souscriptions (Contrats) et montants financiers
    const sous = await query(`
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(montant_caution), 0)::numeric  AS caution,
        COALESCE(SUM(montant_avance),  0)::numeric  AS avance,
        COALESCE(SUM(montant_loyer),   0)::numeric  AS loyer
      FROM immogest.souscriptions
      WHERE LOWER(COALESCE(statut, '')) IN ('active', 'actif', 'en_cours', 'en cours', '')
    `);

    // 5. Impayés enregistrés sur les règlements non soldés
    const reg = await query(`
      SELECT COALESCE(SUM(GREATEST(0, montant_a_payer - montant_paye)), 0)::numeric AS impaye
      FROM immogest.reglements
      WHERE LOWER(COALESCE(statut, '')) NOT IN ('regle', 'paye', 'payé')
        AND (montant_a_payer - montant_paye) > 0
    `);

    // 6. Encaissements réels du mois en cours
    const encaisses = await query(`
      SELECT COALESCE(SUM(montant_paye), 0)::numeric AS total
      FROM immogest.reglements
      WHERE DATE_TRUNC('month', mois_concerne) = DATE_TRUNC('month', CURRENT_DATE)
         OR DATE_TRUNC('month', date_paiement) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const propsCount     = props.rows[0]?.total   || 0;
    const locsCount      = locs.rows[0]?.total    || 0;
    const totalMaisons   = maisons.rows[0]?.total || 0;
    const maisOccupees   = maisOcc.rows[0]?.occupees || 0;
    const maisonsDispo   = Math.max(0, totalMaisons - maisOccupees);
    const totalSous      = sous.rows[0]?.total    || 0;

    const loyer          = parseFloat(sous.rows[0]?.loyer   || 0);
    const caution        = parseFloat(sous.rows[0]?.caution || 0);
    const avance         = parseFloat(sous.rows[0]?.avance  || 0);
    const impayeReg      = parseFloat(reg.rows[0]?.impaye   || 0);
    const encaissesMois  = parseFloat(encaisses.rows[0]?.total || 0);

    // Reste à recouvrir réels : différence entre les loyers mensuels prévus et tous les encaissements effectués ce mois-ci
    const resteDuMois    = Math.max(0, loyer - encaissesMois);
    const resteTotal     = impayeReg + resteDuMois;

    // Taux d'occupation (en %)
    const tauxOccupation = totalMaisons > 0
      ? Math.round((maisOccupees / totalMaisons) * 1000) / 10
      : 0;

    const valeurEstimee = caution * 6;
    const rendementBrut = valeurEstimee > 0
      ? Math.round(((loyer * 12) / valeurEstimee) * 1000) / 10
      : 0;

    return NextResponse.json({
      TotalProprietaires:        propsCount,
      TotalLocataires:           locsCount,
      TotalMaisons:              totalMaisons,
      TotalMaisonsOccupees:      maisOccupees,
      MaisonsDisponibles:        maisonsDispo,
      TotalSouscriptions:        totalSous,
      TotalSouscriptionsActives: totalSous,
      TotalCaution:              caution,
      TotalCautions:             caution,
      TotalAvance:               avance,
      TotalAvances:              avance,
      TotalLoyerMensuel:         loyer,
      TotalLoyersMensuels:       loyer,
      TotalEncaissesMois:        encaissesMois,
      TotalResteRecouvrir:       resteTotal,
      ResteARecouvrir:           resteTotal,
      TauxOccupation:            tauxOccupation,
      RendementBrut:             rendementBrut,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/dashboard/kpis:', error);
    return NextResponse.json({
      TotalProprietaires: 0, TotalLocataires: 0, TotalMaisons: 0,
      MaisonsDisponibles: 0, TotalSouscriptions: 0, TotalLoyersMensuels: 0,
      TotalCautions: 0, TotalAvances: 0, ResteARecouvrir: 0,
    });
  }
}
