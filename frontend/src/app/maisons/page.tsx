'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { maisonsApi, proprietairesApi } from '@/lib/api';
import {
  DataTable, Modal, PageWrapper, Pagination, Sidebar
} from '@/components/ui';

const TYPE_CONSTRUCTION_OPTIONS = [
  { value: 'MaisonBasse', label: 'Maison basse' },
  { value: 'Appartement', label: 'Appartement' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Studio', label: 'Studio' },
  { value: 'Duplex', label: 'Duplex' },
  { value: 'Bureau', label: 'Bureau' },
  { value: 'Commerce', label: 'Commerce' },
  { value: 'Entrepot', label: 'Entrepôt' },
];

const DEMO_PROPRIETAIRES = [
  { Id: 'prop-1', NomPrenoms: 'Ets Diarra (Bailleur)', Contact: '0708594241', Email: 'ggh@gmail.com', Adresse: 'Yopougon, Abidjan', NbMaisons: 2, EstActif: true },
  { Id: 'prop-2', NomPrenoms: 'KOUASSI Koffi Jean', Contact: '0102030405', Email: 'kouassi@gmail.com', Adresse: 'Cocody Riviera 3', NbMaisons: 4, EstActif: true },
  { Id: 'prop-3', NomPrenoms: 'Société Immobilière SIFCA', Contact: '2720202020', Email: 'contact@sifca.ci', Adresse: 'Plateau Immeuble Alpha', NbMaisons: 8, EstActif: true }
];

const DEMO_MAISONS = [
  { Id: 'mais-1', Idm: 'MAIS-2026-001', ProprietaireId: 'prop-1', ProprietaireNomPrenoms: 'Ets Diarra (Bailleur)', TypeConstruction: 'Appartement', NbPieces: 3, CoutLoyer: 150000, Ville: 'Abidjan', Quartier: 'Cocody Riviera 3', EstDisponible: true },
  { Id: 'mais-2', Idm: 'MAIS-2026-002', ProprietaireId: 'prop-2', ProprietaireNomPrenoms: 'KOUASSI Koffi Jean', TypeConstruction: 'Villa', NbPieces: 5, CoutLoyer: 450000, Ville: 'Abidjan', Quartier: 'Deux Plateaux', EstDisponible: false }
];

export default function MaisonsPage() {
  const [maisons, setMaisons]             = useState<any[]>([]);
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [search, setSearch]               = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [editItem, setEditItem]           = useState<any>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      Idm: '',
      ProprietaireId: '',
      TypeConstruction: 'Appartement',
      NbPieces: 3,
      CoutLoyer: 80000,
      Ville: 'Abidjan',
      Quartier: '',
      AdresseComplete: '',
      Description: '',
      EstDisponible: true,
    }
  });

  const watchType  = watch('TypeConstruction');
  const watchNb    = watch('NbPieces');
  const watchCout  = watch('CoutLoyer');
  const watchVille = watch('Ville');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        maisonsApi.getAll({ page, pageSize: 15, search }),
        proprietairesApi.getAll({ pageSize: 200 }),
      ]);
      const loadedMaisons = mRes.Items || mRes.items || [];
      const loadedProps   = pRes.Items || pRes.items || [];

      setMaisons(loadedMaisons);
      setTotalPages(mRes.TotalPages || mRes.totalPages || 1);
      setProprietaires(loadedProps);
    } catch (err: any) {
      console.warn('Chargement des maisons en mode local/hors ligne:', err);
      setMaisons([]);
      setTotalPages(1);
      setProprietaires([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateIdm = async () => {
    try {
      const res = await maisonsApi.generateIdm({
        type: watchType,
        nbPieces: Number(watchNb),
        loyer: Number(watchCout),
        ville: watchVille,
      });
      const generated = typeof res === 'string' ? res : (res?.idm || res);
      setValue('Idm', generated);
      toast.success(`IDM généré : ${generated}`);
    } catch {
      toast.error('Erreur de génération d\'IDM.');
    }
  };

  const openCreate = () => {
    reset({
      Idm: '',
      ProprietaireId: proprietaires[0]?.Id || '',
      TypeConstruction: 'Appartement',
      NbPieces: 3,
      CoutLoyer: 80000,
      Ville: 'Abidjan',
      Quartier: '',
      AdresseComplete: '',
      Description: '',
      EstDisponible: true,
    });
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      Idm:              item.Idm,
      ProprietaireId:   item.ProprietaireId,
      TypeConstruction: item.TypeConstruction,
      NbPieces:         item.NbPieces,
      CoutLoyer:        item.CoutLoyer,
      Ville:            item.Ville,
      Quartier:         item.Quartier ?? '',
      AdresseComplete:  item.AdresseComplete ?? '',
      Description:      item.Description ?? '',
      EstDisponible:    item.EstDisponible,
    });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      Idm:       data.Idm && data.Idm.trim() !== '' ? data.Idm.trim() : null,
      NbPieces:  Number(data.NbPieces),
      CoutLoyer: Number(data.CoutLoyer),
    };

    try {
      if (editItem) {
        await maisonsApi.update(editItem.Id || editItem.id, payload);
        toast.success('Maison modifiée avec succès.');
      } else {
        await maisonsApi.create(payload);
        toast.success('Maison créée avec succès.');
      }
      fetchData();
      setShowModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.response ? 'Erreur lors de la sauvegarde.' : 'Serveur API non disponible.');
      toast.error(`Échec d'enregistrement en base : ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette maison ?')) return;
    try {
      await maisonsApi.delete(id);
      toast.success('Maison supprimée avec succès.');
      fetchData();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.status === 403 ? "Vous n'avez pas les droits nécessaires pour supprimer ce bien." : null) ||
        'Suppression impossible.';

      if (id.startsWith('mais-') || !err.response) {
        setMaisons((prev) => prev.filter((m) => (m.Id || m.id) !== id));
        toast.success('Maison supprimée.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const formatFCFA = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Properties Portfolio"
          subtitle="Catalogue d'actifs et gestion du patrimoine immobilier."
          action={
            <button onClick={openCreate} className="btn-gold">
              <span className="material-symbols-outlined text-base">add_business</span>
              <span>Nouveau Bien</span>
            </button>
          }
        >
          {/* ─── KPIs Bento (Ultra Premium Design) ────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Total des Biens</p>
                <h3 className="text-3xl font-display font-extrabold text-slate-900 mt-1">{maisons.length}</h3>
                <span className="text-xs font-bold text-emerald-600 mt-1 inline-block">+2 ce mois-ci</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10">
                <span className="material-symbols-outlined text-2xl">home_work</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Occupation</p>
                <h3 className="text-3xl font-display font-extrabold text-slate-900 mt-1">
                  {maisons.filter(m => !m.EstDisponible).length}
                </h3>
                <span className="text-xs font-bold text-emerald-600 mt-1 inline-block">Taux d'occupation max</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Logements Vacants</p>
                <h3 className="text-3xl font-display font-extrabold text-slate-900 mt-1">
                  {maisons.filter(m => m.EstDisponible).length}
                </h3>
                <span className="text-xs font-bold text-rose-600 mt-1 inline-block">Disponibles immédiatement</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">pending</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Revenu Mensuel</p>
                <h3 className="text-2xl font-display font-extrabold text-slate-900 mt-1">
                  {formatFCFA(maisons.reduce((acc, m) => acc + (m.CoutLoyer || 0), 0))}
                </h3>
                <span className="text-xs font-bold text-amber-700 mt-1 inline-block">Potentiel brut</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">monetization_on</span>
              </div>
            </div>
          </div>

          {/* Recherche & Mode de Vue */}
          <div className="card mb-6 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="search-bar flex-1 max-w-md">
              <span className="search-bar-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par IDM, ville, quartier..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-11"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
                <span>Cartes</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                <span>Tableau</span>
              </button>
            </div>
          </div>

          {/* Affichage Grille vs Tableau */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {maisons.map((item, idx) => {
                const sampleImages = [
                  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
                  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
                  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
                  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
                ];
                const bgImg = sampleImages[idx % sampleImages.length];

                return (
                  <div key={item.Id} className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={bgImg}
                        alt={item.Idm}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md text-white font-mono text-xs font-extrabold px-3 py-1 rounded-lg shadow border border-white/10">
                        {item.Idm}
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm backdrop-blur-md ${
                          item.EstDisponible ? 'bg-emerald-500/90 text-white' : 'bg-slate-900/90 text-white'
                        }`}>
                          {item.EstDisponible ? 'Disponible' : 'Occupé'}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-slate-900 font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-lg border border-white">
                        {formatFCFA(item.CoutLoyer)} / mois
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-display font-extrabold text-slate-900 text-base">{item.TypeConstruction}</h4>
                          <span className="text-xs font-bold text-slate-500">📍 {item.Ville}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mb-4">
                          Quartier {item.Quartier || 'Centre'} • {item.NbPieces} pièces
                        </p>
                        <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          Propriétaire: <span className="font-extrabold text-slate-900">{item.NomProprietaire || 'Non assigné'}</span>
                        </p>
                      </div>

                      <div className="text-xs text-slate-500 border-t border-slate-100 pt-4 flex items-center justify-between">
                        <span>Bailleur: <strong className="text-slate-900 font-bold">{item.NomProprietaire || 'Non assigné'}</strong></span>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(item)} className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors">✏️</button>
                          <button onClick={() => handleDelete(item.Id || item.id)} className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">🗑️</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'Idm', label: 'IDM', render: (r) => <span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{r.Idm}</span> },
                { key: 'NomProprietaire', label: 'Propriétaire' },
                { key: 'TypeConstruction', label: 'Type', render: (r) => `${r.TypeConstruction} (${r.NbPieces} p.)` },
                { key: 'Ville', label: 'Ville / Quartier', render: (r) => `${r.Ville}${r.Quartier ? ' - ' + r.Quartier : ''}` },
                { key: 'CoutLoyer', label: 'Loyer', render: (r) => <span className="font-bold text-slate-900">{formatFCFA(r.CoutLoyer)}</span> },
                { key: 'EstDisponible', label: 'Statut', render: (r) => <span className={`badge ${r.EstDisponible ? 'badge-active' : 'badge-expired'}`}>{r.EstDisponible ? 'Disponible' : 'Occupé'}</span> },
                { key: 'actions', label: 'Actions', render: (r) => (
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm">✏️</button>
                    <button onClick={() => handleDelete(r.Id || r.id)} className="btn btn-danger btn-sm">🗑️</button>
                  </div>
                ) },
              ]}
              data={maisons}
              loading={loading}
            />
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* ─── Modal Ultra-Premium Formulaire ─────────────────────── */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editItem ? 'Modifier la Propriété' : 'Enregistrer une Nouvelle Propriété'}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="form-section-title">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">real_estate_agent</span>
                <span>Assignation & Typologie</span>
              </div>

              <div className="form-group">
                <label className="form-label">Propriétaire Bailleur *</label>
                <div className="input-icon-group">
                  <span className="material-symbols-outlined input-icon">person</span>
                  <select
                    {...register('ProprietaireId', { required: 'Veuillez sélectionner un propriétaire' })}
                    className="form-select"
                  >
                    <option value="">-- Sélectionner un propriétaire --</option>
                    {proprietaires.map((p) => (
                      <option key={p.Id} value={p.Id}>
                        {p.NomPrenoms} ({p.Email || p.Contact || 'Sans contact'})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.ProprietaireId && (
                  <span className="form-error">{String(errors.ProprietaireId.message)}</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Type de Construction *</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">domain</span>
                    <select {...register('TypeConstruction')} className="form-select">
                      {TYPE_CONSTRUCTION_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre de pièces *</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">bed</span>
                    <input type="number" min="1" {...register('NbPieces')} className="form-input" />
                  </div>
                </div>
              </div>

              <div className="form-section-title pt-2">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">location_on</span>
                <span>Tarification & Localisation</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Coût du Loyer (FCFA) *</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">payments</span>
                    <input type="number" step="1000" {...register('CoutLoyer')} className="form-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ville *</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">location_city</span>
                    <input type="text" {...register('Ville', { required: true })} className="form-input" placeholder="ex: Abidjan" />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quartier</label>
                <div className="input-icon-group">
                  <span className="material-symbols-outlined input-icon">explore</span>
                  <input type="text" {...register('Quartier')} className="form-input" placeholder="ex: Cocody Riviera 3" />
                </div>
              </div>

              <div className="form-group">
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label mb-0">IDM (Identifiant Métier)</label>
                  <button
                    type="button"
                    onClick={handleGenerateIdm}
                    className="text-xs text-[#735c00] font-extrabold hover:underline flex items-center gap-1"
                  >
                    ⚡ Générer auto
                  </button>
                </div>
                <div className="input-icon-group">
                  <span className="material-symbols-outlined input-icon">tag</span>
                  <input
                    type="text"
                    {...register('Idm')}
                    className="form-input font-mono font-bold"
                    placeholder="Génération automatique si vide"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Remarques</label>
                <textarea
                  {...register('Description')}
                  className="form-input"
                  placeholder="Spécificités et équipements du bien..."
                />
              </div>

              {editItem && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="EstDisponible"
                    {...register('EstDisponible')}
                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                  />
                  <label htmlFor="EstDisponible" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bien disponible à la location
                  </label>
                </div>
              )}

              <div className="modal-footer -mx-7 -mb-7 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-gold">
                  {editItem ? 'Enregistrer les modifications' : 'Créer la propriété'}
                </button>
              </div>
            </form>
          </Modal>
        </PageWrapper>
      </main>
    </div>
  );
}
