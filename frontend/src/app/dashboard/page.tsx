'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/ui';
import { dashboardApi } from '@/lib/api';

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' FCFA';

export default function DashboardPage() {
  const [kpis, setKpis]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity'>('overview');

  useEffect(() => {
    dashboardApi.getKpis()
      .then((res) => setKpis(res.Kpis || res.kpis || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 border-l-4 border-l-rose-500">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-lg font-bold">
                      ⚠️
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

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Link href="/proprietaires">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-indigo-50/40 hover:bg-indigo-50/70 backdrop-blur-md text-indigo-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-100/40 border border-indigo-200/40 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">👤</span>
                      <span className="text-xs font-bold">Propriétaires</span>
                    </button>
                  </Link>

                  <Link href="/maisons">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-purple-50/40 hover:bg-purple-50/70 backdrop-blur-md text-purple-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-purple-100/40 border border-purple-200/40 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">🏠</span>
                      <span className="text-xs font-bold">Maisons</span>
                    </button>
                  </Link>

                  <Link href="/locataires">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-teal-50/40 hover:bg-teal-50/70 backdrop-blur-md text-teal-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-teal-100/40 border border-teal-200/40 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">🔑</span>
                      <span className="text-xs font-bold">Locataires</span>
                    </button>
                  </Link>

                  <Link href="/souscriptions">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-amber-50/40 hover:bg-amber-50/70 backdrop-blur-md text-amber-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-amber-100/40 border border-amber-200/40 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">📋</span>
                      <span className="text-xs font-bold">Contrats</span>
                    </button>
                  </Link>

                  <Link href="/reglements">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-rose-50/40 hover:bg-rose-50/70 backdrop-blur-md text-rose-950 hover:scale-105 active:scale-95 transition-all shadow-md shadow-rose-100/40 border border-rose-200/40 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">💰</span>
                      <span className="text-xs font-bold">Paiements</span>
                    </button>
                  </Link>

                  <Link href="/depenses">
                    <button className="w-full flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-slate-100/40 hover:bg-slate-100/70 backdrop-blur-md text-slate-900 hover:scale-105 active:scale-95 transition-all shadow-md shadow-slate-200/40 border border-slate-300/40 group">
                      <span className="text-3xl group-hover:rotate-12 transition-transform">📉</span>
                      <span className="text-xs font-bold">Dépenses</span>
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
                    {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map((m, i) => (
                      <div key={m} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <div
                          className="w-full bg-gradient-to-t from-slate-900 to-slate-700 rounded-t-lg transition-all hover:brightness-125"
                          style={{ height: `${35 + ((i * 7) % 55)}%` }}
                        ></div>
                        <span className="text-[10px] font-bold text-slate-400">{m}</span>
                      </div>
                    ))}
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
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taux de Recouvrement</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-1">94.8%</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>+2.4% vs mois dernier</span>
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-[#D4AF37]">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rendement Brut Moyen</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-1">8.4%</p>
                  <p className="text-xs text-slate-500 font-semibold mt-2">Calculé sur 100% du parc géré</p>
                </div>

                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-blue-500">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loyers Encaisssés (Cumul)</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-1">{formatFCFA(kpis?.TotalLoyersMensuels ? kpis.TotalLoyersMensuels * 6 : 4800000)}</p>
                  <p className="text-xs text-blue-600 font-semibold mt-2">Semestre en cours</p>
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
    </div>
  );
}
