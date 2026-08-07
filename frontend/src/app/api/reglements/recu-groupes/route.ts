import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage([595.28, 841.89]);
    const { height } = page.getSize();
    
    let y = height - 50;

    const drawText = (text: string, options: any) => {
      const f = options.bold ? fontBold : font;
      const size = options.size || 12;
      const x = options.x || 50;
      page.drawText(text, { x, y: y - size, size, font: f, color: rgb(0, 0, 0) });
      y -= size + (options.margin || 5);
    };

    const addHeader = () => {
      drawText('RELEVE DES REGLEMENTS', { size: 20, bold: true, x: 150, margin: 10 });
      drawText(`Periode : ${mois.toString().padStart(2, '0')} / ${annee}`, { size: 14, x: 230, margin: 30 });
    };

    addHeader();

    let totalPayer = 0;
    let totalPaye = 0;

    rows.forEach((row, index) => {
      if (y < 150) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
        addHeader();
      }

      drawText(`Paiement #${index + 1} - ${row.idr || ''}`, { bold: true, margin: 5 });
      drawText(`Locataire : ${row.nom_prenoms || ''} | Contact : ${row.contact || 'N/A'}`, { size: 10 });
      drawText(`Bien : ${row.code_maison || 'N/A'} (${row.ville || ''}) | Contrat : ${row.code_souscription || ''}`, { size: 10 });
      drawText(`Date : ${new Date(row.date_paiement).toLocaleDateString('fr-FR')} | Statut : ${row.statut}`, { size: 10 });
      drawText(`Montant Loyer : ${row.montant_a_payer || 0} FCFA | Montant Paye : ${row.montant_paye || 0} FCFA`, { size: 10 });
      y -= 15;

      totalPayer += Number(row.montant_a_payer || 0);
      totalPaye += Number(row.montant_paye || 0);
    });

    if (y < 150) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 50;
    }

    y -= 10;
    drawText('RESUME DU MOIS :', { size: 14, bold: true, margin: 10 });
    drawText(`Total des loyers attendus : ${totalPayer} FCFA`, {});
    drawText(`Total des loyers encaisses : ${totalPaye} FCFA`, {});
    drawText(`Reste a recouvrer : ${totalPayer - totalPaye} FCFA`, {});

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recus_groupes_${annee}_${mois}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reglements/recu-groupes:', error);
    return new NextResponse('Erreur de generation PDF', { status: 500 });
  }
}
