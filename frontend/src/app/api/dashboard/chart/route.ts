import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  const url  = new URL(req.url);
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);

  try {
    // Encaissements mensuels (règlements payés)
    const revenus = await query(`
      SELECT
        EXTRACT(MONTH FROM date_paiement)::int AS mois,
        COALESCE(SUM(montant_paye), 0)::numeric  AS total
      FROM immogest.reglements
      WHERE statut = 'Paye'
        AND EXTRACT(YEAR FROM date_paiement) = $1
      GROUP BY mois
      ORDER BY mois
    `, [year]);

    // Dépenses mensuelles
    const depenses = await query(`
      SELECT
        EXTRACT(MONTH FROM date_depense)::int AS mois,
        COALESCE(SUM(montant), 0)::numeric     AS total
      FROM immogest.depenses
      WHERE EXTRACT(YEAR FROM date_depense) = $1
      GROUP BY mois
      ORDER BY mois
    `, [year]);

    // Construire un tableau de 12 mois (index 0 = janvier)
    const revenusMap:  Record<number, number> = {};
    const depensesMap: Record<number, number> = {};

    for (const row of revenus.rows)  revenusMap[row.mois]  = parseFloat(row.total);
    for (const row of depenses.rows) depensesMap[row.mois] = parseFloat(row.total);

    const mois = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    const data = mois.map((label, i) => ({
      label,
      revenus:  revenusMap[i + 1]  || 0,
      depenses: depensesMap[i + 1] || 0,
    }));

    return NextResponse.json({ year, data });
  } catch (error: any) {
    console.error('Erreur GET /api/dashboard/chart:', error);
    // Retourne 12 mois à zéro en cas d'erreur
    const mois = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    return NextResponse.json({
      year,
      data: mois.map((label) => ({ label, revenus: 0, depenses: 0 })),
    });
  }
}
