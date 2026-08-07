import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { type: string } }
) {
  const { type } = params;
  const url  = new URL(req.url);
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);

  try {
    switch (type) {

      // ── 1. Bilan Financier & Encaissements ─────────────────────────────
      case 'financial': {
        const rows = await query(`
          SELECT
            r.idr,
            r.date_paiement,
            r.mois_concerne,
            r.montant_a_payer,
            r.montant_paye,
            r.statut,
            r.notes,
            l.nom_prenoms  AS locataire,
            m.idm          AS maison,
            m.ville
          FROM immogest.reglements r
          LEFT JOIN immogest.souscriptions s ON s.id = r.souscription_id
          LEFT JOIN immogest.locataires    l ON l.id = s.locataire_id
          LEFT JOIN immogest.maisons       m ON m.id = s.maison_id
          WHERE EXTRACT(YEAR FROM r.date_paiement) = $1
          ORDER BY r.date_paiement DESC
        `, [year]);

        const totaux = await query(`
          SELECT
            COALESCE(SUM(montant_paye),0)::numeric     AS encaisse,
            COALESCE(SUM(montant_a_payer),0)::numeric  AS du,
            COALESCE(SUM(CASE WHEN statut = 'Paye' THEN montant_paye ELSE 0 END),0)::numeric AS paye,
            COUNT(*)::int                              AS nb
          FROM immogest.reglements
          WHERE EXTRACT(YEAR FROM date_paiement) = $1
        `, [year]);

        return NextResponse.json({
          type: 'financial', year,
          titre: 'Bilan Financier & Encaissements',
          colonnes: ['N° Reçu','Date Paiement','Mois Concerné','Locataire','Maison','Montant Dû','Montant Payé','Statut','Notes'],
          lignes: rows.rows.map((r: any) => [
            r.idr,
            r.date_paiement ? new Date(r.date_paiement).toLocaleDateString('fr-FR') : '—',
            r.mois_concerne ? new Date(r.mois_concerne).toLocaleDateString('fr-FR', { month:'long', year:'numeric' }) : '—',
            r.locataire || '—',
            `${r.maison || '—'} (${r.ville || ''})`,
            new Intl.NumberFormat('fr-FR').format(r.montant_a_payer) + ' FCFA',
            new Intl.NumberFormat('fr-FR').format(r.montant_paye)    + ' FCFA',
            r.statut,
            r.notes || '',
          ]),
          totaux: {
            nbLignes:  totaux.rows[0]?.nb       || 0,
            totalDu:   parseFloat(totaux.rows[0]?.du)       || 0,
            totalPaye: parseFloat(totaux.rows[0]?.encaisse) || 0,
          },
        });
      }

      // ── 2. Rapport des Dépenses & Factures ─────────────────────────────
      case 'expenses': {
        const rows = await query(`
          SELECT
            d.id,
            d.date_depense,
            d.type_depense,
            d.article,
            d.quantite,
            d.prix_unitaire,
            d.montant,
            d.observation,
            m.idm  AS maison,
            l.nom_prenoms AS locataire
          FROM immogest.depenses d
          LEFT JOIN immogest.maisons   m ON m.id = d.maison_id
          LEFT JOIN immogest.locataires l ON l.id = d.locataire_id
          WHERE EXTRACT(YEAR FROM d.date_depense) = $1
          ORDER BY d.date_depense DESC
        `, [year]);

        const totaux = await query(`
          SELECT
            COALESCE(SUM(montant),0)::numeric AS total,
            COUNT(*)::int                     AS nb
          FROM immogest.depenses
          WHERE EXTRACT(YEAR FROM date_depense) = $1
        `, [year]);

        return NextResponse.json({
          type: 'expenses', year,
          titre: 'Rapport des Dépenses & Factures',
          colonnes: ['Date','Type','Article / Libellé','Qté','Prix Unitaire','Montant Total','Maison / Locataire','Observation'],
          lignes: rows.rows.map((r: any) => [
            r.date_depense ? new Date(r.date_depense).toLocaleDateString('fr-FR') : '—',
            r.type_depense === 'DepensesGlobales' ? 'Globale' : r.type_depense === 'DepensesMaison' ? 'Maison' : 'Locataire',
            r.article,
            r.quantite,
            new Intl.NumberFormat('fr-FR').format(r.prix_unitaire) + ' FCFA',
            new Intl.NumberFormat('fr-FR').format(r.montant)       + ' FCFA',
            r.maison || r.locataire || '—',
            r.observation || '',
          ]),
          totaux: {
            nbLignes: totaux.rows[0]?.nb    || 0,
            total:    parseFloat(totaux.rows[0]?.total) || 0,
          },
        });
      }

      // ── 3. Rendement par Propriétaire / Bien ───────────────────────────
      case 'yield': {
        const rows = await query(`
          SELECT
            p.nom_prenoms  AS proprietaire,
            m.idm,
            m.ville,
            m.type_construction,
            m.cout_loyer,
            m.est_disponible,
            COUNT(DISTINCT s.id)::int AS nb_contrats,
            COALESCE(SUM(r.montant_paye), 0)::numeric AS encaisse_total,
            COALESCE(SUM(d.montant),      0)::numeric AS depenses_total
          FROM immogest.maisons m
          LEFT JOIN immogest.proprietaires p ON p.id = m.proprietaire_id
          LEFT JOIN immogest.souscriptions s ON s.maison_id = m.id AND s.statut = 'Active'
          LEFT JOIN immogest.reglements    r ON r.souscription_id = s.id
          LEFT JOIN immogest.depenses      d ON d.maison_id = m.id
            AND EXTRACT(YEAR FROM d.date_depense) = $1
          GROUP BY p.nom_prenoms, m.idm, m.ville, m.type_construction, m.cout_loyer, m.est_disponible
          ORDER BY encaisse_total DESC
        `, [year]);

        return NextResponse.json({
          type: 'yield', year,
          titre: 'Rendement par Propriétaire / Bien',
          colonnes: ['Propriétaire','IDM Maison','Ville','Type','Loyer Mensuel','Statut','Contrats Actifs','Encaissé Total','Dépenses','Revenu Net'],
          lignes: rows.rows.map((r: any) => {
            const net = parseFloat(r.encaisse_total) - parseFloat(r.depenses_total);
            return [
              r.proprietaire || '—',
              r.idm,
              r.ville,
              r.type_construction,
              new Intl.NumberFormat('fr-FR').format(r.cout_loyer) + ' FCFA',
              r.est_disponible ? 'Disponible' : 'Occupée',
              r.nb_contrats,
              new Intl.NumberFormat('fr-FR').format(r.encaisse_total) + ' FCFA',
              new Intl.NumberFormat('fr-FR').format(r.depenses_total) + ' FCFA',
              new Intl.NumberFormat('fr-FR').format(net) + ' FCFA',
            ];
          }),
          totaux: {
            nbLignes: rows.rows.length,
          },
        });
      }

      // ── 4. Audit des Contrats & Baux ───────────────────────────────────
      case 'audit': {
        const rows = await query(`
          SELECT
            s.ids,
            s.date_souscription,
            s.date_fin,
            s.statut,
            s.montant_loyer,
            s.montant_caution,
            s.montant_avance,
            s.nb_mois_contrat,
            l.nom_prenoms  AS locataire,
            m.idm          AS maison,
            m.ville
          FROM immogest.souscriptions s
          LEFT JOIN immogest.locataires l ON l.id = s.locataire_id
          LEFT JOIN immogest.maisons    m ON m.id = s.maison_id
          ORDER BY s.date_souscription DESC
        `);

        const totaux = await query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(CASE WHEN statut = 'Active'  THEN 1 END)::int AS actifs,
            COUNT(CASE WHEN statut = 'Expire'  THEN 1 END)::int AS expires,
            COALESCE(SUM(CASE WHEN statut = 'Active' THEN montant_loyer ELSE 0 END), 0)::numeric AS loyer_actif
          FROM immogest.souscriptions
        `);

        return NextResponse.json({
          type: 'audit', year,
          titre: 'Audit des Contrats & Baux',
          colonnes: ['N° Contrat','Date Début','Date Fin','Durée (mois)','Locataire','Maison','Ville','Loyer','Caution','Avance','Statut'],
          lignes: rows.rows.map((r: any) => [
            r.ids,
            r.date_souscription ? new Date(r.date_souscription).toLocaleDateString('fr-FR') : '—',
            r.date_fin          ? new Date(r.date_fin).toLocaleDateString('fr-FR')          : '—',
            r.nb_mois_contrat,
            r.locataire || '—',
            r.maison    || '—',
            r.ville     || '—',
            new Intl.NumberFormat('fr-FR').format(r.montant_loyer)   + ' FCFA',
            new Intl.NumberFormat('fr-FR').format(r.montant_caution) + ' FCFA',
            new Intl.NumberFormat('fr-FR').format(r.montant_avance)  + ' FCFA',
            r.statut,
          ]),
          totaux: {
            nbLignes: totaux.rows[0]?.total   || 0,
            actifs:   totaux.rows[0]?.actifs  || 0,
            expires:  totaux.rows[0]?.expires || 0,
            loyerMensuelActif: parseFloat(totaux.rows[0]?.loyer_actif) || 0,
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Type de rapport invalide.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Erreur GET /api/rapports/${type}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
