import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const props    = await query('SELECT COUNT(*)::int AS total FROM immogest.proprietaires WHERE est_actif = TRUE');
    const locs     = await query('SELECT COUNT(*)::int AS total FROM immogest.locataires WHERE est_actif = TRUE');
    const maisons  = await query('SELECT COUNT(*)::int AS total FROM immogest.maisons');
    const maisOcc  = await query(`
      SELECT COUNT(DISTINCT s.maison_id)::int AS occupees
      FROM immogest.souscriptions s
      WHERE s.statut = 'Active'
    `);
    const sous = await query(`
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(montant_caution), 0)::numeric  AS caution,
        COALESCE(SUM(montant_avance),  0)::numeric  AS avance,
        COALESCE(SUM(montant_loyer),   0)::numeric  AS loyer
      FROM immogest.souscriptions
      WHERE statut = 'Active'
    `);
    const reg = await query(`
      SELECT COALESCE(SUM(montant_a_payer - montant_paye), 0)::numeric AS impaye
      FROM immogest.reglements
      WHERE statut IN ('En attente', 'Partiel', 'En retard')
    `);
    // Encaissements du mois en cours
    const encaisses = await query(`
      SELECT COALESCE(SUM(montant_paye), 0)::numeric AS total
      FROM immogest.reglements
      WHERE statut = 'Paye'
        AND DATE_TRUNC('month', date_paiement) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const totalMaisons  = maisons.rows[0]?.total   || 0;
    const maisOccupees  = maisOcc.rows[0]?.occupees || 0;
    const loyer         = parseFloat(sous.rows[0]?.loyer   || 0);
    const caution       = parseFloat(sous.rows[0]?.caution || 0);
    const avance        = parseFloat(sous.rows[0]?.avance  || 0);
    const impaye        = parseFloat(reg.rows[0]?.impaye   || 0);
    const encaissesMois = parseFloat(encaisses.rows[0]?.total || 0);

    // Taux d'occupation = maisons occupées / total maisons (en %)
    const tauxOccupation = totalMaisons > 0
      ? Math.round((maisOccupees / totalMaisons) * 1000) / 10
      : 0;

    // Rendement locatif brut = (loyer mensuel × 12) / (caution × 6) * 100 — ou 0 si pas de données
    // Formule: (revenus annuels / valeur estimée patrimoine) × 100
    // On estime la valeur du bien = caution × 6 mois (proxy très conservateur)
    // Si pas de caution, on retourne 0
    const valeurEstimee = caution * 6;
    const rendementBrut = valeurEstimee > 0
      ? Math.round(((loyer * 12) / valeurEstimee) * 1000) / 10
      : 0;

    // Revenu NET mensuel = loyers encaissés ce mois
    const revenuNetMensuel = encaissesMois > 0 ? encaissesMois : loyer;

    return NextResponse.json({
      // Champs hérités (compatibilité)
      TotalProprietaires:       props.rows[0]?.total || 0,
      TotalLocataires:          locs.rows[0]?.total  || 0,
      TotalMaisons:             totalMaisons,
      TotalMaisonsOccupees:     maisOccupees,
      TotalSouscriptionsActives: sous.rows[0]?.total || 0,
      TotalCaution:             caution,
      TotalAvance:              avance,
      TotalLoyerMensuel:        loyer,
      TotalResteRecouvrir:      impaye,
      // Champs normalisés (rapports)
      TotalCautions:            caution + avance,       // caution + avance consignées
      TotalLoyersMensuels:      revenuNetMensuel,
      TauxOccupation:           tauxOccupation,         // en %
      RendementBrut:            rendementBrut,           // en %
    });
  } catch (error: any) {
    console.error('Erreur GET /api/dashboard/kpis:', error);
    return NextResponse.json({
      TotalProprietaires: 0,
      TotalLocataires: 0,
      TotalMaisons: 0,
      TotalMaisonsOccupees: 0,
      TotalSouscriptionsActives: 0,
      TotalCaution: 0,
      TotalAvance: 0,
      TotalLoyerMensuel: 0,
      TotalResteRecouvrir: 0,
      TotalCautions: 0,
      TotalLoyersMensuels: 0,
      TauxOccupation: 0,
      RendementBrut: 0,
    });
  }
}
