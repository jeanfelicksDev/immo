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
      SELECT s.id, s.ids, s.maison_id, m.idm AS code_maison, m.ville, m.type_construction, m.loyer_mensuel,
             l.nom_prenoms, l.contact, l.piece_identite, l.profession, l.adresse,
             s.date_souscription, s.date_fin, s.montant_loyer, s.montant_caution, s.montant_avance, s.nb_mois_contrat
      FROM immogest.souscriptions s
      JOIN immogest.maisons m ON s.maison_id = m.id
      JOIN immogest.locataires l ON s.locataire_id = l.id
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
    drawText('CONTRAT DE BAIL A USAGE D\'HABITATION', { size: 20, bold: true, x: 100, margin: 30 });

    // Infos
    drawText(`Ref. Contrat : ${data.ids || ''}`, {});
    drawText(`Date de souscription : ${new Date(data.date_souscription).toLocaleDateString('fr-FR')}`, {});
    if (data.date_fin) {
      drawText(`Date de fin : ${new Date(data.date_fin).toLocaleDateString('fr-FR')}`, {});
    }
    y -= 15;

    // Parties
    drawText('ENTRE LES SOUSSIGNES :', { size: 14, bold: true, margin: 10 });
    drawText('Le Bailleurs (Proprietaire / Agence Immobiliere)', {});
    y -= 10;
    drawText('ET', { bold: true });
    y -= 10;
    drawText(`Monsieur / Madame : ${data.nom_prenoms || ''}`, {});
    if (data.contact) drawText(`Contact : ${data.contact}`, {});
    if (data.piece_identite) drawText(`Piece d'identite : ${data.piece_identite}`, {});
    if (data.profession) drawText(`Profession : ${data.profession}`, {});
    if (data.adresse) drawText(`Adresse : ${data.adresse}`, {});
    drawText('Ci-apres denomme(e) "Le Preneur".', {});
    y -= 20;

    // Location
    drawText('OBJET DU CONTRAT :', { size: 14, bold: true, margin: 10 });
    drawText(`Type de bien : ${data.type_construction || 'Non specifie'}`, {});
    drawText(`Localisation : ${data.ville || 'Non specifiee'}`, {});
    drawText(`Code du bien : ${data.code_maison || 'N/A'}`, {});
    y -= 20;

    // Conditions
    drawText('CONDITIONS FINANCIERES :', { size: 14, bold: true, margin: 10 });
    drawText(`Loyer mensuel : ${data.montant_loyer || 0} FCFA`, {});
    drawText(`Caution (Garantie) : ${data.montant_caution || 0} FCFA`, {});
    if (data.montant_avance > 0) {
      drawText(`Avance sur loyer : ${data.montant_avance} FCFA`, {});
    }
    drawText(`Duree du contrat : ${data.nb_mois_contrat || 'Non specifie'} mois`, {});
    y -= 40;

    // Signatures
    drawText('Lu et approuve,', {});
    y -= 20;
    drawText('Le Preneur', { x: 50 });
    drawText('Le Bailleur', { x: 400 });

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
