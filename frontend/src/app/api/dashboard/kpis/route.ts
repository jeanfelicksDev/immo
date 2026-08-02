import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const props = await query('SELECT COUNT(*)::int AS total FROM immogest.proprietaires WHERE est_actif = TRUE');
    const locs = await query('SELECT COUNT(*)::int AS total FROM immogest.locataires WHERE est_actif = TRUE');
    const maisons = await query('SELECT COUNT(*)::int AS total FROM immogest.maisons');
    const sous = await query('SELECT COUNT(*)::int AS total, COALESCE(SUM(montant_caution), 0)::numeric AS caution, COALESCE(SUM(montant_avance), 0)::numeric AS avance, COALESCE(SUM(montant_loyer), 0)::numeric AS loyer FROM immogest.souscriptions WHERE statut = \'Active\'');
    const reg = await query('SELECT COALESCE(SUM(montant_a_payer - montant_paye), 0)::numeric AS impaye FROM immogest.reglements WHERE statut IN (\'En attente\', \'Partiel\', \'En retard\')');

    return NextResponse.json({
      TotalProprietaires: props.rows[0]?.total || 0,
      TotalLocataires: locs.rows[0]?.total || 0,
      TotalMaisons: maisons.rows[0]?.total || 0,
      TotalSouscriptionsActives: sous.rows[0]?.total || 0,
      TotalCaution: parseFloat(sous.rows[0]?.caution || 0),
      TotalAvance: parseFloat(sous.rows[0]?.avance || 0),
      TotalLoyerMensuel: parseFloat(sous.rows[0]?.loyer || 0),
      TotalResteRecouvrir: parseFloat(reg.rows[0]?.impaye || 0)
    });
  } catch (error: any) {
    console.error('Erreur GET /api/dashboard/kpis:', error);
    return NextResponse.json({
      TotalProprietaires: 0,
      TotalLocataires: 0,
      TotalMaisons: 0,
      TotalSouscriptionsActives: 0,
      TotalCaution: 0,
      TotalAvance: 0,
      TotalLoyerMensuel: 0,
      TotalResteRecouvrir: 0
    });
  }
}
