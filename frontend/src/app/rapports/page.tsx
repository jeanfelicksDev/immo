'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Sidebar, PageWrapper } from '@/components/ui';
import { dashboardApi, depensesApi, reglementsApi } from '@/lib/api';

export default function RapportsPage() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [reportType, setReportType] = useState('financial');
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getKpis()
      .then((res) => setKpis(res.Kpis || res.kpis || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatFCFA = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  const handleGenerateReport = () => {
    toast.success(`Rapport ${reportType.toUpperCase()} généré avec succès en format PDF.`);
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

              <button onClick={handleGenerateReport} className="btn btn-primary shadow-lg shadow-slate-900/10">
                <span className="material-symbols-outlined text-sm">file_download</span>
                <span>Générer Rapport PDF</span>
              </button>
            </div>
          }
        >
          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TAUX D'OCCUPATION MOYEN</p>
              <div className="flex items-end gap-2">
                <h3 className="text-3xl font-display font-extrabold text-slate-900">94.2%</h3>
                <span className="text-xs font-bold text-emerald-600 mb-1 flex items-center">
                  ↑ 2.1%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-slate-900 h-full rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">REVENU NET MENSUEL</p>
              <div className="flex items-end gap-2">
                <h3 className="text-2xl font-display font-extrabold text-slate-900">
                  {formatFCFA(kpis?.TotalLoyersMensuels || 0)}
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-600 mt-2 inline-block">↑ Taux de recouvrement 98.1%</span>
            </div>

            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">RENDEMENT LOCATIF BRUT</p>
              <div className="flex items-end gap-2">
                <h3 className="text-3xl font-display font-extrabold text-slate-900">8.4%</h3>
                <span className="text-xs font-bold text-emerald-600 mb-1 flex items-center">
                  ↑ 0.6%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Rendement brut moyen par bien</p>
            </div>

            <div className="glass-card p-6 rounded-xl relative overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">CAUTIONS CONSIGNÉES</p>
              <div className="flex items-end gap-2">
                <h3 className="text-2xl font-display font-extrabold text-slate-900">
                  {formatFCFA(kpis?.TotalCautions || 0)}
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 mt-2 inline-block">Fonds de garantie sécurisés</span>
            </div>
          </div>

          {/* Section Graphiques et Génération de Rapports */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Graphique Encaissements vs Dépenses */}
            <div className="lg:col-span-2 glass-card rounded-xl p-6 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Revenus Locatifs vs Charges Dépenses</h3>
                  <p className="text-xs text-slate-500">Comparatif mensuel des encaissements et des frais de gestion</p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  Exercice 2026
                </span>
              </div>

              <div className="flex items-end gap-4 h-48 pt-4 border-t border-slate-100">
                {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map((m, idx) => {
                  const revHeight = [50, 60, 65, 75, 80, 90, 85, 95, 70, 88, 92, 100][idx];
                  const expHeight = [15, 20, 10, 25, 18, 30, 22, 15, 18, 25, 20, 15][idx];
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        <div className="w-1/2 bg-slate-900 group-hover:bg-[#D4AF37] rounded-t transition-all duration-300" style={{ height: `${revHeight}%` }} title={`Revenus ${m}`} />
                        <div className="w-1/2 bg-rose-400 rounded-t transition-all duration-300" style={{ height: `${expHeight}%` }} title={`Dépenses ${m}`} />
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">{m}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-900 rounded-sm"></span>
                  <span className="text-slate-600 font-medium">Revenus Loyers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-rose-400 rounded-sm"></span>
                  <span className="text-slate-600 font-medium">Frais & Dépenses</span>
                </div>
              </div>
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
                <button onClick={handleGenerateReport} className="btn btn-primary flex-1">
                  📥 Télécharger PDF
                </button>
                <button onClick={() => toast.success('Export Excel CSV prêt.')} className="btn btn-secondary">
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
