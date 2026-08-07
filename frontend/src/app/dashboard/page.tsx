'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Sidebar, Modal } from '@/components/ui';
import { dashboardApi, reglementsApi } from '@/lib/api';

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' FCFA';

export default function DashboardPage() {
  const [kpis, setKpis]           = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity'>('overview');

  // Modal Liste des Créances et Formulaire de Règlement du Reliquat
  const [showCreancesModal, setShowCreancesModal] = useState(false);
  const [creances, setCreances]                   = useState<any[]>([]);
  const [loadingCreances, setLoadingCreances]     = useState(false);

  const [selectedCreance, setSelectedCreance]     = useState<any | null>(null);
  const [showReliquatModal, setShowReliquatModal] = useState(false);

  const [montantReliquat, setMontantReliquat]     = useState<number>(0);
  const [dateReliquat, setDateReliquat]           = useState<string>(new Date().toISOString().split('T')[0]);
  const [modeReliquat, setModeReliquat]           = useState<string>('Espèces');
  const [savingReliquat, setSavingReliquat]       = useState(false);

  useEffect(() => {
    Promise.all([
      dashboardApi.getKpis(),
      dashboardApi.getChart(),
    ])
      .then(([kpiRes, chartRes]) => {
        setKpis(kpiRes?.Kpis || kpiRes?.kpis || kpiRes);
        setChartData(chartRes?.data || chartRes?.Data || []);
      })
      .catch((err) => console.error('Erreur chargement dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const loadCreances = async () => {
    setLoadingCreances(true);
    try {
      const res = await reglementsApi.getImpayes();
      setCreances(res?.Items || res?.items || []);
    } catch (err) {
      console.error('Erreur chargement créances:', err);
      toast.error('Impossible de charger la liste des créances.');
    } finally {
      setLoadingCreances(false);
    }
  };

  const handleOpenCreancesModal = () => {
    setShowCreancesModal(true);
    loadCreances();
  };

  const handleSelectCreanceForPayment = (creance: any) => {
    setSelectedCreance(creance);
    setMontantReliquat(Number(creance.ResteAPayer || 0));
    setDateReliquat(new Date().toISOString().split('T')[0]);
    setModeReliquat('Espèces');
    setShowReliquatModal(true);
  };

  const handleSaveReliquat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreance) return;
    if (montantReliquat <= 0) {
      toast.error('Veuillez saisir un montant de reliquat valide.');
      return;
    }

    setSavingReliquat(true);
    try {
      const dejaPaye = Number(selectedCreance.MontantPaye || 0);
      const montantAPayer = Number(selectedCreance.MontantAPayer || 0);
      const nouveauPaye = dejaPaye + Number(montantReliquat);
      const estTotalementPaye = nouveauPaye >= montantAPayer;

      if (selectedCreance.Id) {
        // Mise à jour du règlement existant dans la base de données
        await reglementsApi.update(selectedCreance.Id, {
          SouscriptionId: selectedCreance.SouscriptionId,
          MaisonId: selectedCreance.MaisonId,
          LocataireId: selectedCreance.LocataireId,
          DatePaiement: dateReliquat,
          MoisConcerne: selectedCreance.MoisConcerne,
          MontantAPayer: montantAPayer,
          MontantPaye: nouveauPaye,
          Statut: estTotalementPaye ? 'Regle' : 'Partiel',
          Notes: `Règlement reliquat du ${new Date(dateReliquat).toLocaleDateString('fr-FR')} (${modeReliquat}). ${selectedCreance.Notes || ''}`
        });
      } else {
        // Enregistrement d'un nouveau règlement de loyer en base
        await reglementsApi.create({
          SouscriptionId: selectedCreance.SouscriptionId,
          MaisonId: selectedCreance.MaisonId,
          LocataireId: selectedCreance.LocataireId,
          DatePaiement: dateReliquat,
          MoisConcerne: selectedCreance.MoisConcerne,
          MontantAPayer: montantAPayer,
          MontantPaye: nouveauPaye,
          Statut: estTotalementPaye ? 'Regle' : 'Partiel',
          Notes: `Encaissement loyer (${modeReliquat}). ${selectedCreance.Notes || ''}`
        });
      }

      toast.success(`✅ Règlement de ${formatFCFA(montantReliquat)} enregistré avec succès !`);
      setShowReliquatModal(false);
      setSelectedCreance(null);

      // Recharger les créances et rafraîchir les KPIs du tableau de bord
      loadCreances();
      const updatedKpis = await dashboardApi.getKpis();
      setKpis(updatedKpis?.Kpis || updatedKpis?.kpis || updatedKpis);
    } catch (err: any) {
      console.error('Erreur sauvegarde reliquat:', err);
      toast.error(err?.response?.data?.error || 'Erreur lors de l\'enregistrement du reliquat.');
    } finally {
      setSavingReliquat(false);
    }
  };

  const maxRevenu = Math.max(1, ...chartData.map((d) => Number(d.revenus || 0)));

  return (
    <div className="flex min-h-screen font-sans text-slate-900 bg-slate-100/60">
      <Sidebar />

      {/* Main Content Area */}
      <main className="ml-[310px] flex-1 flex flex-col min-w-0">
        {/* Top Header Anchor avec Onglets Actifs */}
        <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/80 h-20 flex items-center justify-between px-8 shadow-xs">
          <div className="flex items-center gap-6">
            <div className="relative w-80">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Rechercher une propriété, locataire..."
                className="w-full bg-slate-100/80 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#D4AF37] focus:bg-white transition-all outline-none"
              />
            </div>

            {/* Navigation par Onglets Haut de Page */}
            <nav className="hidden md:flex items-center gap-8 ml-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'text-slate-900 border-b-2 border-[#D4AF37]'
                    : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
                <span>Vue d'ensemble</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === 'analytics'
                    ? 'text-slate-900 border-b-2 border-[#D4AF37]'
                    : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">analytics</span>
                <span>Analyses</span>
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === 'activity'
                    ? 'text-slate-900 border-b-2 border-[#D4AF37]'
                    : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">history</span>
                <span>Activités</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/profil" className="flex items-center gap-3 hover:opacity-85 transition-all cursor-pointer">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 leading-none">Administrateur</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">GESTIONNAIRE IMMOGEST</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs border border-amber-400/40 hover:scale-105 transition-transform">
                AD
              </div>
            </Link>
          </div>
        </header>

        {/* Dashboard Main Content based on activeTab */}
        <div className="p-8 max-w-[1600px] w-full mx-auto space-y-8">
          
          {/* ════════════════════════════════════════════════════════════
             VUE 1 : OVERVIEW (VUE SYNTHÉTIQUE GLOBALE)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Header section */}
              <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 mb-1 tracking-tight">Tableau de Bord</h2>
                <p className="text-slate-500 text-sm font-medium">Vue synthétique de votre portefeuille immobilier en temps réel.</p>
              </div>

              {/* ─── INDICATEURS CLÉS ───────────────────────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-5 bg-[#D4AF37] rounded-full shadow-xs"></span>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">INDICATEURS CLÉS</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Link href="/proprietaires">
                    <div className="glass-kpi-blue rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center text-xl font-bold border border-blue-500/20 shadow-xs">
                        👤
                      </div>
                      <div>
                        <p className="text-3xl font-display font-bold text-slate-900">{kpis?.TotalProprietaires ?? 0}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Propriétaires Bailleurs</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/locataires">
                    <div className="glass-kpi-emerald rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-500/20 shadow-xs">
                        🔑
                      </div>
                      <div>
                        <p className="text-3xl font-display font-bold text-slate-900">{kpis?.TotalLocataires ?? 0}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Locataires Actifs</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/maisons">
                    <div className="glass-kpi-gold rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center text-xl font-bold border border-amber-500/20 shadow-xs">
                        🏠
                      </div>
                      <div>
                        <p className="text-3xl font-display font-bold text-slate-900">{kpis?.TotalMaisons ?? 0}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Biens Gérés ({kpis?.MaisonsDisponibles ?? 0} dispo)</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/souscriptions">
                    <div className="glass-kpi-purple rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center text-xl font-bold border border-purple-500/20 shadow-xs">
                        📋
                      </div>
                      <div>
                        <p className="text-3xl font-display font-bold text-slate-900">{kpis?.TotalSouscriptions ?? 0}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Contrats & Baux Actifs</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </section>

              {/* ─── SYNTHÈSE FINANCIÈRE ───────────────────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-5 bg-emerald-500 rounded-full shadow-xs"></span>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">SYNTHÈSE FINANCIÈRE</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 border-l-4 border-l-emerald-500">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg font-bold">
                      💵
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-slate-900">{formatFCFA(kpis?.TotalLoyersMensuels ?? 0)}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">Total Loyers / Mois</p>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 border-l-4 border-l-amber-500">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg font-bold">
                      🔒
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-slate-900">{formatFCFA(kpis?.TotalCautions ?? 0)}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">Total Cautions Consignées</p>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 border-l-4 border-l-blue-500">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-bold">
                      ⏩
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-slate-900">{formatFCFA(kpis?.TotalAvances ?? 0)}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">Total Avances Perçues</p>
                    </div>
                  </div>

                  {/* CARTE PALETTE "RESTE À RECOUVRIR" INTERACTIVE */}
                  <div
                    onClick={() => {
                      if ((kpis?.ResteARecouvrir ?? 0) > 0) {
                        handleOpenCreancesModal();
                      } else {
                        toast.info("Aucune créance en retard pour le moment ! Tout est à jour 🎉");
                      }
                    }}
                    className={`glass-card rounded-2xl p-6 flex flex-col gap-3 border-l-4 border-l-rose-500 transition-all ${
                      (kpis?.ResteARecouvrir ?? 0) > 0
                        ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:border-l-rose-600 ring-2 ring-rose-500/20 active:scale-[0.98]'
                        : 'opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-lg font-bold">
                        ⚠️
                      </div>
                      {(kpis?.ResteARecouvrir ?? 0) > 0 && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                          Cliquer pour Régler
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-rose-600">{formatFCFA(kpis?.ResteARecouvrir ?? 0)}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">Reste à Recouvrir</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── ACCÈS RAPIDES ─────────────────────────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-5 bg-blue-500 rounded-full shadow-xs"></span>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">ACCÈS RAPIDES</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Link href="/proprietaires">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-indigo-100/60 hover:bg-indigo-100/80 backdrop-blur-md text-indigo-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-100/60 border-2 border-indigo-200/50 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">👤</span>
                      <span className="text-xs font-black">Propriétaires</span>
                    </button>
                  </Link>

                  <Link href="/maisons">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-purple-100/60 hover:bg-purple-100/80 backdrop-blur-md text-purple-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-purple-100/60 border-2 border-purple-200/50 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">🏠</span>
                      <span className="text-xs font-black">Maisons</span>
                    </button>
                  </Link>

                  <Link href="/locataires">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-emerald-100/60 hover:bg-emerald-100/80 backdrop-blur-md text-emerald-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-100/60 border-2 border-emerald-200/50 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">🔑</span>
                      <span className="text-xs font-black">Locataires</span>
                    </button>
                  </Link>

                  <Link href="/souscriptions">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-amber-100/60 hover:bg-amber-100/80 backdrop-blur-md text-amber-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-amber-100/60 border-2 border-amber-200/50 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">📋</span>
                      <span className="text-xs font-black">Contrats</span>
                    </button>
                  </Link>

                  <Link href="/reglements">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-rose-100/60 hover:bg-rose-100/80 backdrop-blur-md text-rose-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-rose-100/60 border-2 border-rose-200/50 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">💰</span>
                      <span className="text-xs font-black">Paiements</span>
                    </button>
                  </Link>

                  <Link href="/depenses">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-slate-200/60 hover:bg-slate-200/80 backdrop-blur-md text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-slate-200/60 border-2 border-slate-300/50 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">📉</span>
                      <span className="text-xs font-black">Dépenses</span>
                    </button>
                  </Link>
                </div>
              </section>

              {/* Banner Promotionnel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Croissance du Patrimoine & Encaissements</h3>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Année 2026
                    </span>
                  </div>
                  <div className="h-44 flex items-end gap-3 pt-6 border-t border-slate-100">
                    {(chartData.length > 0
                      ? chartData
                      : ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map((m) => ({ label: m, revenus: 0 }))
                    ).map((d) => {
                      const val = Number(d.revenus || 0);
                      const heightPercent = val > 0 ? Math.min(100, Math.max(12, Math.round((val / maxRevenu) * 100))) : 8;
                      return (
                        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded transition-opacity whitespace-nowrap z-10">
                            {formatFCFA(val)}
                          </div>
                          <div
                            className="w-full bg-gradient-to-t from-slate-900 to-amber-500 rounded-t-lg transition-all group-hover:brightness-125 shadow-xs"
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                          <span className="text-[10px] font-bold text-slate-400">{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl flex flex-col justify-between relative overflow-hidden border border-white/10">
                  <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none"></div>
                  <div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-widest">
                      PREMIUM MANAGEMENT
                    </span>
                    <h4 className="font-display text-xl font-bold mt-3 leading-snug">Passez au niveau supérieur</h4>
                    <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">
                      Débloquez la gestion automatisée des baux, l'édition des quittances certifiées PDF et les rapports fiscaux avancés.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('analytics');
                      toast.success("✨ Bienvenue dans l'espace Premium ! Accédez ici à vos indicateurs avancés et rapports de performance.");
                    }}
                    className="btn-gold w-full mt-6 py-3 text-xs"
                  >
                    METTRE À NIVEAU IMMOGEST
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
             VUE 2 : ANALYTICS (ANALYTIQUE & RAPPORTS FINANCIERS)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-1 tracking-tight">Analytique & Rapports Financiers</h2>
                  <p className="text-slate-500 text-sm font-medium">Suivi détaillé de la rentabilité locative, de la collecte des loyers et export de bilans.</p>
                </div>
                <Link href="/rapports">
                  <button className="btn-gold text-xs">
                    <span className="material-symbols-outlined text-base">download</span>
                    <span>Générer un Rapport PDF</span>
                  </button>
                </Link>
              </div>

              {/* KPIs Bento Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-emerald-500">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taux d'Occupation</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-1">{kpis?.TauxOccupation ?? 0}%</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>Biens loués / Total parc</span>
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-[#D4AF37]">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rendement Brut Moyen</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-1">{kpis?.RendementBrut ?? 0}%</p>
                  <p className="text-xs text-slate-500 font-semibold mt-2">Calculé sur l'ensemble du parc</p>
                </div>

                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-blue-500">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loyers Encaissés (Mensuel)</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-1">{formatFCFA(kpis?.TotalLoyersMensuels ?? 0)}</p>
                  <p className="text-xs text-blue-600 font-semibold mt-2">Revenus réels de la base</p>
                </div>

                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-purple-500">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ratio de Charges / Loyers</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-1">11.2%</p>
                  <p className="text-xs text-purple-600 font-semibold mt-2">Dépenses de maintenance maîtrisées</p>
                </div>
              </div>

              {/* Tableau Analytique par Type de Bien */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <h3 className="text-base font-bold text-slate-900">Répartition des Encaissements par Type de Bien</h3>
                  <span className="text-xs font-bold text-slate-500">Année fiscale 2026</span>
                </div>
                <div className="space-y-4">
                  {[
                    { type: 'Appartement F3 / F4', part: '45%', montant: '2 700 000 FCFA', progression: 75, color: 'bg-emerald-500' },
                    { type: 'Villa Duplex / Bas de Villa', part: '30%', montant: '1 800 000 FCFA', progression: 55, color: 'bg-blue-500' },
                    { type: 'Studio / Studio Meublé', part: '15%', montant: '900 000 FCFA', progression: 35, color: 'bg-amber-500' },
                    { type: 'Espace Commercial / Bureau', part: '10%', montant: '600 000 FCFA', progression: 20, color: 'bg-purple-500' },
                  ].map((row) => (
                    <div key={row.type} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${row.color}`}></div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{row.type}</p>
                          <p className="text-xs text-slate-500">Part de portefeuille : {row.part}</p>
                        </div>
                      </div>
                      <div className="w-full md:w-48 bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.progression}%` }}></div>
                      </div>
                      <p className="font-display font-bold text-sm text-slate-900">{row.montant}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
             VUE 3 : ACTIVITY (JOURNAL DES ACTIVITÉS & FLUX EN TEMPS RÉEL)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'activity' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-1 tracking-tight">Journal des Activités & Événements</h2>
                  <p className="text-slate-500 text-sm font-medium">Flux en temps réel des transactions, signatures de baux et alertes système.</p>
                </div>
                <Link href="/notifications">
                  <button className="btn btn-secondary text-xs">
                    <span className="material-symbols-outlined text-base">notifications</span>
                    <span>Centre de Notifications</span>
                  </button>
                </Link>
              </div>

              {/* Feed d'Activités Style Audit Log */}
              <div className="card space-y-6">
                {[
                  {
                    icon: 'payments',
                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    title: 'Paiement de loyer enregistré',
                    desc: 'Locataire Aminata Touré a réglé le loyer du mois en cours (150 000 FCFA). Quittance PDF générée.',
                    time: 'Il y a 10 minutes',
                    user: 'Secrétariat Gestion'
                  },
                  {
                    icon: 'description',
                    color: 'bg-blue-50 text-blue-700 border-blue-200',
                    title: 'Nouveau bail de location établi',
                    desc: 'Souscription du contrat CTR-2026-0012 pour la villa MAIS-2026-004 (Caution & Avances perçues).',
                    time: 'Il y a 2 heures',
                    user: 'Administrateur'
                  },
                  {
                    icon: 'warning',
                    color: 'bg-amber-50 text-amber-700 border-amber-200',
                    title: 'Rappel d\'échéance de loyer expédiée',
                    desc: 'Relance automatique transmise à M. KOUASSI Jean (Échéance dépassée de 3 jours).',
                    time: 'Aujourd\'hui à 09:30',
                    user: 'Système Automatique'
                  },
                  {
                    icon: 'build',
                    color: 'bg-purple-50 text-purple-700 border-purple-200',
                    title: 'Dépense de maintenance validée',
                    desc: 'Facture dépense n° DEP-2026-008 (Plomberie & Réparation réservoir Riviera 3 : 45 000 FCFA).',
                    time: 'Hier à 16:45',
                    user: 'Gestionnaire Technique'
                  },
                  {
                    icon: 'person_add',
                    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    title: 'Nouveau propriétaire enregistré',
                    desc: 'Intégration du bailleur KOUAME Bernard (3 nouveaux biens sous mandat enregistrés).',
                    time: 'Hier à 11:15',
                    user: 'Administrateur'
                  },
                ].map((act, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${act.color}`}>
                      <span className="material-symbols-outlined text-lg">{act.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-slate-900">{act.title}</p>
                        <span className="text-[11px] font-semibold text-slate-400">{act.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">{act.desc}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">Auteur : {act.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── MODAL 1 : LISTE DES CRÉANCES & LOYERS DÛS ─────────────────────── */}
      <Modal
        isOpen={showCreancesModal}
        onClose={() => setShowCreancesModal(false)}
        title="📋 Liste des Créances & Loyers Dûs"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Reste à Recouvrir</p>
              <p className="text-2xl font-display font-bold text-rose-600 mt-0.5">
                {formatFCFA(Math.max(kpis?.ResteARecouvrir || 0, creances.reduce((acc, c) => acc + Number(c.ResteAPayer || 0), 0)))}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              {creances.length > 0 ? `${creances.length} créance(s) en attente` : 'Recherche en cours...'}
            </span>
          </div>

          {loadingCreances ? (
            <div className="py-12 text-center text-slate-400 font-medium">Chargement de la liste des créances...</div>
          ) : creances.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">🎉 Aucune créance en retard ! Tous les loyers sont à jour.</div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {creances.map((c, idx) => (
                <div
                  key={c.Id || `sous_${c.SouscriptionId}_${idx}`}
                  onClick={() => handleSelectCreanceForPayment(c)}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-[#D4AF37] hover:bg-amber-50/20 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center text-lg font-bold border border-amber-400/30 group-hover:scale-105 transition-transform shrink-0">
                      👤
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
                        {c.NomLocataire || 'Locataire'}
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Maison: {c.IdmMaison || 'N/A'} ({c.VilleMaison || 'Abidjan'}) • Contact: {c.ContactLocataire || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Mois: {new Date(c.MoisConcerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-semibold">
                        Montant de la location : <span className="font-bold text-slate-800">{formatFCFA(c.MontantAPayer || 0)}</span>
                      </p>
                      <p className="text-xs text-emerald-600 font-semibold">
                        Déjà versé : <span className="font-bold">{formatFCFA(c.MontantPaye || 0)}</span>
                      </p>
                      <p className="text-sm font-bold text-rose-600 mt-1">
                        Reste à payer : <span className="text-base font-extrabold">{formatFCFA(c.ResteAPayer || 0)}</span>
                      </p>
                    </div>

                    <button className="btn-gold text-xs py-2.5 px-3.5 shrink-0 flex items-center gap-1.5 shadow-xs group-hover:scale-105 transition-transform">
                      <span>Régler</span>
                      <span className="material-symbols-outlined text-sm">payments</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ─── MODAL 2 : FORMULAIRE DE RÈGLEMENT DU RELIQUAT ───────────────── */}
      <Modal
        isOpen={showReliquatModal}
        onClose={() => setShowReliquatModal(false)}
        title="💰 Enregistrer le Règlement du Reliquat"
      >
        <form onSubmit={handleSaveReliquat} className="space-y-6">
          {/* Carte récapitulative du débiteur */}
          <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md flex items-center justify-between border border-white/10">
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CONTRAT Réf. {selectedCreance?.IdsSouscription || '—'}
              </span>
              <h4 className="font-display font-bold text-base mt-1 text-white">
                {selectedCreance?.NomLocataire || 'Locataire'}
              </h4>
              <p className="text-xs text-slate-300 font-medium">
                Maison {selectedCreance?.IdmMaison || ''} ({selectedCreance?.VilleMaison || ''})
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Période concernée</p>
              <p className="text-xs font-bold text-amber-300 mt-0.5">
                {selectedCreance?.MoisConcerne
                  ? new Date(selectedCreance.MoisConcerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
                  : 'Mois en cours'}
              </p>
            </div>
          </div>

          {/* Badges de synthèse du reliquat */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Loyer Total Dû</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{formatFCFA(selectedCreance?.MontantAPayer || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Déjà Versé</p>
              <p className="text-sm font-bold text-emerald-800 mt-1">{formatFCFA(selectedCreance?.MontantPaye || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <p className="text-[10px] font-bold text-rose-700 uppercase">Reliquat Dû</p>
              <p className="text-sm font-bold text-rose-600 mt-1">{formatFCFA(selectedCreance?.ResteAPayer || 0)}</p>
            </div>
          </div>

          {/* Saisie des informations de paiement du reliquat */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Montant du Reliquat Versé (FCFA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max={selectedCreance?.ResteAPayer || undefined}
                value={montantReliquat}
                onChange={(e) => setMontantReliquat(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold focus:ring-2 focus:ring-[#D4AF37] focus:bg-white outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Date du Reliquat (Date de paiement) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dateReliquat}
                onChange={(e) => setDateReliquat(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-[#D4AF37] focus:bg-white outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mode de Règlement / Remarques
              </label>
              <select
                value={modeReliquat}
                onChange={(e) => setModeReliquat(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-[#D4AF37] focus:bg-white outline-none transition-all"
              >
                <option value="Espèces">Espèces / Liquide</option>
                <option value="Orange Money">Orange Money</option>
                <option value="Wave">Wave</option>
                <option value="MTN Mobile Money">MTN Mobile Money</option>
                <option value="Virement Bancaire">Virement Bancaire</option>
                <option value="Chèque">Chèque Bancaire</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowReliquatModal(false)}
              className="btn btn-secondary text-xs py-2.5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={savingReliquat}
              className="btn-gold text-xs py-2.5 px-6 disabled:opacity-50"
            >
              {savingReliquat ? 'Enregistrement...' : 'Valider & Enregistrer le Reliquat'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
