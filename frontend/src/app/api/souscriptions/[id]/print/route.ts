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

    // Couleurs de la charte premium
    const cPrimary = rgb(15 / 255, 23 / 255, 42 / 255); // #0f172a (Bleu nuit)
    const cAccent = rgb(217 / 255, 119 / 255, 6 / 255);  // #d97706 (Or/Ambre)
    const cText = rgb(51 / 255, 65 / 255, 85 / 255);    // #334155 (Gris texte)

    const drawText = (text: string, options: any = {}) => {
      const f = options.bold ? fontBold : (options.italic ? fontOblique : font);
      const size = options.size || 8.5;
      const x = options.x || 50;
      const color = options.color || (options.isTitle ? cPrimary : cText);
      
      if (y - size < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      
      page.drawText(text, { x, y: y - size, size, font: f, color });
      y -= size + (options.margin || 4);
    };

    const drawSeparator = (marginBefore = 8, marginAfter = 8) => {
      y -= marginBefore;
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      page.drawLine({
        start: { x: 50, y },
        end: { x: 545, y },
        thickness: 0.5,
        color: rgb(226 / 255, 232 / 255, 240 / 255), // Slate 200
      });
      y -= marginAfter;
    };

    const drawAccentLine = (xStart: number, xEnd: number, thickness = 1) => {
      page.drawLine({
        start: { x: xStart, y: y },
        end: { x: xEnd, y: y },
        thickness,
        color: cAccent,
      });
    };

    // Entete Premium
    drawText('RÉPUBLIQUE DE CÔTE D\'IVOIRE', { size: 7.5, bold: true, x: 230, margin: 2, color: rgb(100/255, 116/255, 139/255) });
    drawText('Union · Discipline · Travail', { size: 7, italic: true, x: 247, margin: 10, color: rgb(148/255, 163/255, 184/255) });
    
    // Petite ligne dorée décorative
    y -= 2;
    drawAccentLine(270, 320, 1.5);
    y -= 10;

    drawText('CONTRAT DE BAIL À USAGE D\'HABITATION', { size: 13, bold: true, x: 145, margin: 5, color: cPrimary });
    drawText('Réglementé par la Loi n° 2019-576 du 26 juin 2019', { size: 8, bold: true, x: 185, margin: 20, color: cAccent });

    drawText('ENTRE LES SOUSSIGNÉS DÛMENT IDENTIFIÉS :', { size: 9.5, bold: true, x: 50, margin: 12, color: cPrimary });
    
    // Encadre ou Liste Bailleur
    drawText('1. LE BAILLEUR (PROPRIÉTAIRE)', { size: 9, bold: true, margin: 6, color: cPrimary });
    drawText(`• Nom complet / Raison Sociale :  ${data.nom_proprietaire || 'Agence Immobilière'}`, { x: 65 });
    drawText(`• Adresse Domiciliaire :  ${data.adresse_proprietaire || '—'}`, { x: 65 });
    drawText(`• Téléphone :  ${data.contact_proprietaire || '—'}    |    Adresse Email :  ${data.email_proprietaire || '—'}`, { x: 65 });
    drawText('• Représenté par : Agence Immobilière Mandataire', { x: 65, margin: 12 });

    drawSeparator(4, 8);

    // Locataire
    drawText('2. LE LOCATAIRE (PRENEUR)', { size: 9, bold: true, margin: 6, color: cPrimary });
    drawText(`• Nom complet :  ${data.nom_locataire || '—'}`, { x: 65 });
    drawText(`• Pièce d'Identité :  ${data.piece_locataire || '—'}`, { x: 65 });
    drawText(`• Profession / Employeur :  ${data.profession_locataire || '—'}`, { x: 65 });
    drawText(`• Téléphone :  ${data.contact_locataire || '—'}`, { x: 65 });
    drawText(`• Adresse de Domicile :  ${data.adresse_locataire || '—'}`, { x: 65, margin: 15 });

    drawText('IL A ÉTÉ EXPRESSÉMENT CONVENU ET ARRÊTÉ LES CLAUSES SUIVANTES :', { size: 9, bold: true, margin: 15, color: cAccent });

    // Article 1
    drawText('ARTICLE 1 : OBJET DU CONTRAT ET DÉSIGNATION DES LIEUX', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText('Le Bailleur donne à bail à usage exclusif d\'habitation au Locataire, le logement décrit ci-après :', { x: 50 });
    drawText(`• Situation géographique : Ville de ${data.ville || '—'}, Commune de ____________, Quartier ____________, Réf : ${data.code_maison || 'N/A'}`, { x: 65 });
    drawText(`• Description : Bien de type ${data.type_construction || '—'} comprenant ${data.nb_pieces || '—'} pièce(s) principale(s). (${data.description_maison || 'Non spécifiée'})`, { x: 65 });
    drawText(`• Compteurs : Électricité CIE N° _________________   |   Eau SODECI N° _________________`, { x: 65 });
    drawText('• Destination exclusive : Logement destiné uniquement à l\'habitation principale, à l\'exclusion de tout usage commercial.', { x: 65, margin: 12 });

    // Article 2
    drawText('ARTICLE 2 : DURÉE DU BAIL ET PRISE D\'EFFET', { size: 9, bold: true, margin: 5, color: cPrimary });
    const dateDebut = data.date_souscription ? new Date(data.date_souscription).toLocaleDateString('fr-FR') : '—';
    const dateFin = data.date_fin ? new Date(data.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée';
    drawText(`Le présent contrat est conclu pour une durée déterminée de ${data.nb_mois_contrat || 12} mois, à compter du ${dateDebut}`, { x: 50 });
    drawText(`pour se terminer le ${dateFin}. Il se renouvellera ensuite par tacite reconduction pour une durée égale.`, { x: 50, margin: 12 });

    // Article 3
    drawText('ARTICLE 3 : CONDITIONS FINANCIÈRES (LOYER ET CHARGES)', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText(`Le loyer mensuel principal net est fixé à la somme de : ${Number(data.montant_loyer || 0).toLocaleString('fr-FR')} FCFA.`, { x: 50 });
    drawText('Les charges communes mensuelles (entretien, ordures) sont fixées à : 0 FCFA.', { x: 50 });
    drawText('Le montant total mensuel est payable d\'avance au plus tard le 5 de chaque mois contre délivrance de quittance.', { x: 50 });
    drawText('Note Loi : Le loyer ne peut subir aucune révision avant un délai minimal de trois (3) ans (Art. 32 de la loi 2019-576).', { x: 50, italic: true, margin: 12, color: cAccent });

    // Article 4
    drawText('ARTICLE 4 : DÉPÔT DE GARANTIE ET AVANCES SUR LOYER', { size: 9, bold: true, margin: 5, color: cPrimary });
    const cautionMois = Math.round(Number(data.montant_caution || 0) / Number(data.montant_loyer || 1));
    const avanceMois = Math.round(Number(data.montant_avance || 0) / Number(data.montant_loyer || 1));
    drawText(`• Dépôt de garantie (Caution) : ${Number(data.montant_caution || 0).toLocaleString('fr-FR')} FCFA (correspondant à ${cautionMois} mois, max 2).`, { x: 65 });
    drawText(`• Avance sur loyer : ${Number(data.montant_avance || 0).toLocaleString('fr-FR')} FCFA (correspondant à ${avanceMois} mois, max 2).`, { x: 65 });
    drawText('Le dépôt de garantie sera restitué dans un délai max d\'un (1) mois à compter de la restitution des clés et après état des lieux.', { x: 50, margin: 12 });

    // Article 5
    drawText('ARTICLE 5 : ÉTAT DES LIEUX D\'ENTRÉE ET DE SORTIE', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText('Un état des lieux contradictoire et écrit est dressé obligatoirement à la remise des clés (entrée) et lors de la sortie.', { x: 50, margin: 12 });

    // Article 6
    drawText('ARTICLE 6 : OBLIGATIONS GÉNÉRALES DU BAILLEUR', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText('• Délivrer le logement décent et en bon état de réparation, de sécurité et d\'étanchéité.', { x: 65 });
    drawText('• Assurer au Locataire la jouissance paisible des locaux et effectuer les grosses réparations de structure.', { x: 65 });
    drawText('• Délivrer gratuitement une quittance de loyer pour chaque paiement reçu.', { x: 65, margin: 12 });

    // Article 7
    drawText('ARTICLE 7 : OBLIGATIONS GÉNÉRALES DU LOCATAIRE', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText('• Payer ponctuellement le loyer principal et les charges aux échéances convenues.', { x: 65 });
    drawText('• User paisiblement du logement selon sa destination exclusive d\'habitation principale.', { x: 65 });
    drawText('• Assurer l\'entretien courant du logement. Interdiction de sous-louer sans accord écrit du Bailleur.', { x: 65, margin: 12 });

    // Article 8
    drawText('ARTICLE 8 : RÉSILIATION DU CONTRAT ET PRÉAVIS', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText('• Préavis ordinaire : Chaque partie peut résilier avec un préavis écrit de trois (3) mois (par huissier ou recommandé).', { x: 65 });
    drawText('• Inexécution : Résiliation de plein droit un (1) mois après commandement de payer par huissier infructueux.', { x: 65, margin: 12 });

    // Article 9
    drawText('ARTICLE 9 : FORMALITÉS D\'ENREGISTREMENT FISCAL', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText('Le présent contrat sera enregistré par le Bailleur auprès de la Direction Générale des Impôts (DGI) sous un (1) mois.', { x: 50, margin: 12 });

    // Article 10
    drawText('ARTICLE 10 : ÉLECTION DE DOMICILE ET LITIGES', { size: 9, bold: true, margin: 5, color: cPrimary });
    drawText('Bailleur élit domicile à son adresse, Locataire dans les lieux loués. Litiges soumis au tribunal du lieu du bien.', { x: 50, margin: 20 });

    // Signatures
    drawSeparator(6, 12);
    drawText(`Fait à ${data.ville || '—'}, le ${new Date().toLocaleDateString('fr-FR')}, rédigé en trois (3) exemplaires originaux.`, { italic: true, margin: 15 });
    
    const signatureY = y;
    
    // Boite de Signature Bailleur
    page.drawRectangle({
      x: 50,
      y: signatureY - 80,
      width: 230,
      height: 75,
      color: rgb(248/255, 250/255, 252/255),
      borderColor: rgb(226/255, 232/255, 240/255),
      borderWidth: 1,
    });
    page.drawText('LE BAILLEUR (PROPRIÉTAIRE)', { x: 95, y: signatureY - 18, size: 8, font: fontBold, color: cPrimary });
    page.drawText('Mention "Lu et approuvé" + Signature', { x: 90, y: signatureY - 30, size: 6.5, font: fontOblique, color: rgb(100/255, 116/255, 139/255) });
    page.drawText('Signature & Cachet', { x: 130, y: signatureY - 70, size: 6, font: font, color: rgb(148/255, 163/255, 184/255) });
    
    // Boite de Signature Locataire
    page.drawRectangle({
      x: 315,
      y: signatureY - 80,
      width: 230,
      height: 75,
      color: rgb(248/255, 250/255, 252/255),
      borderColor: rgb(226/255, 232/255, 240/255),
      borderWidth: 1,
    });
    page.drawText('LE LOCATAIRE (PRENEUR)', { x: 370, y: signatureY - 18, size: 8, font: fontBold, color: cPrimary });
    page.drawText('Mention "Lu et approuvé" + Signature', { x: 355, y: signatureY - 30, size: 6.5, font: fontOblique, color: rgb(100/255, 116/255, 139/255) });
    page.drawText('Signature du Preneur', { x: 395, y: signatureY - 70, size: 6, font: font, color: rgb(148/255, 163/255, 184/255) });

    y = signatureY - 100;
    drawText(`Contrat de bail conforme Loi n° 2019-576 (Côte d'Ivoire) — Réf. ${data.ids || id} — ImmoGest`, { size: 6.5, x: 160, color: rgb(148/255, 163/255, 184/255) });

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
