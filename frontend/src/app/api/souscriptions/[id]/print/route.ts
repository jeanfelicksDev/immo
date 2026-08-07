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

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Entête
      doc.fontSize(22).font('Helvetica-Bold').text('CONTRAT DE BAIL A USAGE D\'HABITATION', { align: 'center' });
      doc.moveDown(2);

      // Infos générales
      doc.fontSize(12).font('Helvetica');
      doc.text(`Ref. Contrat : ${data.ids}`);
      doc.text(`Date de souscription : ${new Date(data.date_souscription).toLocaleDateString('fr-FR')}`);
      if (data.date_fin) {
        doc.text(`Date de fin : ${new Date(data.date_fin).toLocaleDateString('fr-FR')}`);
      }
      doc.moveDown();

      // Les parties
      doc.fontSize(14).font('Helvetica-Bold').text('ENTRE LES SOUSSIGNES :');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text('Le Bailleurs (Proprietaire / Agence Immobiliere)');
      doc.moveDown();
      doc.text('ET');
      doc.moveDown();
      doc.text(`Monsieur / Madame : ${data.nom_prenoms}`, { continued: true }).font('Helvetica').text('');
      if (data.contact) doc.text(`Contact : ${data.contact}`);
      if (data.piece_identite) doc.text(`Piece d'identite : ${data.piece_identite}`);
      if (data.profession) doc.text(`Profession : ${data.profession}`);
      if (data.adresse) doc.text(`Adresse : ${data.adresse}`);
      doc.text('Ci-apres denomme(e) "Le Preneur".');
      doc.moveDown(2);

      // La location
      doc.fontSize(14).font('Helvetica-Bold').text('OBJET DU CONTRAT :');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Type de bien : ${data.type_construction || 'Non specifie'}`);
      doc.text(`Localisation : ${data.ville || 'Non specifiee'}`);
      doc.text(`Code du bien : ${data.code_maison || 'N/A'}`);
      doc.moveDown(2);

      // Conditions financières
      doc.fontSize(14).font('Helvetica-Bold').text('CONDITIONS FINANCIERES :');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Loyer mensuel : ${data.montant_loyer} FCFA`);
      doc.text(`Caution (Garantie) : ${data.montant_caution} FCFA`);
      if (data.montant_avance > 0) {
        doc.text(`Avance sur loyer : ${data.montant_avance} FCFA`);
      }
      doc.text(`Duree du contrat : ${data.nb_mois_contrat || 'Non specifie'} mois`);
      doc.moveDown(2);

      // Signatures
      doc.text('Lu et approuve,');
      doc.moveDown(1);
      doc.text('Le Preneur', { continued: true });
      doc.text('Le Bailleur', { align: 'right' });

      doc.end();
    });

    return new NextResponse(pdfBuffer, {
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
