import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PDFDocument from 'pdfkit';

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

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Entête
      doc.fontSize(20).font('Helvetica-Bold').text('RELEVÉ DES RÈGLEMENTS', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Période : ${mois.toString().padStart(2, '0')} / ${annee}`, { align: 'center' });
      doc.moveDown(2);

      let totalPayer = 0;
      let totalPaye = 0;

      rows.forEach((row, index) => {
        doc.fontSize(12).font('Helvetica-Bold').text(`Paiement #${index + 1} - ${row.idr}`);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Locataire : ${row.nom_prenoms} | Contact : ${row.contact || 'N/A'}`);
        doc.text(`Bien : ${row.code_maison || 'N/A'} (${row.ville || ''}) | Contrat : ${row.code_souscription}`);
        doc.text(`Date : ${new Date(row.date_paiement).toLocaleDateString('fr-FR')} | Statut : ${row.statut}`);
        doc.text(`Montant Loyer : ${row.montant_a_payer} FCFA | Montant Payé : ${row.montant_paye} FCFA`);
        doc.moveDown();

        totalPayer += Number(row.montant_a_payer);
        totalPaye += Number(row.montant_paye);

        // Si on est proche de la fin de la page, on ajoute une nouvelle page
        if (doc.y > 700) {
          doc.addPage();
        }
      });

      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').text('RÉSUMÉ DU MOIS :');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Total des loyers attendus : ${totalPayer} FCFA`);
      doc.text(`Total des loyers encaissés : ${totalPaye} FCFA`);
      doc.text(`Reste à recouvrer : ${totalPayer - totalPaye} FCFA`);

      doc.end();
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recus_groupes_${annee}_${mois}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reglements/recu-groupes:', error);
    return new NextResponse('Erreur de génération PDF', { status: 500 });
  }
}
