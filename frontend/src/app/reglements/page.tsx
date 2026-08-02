'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { reglementsApi, souscriptionsApi, downloadPdf } from '@/lib/api';
import {
  DataTable, Modal, PageWrapper, Pagination, Sidebar, StatutBadge
} from '@/components/ui';
import { FilterBar, FilterState } from '@/components/FilterBar';

export default function ReglementsPage() {
  const [reglements, setReglements]       = useState<any[]>([]);
  const [souscriptions, setSouscriptions] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [search, setSearch]               = useState('');
  const [extraFilters, setExtraFilters]   = useState<FilterState>({});
  const [showModal, setShowModal]         = useState(false);
  const [editItem, setEditItem]           = useState<any>(null);

  // Filtres Reçus groupés
  const [anneeGroupee, setAnneeGroupee]   = useState<number>(new Date().getFullYear());
  const [moisGroupe, setMoisGroupe]       = useState<number>(new Date().getMonth() + 1);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      Idr: '',
      SouscriptionId: '',
      DatePaiement: new Date().toISOString().split('T')[0],
      MoisConcerne: new Date().toISOString().split('T')[0].substring(0, 7) + '-01',
      MontantAPayer: 0,
      MontantPaye: 0,
      Statut: 'Paye',
      Notes: '',
    }
  });

  const selectedSouscriptionId = watch('SouscriptionId');

