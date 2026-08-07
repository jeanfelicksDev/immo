import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined') {
      return new NextResponse('ID invalide', { status: 400 });
    }

    const sql = `
      SELECT s.id, s.ids, s.maison_id, m.idm AS code_maison, m.ville, m.type_construction, m.cout_loyer,
             m.nb_pieces AS nb_pieces, m.description AS description_maison,
             l.nom_prenoms AS nom_locataire, l.contact AS contact_locataire, l.piece_identite AS piece_locataire, l.profession AS profession_locataire, l.adresse AS adresse_locataire,
             p.nom_prenoms AS nom_proprietaire, p.contact AS contact_proprietaire, p.email AS email_proprietaire, p.adresse AS adresse_proprietaire,
             s.date_souscription, s.date_fin, s.montant_loyer, s.montant_caution, s.montant_avance, s.nb_mois_contrat
      FROM immogest.souscriptions s
      JOIN immogest.maisons m ON s.maison_id = m.id
      JOIN immogest.locataires l ON s.locataire_id = l.id
      JOIN immogest.proprietaires p ON m.proprietaire_id = p.id
      WHERE s.id = $1
    `;

    const { rows } = await query(sql, [id]);
    if (rows.length === 0) {
      return new NextResponse('Contrat introuvable', { status: 404 });
    }

    const data = rows[0];

    // Creation du PDF avec pdf-lib
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const height = 841.89;
    let y = height - 50;

    const drawText = (text: string, options: any = {}) => {
      const f = options.bold ? fontBold : (options.italic ? fontOblique : font);
      const size = options.size || 9;
      const x = options.x || 50;
      
      if (y - size < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      
      page.drawText(text, { x, y: y - size, size, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= size + (options.margin || 4);
    };

    // Entete
    drawText('CONTRAT DE BAIL À USAGE D\'HABITATION', { size: 14, bold: true, x: 150, margin: 5 });
    drawText('République de Côte d\'Ivoire — Union · Discipline · Travail', { size: 8, x: 175, margin: 5 });
    drawText('Régie par la Loi n° 2019-576 du 26 juin 2019', { size: 9, bold: true, x: 185, margin: 20 });

    drawText('ENTRE LES SOUSSIGNÉS :', { size: 11, bold: true, x: 50, margin: 10 });
    
    // Bailleur
    drawText('1. LE BAILLEUR (PROPRIÉTAIRE OU REPRÉSENTANT LÉGAL)', { size: 10, bold: true, margin: 6 });
    drawText(`• Nom et Prénoms / Raison Sociale : ${data.nom_proprietaire || 'Agence Immobilière'}`, { x: 70 });
    drawText(`• Adresse Domiciliaire : ${data.adresse_proprietaire || '—'}`, { x: 70 });
    drawText(`• Téléphone : ${data.contact_proprietaire || '—'} | Email : ${data.email_proprietaire || '—'}`, { x: 70 });
    drawText('• Représenté par : Agence Immobilière / Mandataire', { x: 70, margin: 12 });

    // Locataire
    drawText('2. LE LOCATAIRE (PRENEUR)', { size: 10, bold: true, margin: 6 });
    drawText(`• Nom et Prénoms : ${data.nom_locataire || '—'}`, { x: 70 });
    drawText(`• Pièce d'Identité : ${data.piece_locataire || '—'}`, { x: 70 });
    drawText(`• Profession / Employeur : ${data.profession_locataire || '—'}`, { x: 70 });
    drawText(`• Téléphone : ${data.contact_locataire || '—'}`, { x: 70 });
    drawText(`• Adresse de Domicile : ${data.adresse_locataire || '—'}`, { x: 70, margin: 15 });

    drawText('IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :', { size: 11, bold: true, margin: 15 });

    // Article 1
    drawText('ARTICLE 1 : OBJET DU CONTRAT ET DÉSIGNATION DES LIEUX', { size: 10, bold: true, margin: 6 });
    drawText('Le Bailleur donne à bail à usage exclusif d\'habitation au Locataire, qui accepte, l\'immeuble/logement désigné ci-après :', { x: 50 });
    drawText(`• Situation géographique : Ville de ${data.ville || '—'}, Commune de ____________, Quartier ____________`, { x: 70 });
    drawText(`• Description du logement : Type ${data.type_construction || '—'} de ${data.nb_pieces || '—'} pièces. (${data.description_maison || 'Non spécifiée'})`, { x: 70 });
    drawText(`• Compteurs : Électricité CIE N° ________________ | Eau SODECI N° ________________`, { x: 70 });
    drawText('• Destination : Exclusivité d\'habitation principale à l\'exclusion de tout usage commercial ou professionnel.', { x: 70, margin: 12 });

    // Article 2
    drawText('ARTICLE 2 : DURÉE ET PRISE D\'EFFET', { size: 10, bold: true, margin: 6 });
    const dateDebut = data.date_souscription ? new Date(data.date_souscription).toLocaleDateString('fr-FR') : '—';
    const dateFin = data.date_fin ? new Date(data.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée';
    drawText(`Le présent contrat est conclu pour une durée de ${data.nb_mois_contrat || 12} mois, à compter du ${dateDebut} pour se terminer`, { x: 50 });
    drawText(`le ${dateFin}. Il se renouvellera ensuite par tacite reconduction pour une durée égale.`, { x: 50, margin: 12 });

    // Article 3
    drawText('ARTICLE 3 : LOYER ET CHARGES LOCATIVES', { size: 10, bold: true, margin: 6 });
    drawText(`Le loyer mensuel principal est fixé à la somme de : ${Number(data.montant_loyer || 0).toLocaleString('fr-FR')} FCFA.`, { x: 50 });
    drawText('Les charges communes mensuelles (nettoyage, ordures) sont fixées à : 0 FCFA.', { x: 50 });
    drawText('Le montant total mensuel est payable d\'avance au plus tard le 5 de chaque mois contre délivrance de quittance.', { x: 50 });
    drawText('Note Loi : Le loyer ne peut faire l\'objet d\'aucune révision avant un délai minimal de trois (3) ans.', { x: 50, italic: true, margin: 12 });

    // Article 4
    drawText('ARTICLE 4 : DÉPÔT DE GARANTIE ET AVANCES DE LOYER', { size: 10, bold: true, margin: 6 });
    const cautionMois = Math.round(Number(data.montant_caution || 0) / Number(data.montant_loyer || 1));
    const avanceMois = Math.round(Number(data.montant_avance || 0) / Number(data.montant_loyer || 1));
    drawText(`• Dépôt de garantie (Caution) : ${Number(data.montant_caution || 0).toLocaleString('fr-FR')} FCFA (correspondant à ${cautionMois} mois, max 2).`, { x: 70 });
    drawText(`• Avance de loyer : ${Number(data.montant_avance || 0).toLocaleString('fr-FR')} FCFA (correspondant à ${avanceMois} mois, max 2).`, { x: 70 });
    drawText('Le dépôt de garantie sera restitué dans un délai max d\'un (1) mois à compter de la remise des clés et de l\'état des lieux.', { x: 50, margin: 12 });

    // Article 5
    drawText('ARTICLE 5 : ÉTAT DES LIEUX', { size: 10, bold: true, margin: 6 });
    drawText('Un état des lieux contradictoire est dressé à la remise des clés (entrée) et lors de la restitution des locaux (sortie).', { x: 50, margin: 12 });

    // Article 6
    drawText('ARTICLE 6 : OBLIGATIONS DU BAILLEUR', { size: 10, bold: true, margin: 6 });
    drawText('• Délivrer le logement en bon état d\'usage, d\'étanchéité, de sécurité et de salubrité.', { x: 70 });
    drawText('• Assurer au Locataire la jouissance paisible des locaux pendant toute la durée du bail.', { x: 70 });
    drawText('• Prendre en charge les gros travaux et réparations majeures (structure, toiture, assainissement).', { x: 70, margin: 12 });

    // Article 7
    drawText('ARTICLE 7 : OBLIGATIONS DU LOCATAIRE', { size: 10, bold: true, margin: 6 });
    drawText('• Payer le loyer et les charges aux échéances convenues.', { x: 70 });
    drawText('• User paisiblement du logement selon sa destination exclusive d\'habitation.', { x: 70 });
    drawText('• Assurer l\'entretien courant du logement et effectuer les menues réparations locatives.', { x: 70 });
    drawText('• Cession & Sous-location : Interdiction de sous-louer sans accord écrit préalable du Bailleur.', { x: 70, margin: 12 });

    // Article 8
    drawText('ARTICLE 8 : CONGÉ, RÉSILIATION ET PRÉAVIS', { size: 10, bold: true, margin: 6 });
    drawText('• Préavis ordinaire : Préavis écrit de trois (3) mois par lettre recommandée ou exploit d\'huissier.', { x: 70 });
    drawText('• Inexécution : En cas de non-paiement, commandement par huissier avec délai d\'un (1) mois avant action en justice.', { x: 70, margin: 12 });

    // Article 9 et 10
    drawText('ARTICLE 9 : ENREGISTREMENT FISCAL', { size: 10, bold: true, margin: 6 });
    drawText('Le présent contrat sera enregistré auprès de la Direction Générale des Impôts (DGI) dans le délai légal d\'un mois.', { x: 50, margin: 12 });

    drawText('ARTICLE 10 : ÉLECTION DE DOMICILE ET LITIGES', { size: 10, bold: true, margin: 6 });
    drawText('Élection de domicile aux adresses indiquées. Litiges soumis au Tribunal de Première Instance compétent.', { x: 50, margin: 25 });

    // Signatures
    drawText(`Fait à ${data.ville || '—'}, le ${new Date().toLocaleDateString('fr-FR')}, en 3 exemplaires originaux.`, { italic: true, margin: 20 });
    
    const signatureY = y;
    drawText('LE BAILLEUR', { bold: true, x: 80, margin: 2 });
    drawText('("Lu et approuvé" + Signature)', { size: 7, x: 75, margin: 2 });
    
    y = signatureY;
    drawText('LE LOCATEUR (LOCATAIRE)', { bold: true, x: 380, margin: 2 });
    drawText('("Lu et approuvé" + Signature)', { size: 7, x: 385, margin: 2 });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contrat_${data.ids || id}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error('Erreur GET /api/souscriptions/[id]/print:', error);
    return new NextResponse('Erreur de generation PDF', { status: 500 });
  }
}
