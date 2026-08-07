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

  const handlePrintRecu = (item: any) => {
    const dateNow = new Date().toLocaleDateString('fr-FR');
    const datePaiement = item.DatePaiement ? new Date(item.DatePaiement).toLocaleDateString('fr-FR') : '—';
    const moisConcerne = item.MoisConcerne
      ? new Date(item.MoisConcerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : '—';
    const reste = (Number(item.MontantAPayer || 0) - Number(item.MontantPaye || 0));

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Reçu de Paiement — ${item.Idr || item.idr || 'N/A'}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 40px; font-size: 13px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { font-size: 20px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
    .header p { color: #555; font-size: 12px; }
    .ref-box { border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; background: #f9f9f9; }
    .ref-box span { font-weight: bold; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 14px; text-transform: uppercase; color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 6px; margin-bottom: 12px; }
    .section table { width: 100%; border-collapse: collapse; }
    .section table td { padding: 6px 8px; vertical-align: top; }
    .section table td:first-child { font-weight: bold; width: 45%; color: #333; }
    .total-box { border: 2px solid #1a3a5c; padding: 12px 16px; border-radius: 6px; margin-top: 16px; background: #f0f4f8; }
    .sig-row { display: flex; justify-content: flex-end; margin-top: 60px; }
    .sig-box { text-align: center; width: 40%; }
    .sig-box .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 8px; font-size: 11px; color: #555; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reçu de Paiement</h1>
    <p>Quittance de Loyer — Généré le ${dateNow}</p>
  </div>

  <div class="ref-box">
    <span>N° Reçu :</span> ${item.Idr || item.idr || 'N/A'} &nbsp;|&nbsp;
    <span>Statut :</span> ${item.Statut || item.statut || '—'} &nbsp;|&nbsp;
    <span>Mois :</span> ${moisConcerne}
  </div>

  <div class="section">
    <h2>Informations du Locataire</h2>
    <table>
      <tr><td>Nom & Prénoms :</td><td>${item.NomLocataire || '—'}</td></tr>
      <tr><td>Bien Immobilier :</td><td>${item.IdmMaison || '—'} (${item.VilleMaison || '—'})</td></tr>
      <tr><td>N° Contrat :</td><td>${item.IdsSouscription || '—'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Détails du Paiement</h2>
    <table>
      <tr><td>Date de Paiement :</td><td>${datePaiement}</td></tr>
      <tr><td>Montant du Loyer :</td><td>${Number(item.MontantAPayer || 0).toLocaleString('fr-FR')} FCFA</td></tr>
      <tr><td>Montant Payé :</td><td><strong>${Number(item.MontantPaye || 0).toLocaleString('fr-FR')} FCFA</strong></td></tr>
      ${reste > 0 ? `<tr><td>Reste à Payer :</td><td style="color:red;">${reste.toLocaleString('fr-FR')} FCFA</td></tr>` : ''}
      ${item.Notes ? `<tr><td>Notes :</td><td>${item.Notes}</td></tr>` : ''}
    </table>
    <div class="total-box">
      Paiement <strong>${reste <= 0 ? 'SOLDÉ' : 'PARTIEL'}</strong> — 
      ${Number(item.MontantPaye || 0).toLocaleString('fr-FR')} FCFA encaissés sur ${Number(item.MontantAPayer || 0).toLocaleString('fr-FR')} FCFA
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-line">Cachet & Signature<br/>Le Responsable</div>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour télécharger le reçu.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
    toast.success('Reçu ouvert — Choisissez "Enregistrer en PDF" dans la boîte d\'impression.');
  };

  const handlePrintGroupes = () => {
    const moisNom = new Date(anneeGroupee, moisGroupe - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const lignes = reglements.filter((r: any) => {
      const d = new Date(r.MoisConcerne || r.DatePaiement);
      return d.getFullYear() === anneeGroupee && (d.getMonth() + 1) === moisGroupe;
    });

    if (lignes.length === 0) {
      toast.error('Aucun règlement trouvé pour ce mois.');
      return;
    }

    let totalPayer = 0;
    let totalPaye = 0;
    let rows = '';
    lignes.forEach((r: any, i: number) => {
      totalPayer += Number(r.MontantAPayer || 0);
      totalPaye += Number(r.MontantPaye || 0);
      rows += `<tr>
        <td>${i + 1}</td>
        <td>${r.Idr || '—'}</td>
        <td>${r.NomLocataire || '—'}</td>
        <td>${r.IdmMaison || '—'}</td>
        <td>${Number(r.MontantAPayer || 0).toLocaleString('fr-FR')} FCFA</td>
        <td>${Number(r.MontantPaye || 0).toLocaleString('fr-FR')} FCFA</td>
        <td>${r.Statut || '—'}</td>
      </tr>`;
    });

    const htmlContent = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Relevé Groupé — ${moisNom}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 30px; font-size: 12px; }
  h1 { font-size: 18px; text-align: center; text-transform: uppercase; }
  p.sub { text-align: center; color: #555; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a3a5c; color: white; padding: 8px; text-align: left; }
  td { border: 1px solid #ddd; padding: 7px; }
  tr:nth-child(even) { background: #f5f7fa; }
  .total { margin-top: 20px; border: 2px solid #1a3a5c; padding: 12px; border-radius: 6px; background: #f0f4f8; }
</style>
</head><body>
  <h1>Relevé des Règlements</h1>
  <p class="sub">Période : ${moisNom}</p>
  <table>
    <thead><tr><th>#</th><th>N° Reçu</th><th>Locataire</th><th>Bien</th><th>Loyer</th><th>Payé</th><th>Statut</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">
    <strong>Total attendu :</strong> ${totalPayer.toLocaleString('fr-FR')} FCFA &nbsp;|&nbsp;
    <strong>Total encaissé :</strong> ${totalPaye.toLocaleString('fr-FR')} FCFA &nbsp;|&nbsp;
    <strong>Reste :</strong> ${(totalPayer - totalPaye).toLocaleString('fr-FR')} FCFA
  </div>
</body></html>`;

    const printWindow = window.open('', '_blank', 'width=1100,height=700');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour télécharger le relevé.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
    toast.success('Relevé groupé ouvert — Choisissez "Enregistrer en PDF".');
  };


  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!confirm('Voulez-vous vraiment supprimer ce règlement ?')) return;

    setReglements((prev) => prev.filter((r) => (r.Id || r.id) !== id));

    try {
      await reglementsApi.delete(id);
      toast.success('Règlement supprimé avec succès.');
      fetchData();
    } catch (err: any) {
      console.error('Erreur de suppression règlement:', err);
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
