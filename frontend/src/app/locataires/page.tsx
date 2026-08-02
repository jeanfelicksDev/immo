'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { locatairesApi } from '@/lib/api';
import {
  DataTable, Modal, PageWrapper, Pagination, Sidebar
} from '@/components/ui';

export default function LocatairesPage() {
  const [locataires, setLocataires]   = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      NomPrenoms: '',
      Contact: '',
      Email: '',
      Adresse: '',
      PieceIdentite: '',
      Profession: '',
      Notes: '',
      EstActif: true,
    }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await locatairesApi.getAll({ page, pageSize: 15, search });
      const items = res.Items || res.items || [];
      setLocataires(items);
      localStorage.setItem('immogest_locataires', JSON.stringify(items));
      setTotalPages(res.TotalPages || res.totalPages || 1);
    } catch (err: any) {
      console.warn('Chargement des locataires en mode local/hors ligne:', err);
      setLocataires([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    reset({ NomPrenoms: '', Contact: '', Email: '', Adresse: '', PieceIdentite: '', Profession: '', Notes: '', EstActif: true });
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      NomPrenoms:    item.NomPrenoms,
      Contact:       item.Contact ?? '',
      Email:         item.Email ?? '',
      Adresse:       item.Adresse ?? '',
      PieceIdentite: item.PieceIdentite ?? '',
      Profession:    item.Profession ?? '',
      Notes:         item.Notes ?? '',
      EstActif:      item.EstActif ?? true,
    });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    const payload = {
      NomPrenoms:    data.NomPrenoms ? data.NomPrenoms.trim() : '',
      Contact:       data.Contact && data.Contact.trim() !== '' ? data.Contact.trim() : null,
      Email:         data.Email && data.Email.trim() !== '' ? data.Email.trim().toLowerCase() : null,
      Adresse:       data.Adresse && data.Adresse.trim() !== '' ? data.Adresse.trim() : null,
      PieceIdentite: data.PieceIdentite && data.PieceIdentite.trim() !== '' ? data.PieceIdentite.trim() : null,
      Profession:    data.Profession && data.Profession.trim() !== '' ? data.Profession.trim() : null,
      Notes:         data.Notes && data.Notes.trim() !== '' ? data.Notes.trim() : null,
      EstActif:      data.EstActif ?? true,
    };

    try {
      if (editItem) {
        await locatairesApi.update(editItem.Id || editItem.id, payload);
        toast.success('Locataire modifié avec succès.');
      } else {
        await locatairesApi.create(payload);
        toast.success('Locataire créé avec succès.');
      }
      fetchData();
      setShowModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.response ? 'Erreur lors de la sauvegarde.' : 'Serveur API non disponible.');
      toast.error(`Échec d'enregistrement en base : ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce locataire ?')) return;
    try {
      await locatairesApi.delete(id);
      toast.success('Locataire supprimé avec succès.');
      fetchData();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.status === 403 ? "Vous n'avez pas les droits nécessaires pour supprimer ce locataire." : null) ||
        'Suppression impossible.';

      if (id.startsWith('loc-') || !err.response) {
        setLocataires((prev) => prev.filter((l) => (l.Id || l.id) !== id));
        toast.success('Locataire supprimé.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const columns = [
    { key: 'NomPrenoms', label: 'Locataire',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-800 text-xs">
            {r.NomPrenoms?.substring(0, 2).toUpperCase() || 'LC'}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{r.NomPrenoms}</div>
            <div className="text-xs text-slate-500">{r.Email || r.Profession || 'Email non renseigné'}</div>
          </div>
        </div>
      )
    },
    { key: 'Contact', label: 'Contact', render: (r: any) => r.Contact || '—' },
    { key: 'PieceIdentite', label: 'Pièce Identité',
      render: (r: any) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {r.PieceIdentite || '—'}
        </span>
      )
    },
    { key: 'NbContrats', label: 'Contrats',
      render: (r: any) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          📋 {r.NbContrats || 0} contrat(s)
        </span>
      )
    },
    { key: 'EstActif', label: 'Statut',
      render: (r: any) => (
        <span className={`badge ${r.EstActif ? 'badge-active' : 'badge-expired'}`}>
          {r.EstActif ? 'À jour' : 'Inactif'}
        </span>
      )
    },
    { key: 'actions', label: 'Action',
      render: (r: any) => (
        <div className="flex justify-end gap-1.5">
          <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm" title="Modifier">✏️</button>
          <button onClick={() => handleDelete(r.Id)} className="btn btn-danger btn-sm" title="Supprimer">🗑️</button>
        </div>
      )
    },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Gestion des Locataires"
          subtitle="Gérez vos baux, suivez les paiements et communiquez avec vos résidents."
          action={
            <button onClick={openCreate} className="btn-gold">
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>Nouveau Locataire</span>
            </button>
          }
        >
          {/* ─── KPIs Bento ────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card rounded-2xl p-6 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-[#735c00]">
                <span className="material-symbols-outlined text-3xl">group</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Locataires</p>
                <p className="text-3xl font-display font-bold text-slate-900 mt-1">{locataires.length}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center gap-6 border-l-4 border-emerald-500">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paiements à jour</p>
                <p className="text-3xl font-display font-bold text-slate-900 mt-1">
                  {locataires.length > 0 ? `${Math.round((locataires.filter(l => l.EstActif).length / locataires.length) * 100)}%` : '100%'}
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex items-center gap-6 border-l-4 border-rose-500">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-700">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retards / Inactifs</p>
                <p className="text-3xl font-display font-bold text-slate-900 mt-1">
                  {locataires.filter(l => !l.EstActif).length}
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
                placeholder="Rechercher par nom, téléphone, CNI..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-11"
              />
            </div>
          </div>

          {/* Tableau */}
          <DataTable columns={columns} data={locataires} loading={loading} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* ─── Modal Formulaire Locataire ─────────────────────── */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editItem ? 'Modifier le Locataire' : 'Ajouter un Nouveau Locataire'}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="form-section-title">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">person</span>
                <span>État Civil & Identité</span>
              </div>

              <div className="form-group">
                <label className="form-label">Nom & Prénoms *</label>
                <div className="input-icon-group">
                  <span className="material-symbols-outlined input-icon">badge</span>
                  <input
                    type="text"
                    {...register('NomPrenoms', { required: 'Le nom et prénom sont obligatoires.' })}
                    className="form-input"
                    placeholder="ex: Touré Aminata Fatou"
                  />
                </div>
                {errors.NomPrenoms && <span className="form-error">{String(errors.NomPrenoms.message)}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Contact (Téléphone)</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">call</span>
                    <input type="text" {...register('Contact')} className="form-input" placeholder="ex: +225 07 55 66 77 88" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Adresse Email</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">mail</span>
                    <input type="email" {...register('Email')} className="form-input" placeholder="ex: aminata@email.com" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">N° CNI / Passeport</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">fingerprint</span>
                    <input type="text" {...register('PieceIdentite')} className="form-input" placeholder="ex: CNI C001234567" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Profession</label>
                  <div className="input-icon-group">
                    <span className="material-symbols-outlined input-icon">work</span>
                    <input type="text" {...register('Profession')} className="form-input" placeholder="ex: Cadre de Banque" />
                  </div>
                </div>
              </div>

              <div className="form-section-title pt-2">
                <span className="material-symbols-outlined text-sm text-[#D4AF37]">home</span>
                <span>Résidence & Notes</span>
              </div>

              <div className="form-group">
                <label className="form-label">Adresse de résidence</label>
                <div className="input-icon-group">
                  <span className="material-symbols-outlined input-icon">location_on</span>
                  <input type="text" {...register('Adresse')} className="form-input" placeholder="ex: Abidjan, Cocody Riviera 3" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes complémentaires</label>
                <textarea {...register('Notes')} className="form-input" placeholder="Informations et antécédents..." />
              </div>

              <div className="modal-footer -mx-7 -mb-7 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-gold">
                  {editItem ? 'Enregistrer les modifications' : 'Enregistrer le locataire'}
                </button>
              </div>
            </form>
          </Modal>
        </PageWrapper>
      </main>
    </div>
  );
}
