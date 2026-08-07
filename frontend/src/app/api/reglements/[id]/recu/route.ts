import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const dynamic = 'force-dynamic';

async function embedImageIfExists(pdfDoc: PDFDocument, imageStr: string | null | undefined) {
  if (!imageStr || typeof imageStr !== 'string' || imageStr.trim() === '') return null;
  try {
    let bytes: Uint8Array;
    let isPng = true;

    if (imageStr.startsWith('data:image/')) {
      const parts = imageStr.split(',');
      if (parts.length < 2) return null;
      const mime = parts[0];
      if (mime.includes('jpeg') || mime.includes('jpg')) {
        isPng = false;
      }
      const base64Data = parts[1];
      const buffer = Buffer.from(base64Data, 'base64');
      bytes = new Uint8Array(buffer);
    } else if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
      const res = await fetch(imageStr);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
      if (imageStr.toLowerCase().endsWith('.jpg') || imageStr.toLowerCase().endsWith('.jpeg')) {
        isPng = false;
      }
    } else {
      return null;
    }

    if (isPng) {
      try {
        return await pdfDoc.embedPng(bytes);
      } catch {
        return await pdfDoc.embedJpg(bytes);
      }
    } else {
      try {
        return await pdfDoc.embedJpg(bytes);
      } catch {
        return await pdfDoc.embedPng(bytes);
      }
    }
  } catch (err) {
    console.error("Erreur lors de l'intégration de l'image PDF:", err);
    return null;
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined') {
      return new NextResponse('ID invalide', { status: 400 });
    }

    // 1. Récupérer le règlement
    const sql = `
      SELECT r.id, r.idr, r.date_paiement, r.mois_concerne, r.montant_a_payer, r.montant_paye, r.statut, r.notes,
             s.ids AS code_souscription, m.idm AS code_maison, m.ville, m.type_construction,
             l.nom_prenoms, l.contact
      FROM immogest.reglements r
      JOIN immogest.souscriptions s ON r.souscription_id = s.id
      JOIN immogest.maisons m ON r.maison_id = m.id
      JOIN immogest.locataires l ON r.locataire_id = l.id
      WHERE r.id = $1
    `;

    const { rows } = await query(sql, [id]);
    if (rows.length === 0) {
      return new NextResponse('Règlement introuvable', { status: 404 });
    }

    const data = rows[0];

    // 2. Récupérer les informations de l'entreprise (Logo & Signature)
    const { rows: entrepRows } = await query(`
      SELECT denomination, adresse_postale, adresse_physique, telephone, email_commercial, rccm_ifu, logo_url, signature_url, devise
      FROM immogest.entreprises
      ORDER BY created_at ASC LIMIT 1
    `);
    const entreprise = entrepRows[0] || {};

    // 3. Initialiser le document PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const page = pdfDoc.addPage([595.28, 841.89]); // Format A4
    const { height } = page.getSize();

    // Charger les images (Logo et Signature)
    const embeddedLogo = await embedImageIfExists(pdfDoc, entreprise.logo_url || entreprise.LogoUrl);
    const embeddedSignature = await embedImageIfExists(pdfDoc, entreprise.signature_url || entreprise.SignatureUrl);

    let y = height - 50;

    const cPrimary = rgb(15 / 255, 23 / 255, 42 / 255);  // #0f172a
    const cAccent = rgb(217 / 255, 119 / 255, 6 / 255);   // #d97706
    const cText = rgb(51 / 255, 65 / 255, 85 / 255);     // #334155

    const drawText = (text: string, options: any = {}) => {
      const f = options.bold ? fontBold : (options.italic ? fontOblique : font);
      const size = options.size || 10;
      const x = options.x || 50;
      const color = options.color || (options.isTitle ? cPrimary : cText);

      page.drawText(text, { x, y: y - size, size, font: f, color });
      y -= size + (options.margin || 5);
    };

    // ─── ENTÊTE & LOGO DE L'AGENCE ─────────────────────────────
    const headerStartY = y;
    if (embeddedLogo) {
      const logoDims = embeddedLogo.scale(1);
      const targetWidth = 100;
      const scaleFactor = targetWidth / logoDims.width;
      const targetHeight = Math.min(logoDims.height * scaleFactor, 60);

      page.drawImage(embeddedLogo, {
        x: 50,
        y: headerStartY - targetHeight,
        width: targetWidth,
        height: targetHeight,
      });

      // Textes à côté du logo
      let textY = headerStartY;
      page.drawText(entreprise.denomination || entreprise.Denomination || 'ImmoGest Agence', {
        x: 160,
        y: textY - 14,
        size: 14,
        font: fontBold,
        color: cPrimary,
      });
      textY -= 20;

      const subHeader = `${entreprise.adresse_postale || entreprise.AdressePostale || ''} • Tél: ${entreprise.telephone || entreprise.Telephone || ''}`;
      page.drawText(subHeader, {
        x: 160,
        y: textY - 9,
        size: 8.5,
        font,
        color: cText,
      });
      textY -= 14;

      if (entreprise.rccm_ifu || entreprise.RccmIfu) {
        page.drawText(`N° IFU/RCCM: ${entreprise.rccm_ifu || entreprise.RccmIfu}`, {
          x: 160,
          y: textY - 8,
          size: 8,
          font: fontOblique,
          color: rgb(100 / 255, 116 / 255, 139 / 255),
        });
      }

      y = headerStartY - Math.max(targetHeight, 60) - 20;
    } else {
      drawText(entreprise.denomination || entreprise.Denomination || 'ImmoGest Agence', { size: 16, bold: true, color: cPrimary });
      drawText(`${entreprise.adresse_postale || entreprise.AdressePostale || ''} • ${entreprise.adresse_physique || entreprise.AdressePhysique || ''}`, { size: 9 });
      drawText(`Tél: ${entreprise.telephone || entreprise.Telephone || '—'} • Email: ${entreprise.email_commercial || entreprise.EmailCommercial || '—'}`, { size: 9 });
      if (entreprise.rccm_ifu || entreprise.RccmIfu) {
        drawText(`N° IFU/RCCM : ${entreprise.rccm_ifu || entreprise.RccmIfu}`, { size: 8, italic: true });
      }
      y -= 15;
    }

    // Ligne de séparation dorée
    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: 1.5,
      color: cAccent,
    });
    y -= 25;

    // ─── TITRE DU REÇU ──────────────────────────────────────────
    drawText('REÇU DE PAIEMENT DE LOYER', { size: 18, bold: true, x: 160, color: cPrimary, margin: 4 });
    drawText('QUITTANCE OFFICIELLE DE PAIEMENT', { size: 10, bold: true, x: 195, color: cAccent, margin: 20 });

    // ─── INFORMATIONS GÉNÉRALES ────────────────────────────────
    drawText(`Réf. Quittance : ${data.idr || id}`, { bold: true, size: 10 });
    drawText(`Date d'émission / paiement : ${new Date(data.date_paiement).toLocaleDateString('fr-FR')}`, { size: 9.5 });
    drawText(`Mois concerné : ${new Date(data.mois_concerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}`, { size: 9.5, bold: true });
    drawText(`Statut du règlement : ${data.statut === 'Regle' ? 'RÉGLÉ / PAYÉ (SOLDE)' : data.statut}`, { size: 9.5 });
    y -= 15;

    // ─── LOCATAIRE & BIEN IMMOBILIER ────────────────────────────
    page.drawRectangle({
      x: 50,
      y: y - 85,
      width: 495,
      height: 85,
      color: rgb(248 / 255, 250 / 255, 252 / 255),
      borderColor: rgb(226 / 255, 232 / 255, 240 / 255),
      borderWidth: 1,
    });

    const boxY = y - 15;
    page.drawText('INFORMATIONS DU LOCATAIRE & BIEN :', { x: 60, y: boxY, size: 9.5, font: fontBold, color: cPrimary });
    page.drawText(`Locataire : ${data.nom_prenoms || '—'}`, { x: 60, y: boxY - 18, size: 9, font, color: cText });
    page.drawText(`Contact : ${data.contact || 'Non renseigné'}`, { x: 60, y: boxY - 32, size: 9, font, color: cText });

    page.drawText(`Code Bien / Maison : ${data.code_maison || 'N/A'}`, { x: 310, y: boxY - 18, size: 9, font, color: cText });
    page.drawText(`Type : ${data.type_construction || 'Habitation'}`, { x: 310, y: boxY - 32, size: 9, font, color: cText });
    page.drawText(`Localisation : ${data.ville || 'Abidjan'}`, { x: 310, y: boxY - 46, size: 9, font, color: cText });
    page.drawText(`Code Souscription : ${data.code_souscription || 'N/A'}`, { x: 60, y: boxY - 46, size: 9, font, color: cText });

    y -= 105;

    // ─── DÉTAILS DU PAIEMENT ────────────────────────────────────
    drawText('DÉTAILS DES MONTANTS RÈGLÉS :', { size: 11, bold: true, color: cPrimary, margin: 10 });
    drawText(`Loyer mensuel prévu : ${Number(data.montant_a_payer || 0).toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'}`, { size: 10 });
    drawText(`Montant effectivement encaissé : ${Number(data.montant_paye || 0).toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'}`, { size: 10, bold: true, color: rgb(16 / 255, 185 / 255, 129 / 255) });

    const reste = Number(data.montant_a_payer || 0) - Number(data.montant_paye || 0);
    if (reste > 0) {
      drawText(`Solde / Reste à payer : ${reste.toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'}`, { size: 10, bold: true, color: rgb(225 / 255, 29 / 255, 72 / 255) });
    }

    if (data.notes) {
      y -= 5;
      drawText(`Observations / Notes : ${data.notes}`, { size: 9, italic: true });
    }

    y -= 35;

    // ─── CACHET ET SIGNATURE DE L'AGENCE ─────────────────────────
    const sigX = 340;
    const sigStartY = y;

    page.drawText('Cachet et Signature Officielle', { x: sigX, y: sigStartY, size: 9.5, font: fontBold, color: cPrimary });
    
    if (embeddedSignature) {
      const sigDims = embeddedSignature.scale(1);
      const targetWidth = 140;
      const scaleFactor = targetWidth / sigDims.width;
      const targetHeight = Math.min(sigDims.height * scaleFactor, 55);

      page.drawImage(embeddedSignature, {
        x: sigX + 5,
        y: sigStartY - targetHeight - 12,
        width: targetWidth,
        height: targetHeight,
      });

      page.drawText(entreprise.denomination || entreprise.Denomination || "L'Administration Agence", {
        x: sigX,
        y: sigStartY - targetHeight - 24,
        size: 8.5,
        font: fontOblique,
        color: cText,
      });
    } else {
      page.drawText("Pour l'Agence Immobilière / Le Gestionnaire", {
        x: sigX,
        y: sigStartY - 20,
        size: 8.5,
        font: fontOblique,
        color: cText,
      });
      page.drawText('(Signature non renseignée)', {
        x: sigX,
        y: sigStartY - 38,
        size: 8,
        font: fontOblique,
        color: rgb(148 / 255, 163 / 255, 184 / 255),
      });
    }

    // Bas de page légal
    page.drawText(`Quittance générée par le système ImmoGest SaaS — ${entreprise.denomination || 'Agence Pro'}`, {
      x: 130,
      y: 30,
      size: 7.5,
      font,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="recu_${data.idr || id}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reglements/[id]/recu:', error);
    return new NextResponse('Erreur de génération du reçu PDF', { status: 500 });
  }
}

