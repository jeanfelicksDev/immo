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
    const timeNow = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
  <title>Contrat de Bail Officiel — ${item.Ids || 'N/A'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Lora:ital,wght@0,400..600;1,400..600&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: 'Montserrat', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 15mm 20mm;
      font-size: 10.5px;
      line-height: 1.5;
      background-color: #fff;
      box-sizing: border-box;
    }
    .custom-print-header {
      position: fixed;
      top: 10mm;
      left: 20mm;
      right: 20mm;
      display: flex;
      justify-content: space-between;
      font-family: 'Montserrat', sans-serif;
      font-size: 7.5px;
      font-weight: 500;
      color: #94a3b8;
      border-bottom: 0.5px solid #e2e8f0;
      padding-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      z-index: 9999;
    }
    .print-layout-table {
      width: 100%;
      border-collapse: collapse;
    }
    .print-header-spacer {
      height: 12mm;
    }
    
    /* Header & Title */
    .contract-header {
      text-align: center;
      margin-bottom: 25px;
      position: relative;
    }
    .republique-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .republique-devise {
      font-size: 7.5px;
      font-style: italic;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .decor-line {
      width: 60px;
      height: 1px;
      background-color: #d97706;
      margin: 8px auto;
    }
    .contract-title {
      font-family: 'Cinzel', serif;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 10px 0;
      letter-spacing: 1px;
      line-height: 1.2;
    }
    .law-badge {
      display: inline-block;
      background-color: #0f172a;
      border: 1px solid #d97706;
      color: #fef08a;
      font-size: 8.5px;
      font-weight: 600;
      padding: 4px 12px;
      margin-top: 5px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    .preamble {
      text-align: center;
      font-family: 'Lora', serif;
      font-style: italic;
      font-size: 11px;
      color: #0f172a;
      margin: 20px 0 15px 0;
      font-weight: 600;
    }
    
    /* Parties Section */
    .parties-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .party-card {
      border: 1px solid #e2e8f0;
      border-top: 3px solid #0f172a;
      background-color: #fafaf9;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .party-card h2 {
      font-family: 'Cinzel', serif;
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px 0;
      padding-bottom: 4px;
      border-bottom: 1px double #cbd5e1;
      letter-spacing: 0.5px;
    }
    .party-row {
      display: flex;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .party-label {
      font-weight: 600;
      width: 100px;
      color: #475569;
    }
    .party-value {
      flex: 1;
      color: #0f172a;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 1px;
    }
    
    .transition-clause {
      text-align: center;
      font-family: 'Cinzel', serif;
      font-weight: 700;
      font-size: 10px;
      color: #d97706;
      margin: 20px 0;
      letter-spacing: 1px;
    }
    
    /* Articles formatting */
    .article {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .article-title {
      font-family: 'Lora', serif;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
      text-transform: uppercase;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 3px;
      display: flex;
      align-items: center;
    }
    .article-title::before {
      content: "•";
      color: #d97706;
      font-size: 14px;
      margin-right: 6px;
    }
    .article p {
      margin: 0 0 6px 0;
      text-align: justify;
      color: #334155;
    }
    .article ul {
      margin: 4px 0;
      padding-left: 20px;
    }
    .article li {
      margin-bottom: 3px;
      color: #334155;
    }
    .article u {
      text-underline-offset: 2px;
      color: #0f172a;
      font-weight: 500;
    }
    
    .law-note-box {
      background-color: #fefcf5;
      border-left: 3px solid #d97706;
      border-right: 1px solid #fef08a;
      border-top: 1px solid #fef08a;
      border-bottom: 1px solid #fef08a;
      color: #854d0e;
      padding: 8px 12px;
      font-size: 9px;
      margin-top: 8px;
      margin-bottom: 8px;
      text-align: justify;
    }
    
    /* Signatures Section */
    .signatures-block {
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      page-break-inside: avoid;
    }
    .signatures-place {
      font-size: 10px;
      font-style: italic;
      color: #475569;
      margin-bottom: 15px;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .signature-card {
      border: 1px solid #f1f5f9;
      background-color: #f8fafc;
      padding: 15px;
      min-height: 100px;
      text-align: center;
      position: relative;
    }
    .signature-card h4 {
      font-family: 'Cinzel', serif;
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: 0.5px;
    }
    .signature-card .handwritten-hint {
      font-size: 8px;
      color: #64748b;
      font-style: italic;
      margin-bottom: 25px;
    }
    .signature-line {
      border-top: 1px dashed #cbd5e1;
      width: 70%;
      margin: 45px auto 0 auto;
      padding-top: 4px;
      font-size: 8px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    
    .document-footer {
      text-align: center;
      margin-top: 35px;
      font-size: 8px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
      letter-spacing: 0.5px;
    }
    
    @media print {
      body {
        font-size: 10px;
        color: #000;
      }
      .page-break {
        page-break-before: always;
      }
      .party-card {
        background-color: transparent !important;
        border: 1px solid #000;
      }
      .signature-card {
        background-color: transparent !important;
        border: 1px solid #ddd;
      }
      .law-note-box {
        background-color: transparent !important;
        border: 1px solid #999;
      }
    }
  </style>
</head>
<body>

  <!-- En-tête Montserrat personnalisé récurrent sur chaque page -->
  <div class="custom-print-header">
    <span>Le ${dateNow} à ${timeNow}</span>
    <span>Contrat de Bail Officiel — ${item.Ids || 'N/A'}</span>
  </div>

  <table class="print-layout-table">
    <thead>
      <tr>
        <td>
          <div class="print-header-spacer"></div>
        </td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>

          <div class="contract-header">
            <div class="republique-title">République de Côte d'Ivoire</div>
    <div class="republique-devise">Union · Discipline · Travail</div>
    <div class="decor-line"></div>
    <h1 class="contract-title">CONTRAT DE BAIL À USAGE D'HABITATION</h1>
    <div class="law-badge">Réglementé par la Loi n° 2019-576 du 26 juin 2019</div>
  </div>

  <div class="preamble">Entre les soussignés dûment identifiés :</div>

  <div class="parties-container">
    <div class="party-card">
      <h2>1. LE BAILLEUR (PROPRIÉTAIRE)</h2>
      <div class="party-row"><div class="party-label">Nom complet :</div><div class="party-value">${nomProprietaire}</div></div>
      <div class="party-row"><div class="party-label">Né(e) le / à :</div><div class="party-value">________________________</div></div>
      <div class="party-row"><div class="party-label">Nationalité :</div><div class="party-value">Ivoirienne</div></div>
      <div class="party-row"><div class="party-label">Pièce d'Identité :</div><div class="party-value">________________________</div></div>
      <div class="party-row"><div class="party-label">Adresse :</div><div class="party-value">${adresseProprietaire}</div></div>
      <div class="party-row"><div class="party-label">Téléphone :</div><div class="party-value">${contactProprietaire}</div></div>
      <div class="party-row"><div class="party-label">Adresse Email :</div><div class="party-value">${emailProprietaire}</div></div>
      <div class="party-row"><div class="party-label">Représenté par :</div><div class="party-value">Agence Immobilière Mandataire</div></div>
    </div>

    <div class="party-card">
      <h2>2. LE LOCATAIRE (PRENEUR)</h2>
      <div class="party-row"><div class="party-label">Nom complet :</div><div class="party-value">${nomLocataire}</div></div>
      <div class="party-row"><div class="party-label">Né(e) le / à :</div><div class="party-value">________________________</div></div>
      <div class="party-row"><div class="party-label">Nationalité :</div><div class="party-value">________________________</div></div>
      <div class="party-row"><div class="party-label">Pièce d'Identité :</div><div class="party-value">${pieceLocataire}</div></div>
      <div class="party-row"><div class="party-label">Profession / Emp. :</div><div class="party-value">${professionLocataire}</div></div>
      <div class="party-row"><div class="party-label">Adresse Domicile :</div><div class="party-value">${adresseLocataire}</div></div>
      <div class="party-row"><div class="party-label">Téléphone :</div><div class="party-value">${contactLocataire}</div></div>
      <div class="party-row"><div class="party-label">Adresse Email :</div><div class="party-value">________________________</div></div>
    </div>
  </div>

  <div class="transition-clause">Il a été expressément convenu et arrêté les clauses suivantes :</div>

  <div class="article">
    <h3 class="article-title">Article 1 : Objet du contrat et désignation des lieux</h3>
    <p>Le Bailleur donne à bail à usage exclusif d'habitation au Locataire, qui accepte, le logement décrit ci-après :</p>
    <ul>
      <li><strong>Situation géographique :</strong> Ville de <u>${villeMaison}</u>, Commune de <u>_________________</u>, Quartier <u>_________________</u>, Code Unique Bien <u>${codeMaison}</u>.</li>
      <li><strong>Description :</strong> Bien immobilier de type <u>${typeMaison}</u> de <u>${piecesMaison}</u> pièces principales. Description technique : <i>${descMaison}</i>.</li>
      <li><strong>Compteurs administratifs :</strong> Électricité CIE N° <u>___________________</u> | Eau SODECI N° <u>___________________</u>.</li>
      <li><strong>Destination exclusive :</strong> Le logement est destiné uniquement à l'habitation principale du Locataire et de sa famille, excluant toute activité commerciale, professionnelle ou libérale.</li>
    </ul>
  </div>

  <div class="article">
    <h3 class="article-title">Article 2 : Durée du bail et prise d'effet</h3>
    <p>Le présent contrat est conclu pour une durée déterminée de <strong><u>${item.NbMoisContrat || 12}</u> mois</strong>, à compter du <strong>${dateDebut}</strong> pour se terminer le <strong>${dateFin}</strong>. Il se renouvellera ensuite par tacite reconduction pour une durée égale, sauf congé préalablement signifié.</p>
  </div>

  <div class="article">
    <h3 class="article-title">Article 3 : Conditions financières (Loyer et charges)</h3>
    <p>Le loyer mensuel principal et net est fixé d'accord parties à la somme de <strong>${Number(item.MontantLoyer || 0).toLocaleString('fr-FR')} FCFA</strong>. Les charges communes (ordures, entretien) sont fixées à <strong>0 FCFA</strong>. Le loyer global est payable d'avance au plus tard le <strong>5</strong> de chaque mois civil contre quittance obligatoire signée par le Bailleur.</p>
    <div class="law-note-box">
      <strong>Réglementation sur la Révision (Art. 32 de la loi 2019-576) :</strong> Le montant du loyer ne peut subir de révision ou d'ajustement avant l'expiration d'un délai minimal de trois (3) ans à compter de la signature, sauf travaux d'amélioration importants réalisés par le bailleur en concertation avec le locataire.
    </div>
  </div>

  <div class="article">
    <h3 class="article-title">Article 4 : Dépôt de garantie et avances sur loyer</h3>
    <p>À titre de garantie de l'exécution de ses obligations, le Locataire verse à la signature les sommes suivantes plafonnées par la loi :</p>
    <ul>
      <li><strong>Dépôt de garantie (Caution) :</strong> <strong>${Number(item.MontantCaution || 0).toLocaleString('fr-FR')} FCFA</strong> (soit <u>${cautionMois || 2}</u> mois de loyer - maximum légal de 2 mois).</li>
      <li><strong>Avance de loyer :</strong> <strong>${Number(item.MontantAvance || 0).toLocaleString('fr-FR')} FCFA</strong> (soit <u>${avanceMois || 1}</u> mois d'avance - maximum légal de 2 mois).</li>
    </ul>
    <p>Le dépôt de garantie sera restitué au Locataire dans un délai maximum d'un (1) mois à compter de la restitution des clés, après déduction faite des réparations locatives justifiées et éventuels impayés.</p>
  </div>

  <div class="page-break"></div>

  <div class="article">
    <h3 class="article-title">Article 5 : État des lieux d'entrée et de sortie</h3>
    <p>Un état des lieux contradictoire et écrit est établi obligatoirement lors de la remise des clés au Locataire, puis lors de la libération des locaux. Cet état des lieux est paraphé et annexé aux présentes.</p>
  </div>

  <div class="article">
    <h3 class="article-title">Article 6 : Obligations générales du Bailleur</h3>
    <p>Le Bailleur est tenu aux obligations principales suivantes :</p>
    <ul>
      <li>Délivrer un logement décent en bon état de réparation, de propreté et d'étanchéité.</li>
      <li>Assurer au Locataire une jouissance paisible des locaux et le garantir des vices cachés.</li>
      <li>Effectuer à ses frais exclusifs les grosses réparations de structure et de maintien en état (gros œuvre, toiture, réseaux).</li>
      <li>Délivrer gratuitement une quittance de loyer pour chaque règlement effectué par le Locataire.</li>
    </ul>
  </div>

  <div class="article">
    <h3 class="article-title">Article 7 : Obligations générales du Locataire</h3>
    <p>Le Locataire est tenu aux obligations principales suivantes :</p>
    <ul>
      <li>Régler ponctuellement le loyer principal et les charges aux échéances convenues.</li>
      <li>User paisiblement des locaux loués selon leur destination contractuelle d'habitation.</li>
      <li>Prendre à sa charge l'entretien courant du logement et les menues réparations locatives.</li>
      <li>Ne faire aucun changement de distribution ou transformation sans l'accord écrit du Bailleur.</li>
      <li><strong>Interdiction absolue :</strong> Ne pas céder le présent droit au bail, ni sous-louer le logement sans le consentement écrit préalable du Bailleur.</li>
    </ul>
  </div>

  <div class="article">
    <h3 class="article-title">Article 8 : Résiliation du contrat et clause résolutoire</h3>
    <ul>
      <li><strong>Préavis ordinaire :</strong> Chacune des parties peut résilier le contrat en notifiant sa décision avec un préavis écrit de <strong>trois (3) mois</strong> par exploit de commissaire de justice ou lettre recommandée.</li>
      <li><strong>Clause résolutoire :</strong> En cas de non-paiement du loyer ou de violation grave des conditions, le présent contrat sera résilié de plein droit un (1) mois après un commandement de payer ou une mise en demeure demeurés infructueux.</li>
    </ul>
  </div>

  <div class="article">
    <h3 class="article-title">Article 9 : Formalités d'enregistrement fiscal</h3>
    <p>Le présent bail sera obligatoirement soumis à l'enregistrement fiscal par le Bailleur auprès des services de la Direction Générale des Impôts (DGI) compétents, conformément aux délais et taxes légaux.</p>
  </div>

  <div class="article">
    <h3 class="article-title">Article 10 : Élection de domicile et attribution de juridiction</h3>
    <p>Les parties élisent domicile : le Bailleur à son adresse sus-mentionnée, et le Locataire dans les lieux loués. En cas de contestation sur l'exécution des présentes, et à défaut de résolution amiable, compétence exclusive est attribuée aux tribunaux civils du lieu de situation de l'immeuble.</p>
  </div>

  <div class="signatures-block">
    <div class="signatures-place">
      Fait à <u>${villeMaison}</u>, le <u>${dateNow}</u>, rédigé en trois (3) exemplaires originaux et signés de bonne foi.
    </div>
    <div class="signatures-grid">
      <div class="signature-card">
        <h4>LE BAILLEUR (PROPRIÉTAIRE)</h4>
        <div class="handwritten-hint">Mention manuscrite "Lu et approuvé" + Signature</div>
        <div class="signature-line">Signature & Cachet</div>
      </div>
      <div class="signature-card">
        <h4>LE LOCATAIRE (PRENEUR)</h4>
        <div class="handwritten-hint">Mention manuscrite "Lu et approuvé" + Signature</div>
        <div class="signature-line">Signature du Preneur</div>
      </div>
    </div>
  </div>

  <div class="document-footer">
    Contrat de bail à usage d'habitation conforme à la Loi n° 2019-576 (Côte d'Ivoire). ID Contrat : ${item.Ids || 'N/A'} — Document officiel généré par la plateforme ImmoGest.
  </div>

        </td>
      </tr>
    </tbody>
  </table>

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
    if (typeof window !== 'undefined' && !window.confirm('Voulez-vous vraiment résilier/supprimer ce contrat ?')) return;

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
