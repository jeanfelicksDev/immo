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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const annee = parseInt(searchParams.get('annee') || new Date().getFullYear().toString(), 10);
    const mois = parseInt(searchParams.get('mois') || (new Date().getMonth() + 1).toString(), 10);

    const sql = `
      SELECT r.id, r.idr, r.date_paiement, r.mois_concerne, r.montant_a_payer, r.montant_paye, r.statut,
             s.ids AS code_souscription, m.idm AS code_maison, m.ville,
             l.nom_prenoms, l.contact
      FROM immogest.reglements r
      JOIN immogest.souscriptions s ON r.souscription_id = s.id
      JOIN immogest.maisons m ON r.maison_id = m.id
      JOIN immogest.locataires l ON r.locataire_id = l.id
      WHERE EXTRACT(YEAR FROM r.mois_concerne) = $1 AND EXTRACT(MONTH FROM r.mois_concerne) = $2
      ORDER BY r.date_paiement DESC
    `;

    const { rows } = await query(sql, [annee, mois]);
    if (rows.length === 0) {
      return new NextResponse('Aucun règlement trouvé pour ce mois.', { status: 404 });
    }

    // Récupérer les informations de l'entreprise (Logo & Signature)
    const { rows: entrepRows } = await query(`
      SELECT denomination, adresse_postale, adresse_physique, telephone, email_commercial, rccm_ifu, logo_url, signature_url, devise
      FROM immogest.entreprises
      ORDER BY created_at ASC LIMIT 1
    `);
    const entreprise = entrepRows[0] || {};

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const embeddedLogo = await embedImageIfExists(pdfDoc, entreprise.logo_url || entreprise.LogoUrl);
    const embeddedSignature = await embedImageIfExists(pdfDoc, entreprise.signature_url || entreprise.SignatureUrl);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { height } = page.getSize();
    
    let y = height - 50;

    const cPrimary = rgb(15 / 255, 23 / 255, 42 / 255);
    const cAccent = rgb(217 / 255, 119 / 255, 6 / 255);
    const cText = rgb(51 / 255, 65 / 255, 85 / 255);

    const drawText = (text: string, options: any = {}) => {
      const f = options.bold ? fontBold : (options.italic ? fontOblique : font);
      const size = options.size || 10;
      const x = options.x || 50;
      const color = options.color || cText;

      page.drawText(text, { x, y: y - size, size, font: f, color });
      y -= size + (options.margin || 5);
    };

    const addHeader = () => {
      const headerStartY = y;
      if (embeddedLogo) {
        const logoDims = embeddedLogo.scale(1);
        const targetWidth = 80;
        const scaleFactor = targetWidth / logoDims.width;
        const targetHeight = Math.min(logoDims.height * scaleFactor, 50);

        page.drawImage(embeddedLogo, {
          x: 50,
          y: headerStartY - targetHeight,
          width: targetWidth,
          height: targetHeight,
        });

        page.drawText(entreprise.denomination || entreprise.Denomination || 'ImmoGest Agence', {
          x: 140,
          y: headerStartY - 12,
          size: 12,
          font: fontBold,
          color: cPrimary,
        });
        page.drawText(`${entreprise.adresse_postale || ''} • Tél: ${entreprise.telephone || ''}`, {
          x: 140,
          y: headerStartY - 24,
          size: 8,
          font,
          color: cText,
        });

        y = headerStartY - Math.max(targetHeight, 50) - 15;
      } else {
        drawText(entreprise.denomination || 'ImmoGest Agence', { size: 14, bold: true, color: cPrimary });
        y -= 5;
      }

      drawText('RELEVÉ GÉNÉRAL DES RÈGLEMENTS DE LOYER', { size: 16, bold: true, x: 120, color: cPrimary, margin: 4 });
      drawText(`Période : ${mois.toString().padStart(2, '0')} / ${annee}`, { size: 10, bold: true, x: 225, color: cAccent, margin: 20 });
    };

    addHeader();

    let totalPayer = 0;
    let totalPaye = 0;

    rows.forEach((row, index) => {
      if (y < 200) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
        addHeader();
      }

      drawText(`Paiement #${index + 1} - Quittance Ref: ${row.idr || ''}`, { bold: true, size: 9.5, color: cPrimary, margin: 3 });
      drawText(`Locataire : ${row.nom_prenoms || ''} | Contact : ${row.contact || 'N/A'}`, { size: 8.5 });
      drawText(`Bien : ${row.code_maison || 'N/A'} (${row.ville || ''}) | Contrat : ${row.code_souscription || ''}`, { size: 8.5 });
      drawText(`Date de règlement : ${new Date(row.date_paiement).toLocaleDateString('fr-FR')} | Statut : ${row.statut}`, { size: 8.5 });
      drawText(`Loyer prévu : ${Number(row.montant_a_payer || 0).toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'} | Encaiassé : ${Number(row.montant_paye || 0).toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'}`, { size: 8.5, bold: true });
      y -= 12;

      totalPayer += Number(row.montant_a_payer || 0);
      totalPaye += Number(row.montant_paye || 0);
    });

    if (y < 200) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 50;
    }

    y -= 10;
    drawText('RÉSUMÉ DU MOIS :', { size: 12, bold: true, color: cPrimary, margin: 8 });
    drawText(`Total des loyers attendus : ${totalPayer.toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'}`, { size: 9.5 });
    drawText(`Total des loyers encaissés : ${totalPaye.toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'}`, { size: 9.5, bold: true, color: rgb(16 / 255, 185 / 255, 129 / 255) });
    drawText(`Reste total à recouvrer : ${(totalPayer - totalPaye).toLocaleString('fr-FR')} ${entreprise.devise || 'FCFA'}`, { size: 9.5, bold: true, color: rgb(225 / 255, 29 / 255, 72 / 255) });

    y -= 30;

    // Cachet et Signature
    const sigX = 340;
    const sigStartY = y;
    page.drawText('Cachet et Signature Officielle', { x: sigX, y: sigStartY, size: 9.5, font: fontBold, color: cPrimary });

    if (embeddedSignature) {
      const sigDims = embeddedSignature.scale(1);
      const targetWidth = 140;
      const scaleFactor = targetWidth / sigDims.width;
      const targetHeight = Math.min(sigDims.height * scaleFactor, 50);

      page.drawImage(embeddedSignature, {
        x: sigX + 5,
        y: sigStartY - targetHeight - 10,
        width: targetWidth,
        height: targetHeight,
      });

      page.drawText(entreprise.denomination || entreprise.Denomination || "L'Administration Agence", {
        x: sigX,
        y: sigStartY - targetHeight - 22,
        size: 8,
        font: fontOblique,
        color: cText,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="recus_groupes_${annee}_${mois}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reglements/recu-groupes:', error);
    return new NextResponse('Erreur de génération du relevé PDF', { status: 500 });
  }
}

