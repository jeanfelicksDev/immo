import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PDFDocument from 'pdfkit';

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

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Entête
      doc.fontSize(22).font('Helvetica-Bold').text('RECU DE PAIEMENT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text('QUITTANCE DE LOYER', { align: 'center' });
      doc.moveDown(2);

      // Infos générales
      doc.fontSize(12).font('Helvetica');
      doc.text(`Ref. Recu : ${data.idr}`);
      doc.text(`Date de paiement : ${new Date(data.date_paiement).toLocaleDateString('fr-FR')}`);
      doc.text(`Mois concerne : ${new Date(data.mois_concerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
      doc.text(`Statut : ${data.statut === 'Regle' ? 'Paye (Solde)' : data.statut}`);
      doc.moveDown();

      // Locataire
      doc.fontSize(14).font('Helvetica-Bold').text('LOCATAIRE :');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Nom & Prenoms : ${data.nom_prenoms}`);
      if (data.contact) doc.text(`Contact : ${data.contact}`);
      doc.moveDown();

      // Bien immobilier
      doc.fontSize(14).font('Helvetica-Bold').text('BIEN IMMOBILIER :');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Type : ${data.type_construction || 'Non specifie'}`);
      doc.text(`Localisation : ${data.ville || 'Non specifiee'}`);
      doc.text(`Code Maison : ${data.code_maison || 'N/A'}`);
      doc.text(`Code Souscription : ${data.code_souscription || 'N/A'}`);
      doc.moveDown();

      // Montants
      doc.fontSize(14).font('Helvetica-Bold').text('DETAILS DU PAIEMENT :');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Montant du loyer : ${data.montant_a_payer} FCFA`);
      doc.text(`Montant paye : ${data.montant_paye} FCFA`);
      const reste = data.montant_a_payer - data.montant_paye;
      if (reste > 0) {
        doc.text(`Reste a payer : ${reste} FCFA`);
      }
      doc.moveDown();
      if (data.notes) {
        doc.text(`Notes : ${data.notes}`);
      }
      doc.moveDown(3);

      // Signatures
      doc.text('Cachet et Signature', { align: 'right' });
      doc.moveDown(1);
      doc.text('Le Responsable / L\'Agence', { align: 'right' });

      doc.end();
    });

    return new NextResponse(pdfBuffer, {
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
