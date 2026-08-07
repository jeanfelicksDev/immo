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

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { height } = page.getSize();
    
    let y = height - 50;

    const drawText = (text: string, options: any) => {
      const f = options.bold ? fontBold : font;
      const size = options.size || 12;
      const x = options.x || 50;
      page.drawText(text, { x, y: y - size, size, font: f, color: rgb(0, 0, 0) });
      y -= size + (options.margin || 5);
    };

    // Entete
    drawText('RECU DE PAIEMENT', { size: 22, bold: true, x: 180, margin: 10 });
    drawText('QUITTANCE DE LOYER', { size: 14, x: 210, margin: 30 });

    // Infos
    drawText(`Ref. Recu : ${data.idr || ''}`, {});
    drawText(`Date de paiement : ${new Date(data.date_paiement).toLocaleDateString('fr-FR')}`, {});
    drawText(`Mois concerne : ${new Date(data.mois_concerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`, {});
    drawText(`Statut : ${data.statut === 'Regle' ? 'Paye (Solde)' : data.statut}`, {});
    y -= 15;

    // Locataire
    drawText('LOCATAIRE :', { size: 14, bold: true, margin: 10 });
    drawText(`Nom & Prenoms : ${data.nom_prenoms || ''}`, {});
    if (data.contact) drawText(`Contact : ${data.contact}`, {});
    y -= 15;

    // Bien
    drawText('BIEN IMMOBILIER :', { size: 14, bold: true, margin: 10 });
    drawText(`Type : ${data.type_construction || 'Non specifie'}`, {});
    drawText(`Localisation : ${data.ville || 'Non specifiee'}`, {});
    drawText(`Code Maison : ${data.code_maison || 'N/A'}`, {});
    drawText(`Code Souscription : ${data.code_souscription || 'N/A'}`, {});
    y -= 15;

    // Montants
    drawText('DETAILS DU PAIEMENT :', { size: 14, bold: true, margin: 10 });
    drawText(`Montant du loyer : ${data.montant_a_payer || 0} FCFA`, {});
    drawText(`Montant paye : ${data.montant_paye || 0} FCFA`, {});
    const reste = (data.montant_a_payer || 0) - (data.montant_paye || 0);
    if (reste > 0) {
      drawText(`Reste a payer : ${reste} FCFA`, {});
    }
    y -= 10;
    if (data.notes) {
      drawText(`Notes : ${data.notes}`, {});
    }
    y -= 40;

    // Signatures
    drawText('Cachet et Signature', { x: 400 });
    y -= 20;
    drawText('Le Responsable / L\'Agence', { x: 380 });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recu_${data.idr || id}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reglements/[id]/recu:', error);
    return new NextResponse('Erreur de generation PDF', { status: 500 });
  }
}
