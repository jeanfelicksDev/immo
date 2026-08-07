'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { souscriptionsApi, maisonsApi, locatairesApi, downloadPdf } from '@/lib/api';
import {
  DataTable, Modal, PageWrapper, Pagination, Sidebar, StatutBadge
} from '@/components/ui';
import { FilterBar, FilterState } from '@/components/FilterBar';

export default function SouscriptionsPage() {
  const [souscriptions, setSouscriptions] = useState<any[]>([]);
  const [maisons, setMaisons]             = useState<any[]>([]);
  const [locataires, setLocataires]       = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [search, setSearch]               = useState('');
  const [extraFilters, setExtraFilters]   = useState<FilterState>({});
  const [showModal, setShowModal]         = useState(false);
  const [editItem, setEditItem]           = useState<any>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      Ids: '',
      MaisonId: '',
      LocataireId: '',
      DateSouscription: new Date().toISOString().split('T')[0],
      DateFin: '',
      MontantLoyer: 80000,
      MontantCaution: 160000,
      MontantAvance: 80000,
      NbMoisContrat: 12,
      Conditions: '',
    }
  });

  const selectedMaisonId = watch('MaisonId');

const DEMO_MAISONS_S = [
  { Id: 'mais-1', Idm: 'MAIS-2026-001', CoutLoyer: 150000, Ville: 'Abidjan', TypeConstruction: 'Appartement', EstDisponible: true },
  { Id: 'mais-2', Idm: 'MAIS-2026-002', CoutLoyer: 450000, Ville: 'Abidjan', TypeConstruction: 'Villa', EstDisponible: false }
];

