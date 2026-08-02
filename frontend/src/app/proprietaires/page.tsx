'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { proprietairesApi } from '@/lib/api';
import {
  DataTable, Modal, PageWrapper, Pagination, Sidebar
} from '@/components/ui';

export default function ProprietairesPage() {
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [search, setSearch]               = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [editItem, setEditItem]           = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      NomPrenoms: '',
      Contact: '',
      Email: '',
      Adresse: '',
      Notes: '',
      EstActif: true,
    }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await proprietairesApi.getAll({ page, pageSize: 15, search });
      const items = res.Items || res.items || [];
      setProprietaires(items);
      localStorage.setItem('immogest_proprietaires', JSON.stringify(items));
      setTotalPages(res.TotalPages || res.totalPages || 1);
    } catch (err: any) {
      console.warn('Chargement des propriétaires en mode local/hors ligne:', err);
      setProprietaires([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    reset({ NomPrenoms: '', Contact: '', Email: '', Adresse: '', Notes: '', EstActif: true });
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      NomPrenoms: item.NomPrenoms,
      Contact:    item.Contact ?? '',
      Email:      item.Email ?? '',
      Adresse:    item.Adresse ?? '',
      Notes:      item.Notes ?? '',
      EstActif:   item.EstActif ?? true,
    });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    const payload = {
      NomPrenoms: data.NomPrenoms ? data.NomPrenoms.trim() : '',
      Contact:    data.Contact && data.Contact.trim() !== '' ? data.Contact.trim() : null,
      Email:      data.Email && data.Email.trim() !== '' ? data.Email.trim().toLowerCase() : null,
      Adresse:    data.Adresse && data.Adresse.trim() !== '' ? data.Adresse.trim() : null,
      Notes:      data.Notes && data.Notes.trim() !== '' ? data.Notes.trim() : null,
      EstActif:   data.EstActif ?? true,
    };

    try {
      if (editItem) {
        await proprietairesApi.update(editItem.Id || editItem.id, payload);
        toast.success('Propriétaire modifié avec succès.');
      } else {
        await proprietairesApi.create(payload);
        toast.success('Propriétaire créé avec succès.');
      }
      fetchData();
      setShowModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.response ? 'Erreur lors de la sauvegarde.' : 'Serveur API non disponible.');
      toast.error(`Échec d'enregistrement en base : ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce propriétaire ?')) return;
    try {
      await proprietairesApi.delete(id);
      toast.success('Propriétaire supprimé avec succès.');
      fetchData();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.status === 403 ? "Vous n'avez pas les droits nécessaires pour supprimer ce propriétaire." : null) ||
        'Suppression impossible.';

      if (id.startsWith('prop-') || !err.response) {
        setProprietaires((prev) => prev.filter((p) => (p.Id || p.id) !== id));
        toast.success('Propriétaire supprimé.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const columns = [
    { key: 'NomPrenoms', label: 'Propriétaire Bailleur',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
            {r.NomPrenoms?.substring(0, 2).toUpperCase() || 'PR'}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{r.NomPrenoms}</div>
            <div className="text-xs text-slate-500">{r.Email || 'Email non renseigné'}</div>
          </div>
        </div>
      )
    },
    { key: 'Contact', label: 'Contact', render: (r: any) => r.Contact || '—' },
    { key: 'Adresse', label: 'Adresse', render: (r: any) => r.Adresse || '—' },
    { key: 'NbMaisons', label: 'Biens en gestion',
      render: (r: any) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          🏠 {r.NbMaisons || 0} bien(s)
        </span>
      )
    },
    { key: 'EstActif', label: 'Statut',
      render: (r: any) => (
        <span className={`badge ${r.EstActif ? 'badge-active' : 'badge-expired'}`}>
          {r.EstActif ? 'Actif' : 'Inactif'}
        </span>
      )
    },
    { key: 'actions', label: 'Action',
      render: (r: any) => (
        <div className="flex justify-end gap-1.5">
          <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm" title="Modifier">✏️</button>
          <button onClick={() => handleDelete(r.Id || r.id)} className="btn btn-danger btn-sm" title="Supprimer">🗑️</button>
        </div>
      )
    },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Propriétaires Bailleurs"
          subtitle="Portefeuille des bailleurs et suivi des mandats de gestion."
          action={
            <button onClick={openCreate} className="btn-gold">
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>Nouveau Propriétaire</span>
            </button>
          }
        >
          {/* ─── KPIs Bento ────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card rounded-2xl p-6 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">real_estate_agent</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bailleurs</p>
                <p className="text-3xl font-display font-bold text-slate-900 mt-1">{proprietaires.length}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center gap-6 border-l-4 border-emerald-500">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bailleurs Actifs</p>
                <p className="text-3xl font-display font-bold text-slate-900 mt-1">
                  {proprietaires.filter(p => p.EstActif).length}
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center gap-6 border-l-4 border-amber-500">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700">
                <span className="material-symbols-outlined text-3xl">holiday_village</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Biens Sous Mandat</p>
                <p className="text-3xl font-display font-bold text-slate-900 mt-1">
                  {proprietaires.reduce((acc, p) => acc + (p.NbMaisons || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Recherche */}
          <div className="card mb-6 p-4">
            <div className="search-bar max-w-md">
              <span className="search-bar-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par nom, contact, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-11"
              />
            </div>
          </div>

          {/* Tableau */}
          <DataTable columns={columns} data={proprietaires} loading={loading} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* ─── Modal Formulaire Propriétaire ─────────────────────── */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editItem ? 'Modifier le Propriétaire' : 'Ajouter un Nouveau Propriétaire'}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="form-section-title">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">person</span>
                <span>Coordonnées du Bailleur</span>
              </div>

              <div className="form-group">
                <label className="form-label">Nom & Prénoms du Bailleur *</label>
                <div className="input-icon-group">
                  <span className="material-symbols-outlined input-icon">badge</span>
                  <input
                    type="text"
                    {...register('NomPrenoms', { required: 'Le nom et prénom sont obligatoires.' })}
                    className="form-input"
                    placeholder="ex: KOUASSI Koffi Jean"
                  />
                </div>
                {errors.NomPrenoms && <span className="form-error">{String(errors.NomPrenoms.message)}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Contact (Téléphone)</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">call</span>
                    <input type="text" {...register('Contact')} className="form-input" placeholder="ex: +225 01 02 03 04 05" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Adresse Email</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">mail</span>
                    <input type="email" {...register('Email')} className="form-input" placeholder="ex: kouassi@email.com" />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Adresse physique / Siège</label>
                <div className="input-icon-group">
                  <span className="material-symbols-outlined input-icon">location_on</span>
                  <input type="text" {...register('Adresse')} className="form-input" placeholder="ex: Abidjan, Marcory Zone 4" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes & Mandats</label>
                <textarea {...register('Notes')} className="form-input" placeholder="Modalités du mandat de gestion, RIB..." />
              </div>

              <div className="modal-footer -mx-7 -mb-7 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-gold">
                  {editItem ? 'Enregistrer les modifications' : 'Enregistrer le propriétaire'}
                </button>
              </div>
            </form>
          </Modal>
        </PageWrapper>
      </main>
    </div>
  );
}
