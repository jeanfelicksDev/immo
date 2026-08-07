'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { depensesApi, maisonsApi, locatairesApi } from '@/lib/api';
import {
  DataTable, Modal, PageWrapper, Pagination, Sidebar
} from '@/components/ui';
import { FilterBar, FilterState } from '@/components/FilterBar';

const TYPE_DEPENSE_OPTIONS = [
  { value: 'DepensesGlobales', label: 'Dépenses globales (agence)' },
  { value: 'DepensesMaison', label: "Dépenses d'une maison" },
  { value: 'ImputationLocataire', label: 'Imputation Locataire' },
];

export default function DepensesPage() {
  const [depenses, setDepenses]     = useState<any[]>([]);
  const [maisons, setMaisons]       = useState<any[]>([]);
  const [locataires, setLocataires] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('');
  const [extraFilters, setExtraFilters] = useState<FilterState>({});
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<any>(null);
  const [pjFile, setPjFile]         = useState<File | null>(null);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      TypeDepense: 'DepensesGlobales',
      MaisonId: '',
      LocataireId: '',
      DateDepense: new Date().toISOString().split('T')[0],
      Article: '',
      Quantite: 1,
      PrixUnitaire: 0,
      Observation: '',
    }
  });

  const typeDepenseWatched = watch('TypeDepense');
  const quantiteWatched    = watch('Quantite');
  const prixUnitaireWatched = watch('PrixUnitaire');

  const montantCalcule = (Number(quantiteWatched) || 0) * (Number(prixUnitaireWatched) || 0);

const DEMO_MAISONS_D = [
  { Id: 'mais-1', Idm: 'MAIS-2026-001', CoutLoyer: 150000, Ville: 'Abidjan' },
  { Id: 'mais-2', Idm: 'MAIS-2026-002', CoutLoyer: 450000, Ville: 'Abidjan' }
];