const DEMO_LOCATAIRES_S = [
  { Id: 'loc-1', NomPrenoms: 'Touré Aminata Fatou', Contact: '+225 07 55 66 77 88' },
  { Id: 'loc-2', NomPrenoms: 'Diallo Mamadou', Contact: '+225 05 11 22 33 44' }
];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, mRes, lRes] = await Promise.all([
        souscriptionsApi.getAll({ page, pageSize: 15, search, ...extraFilters }),
        maisonsApi.getAll({ pageSize: 200 }),
        locatairesApi.getAll({ pageSize: 200 }),
      ]);
      const loadedS = sRes.Items || sRes.items || [];
      const loadedM = mRes.Items || mRes.items || [];
      const loadedL = lRes.Items || lRes.items || [];

      setSouscriptions(loadedS);
      setTotalPages(sRes.TotalPages || sRes.totalPages || 1);
      setMaisons(loadedM);
      setLocataires(loadedL);
    } catch (err: any) {
      console.warn('Chargement des souscriptions en mode local/hors ligne:', err);
      setSouscriptions([]);
      setTotalPages(1);
      setMaisons([]);
      setLocataires([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, extraFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (selectedMaisonId) {
      const m = maisons.find((x) => x.Id === selectedMaisonId);
      if (m) {
        setValue('MontantLoyer', m.CoutLoyer);
        setValue('MontantCaution', m.CoutLoyer * 2);
        setValue('MontantAvance', m.CoutLoyer);
      }
    }
  }, [selectedMaisonId, maisons, setValue]);

  const openCreate = () => {
    const defaultMaison = maisons.find((m) => m.EstDisponible) || maisons[0];
    reset({
      Ids: '',
      MaisonId: defaultMaison?.Id || '',
      LocataireId: locataires[0]?.Id || '',
      DateSouscription: new Date().toISOString().split('T')[0],
      DateFin: '',
      MontantLoyer: defaultMaison?.CoutLoyer || 80000,
      MontantCaution: (defaultMaison?.CoutLoyer || 80000) * 2,
      MontantAvance: defaultMaison?.CoutLoyer || 80000,
      NbMoisContrat: 12,
      Conditions: '',
    });
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      Ids:              item.Ids,
      MaisonId:         item.MaisonId,
      LocataireId:      item.LocataireId,
      DateSouscription: item.DateSouscription,
      DateFin:          item.DateFin ?? '',
      MontantLoyer:     item.MontantLoyer,
      MontantCaution:   item.MontantCaution,
      MontantAvance:    item.MontantAvance,
      NbMoisContrat:    item.NbMoisContrat ?? 12,
      Conditions:       item.Conditions ?? '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      MontantLoyer:   Number(data.MontantLoyer),
      MontantCaution: Number(data.MontantCaution),
      MontantAvance:  Number(data.MontantAvance),
      NbMoisContrat:  data.NbMoisContrat ? Number(data.NbMoisContrat) : null,
      DateFin:        data.DateFin || null,
    };

    try {
      if (editItem) {
        await souscriptionsApi.update(editItem.Id || editItem.id, payload);
        toast.success('Contrat de souscription modifié.');
      } else {
        await souscriptionsApi.create(payload);
        toast.success('Contrat de souscription créé.');
      }
      fetchData();
      setShowModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.response ? 'Erreur lors de la sauvegarde.' : 'Serveur API non disponible.');
      toast.error(`Échec d'enregistrement en base : ${msg}`);
    }
  };

  const handlePrint = (item: any) => {
    // Récupérer les données du maison et locataire correspondants
    const maison = maisons.find((m) => m.Id === item.MaisonId || m.Id === item.maison_id) || {};
    const locataire = locataires.find((l) => l.Id === item.LocataireId || l.Id === item.locataire_id) || {};

    const dateNow = new Date().toLocaleDateString('fr-FR');
    const dateDebut = item.DateSouscription ? new Date(item.DateSouscription).toLocaleDateString('fr-FR') : '—';
    const dateFin = item.DateFin ? new Date(item.DateFin).toLocaleDateString('fr-FR') : 'Indéterminée';

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Contrat de Bail — ${item.Ids || item.ids || 'N/A'}</title>
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
    .fin { margin-top: 60px; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-box { text-align: center; width: 40%; }
    .sig-box .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 8px; font-size: 11px; color: #555; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Contrat de Bail à Usage d'Habitation</h1>
    <p>Généré le ${dateNow}</p>
  </div>

  <div class="ref-box">
    <span>Référence du Contrat :</span> ${item.Ids || item.ids || 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp;
    <span>Statut :</span> ${item.Statut || item.statut || 'Actif'}
  </div>

  <div class="section">
    <h2>Informations des Parties</h2>
    <table>
      <tr><td>Bailleur / Agence :</td><td>Agence Immobilière</td></tr>
      <tr><td>Locataire :</td><td>${locataire.NomPrenoms || item.NomLocataire || '—'}</td></tr>
      <tr><td>Contact Locataire :</td><td>${locataire.Contact || item.ContactLocataire || '—'}</td></tr>
      <tr><td>Pièce d'Identité :</td><td>${locataire.PieceIdentite || '—'}</td></tr>
      <tr><td>Profession :</td><td>${locataire.Profession || '—'}</td></tr>
      <tr><td>Adresse du Locataire :</td><td>${locataire.Adresse || '—'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Objet du Contrat — Bien Immobilier</h2>
    <table>
      <tr><td>Code Maison :</td><td>${maison.Idm || item.IdmMaison || '—'}</td></tr>
      <tr><td>Type de Bien :</td><td>${maison.TypeConstruction || item.TypeConstructionMaison || '—'}</td></tr>
      <tr><td>Localisation :</td><td>${maison.Ville || item.VilleMaison || '—'} ${maison.Quartier ? '— ' + maison.Quartier : ''}</td></tr>
      <tr><td>Adresse Complète :</td><td>${maison.AdresseComplete || maison.Quartier || '—'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Conditions du Contrat</h2>
    <table>
      <tr><td>Date de Début :</td><td>${dateDebut}</td></tr>
      <tr><td>Date de Fin :</td><td>${dateFin}</td></tr>
      <tr><td>Durée :</td><td>${item.NbMoisContrat || item.nb_mois_contrat || '—'} mois</td></tr>
      <tr><td>Loyer Mensuel :</td><td><strong>${Number(item.MontantLoyer || item.montant_loyer || 0).toLocaleString('fr-FR')} FCFA</strong></td></tr>
      <tr><td>Caution / Garantie :</td><td>${Number(item.MontantCaution || item.montant_caution || 0).toLocaleString('fr-FR')} FCFA</td></tr>
      <tr><td>Avance sur Loyer :</td><td>${Number(item.MontantAvance || item.montant_avance || 0).toLocaleString('fr-FR')} FCFA</td></tr>
      ${item.Conditions || item.conditions ? `<tr><td>Clauses Particulières :</td><td>${item.Conditions || item.conditions}</td></tr>` : ''}
    </table>
  </div>

  <div class="fin">
    <p>Lu et approuvé par les deux parties.</p>
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line">Signature du Locataire<br/>${locataire.NomPrenoms || item.NomLocataire || ''}</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Signature &amp; Cachet du Bailleur</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour télécharger le contrat.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    toast.success('Contrat ouvert — Choisissez "Enregistrer en PDF" dans la boîte d\'impression.');
  };


  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!confirm('Voulez-vous vraiment résilier/supprimer ce contrat ?')) return;

    setSouscriptions((prev) => prev.filter((s) => (s.Id || s.id) !== id));

    try {
      await souscriptionsApi.delete(id);
      toast.success('Contrat supprimé avec succès.');
      fetchData();
    } catch (err: any) {
      console.error('Erreur de suppression contrat:', err);
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
    { key: 'Ids', label: 'IDS (Contrat)',
      render: (r: any) => (
        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200">
          {r.Ids}
        </span>
      )
    },
    { key: 'NomLocataire', label: 'Locataire',
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-900">{r.NomLocataire}</div>
          <div className="text-xs text-slate-500">{r.ContactLocataire || '—'}</div>
        </div>
      )
    },
    { key: 'IdmMaison', label: 'Maison / Bien',
      render: (r: any) => (
        <div>
          <div className="font-mono text-xs font-semibold text-slate-800">{r.IdmMaison}</div>
          <div className="text-xs text-slate-500">{r.VilleMaison} ({r.TypeConstructionMaison})</div>
        </div>
      )
    },
    { key: 'MontantLoyer', label: 'Loyer / Caution',
      render: (r: any) => (
        <div>
          <div className="font-bold text-slate-900">{formatFCFA(r.MontantLoyer)}</div>
          <div className="text-xs text-slate-500">Caution: {formatFCFA(r.MontantCaution)}</div>
        </div>
      )
    },
    { key: 'Statut', label: 'Statut',
      render: (r: any) => <StatutBadge statut={r.Statut} />
    },
    { key: 'actions', label: 'Actions',
      render: (r: any) => (
        <div className="flex justify-end gap-1.5">
          <button onClick={() => handlePrint(r)} className="btn btn-secondary btn-sm" title="Télécharger le contrat PDF">📄 PDF</button>
          <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm" title="Modifier">✏️</button>
          <button onClick={() => handleDelete(r.Id || r.id)} className="btn btn-danger btn-sm" title="Supprimer">🗑️</button>
        </div>
      )
    },
  ];

  const activeCount = souscriptions.filter(s => s.Statut === 'Active' || s.statut === 'Active').length;
  const suspendedCount = souscriptions.filter(s => s.Statut === 'Suspendue' || s.statut === 'Suspendue').length;
  const totalCurrent = activeCount + suspendedCount;
  const healthScore = totalCurrent > 0 ? Math.round((activeCount / totalCurrent) * 1000) / 10 : 100;

  let healthLabel = 'Aucun contrat';
  let healthColor = 'text-slate-400';
  if (totalCurrent > 0) {
    if (healthScore >= 90) {
      healthLabel = 'Portefeuille sain';
      healthColor = 'text-blue-600';
    } else if (healthScore >= 70) {
      healthLabel = 'Portefeuille moyen';
      healthColor = 'text-amber-600';
    } else {
      healthLabel = 'Portefeuille critique';
      healthColor = 'text-rose-600';
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Souscriptions & Contrats de Location"
          subtitle="Gestion des contrats de location et suivi des engagements."
          action={
            <button onClick={openCreate} className="btn btn-primary shadow-lg shadow-slate-900/10">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Nouveau Contrat</span>
            </button>
          }
        >
          {/* ─── KPIs Bento (FormsImmoGest Design) ────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass-card rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contrats Actifs</p>
                <h3 className="text-3xl font-display font-bold text-slate-900 mt-1">{souscriptions.length}</h3>
                <span className="text-xs font-semibold text-emerald-600 mt-1 inline-block">✓ Valides</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Renouvellements en Attente</p>
                <h3 className="text-3xl font-display font-bold text-slate-900 mt-1">
                  {souscriptions.filter(s => s.Statut === 'EnAttente').length}
                </h3>
                <span className="text-xs font-semibold text-amber-600 mt-1 inline-block">À traiter</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">hourglass_empty</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Volume Mensuel</p>
                <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">
                  {formatFCFA(souscriptions.reduce((acc, s) => acc + (s.MontantLoyer || 0), 0))}
                </h3>
                <span className="text-xs font-semibold text-emerald-600 mt-1 inline-block">Engagement contractuel</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">trending_up</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score de Santé</p>
                <h3 className="text-3xl font-display font-bold text-slate-900 mt-1">
                  {healthScore}%
                </h3>
                <span className={`text-xs font-semibold mt-1 inline-block ${healthColor}`}>
                  {healthLabel}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
            </div>
          </div>

          <FilterBar onFilterChange={(f) => { setExtraFilters(f); setPage(1); }} />

          {/* Recherche */}
          <div className="card mb-6 p-4">
            <div className="search-bar max-w-md">
              <span className="search-bar-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par IDS, locataire ou bien..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-10"
              />
            </div>
          </div>

          {/* Tableau */}
          <DataTable columns={columns} data={souscriptions} loading={loading} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* ─── Modal Formulaire d'après FormsImmoGest ─────────────────────── */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editItem ? 'Modifier le Contrat de Location' : 'Établir un Nouveau Contrat (Bail)'}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Bien Immobilier (Maison) *</label>
                  <select {...register('MaisonId', { required: true })} className="form-select">
                    {maisons.map((m) => (
                      <option key={m.Id} value={m.Id}>
                        {m.Idm} — {m.Ville} ({m.TypeConstruction}) [{formatFCFA(m.CoutLoyer)}]
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Locataire Occupant *</label>
                  <select {...register('LocataireId', { required: true })} className="form-select">
                    {locataires.map((l) => (
                      <option key={l.Id} value={l.Id}>{l.NomPrenoms} ({l.Contact || 'Sans contact'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Loyer Mensuel (FCFA) *</label>
                  <input type="number" step="1000" {...register('MontantLoyer')} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Caution (FCFA)</label>
                  <input type="number" step="1000" {...register('MontantCaution')} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Avance (FCFA)</label>
                  <input type="number" step="1000" {...register('MontantAvance')} className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Date Début *</label>
                  <input type="date" {...register('DateSouscription', { required: true })} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Durée (mois)</label>
                  <input type="number" min="1" {...register('NbMoisContrat')} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date Fin (facultatif)</label>
                  <input type="date" {...register('DateFin')} className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Conditions particulières / Clauses</label>
                <textarea {...register('Conditions')} className="form-input h-20" placeholder="Clauses spécifiques, état des lieux..." />
              </div>

              <div className="modal-footer -mx-7 -mb-7 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-gold">
                  {editItem ? 'Enregistrer les modifications' : 'Établir le contrat'}
                </button>
              </div>
            </form>
          </Modal>
        </PageWrapper>
      </main>
    </div>
  );
}
