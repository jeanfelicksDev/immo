import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Nombre total de propriétaires (actifs ou par défaut)
    const props = await query(`
      SELECT COUNT(*)::int AS total 
      FROM immogest.proprietaires 
      WHERE est_actif = TRUE OR est_actif IS NULL
    `);

    // 2. Nombre total de locataires (actifs ou par défaut)
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

    // 5. Reste à recouvrir (Impayés / Règlements en attente)
    const reg = await query(`
      SELECT COALESCE(SUM(GREATEST(0, montant_a_payer - montant_paye)), 0)::numeric AS impaye
      FROM immogest.reglements
      WHERE LOWER(COALESCE(statut, '')) NOT IN ('regle', 'paye', 'payé')
        AND (montant_a_payer - montant_paye) > 0
    `);

    // 6. Encaissements du mois en cours
    const encaisses = await query(`
      SELECT COALESCE(SUM(montant_paye), 0)::numeric AS total
      FROM immogest.reglements
      WHERE LOWER(COALESCE(statut, '')) IN ('regle', 'paye', 'payé')
        AND DATE_TRUNC('month', date_paiement) = DATE_TRUNC('month', CURRENT_DATE)
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
    const impaye         = parseFloat(reg.rows[0]?.impaye   || 0);
    const encaissesMois  = parseFloat(encaisses.rows[0]?.total || 0);

    const revenuMensuel = encaissesMois > 0 ? encaissesMois : loyer;

    // Taux d'occupation (en %)
    const tauxOccupation = totalMaisons > 0
      ? Math.round((maisOccupees / totalMaisons) * 1000) / 10
      : 0;

    const valeurEstimee = caution * 6;
    const rendementBrut = valeurEstimee > 0
      ? Math.round(((loyer * 12) / valeurEstimee) * 1000) / 10
      : 0;

    return NextResponse.json({
      // Mappages exacts attendus par la page Dashboard
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
      TotalLoyersMensuels:       revenuMensuel,
      TotalResteRecouvrir:       impaye,
      ResteARecouvrir:           impaye,
      TauxOccupation:            tauxOccupation,
      RendementBrut:             rendementBrut,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/dashboard/kpis:', error);
    return NextResponse.json({
      TotalProprietaires: 0,
      TotalLocataires: 0,
      TotalMaisons: 0,
      TotalMaisonsOccupees: 0,
      MaisonsDisponibles: 0,
      TotalSouscriptions: 0,
      TotalSouscriptionsActives: 0,
      TotalCaution: 0,
      TotalCautions: 0,
      TotalAvance: 0,
      TotalAvances: 0,
      TotalLoyerMensuel: 0,
      TotalLoyersMensuels: 0,
      TotalResteRecouvrir: 0,
      ResteARecouvrir: 0,
      TauxOccupation: 0,
      RendementBrut: 0,
    });
  }
}