const DEMO_LOCATAIRES_D = [
  { Id: 'loc-1', NomPrenoms: 'Touré Aminata Fatou' },
  { Id: 'loc-2', NomPrenoms: 'Diallo Mamadou' }
];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [depRes, maisRes, locRes] = await Promise.all([
        depensesApi.getAll({ page, pageSize: 15, search, type: filterType || undefined, ...extraFilters }),
        maisonsApi.getAll({ pageSize: 200 }),
        locatairesApi.getAll({ pageSize: 200 }),
      ]);
      const loadedDep = depRes.Items || depRes.items || [];
      const loadedM   = maisRes.Items || maisRes.items || [];
      const loadedL   = locRes.Items || locRes.items || [];

      setDepenses(loadedDep);
      setTotalPages(depRes.TotalPages || depRes.totalPages || 1);
      setMaisons(loadedM);
      setLocataires(loadedL);
    } catch (err: any) {
      console.warn('Chargement des dépenses en mode local/hors ligne:', err);
      setDepenses([]);
      setTotalPages(1);
      setMaisons([]);
      setLocataires([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, extraFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    reset({
      TypeDepense: 'DepensesGlobales',
      MaisonId: '',
      LocataireId: '',
      DateDepense: new Date().toISOString().split('T')[0],
      Article: '',
      Quantite: 1,
      PrixUnitaire: 0,
      Observation: '',
    });
    setEditItem(null);
    setPjFile(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      TypeDepense:  item.TypeDepense,
      MaisonId:     item.MaisonId ?? '',
      LocataireId:  item.LocataireId ?? '',
      DateDepense:  item.DateDepense,
      Article:      item.Article,
      Quantite:     item.Quantite,
      PrixUnitaire: item.PrixUnitaire,
      Observation:  item.Observation ?? '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      MaisonId:    data.TypeDepense === 'DepensesMaison' ? data.MaisonId || null : null,
      LocataireId: data.TypeDepense === 'ImputationLocataire' ? data.LocataireId || null : null,
      Quantite:    Number(data.Quantite),
      PrixUnitaire: Number(data.PrixUnitaire),
    };

    try {
      let saved: any;
      if (editItem) {
        saved = await depensesApi.update(editItem.Id, payload);
        toast.success('Dépense modifiée avec succès.');
      } else {
        saved = await depensesApi.create(payload);
        toast.success('Dépense enregistrée avec succès.');
      }

      if (pjFile && saved?.Id) {
        await depensesApi.uploadPJ(saved.Id, pjFile);
        toast.success('Pièce justificative uploadée.');
      }

      fetchData();
      setShowModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.response ? 'Erreur lors de la sauvegarde.' : 'Serveur API non disponible.');
      toast.error(`Échec d'enregistrement en base : ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (typeof window !== 'undefined' && !window.confirm('Confirmer la suppression de cette dépense ?')) return;

    setDepenses((prev) => prev.filter((d) => (d.Id || d.id) !== id));

    try {
      await depensesApi.delete(id);
      toast.success('Dépense supprimée avec succès.');
      fetchData();
    } catch (err: any) {
      console.error('Erreur de suppression dépense:', err);
      fetchData();
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Suppression en base impossible.';
      toast.error(`Échec de suppression : ${errorMessage}`);
    }
  };

  const formatFCFA = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  const columns = [
    { key: 'DateDepense', label: 'Date',
      render: (r: any) => new Date(r.DateDepense).toLocaleDateString('fr-FR') },
    { key: 'TypeDepense', label: 'Type / Affectation',
      render: (r: any) => (
        <span className={`badge ${
          r.TypeDepense === 'DepensesGlobales' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
          r.TypeDepense === 'DepensesMaison'   ? 'bg-purple-50 text-purple-700 border border-purple-200' :
          'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          { r.TypeDepense === 'DepensesGlobales' ? 'Globale' :
            r.TypeDepense === 'DepensesMaison'   ? r.IdmMaison ?? 'Maison' :
            r.NomLocataire ?? 'Locataire' }
        </span>
      )
    },
    { key: 'Article',      label: 'Article / Libellé' },
    { key: 'Quantite',     label: 'Qté', render: (r: any) => r.Quantite },
    { key: 'PrixUnitaire', label: 'Prix U.',
      render: (r: any) => formatFCFA(r.PrixUnitaire) },
    { key: 'Montant', label: 'Total',
      render: (r: any) => (
        <span className="font-bold text-slate-900">{formatFCFA(r.Montant)}</span>
      )
    },
    { key: 'actions', label: 'Actions',
      render: (r: any) => (
        <div className="flex justify-end gap-1.5">
          <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm">✏️</button>
          <button onClick={() => handleDelete(r.Id || r.id)} className="btn btn-danger btn-sm">🗑️</button>
        </div>
      )
    },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Gestion des Dépenses"
          subtitle="Analyse détaillée des flux de trésorerie pour votre portefeuille."
          action={
            <button onClick={openCreate} className="btn btn-primary shadow-lg shadow-slate-900/10">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Nouvelle Dépense</span>
            </button>
          }
        >
          {/* ─── KPIs Bento & Synthetic Chart (FormsImmoGest Design) ───── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Répartition par Catégorie</h3>
                  <p className="text-xs text-slate-500">Globales Agence vs Maisons vs Imputations Locataires</p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  Synthèse Budget
                </span>
              </div>
              <div className="flex items-end gap-6 h-36 pt-4 border-t border-slate-100">
                {[
                  { label: 'Dépenses Agence', amount: depenses.filter(d => d.TypeDepense === 'DepensesGlobales').reduce((a, b) => a + (b.Montant || 0), 0), color: 'bg-slate-900' },
                  { label: "Dépenses Maisons", amount: depenses.filter(d => d.TypeDepense === 'DepensesMaison').reduce((a, b) => a + (b.Montant || 0), 0), color: 'bg-purple-600' },
                  { label: 'Imputations Locataire', amount: depenses.filter(d => d.TypeDepense === 'ImputationLocataire').reduce((a, b) => a + (b.Montant || 0), 0), color: 'bg-[#D4AF37]' },
                ].map((item) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{formatFCFA(item.amount)}</span>
                    <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end h-24">
                      <div
                        className={`w-full ${item.color} rounded-t-lg transition-all duration-500`}
                        style={{ height: `${Math.min(100, Math.max(15, (item.amount / 500000) * 100))}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 font-medium text-center">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Engagé</p>
                <h2 className="text-3xl font-display font-extrabold text-slate-900 mt-2">
                  {formatFCFA(depenses.reduce((acc, d) => acc + (d.Montant || 0), 0))}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Cumul total des factures et pièces justificatives enregistrées.</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Fichiers joints :</span>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full">
                  📎 {depenses.filter(d => d.PieceJustificative).length} pièce(s)
                </span>
              </div>
            </div>
          </div>

          <FilterBar onFilterChange={(f) => { setExtraFilters(f); setPage(1); }} />

          {/* Filtres */}
          <div className="card mb-6 flex flex-wrap gap-3 items-center p-4">
            <div className="search-bar flex-1 min-w-48">
              <span className="search-bar-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="form-select w-auto min-w-48"
            >
              <option value="">Tous les types</option>
              <option value="DepensesGlobales">Dépenses globales (agence)</option>
              <option value="DepensesMaison">Dépenses d'une maison</option>
              <option value="ImputationLocataire">Imputation Locataire</option>
            </select>
          </div>

          <DataTable
            columns={columns}
            data={depenses}
            loading={loading}
            keyExtractor={(r) => r.Id}
            emptyMessage="Aucune dépense enregistrée."
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* ─── Modal Formulaire d'après FormsImmoGest ─────────────────────── */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editItem ? 'Modifier la dépense' : 'Enregistrer une dépense'}
          >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {/* Type de Dépense */}
              <div className="form-group">
                <label className="form-label">Type de dépense *</label>
                <select className="form-select" {...register('TypeDepense', { required: true })}>
                  {TYPE_DEPENSE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Champ Maison (conditionnel) */}
              {typeDepenseWatched === 'DepensesMaison' && (
                <div className="form-group">
                  <label className="form-label">Maison concernée *</label>
                  <select className="form-select" {...register('MaisonId', { required: typeDepenseWatched === 'DepensesMaison' })}>
                    <option value="">-- Sélectionner une maison --</option>
                    {maisons.map((m: any) => (
                      <option key={m.Id} value={m.Id}>{m.Idm} — {m.Ville}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Champ Locataire (conditionnel) */}
              {typeDepenseWatched === 'ImputationLocataire' && (
                <div className="form-group">
                  <label className="form-label">Locataire concerné *</label>
                  <select className="form-select" {...register('LocataireId', { required: typeDepenseWatched === 'ImputationLocataire' })}>
                    <option value="">-- Sélectionner un locataire --</option>
                    {locataires.map((l: any) => (
                      <option key={l.Id} value={l.Id}>{l.NomPrenoms}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Date de la dépense *</label>
                <input type="date" className="form-input" {...register('DateDepense', { required: true })} />
              </div>

              {/* Article */}
              <div className="form-group">
                <label className="form-label">Article / Libellé *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: Réparation climatiseur, Facture Internet..."
                  {...register('Article', { required: 'L\'intitulé est requis.' })}
                />
                {errors.Article && <span className="form-error">{String(errors.Article.message)}</span>}
              </div>

              {/* Quantité + Prix Unitaire + Montant Total */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="form-label">Quantité *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="form-input"
                    {...register('Quantite', { required: true, min: 0.001 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prix Unitaire (FCFA) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    {...register('PrixUnitaire', { required: true, min: 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Montant Total</label>
                  <div className="form-input bg-slate-100 font-bold text-slate-900 cursor-not-allowed flex items-center">
                    {formatFCFA(montantCalcule)}
                  </div>
                </div>
              </div>

              {/* Observation */}
              <div className="form-group">
                <label className="form-label">Observation / Remarques</label>
                <textarea
                  className="form-input h-20"
                  placeholder="Détails supplémentaires, références factures..."
                  {...register('Observation')}
                />
              </div>

              {/* Pièce Justificative */}
              <div className="form-group">
                <label className="form-label">Pièce Justificative (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="form-input"
                  onChange={(e) => setPjFile(e.target.files?.[0] ?? null)}
                />
                {editItem?.PieceJustificative && (
                  <span className="text-xs text-slate-600 mt-1 font-mono">
                    Fichier actuel : {editItem.PieceJustificative}
                  </span>
                )}
              </div>

              <div className="modal-footer -mx-7 -mb-7 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-gold">
                  {editItem ? 'Enregistrer les modifications' : 'Créer la dépense'}
                </button>
              </div>
            </form>
          </Modal>
        </PageWrapper>
      </main>
    </div>
  );
}