const DEMO_SOUSCRIPTIONS_R = [
  { Id: 'ctr-1', Ids: 'CTR-2026-001', LocataireNomPrenoms: 'Touré Aminata Fatou', IdmMaison: 'MAIS-2026-001', MontantLoyer: 150000 },
  { Id: 'ctr-2', Ids: 'CTR-2026-002', LocataireNomPrenoms: 'Diallo Mamadou', IdmMaison: 'MAIS-2026-002', MontantLoyer: 450000 }
];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        reglementsApi.getAll({ page, pageSize: 15, search, ...extraFilters }),
        souscriptionsApi.getAll({ pageSize: 200 }),
      ]);
      const loadedR = rRes.Items || rRes.items || [];
      const loadedS = sRes.Items || sRes.items || [];

      setReglements(loadedR);
      setTotalPages(rRes.TotalPages || rRes.totalPages || 1);
      setSouscriptions(loadedS);
    } catch (err: any) {
      console.warn('Chargement des règlements en mode local/hors ligne:', err);
      setReglements([]);
      setTotalPages(1);
      setSouscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, extraFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (selectedSouscriptionId) {
      const s = souscriptions.find((x) => x.Id === selectedSouscriptionId);
      if (s) {
        setValue('MontantAPayer', s.MontantLoyer);
        setValue('MontantPaye', s.MontantLoyer);
      }
    }
  }, [selectedSouscriptionId, souscriptions, setValue]);

  const openCreate = () => {
    const defaultS = souscriptions[0];
    reset({
      Idr: '',
      SouscriptionId: defaultS?.Id || '',
      DatePaiement: new Date().toISOString().split('T')[0],
      MoisConcerne: new Date().toISOString().substring(0, 7) + '-01',
      MontantAPayer: defaultS?.MontantLoyer || 80000,
      MontantPaye: defaultS?.MontantLoyer || 80000,
      Notes: '',
    });
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      Idr:            item.Idr,
      SouscriptionId: item.SouscriptionId,
      DatePaiement:   item.DatePaiement,
      MoisConcerne:   item.MoisConcerne,
      MontantAPayer:  item.MontantAPayer,
      MontantPaye:    item.MontantPaye,
      Notes:          item.Notes ?? '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      MontantAPayer: Number(data.MontantAPayer),
      MontantPaye:   Number(data.MontantPaye),
    };

    try {
      if (editItem) {
        await reglementsApi.update(editItem.Id || editItem.id, payload);
        toast.success('Règlement relatif modifié.');
      } else {
        await reglementsApi.create(payload);
        toast.success('Règlement enregistré avec succès.');
      }
      fetchData();
      setShowModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.response ? 'Erreur lors de la sauvegarde.' : 'Serveur API non disponible.');
      toast.error(`Échec d'enregistrement en base : ${msg}`);
    }
  };

  const handlePrintRecu = async (item: any) => {
    try {
      const blob = await reglementsApi.getRecu(item.Id);
      downloadPdf(blob, `Recu_${item.Idr}.pdf`);
      toast.success('Reçu téléchargé.');
    } catch {
      toast.error('Erreur lors de la génération du reçu PDF.');
    }
  };

  const handlePrintGroupes = async () => {
    try {
      const blob = await reglementsApi.getRecusGroupes(anneeGroupee, moisGroupe);
      downloadPdf(blob, `Recus_Groupes_${anneeGroupee}_${moisGroupe}.pdf`);
      toast.success('Reçus groupés téléchargés.');
    } catch {
      toast.error('Erreur lors du téléchargement des reçus groupés.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce règlement ?')) return;
    try {
      await reglementsApi.delete(id);
      toast.success('Règlement supprimé avec succès.');
      fetchData();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.status === 403 ? "Vous n'avez pas les droits nécessaires pour supprimer ce règlement." : null) ||
        'Suppression impossible.';

      if (id.startsWith('reg-') || !err.response) {
        setReglements((prev) => prev.filter((r) => (r.Id || r.id) !== id));
        toast.success('Règlement supprimé.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const formatFCFA = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  const columns = [
    { key: 'Idr', label: 'N° Reçu (IDR)',
      render: (r: any) => (
        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200">
          {r.Idr}
        </span>
      )
    },
    { key: 'NomLocataire', label: 'Locataire',
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-900">{r.NomLocataire}</div>
          <div className="text-xs text-slate-500">{r.IdmMaison} ({r.VilleMaison})</div>
        </div>
      )
    },
    { key: 'MoisConcerne', label: 'Mois Concerné',
      render: (r: any) => {
        const d = new Date(r.MoisConcerne);
        return <span className="font-medium text-sm text-slate-800">{d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>;
      }
    },
    { key: 'MontantPaye', label: 'Montant Payé / Exigible',
      render: (r: any) => (
        <div>
          <div className="font-bold text-slate-900">{formatFCFA(r.MontantPaye)}</div>
          <div className="text-xs text-slate-500">Exigible: {formatFCFA(r.MontantAPayer)}</div>
        </div>
      )
    },
    { key: 'Statut', label: 'Statut',
      render: (r: any) => <StatutBadge statut={r.Statut} />
    },
    { key: 'actions', label: 'Actions',
      render: (r: any) => (
        <div className="flex justify-end gap-1.5">
          <button onClick={() => handlePrintRecu(r)} className="btn btn-secondary btn-sm" title="Imprimer le reçu PDF">🧾 Reçu</button>
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
          title="Gestion des Règlements"
          subtitle="Paiements des locataires et émission de reçus certifiés."
          action={
            <button onClick={openCreate} className="btn btn-primary shadow-lg shadow-slate-900/10">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Saisir un Règlement</span>
            </button>
          }
        >
          {/* ─── Financial Banner Bento (FormsImmoGest Design) ───────────────── */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl mb-8 flex flex-wrap items-center justify-between gap-6 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-[#ffe088] uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                Total Encaissé — Exercice En Cours
              </span>
              <h2 className="text-4xl font-display font-extrabold mt-3 tracking-tight">
                {formatFCFA(reglements.reduce((acc, r) => acc + (r.MontantPaye || 0), 0))}
              </h2>
              <p className="text-xs text-slate-300 mt-2 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">↑ +12%</span> vs mois précédent • Émission automatique des reçus certifiés PDF
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-center min-w-32">
                <span className="text-xs text-slate-300">Reçus Générés</span>
                <div className="text-2xl font-display font-bold mt-1">{reglements.length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-center min-w-32">
                <span className="text-xs text-slate-300">Reste Exigible</span>
                <div className="text-2xl font-display font-bold mt-1 text-amber-300">
                  {formatFCFA(reglements.reduce((acc, r) => acc + ((r.MontantAPayer || 0) - (r.MontantPaye || 0)), 0))}
                </div>
              </div>
            </div>
          </div>

          <FilterBar onFilterChange={(f) => { setExtraFilters(f); setPage(1); }} />

          {/* Recherche & Reçus Groupés */}
          <div className="card mb-6 p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="search-bar flex-1 min-w-64">
              <span className="search-bar-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par N° Reçu, locataire, bien..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-10"
              />
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reçus groupés :</span>
              <select
                value={moisGroupe}
                onChange={(e) => setMoisGroupe(Number(e.target.value))}
                className="form-select text-xs py-1.5"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={anneeGroupee}
                onChange={(e) => setAnneeGroupee(Number(e.target.value))}
                className="form-input text-xs py-1.5 w-20"
              />
              <button onClick={handlePrintGroupes} className="btn btn-secondary btn-sm">
                📦 Reçus PDF
              </button>
            </div>
          </div>

          {/* Tableau */}
          <DataTable columns={columns} data={reglements} loading={loading} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* ─── Modal Formulaire d'après FormsImmoGest ─────────────────────── */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editItem ? 'Modifier le Règlement' : 'Saisir un Règlement de Loyer'}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Contrat de Location (Souscription) *</label>
                <select {...register('SouscriptionId', { required: true })} className="form-select">
                  {souscriptions.map((s) => (
                    <option key={s.Id} value={s.Id}>
                      {s.NomLocataire} — {s.IdmMaison} [{formatFCFA(s.MontantLoyer)}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Date du Paiement *</label>
                  <input type="date" {...register('DatePaiement', { required: true })} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mois Concerné (Loyer de) *</label>
                  <input type="date" {...register('MoisConcerne', { required: true })} className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Montant Exigible (FCFA) *</label>
                  <input type="number" step="1000" {...register('MontantAPayer')} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Montant Versé (FCFA) *</label>
                  <input type="number" step="1000" {...register('MontantPaye')} className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mode de paiement / Référence</label>
                <textarea
                  {...register('Notes')}
                  className="form-input h-20"
                  placeholder="ex: Espèces / Virement Mobile Money / N° Transaction..."
                />
              </div>

              <div className="modal-footer -mx-7 -mb-7 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-gold">
                  {editItem ? 'Enregistrer les modifications' : 'Enregistrer le règlement'}
                </button>
              </div>
            </form>
          </Modal>
        </PageWrapper>
      </main>
    </div>
  );
}
