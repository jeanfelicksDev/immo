'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Sidebar, PageWrapper } from '@/components/ui';
import { dashboardApi, depensesApi, reglementsApi } from '@/lib/api';

export default function RapportsPage() {
  const [period, setPeriod]       = useState<'month' | 'quarter' | 'year'>('month');
  const [reportType, setReportType] = useState('financial');
  const [kpis, setKpis]           = useState<any>(null);
  const [chartData, setChartData] = useState<{ label: string; revenus: number; depenses: number }[]>([]);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [reportYear]              = useState(new Date().getFullYear());
  const [loading, setLoading]     = useState(true);
  const [chartLoading, setChartLoading]   = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    dashboardApi.getKpis()
      .then((res) => setKpis(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setChartLoading(true);
    dashboardApi.getChart(chartYear)
      .then((res) => {
        setChartData(res.data || []);
        setChartYear(res.year || chartYear);
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartYear]);

  const formatFCFA = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  // ── Noms lisibles des types de rapport ────────────────────────────────
  const REPORT_LABELS: Record<string, string> = {
    financial: 'Bilan Financier & Encaissements',
    expenses:  'Rapport des Dépenses & Factures',
    yield:     'Rendement par Propriétaire / Bien',
    audit:     'Audit des Contrats & Baux',
  };

  // ── Génération CSV ────────────────────────────────────────────────────
  const handleCSV = async () => {
    setReportLoading(true);
    try {
      const data = await dashboardApi.getReport(reportType, reportYear);
      const { colonnes, lignes, titre } = data;
      const sep = ';';
      const rows = [
        colonnes.join(sep),
        ...lignes.map((row: string[]) => row.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(sep)),
      ].join('\r\n');
      // BOM UTF-8 pour Excel
      const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ImmoGest_${titre.replace(/[^a-zA-Z0-9]/g, '_')}_${reportYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`✅ Export CSV prêt : ${titre}`);
    } catch (err: any) {
      toast.error('Erreur lors de l\'export CSV.');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Génération PDF (via fenêtre d\'impression) ─────────────────────────
  const handlePDF = async () => {
    setReportLoading(true);
    try {
      const data = await dashboardApi.getReport(reportType, reportYear);
      const { colonnes, lignes, titre, totaux } = data;
      const dateNow = new Date().toLocaleDateString('fr-FR');
      const timeNow = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const tableHead = colonnes.map((c: string) => `<th>${c}</th>`).join('');
      const tableRows = lignes.map((row: string[], i: number) =>
        `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">${row.map((c: string) => `<td>${c}</td>`).join('')}</tr>`
      ).join('');

      let totauxHtml = '';
      if (totaux) {
        const t = totaux as any;
        const items: string[] = [];
        if (t.nbLignes  !== undefined) items.push(`<span><strong>Lignes :</strong> ${t.nbLignes}</span>`);
        if (t.totalPaye !== undefined) items.push(`<span><strong>Total encaissé :</strong> ${new Intl.NumberFormat('fr-FR').format(t.totalPaye)} FCFA</span>`);
        if (t.totalDu   !== undefined) items.push(`<span><strong>Total dû :</strong> ${new Intl.NumberFormat('fr-FR').format(t.totalDu)} FCFA</span>`);
        if (t.total     !== undefined) items.push(`<span><strong>Total dépenses :</strong> ${new Intl.NumberFormat('fr-FR').format(t.total)} FCFA</span>`);
        if (t.actifs    !== undefined) items.push(`<span><strong>Contrats actifs :</strong> ${t.actifs}</span>`);
        if (t.expires   !== undefined) items.push(`<span><strong>Expirés :</strong> ${t.expires}</span>`);
        if (t.loyerMensuelActif !== undefined) items.push(`<span><strong>Loyers mensuels actifs :</strong> ${new Intl.NumberFormat('fr-FR').format(t.loyerMensuelActif)} FCFA</span>`);
        if (items.length) totauxHtml = `<div class="totaux">${items.join('')}</div>`;
      }

      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>${titre} — ${reportYear}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Cinzel:wght@700&display=swap');
  @page { size: A4 landscape; margin: 12mm 10mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Montserrat', Arial, sans-serif; color: #0f172a; font-size: 10px; margin:0; padding:0; background:#fff; }
  .header { display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:10px; border-bottom:3px solid #0f172a; margin-bottom:14px; }
  .header-left .brand { font-family:'Cinzel', serif; font-size:20px; font-weight:700; color:#0f172a; letter-spacing:2px; }
  .header-left .subtitle { font-size:9px; color:#64748b; margin-top:2px; }
  .header-right { text-align:right; }
  .header-right .rapport-title { font-size:13px; font-weight:700; color:#0f172a; }
  .header-right .rapport-meta { font-size:9px; color:#64748b; margin-top:2px; }
  h2 { font-size:11px; font-weight:700; color:#0f172a; margin:0 0 10px; text-transform:uppercase; letter-spacing:1px; }
  table { width:100%; border-collapse:collapse; font-size:9px; }
  thead tr { background:#0f172a; color:#fff; }
  thead th { padding:6px 8px; font-weight:700; text-align:left; font-size:8.5px; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
  tbody tr.even { background:#f8fafc; }
  tbody tr.odd  { background:#fff; }
  tbody td { padding:5px 8px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
  .totaux { margin-top:14px; padding:10px 14px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:8px; display:flex; gap:24px; flex-wrap:wrap; }
  .totaux span { font-size:10px; color:#0f172a; }
  .totaux strong { font-weight:700; }
  .footer { position:fixed; bottom:0; left:0; right:0; text-align:center; font-size:8px; color:#94a3b8; padding:6px; border-top:1px solid #e2e8f0; }
  .badge-paye { background:#dcfce7; color:#166534; padding:2px 6px; border-radius:999px; font-weight:700; }
  .badge-retard { background:#fef2f2; color:#991b1b; padding:2px 6px; border-radius:999px; font-weight:700; }
  .badge-attente { background:#fefce8; color:#92400e; padding:2px 6px; border-radius:999px; font-weight:700; }
  .empty { text-align:center; padding:40px; color:#94a3b8; font-size:12px; }
</style></head><body>
<div class="header">
  <div class="header-left">
    <div class="brand">IMMOGEST</div>
    <div class="subtitle">Gestion Immobilière Professionnelle &bull; Abidjan, Côte d\'Ivoire</div>
  </div>
  <div class="header-right">
    <div class="rapport-title">${titre}</div>
    <div class="rapport-meta">Exercice ${reportYear} &bull; Généré le ${dateNow} à ${timeNow}</div>
  </div>
</div>
${ lignes.length === 0
  ? '<div class="empty">⚠️ Aucune donnée disponible pour cette période.</div>'
  : `<table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table>${totauxHtml}`
}
<div class="footer">ImmoGest — Document généré le ${dateNow} à ${timeNow} &bull; Confidentiel</div>
</body></html>`;

      const win = window.open('', '_blank', 'width=1200,height=850');
      if (!win) { toast.error('Veuillez autoriser les popups pour ce site.'); return; }
      win.document.write(html);
      win.document.close();
      win.addEventListener('load', () => { win.focus(); win.print(); });
      toast.success(`✅ Rapport PDF généré : ${titre}`);
    } catch (err: any) {
      toast.error('Erreur lors de la génération du PDF.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Portfolio Performance & Rapports Analytiques"
          subtitle="Analyse du rendement locatif en temps réel et suivi détaillé des dépenses."
          action={
            <div className="flex gap-3 items-center">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setPeriod('month')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    period === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  30 Jours
                </button>
                <button
                  onClick={() => setPeriod('quarter')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    period === 'quarter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Trimestre
                </button>
                <button
                  onClick={() => setPeriod('year')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    period === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Année
                </button>
              </div>

              <button onClick={handlePDF} disabled={reportLoading} className="btn btn-primary shadow-lg shadow-slate-900/10 disabled:opacity-60">
                <span className="material-symbols-outlined text-sm">file_download</span>
                <span>{reportLoading ? 'Chargement...' : 'Générer Rapport PDF'}</span>
              </button>
            </div>
          }
        >
          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 1 — Taux d'occupation moyen */}
            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TAUX D&apos;OCCUPATION MOYEN</p>
              {loading ? (
                <div className="h-9 bg-slate-100 rounded animate-pulse w-24 my-1" />
              ) : kpis?.TotalMaisons === 0 ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-display font-extrabold text-slate-400">—</span>
                  <span className="text-xs text-slate-400">Aucun bien enregistré</span>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-display font-extrabold text-slate-900">
                      {kpis?.TauxOccupation ?? 0}%
                    </h3>
                    <span className={`text-xs font-bold mb-1 flex items-center ${
                      (kpis?.TauxOccupation ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {kpis?.TotalMaisonsOccupees ?? 0}/{kpis?.TotalMaisons ?? 0} biens
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        (kpis?.TauxOccupation ?? 0) >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${kpis?.TauxOccupation ?? 0}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 2 — Revenu net mensuel */}
            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">REVENU NET MENSUEL</p>
              {loading ? (
                <div className="h-9 bg-slate-100 rounded animate-pulse w-36 my-1" />
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <h3 className="text-2xl font-display font-extrabold text-slate-900">
                      {formatFCFA(kpis?.TotalLoyersMensuels ?? 0)}
                    </h3>
                  </div>
                  {(kpis?.TotalLoyersMensuels ?? 0) > 0 ? (
                    <span className="text-xs font-semibold text-emerald-600 mt-2 inline-block">
                      ↑ Encaissements du mois en cours
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 mt-2 inline-block">
                      Aucun règlement ce mois-ci
                    </span>
                  )}
                </>
              )}
            </div>

            {/* 3 — Rendement locatif brut */}
            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">RENDEMENT LOCATIF BRUT</p>
              {loading ? (
                <div className="h-9 bg-slate-100 rounded animate-pulse w-20 my-1" />
              ) : (kpis?.RendementBrut ?? 0) === 0 ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-display font-extrabold text-slate-400">—</span>
                  <span className="text-xs text-slate-400">Données insuffisantes</span>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-display font-extrabold text-slate-900">
                      {kpis?.RendementBrut ?? 0}%
                    </h3>
                    <span className={`text-xs font-bold mb-1 flex items-center ${
                      (kpis?.RendementBrut ?? 0) >= 6 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {(kpis?.RendementBrut ?? 0) >= 6 ? '✓ Bon' : '⚠ Faible'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Revenus annuels / valeur estimée patrimoine</p>
                </>
              )}
            </div>

            {/* 4 — Cautions consignées */}
            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">CAUTIONS CONSIGNÉES</p>
              {loading ? (
                <div className="h-9 bg-slate-100 rounded animate-pulse w-36 my-1" />
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <h3 className="text-2xl font-display font-extrabold text-slate-900">
                      {formatFCFA(kpis?.TotalCautions ?? 0)}
                    </h3>
                  </div>
                  {(kpis?.TotalCautions ?? 0) > 0 ? (
                    <span className="text-xs font-semibold text-emerald-600 mt-2 inline-block">
                      Caution + avance sécurisées ({kpis?.TotalSouscriptionsActives ?? 0} contrat(s))
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 mt-2 inline-block">
                      Aucun contrat actif
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Section Graphiques et Génération de Rapports */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Graphique Encaissements vs Dépenses */}
            <div className="lg:col-span-2 glass-card rounded-xl p-6 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Revenus Locatifs vs Charges Dépenses</h3>
                  <p className="text-xs text-slate-500">Comparatif mensuel des encaissements et des frais de gestion</p>
                </div>
                {/* Sélecteur d'année */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChartYear((y) => y - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all"
                  >‹</button>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full min-w-[72px] text-center">
                    Exercice {chartYear}
                  </span>
                  <button
                    onClick={() => setChartYear((y) => Math.min(y + 1, new Date().getFullYear()))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all disabled:opacity-30"
                    disabled={chartYear >= new Date().getFullYear()}
                  >›</button>
                </div>
              </div>

              {chartLoading ? (
                <div className="flex items-end gap-2 h-48 border-t border-slate-100 pt-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        <div className="w-1/2 bg-slate-100 animate-pulse rounded-t" style={{ height: `${30 + Math.random() * 50}%` }} />
                        <div className="w-1/2 bg-rose-100 animate-pulse rounded-t" style={{ height: `${10 + Math.random() * 20}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (() => {
                // Calcul de l'échelle dynamique
                const maxVal = Math.max(...chartData.map((d) => Math.max(d.revenus, d.depenses)), 1);
                const totalRevenus  = chartData.reduce((s, d) => s + d.revenus,  0);
                const totalDepenses = chartData.reduce((s, d) => s + d.depenses, 0);
                const hasData = totalRevenus > 0 || totalDepenses > 0;

                return (
                  <>
                    {!hasData && (
                      <div className="flex flex-col items-center justify-center h-48 border-t border-slate-100 pt-4 gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300">bar_chart</span>
                        <p className="text-sm text-slate-400 font-medium">Aucune donnée pour l&apos;exercice {chartYear}</p>
                        <p className="text-xs text-slate-400">Enregistrez des règlements et des dépenses pour voir le graphique.</p>
                      </div>
                    )}
                    {hasData && (
                      <div className="flex items-end gap-2 h-48 border-t border-slate-100 pt-4">
                        {chartData.map((m) => {
                          const revH = Math.max((m.revenus  / maxVal) * 100, m.revenus  > 0 ? 4 : 0);
                          const expH = Math.max((m.depenses / maxVal) * 100, m.depenses > 0 ? 4 : 0);
                          const isEmpty = m.revenus === 0 && m.depenses === 0;
                          return (
                            <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                              {/* Tooltip au survol */}
                              {!isEmpty && (
                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <div className="bg-slate-900 text-white rounded-lg px-3 py-2 text-[11px] whitespace-nowrap shadow-xl">
                                    <div className="font-bold text-slate-300 mb-1">{m.label}</div>
                                    {m.revenus  > 0 && <div className="text-emerald-400">■ {new Intl.NumberFormat('fr-FR').format(m.revenus)} F</div>}
                                    {m.depenses > 0 && <div className="text-rose-400">■ {new Intl.NumberFormat('fr-FR').format(m.depenses)} F</div>}
                                  </div>
                                  <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
                                </div>
                              )}
                              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                                <div
                                  className={`w-1/2 rounded-t transition-all duration-500 ${
                                    isEmpty ? 'bg-slate-100' : 'bg-slate-900 group-hover:bg-[#D4AF37]'
                                  }`}
                                  style={{ height: isEmpty ? '4%' : `${revH}%` }}
                                  title={`Revenus ${m.label}: ${new Intl.NumberFormat('fr-FR').format(m.revenus)} FCFA`}
                                />
                                <div
                                  className={`w-1/2 rounded-t transition-all duration-500 ${
                                    isEmpty ? 'bg-slate-100' : 'bg-rose-400'
                                  }`}
                                  style={{ height: isEmpty ? '4%' : `${expH}%` }}
                                  title={`Dépenses ${m.label}: ${new Intl.NumberFormat('fr-FR').format(m.depenses)} FCFA`}
                                />
                              </div>
                              <span className={`text-[10px] font-bold ${ isEmpty ? 'text-slate-300' : 'text-slate-500'}`}>{m.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Légende + Totaux */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-slate-900 rounded-sm" />
                          <span className="text-slate-600 font-medium">Revenus Loyers</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-rose-400 rounded-sm" />
                          <span className="text-slate-600 font-medium">Frais &amp; Dépenses</span>
                        </div>
                      </div>
                      {hasData && (
                        <div className="flex gap-4 text-[11px]">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            ↑ {new Intl.NumberFormat('fr-FR').format(totalRevenus)} F
                          </span>
                          <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            ↓ {new Intl.NumberFormat('fr-FR').format(totalDepenses)} F
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Centre de Génération de Rapports */}
            <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base mb-1">Générateur de Rapports Fiscaux & Audits</h3>
                <p className="text-xs text-slate-500 mb-4">Exportez vos états certifiés pour la comptabilité et les propriétaires.</p>

                <div className="space-y-3">
                  {[
                    { id: 'financial', label: 'Bilan Financier & Encaissements', desc: 'Recouvrements, loyers et arriérés' },
                    { id: 'expenses', label: 'Rapport des Dépenses & Factures', desc: 'Ventilation globale et travaux' },
                    { id: 'yield', label: 'Rendement par Propriétaire / Bien', desc: 'Analyse de rentabilité nette' },
                    { id: 'audit', label: 'Audit des Contrats & Baux', desc: 'Statut des souscriptions actives' },
                  ].map((r) => (
                    <label
                      key={r.id}
                      onClick={() => setReportType(r.id)}
                      className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                        reportType === r.id
                          ? 'border-slate-900 bg-slate-50 shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{r.label}</span>
                        <input type="radio" name="reportType" checked={reportType === r.id} readOnly className="w-3.5 h-3.5 text-slate-900" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handlePDF}
                  disabled={reportLoading}
                  className="btn btn-primary flex-1 disabled:opacity-60"
                >
                  {reportLoading
                    ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Chargement...</>
                    : <>📥 Télécharger PDF</>}
                </button>
                <button
                  onClick={handleCSV}
                  disabled={reportLoading}
                  className="btn btn-secondary disabled:opacity-60"
                >
                  📊 CSV
                </button>
              </div>
            </div>

          </div>
        </PageWrapper>
      </main>
    </div>
  );
}
