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
    const nomProprietaire = item.NomProprietaire || "Agence Immobilière / Propriétaire";
    const contactProprietaire = item.ContactProprietaire || "—";
    const adresseProprietaire = item.AdresseProprietaire || "—";
    const emailProprietaire = item.EmailProprietaire || "—";

    const nomLocataire = item.NomLocataire || locataire.NomPrenoms || "—";
    const contactLocataire = item.ContactLocataire || locataire.Contact || "—";
    const pieceLocataire = item.PieceIdentiteLocataire || locataire.PieceIdentite || "—";
    const professionLocataire = item.ProfessionLocataire || locataire.Profession || "—";
    const adresseLocataire = item.AdresseLocataire || locataire.Adresse || "—";

    const villeMaison = item.VilleMaison || maison.Ville || "—";
    const typeMaison = item.TypeConstructionMaison || maison.TypeConstruction || "—";
    const piecesMaison = item.NbPiecesMaison || maison.NbPieces || "—";
    const descMaison = item.DescriptionMaison || maison.Description || "Non spécifiée";
    const codeMaison = item.IdmMaison || maison.Idm || "N/A";

    const cautionMois = Math.round(Number(item.MontantCaution || 0) / Number(item.MontantLoyer || 1));
    const avanceMois = Math.round(Number(item.MontantAvance || 0) / Number(item.MontantLoyer || 1));

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Contrat de Bail Conforme Loi 2019-576 — ${item.Ids || 'N/A'}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 25px; font-size: 11px; line-height: 1.4; }
    .page-header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #1a3a5c; padding-bottom: 10px; }
    .page-header h1 { font-size: 16px; font-weight: bold; color: #1a3a5c; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; }
    .page-header p { font-size: 10px; color: #555; margin: 2px 0; font-weight: 500; }
    .law-badge { display: inline-block; background-color: #f0f4f8; border: 1px solid #1a3a5c; color: #1a3a5c; font-size: 9px; font-weight: bold; padding: 3px 8px; margin-top: 5px; border-radius: 3px; }
    .soussignes { font-weight: bold; text-align: center; text-transform: uppercase; margin: 15px 0 10px 0; font-size: 11px; color: #1a3a5c; letter-spacing: 0.5px; }
    
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .partie-box { border: 1px solid #ccc; border-radius: 4px; padding: 10px; background-color: #fafafa; }
    .partie-box h2 { font-size: 10px; font-weight: bold; color: #1a3a5c; margin: 0 0 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px; text-transform: uppercase; }
    .partie-row { display: flex; margin-bottom: 4px; }
    .partie-label { font-weight: bold; width: 120px; color: #555; }
    .partie-value { flex: 1; }

    .transition-text { text-align: center; font-weight: bold; margin: 15px 0; font-size: 10px; color: #333; text-transform: uppercase; }
    
    .article { margin-bottom: 12px; border-left: 2.5px solid #1a3a5c; padding-left: 8px; }
    .article h3 { font-size: 10.5px; font-weight: bold; color: #1a3a5c; margin: 0 0 4px 0; text-transform: uppercase; }
    .article p { margin: 0 0 4px 0; text-align: justify; }
    .article ul { margin: 2px 0; padding-left: 15px; }
    .article li { margin-bottom: 2px; }

    .law-note { background-color: #fff9e6; border: 1px solid #ffe0b2; color: #b78103; padding: 6px; border-radius: 4px; font-size: 9px; margin-bottom: 10px; line-height: 1.3; }

    .signatures-section { margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px; }
    .signatures-intro { font-size: 10px; font-style: italic; margin-bottom: 15px; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .signature-box { border: 1px solid #eee; border-radius: 4px; padding: 10px; min-height: 90px; text-align: center; position: relative; }
    .signature-box h4 { font-size: 10px; font-weight: bold; color: #1a3a5c; margin: 0 0 5px 0; text-transform: uppercase; }
    .signature-box p.instructions { font-size: 8px; color: #888; font-style: italic; margin-bottom: 30px; }
    .signature-placeholder { border-top: 1px dashed #ccc; width: 80%; margin: 40px auto 0 auto; padding-top: 5px; font-size: 8px; color: #999; }

    .footer { text-align: center; margin-top: 30px; font-size: 8px; color: #777; border-top: 1px solid #eee; padding-top: 5px; }

    @media print {
      body { padding: 15px; font-size: 10.5px; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>

  <div class="page-header">
    <h1>CONTRAT DE BAIL À USAGE D'HABITATION</h1>
    <p>République de Côte d'Ivoire — Union · Discipline · Travail</p>
    <div class="law-badge">Régie par la Loi n° 2019-576 du 26 juin 2019</div>
  </div>

  <div class="soussignes">Entre les soussignés :</div>

  <div class="parties-grid">
    <div class="partie-box">
      <h2>1. LE BAILLEUR (PROPRIÉTAIRE)</h2>
      <div class="partie-row"><div class="partie-label">Nom / Raison Sociale :</div><div class="partie-value">${nomProprietaire}</div></div>
      <div class="partie-row"><div class="partie-label">Date & Lieu Nais. :</div><div class="partie-value">________________________</div></div>
      <div class="partie-row"><div class="partie-label">Nationalité :</div><div class="partie-value">Ivoirienne</div></div>
      <div class="partie-row"><div class="partie-label">Pièce d'Identité :</div><div class="partie-value">________________________</div></div>
      <div class="partie-row"><div class="partie-label">Adresse :</div><div class="partie-value">${adresseProprietaire}</div></div>
      <div class="partie-row"><div class="partie-label">Téléphone :</div><div class="partie-value">${contactProprietaire}</div></div>
      <div class="partie-row"><div class="partie-label">Email :</div><div class="partie-value">${emailProprietaire}</div></div>
      <div class="partie-row"><div class="partie-label">Représenté par :</div><div class="partie-value">Agence Immobilière</div></div>
    </div>

    <div class="partie-box">
      <h2>2. LE LOCATAIRE (PRENEUR)</h2>
      <div class="partie-row"><div class="partie-label">Nom & Prénoms :</div><div class="partie-value">${nomLocataire}</div></div>
      <div class="partie-row"><div class="partie-label">Date & Lieu Nais. :</div><div class="partie-value">________________________</div></div>
      <div class="partie-row"><div class="partie-label">Nationalité :</div><div class="partie-value">________________________</div></div>
      <div class="partie-row"><div class="partie-label">Pièce d'Identité :</div><div class="partie-value">${pieceLocataire}</div></div>
      <div class="partie-row"><div class="partie-label">Profession / Emp. :</div><div class="partie-value">${professionLocataire}</div></div>
      <div class="partie-row"><div class="partie-label">Adresse Domicile :</div><div class="partie-value">${adresseLocataire}</div></div>
      <div class="partie-row"><div class="partie-label">Téléphone :</div><div class="partie-value">${contactLocataire}</div></div>
      <div class="partie-row"><div class="partie-label">Email :</div><div class="partie-value">________________________</div></div>
    </div>
  </div>

  <div class="transition-text">Il a été convenu et arrêté ce qui suit :</div>

  <div class="article">
    <h3>Article 1 : Objet du contrat et désignation des lieux</h3>
    <p>Le Bailleur donne à bail à usage exclusif d'habitation au Locataire, qui accepte, l'immeuble/logement désigné ci-après :</p>
    <ul>
      <li><strong>Situation géographique :</strong> Ville de <u>${villeMaison}</u>, Commune de <u>_________________</u>, Quartier <u>_________________</u>, Code Bien <u>${codeMaison}</u>.</li>
      <li><strong>Description du logement :</strong> Un bien de type <u>${typeMaison}</u> comprenant <u>${piecesMaison}</u> pièce(s) principale(s). Description : <i>${descMaison}</i>.</li>
      <li><strong>Compteurs :</strong> Électricité CIE N° <u>___________________</u> | Eau SODECI N° <u>___________________</u>.</li>
      <li><strong>Destination :</strong> Exclusivité d'habitation principale à l'exclusion de tout usage commercial ou professionnel.</li>
    </ul>
  </div>

  <div class="article">
    <h3>Article 2 : Durée et prise d'effet</h3>
    <p>Le présent contrat est conclu pour une durée de <u>${item.NbMoisContrat || 12}</u> mois, à compter du <strong>${dateDebut}</strong> pour se terminer le <strong>${dateFin}</strong>. Il se renouvellera ensuite par tacite reconduction pour une durée égale, sauf congé délivré dans les conditions prévues au présent contrat.</p>
  </div>

  <div class="article">
    <h3>Article 3 : Loyer et charges locatives</h3>
    <p>Le loyer mensuel principal est fixé à la somme de <strong>${Number(item.MontantLoyer || 0).toLocaleString('fr-FR')} FCFA</strong>. Les charges communes mensuelles (nettoyage, ordures) sont fixées à <strong>0 FCFA</strong>. Le montant total mensuel est payable d'avance au plus tard le <strong>5</strong> de chaque mois contre délivrance systématique d'une quittance de loyer signée par le Bailleur.</p>
    <div class="law-note">
      <strong>Révision du loyer (Article 32 de la loi) :</strong> Le loyer ne peut faire l'objet d'aucune révision avant un délai minimal de trois (3) ans, sauf travaux d'amélioration significatifs réalisés par le bailleur.
    </div>
  </div>

  <div class="page-break"></div>

  <div class="article">
    <h3>Article 4 : Dépôt de garantie et avances de loyer</h3>
    <p>À la signature du présent contrat, le Locataire verse au Bailleur les sommes suivantes conformément aux plafonds fixés par la Loi n° 2019-576 :</p>
    <ul>
      <li><strong>Dépôt de garantie (Caution) :</strong> <strong>${Number(item.MontantCaution || 0).toLocaleString('fr-FR')} FCFA</strong> (soit <u>${cautionMois || 2}</u> mois de loyer - max 2 mois autorisés).</li>
      <li><strong>Avance de loyer :</strong> <strong>${Number(item.MontantAvance || 0).toLocaleString('fr-FR')} FCFA</strong> (soit <u>${avanceMois || 1}</u> mois de loyer - max 2 mois autorisés).</li>
    </ul>
    <p>Le dépôt de garantie sera restitué au Locataire dans un délai maximal d'un (1) mois à compter de la remise des clés et de l'état des lieux de sortie, déduction faite des créances locatives ou frais de remise en état imputables au Locataire.</p>
  </div>

  <div class="article">
    <h3>Article 5 : État des lieux</h3>
    <p>Un état des lieux contradictoire est dressé à la remise des clés (entrée) et lors de la restitution des locaux (sortie). Cet acte est signé par les deux parties et annexé obligatoirement au présent contrat.</p>
  </div>

  <div class="article">
    <h3>Article 6 : Obligations du bailleur</h3>
    <p>Le Bailleur s'oblige à :</p>
    <ul>
      <li>Délivrer le logement en bon état d'usage, d'étanchéité, de sécurité et de salubrité.</li>
      <li>Assurer au Locataire la jouissance paisible des locaux pendant toute la durée du bail.</li>
      <li>Prendre en charge les gros travaux et réparations majeures (structure, toiture, assainissement lourd, étanchéité).</li>
      <li>Délivrer gratuitement et sans frais une quittance écrite pour chaque paiement reçu.</li>
    </ul>
  </div>

  <div class="article">
    <h3>Article 7 : Obligations du locataire</h3>
    <p>Le Locataire s'oblige à :</p>
    <ul>
      <li>Payer le loyer et les charges aux échéances convenues.</li>
      <li>User paisiblement du logement selon sa destination exclusive d'habitation.</li>
      <li>Assurer l'entretien courant du logement et effectuer les menues réparations locatives.</li>
      <li>Ne pas transformer les lieux sans l'accord écrit préalable du Bailleur.</li>
      <li><strong>Cession & Sous-location :</strong> Ne pas céder le bail ni sous-louer tout ou partie du logement sans l'accord écrit du Bailleur.</li>
    </ul>
  </div>

  <div class="article">
    <h3>Article 8 : Congé, résiliation et préavis</h3>
    <ul>
      <li><strong>Préavis ordinaire :</strong> Chaque partie peut résilier le contrat en notifiant à l'autre un préavis écrit de <strong>trois (3) mois</strong> par lettre recommandée ou acte de Commissaire de Justice (Huissier).</li>
      <li><strong>Inexécution :</strong> En cas de non-paiement du loyer ou d'inexécution d'une obligation, le Bailleur délivre un commandement de payer par huissier. À défaut de régularisation dans un délai d'un (1) mois, le Bailleur pourra saisir la juridiction compétente. Toute expulsion forcée hors décision de justice est strictement interdite.</li>
    </ul>
  </div>

  <div class="article">
    <h3>Article 9 : Enregistrement fiscal</h3>
    <p>Le présent contrat sera enregistré par le Bailleur ou son mandataire auprès des services compétents de la Direction Générale des Impôts (DGI) de Côte d'Ivoire dans le délai légal d'un (1) mois à compter de sa signature.</p>
  </div>

  <div class="article">
    <h3>Article 10 : Élection de domicile et litiges</h3>
    <p>Pour l'exécution des présentes, le Bailleur élit domicile à son adresse sus-indiquée et le Locataire dans les lieux loués. En cas de différend, les parties s'engagent à privilégier un règlement amiable. À défaut, le litige sera soumis au Tribunal de Première Instance compétent du lieu de situation de l'immeuble.</p>
  </div>

  <div class="signatures-section">
    <div class="signatures-intro">
      Fait à <u>${villeMaison}</u>, le <u>${dateNow}</u>, en 3 exemplaires originaux (un pour chaque partie et un pour l'enregistrement fiscal).
    </div>
    <div class="signatures-grid">
      <div class="signature-box">
        <h4>LE BAILLEUR</h4>
        <p class="instructions">("Lu et approuvé" écrit à la main + Signature)</p>
        <div class="signature-placeholder">Emplacement signature Bailleur</div>
      </div>
      <div class="signature-box">
        <h4>LE LOCATEUR (LOCATAIRE)</h4>
        <p class="instructions">("Lu et approuvé" écrit à la main + Signature)</p>
        <div class="signature-placeholder">Emplacement signature Locataire</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Modèle de contrat de bail à usage d'habitation conforme à la Loi n° 2019-576 du 26 juin 2019 (République de Côte d'Ivoire). Réf. contrat : ${item.Ids || 'N/A'}.
  </div>

</body>
</html>`;>
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
