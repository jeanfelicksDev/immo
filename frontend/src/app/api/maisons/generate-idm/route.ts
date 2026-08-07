import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'Appartement';
    const nbPieces = parseInt(searchParams.get('nbPieces') || '1', 10);
    const loyer = parseInt(searchParams.get('loyer') || '0', 10);
    const ville = (searchParams.get('ville') || 'Abidjan').trim();

    // Préfixe basé sur le type de construction
    const typeMap: Record<string, string> = {
      'Appartement': 'APT',
      'Villa': 'VIL',
      'Studio': 'STU',
      'Duplex': 'DPX',
      'Magasin': 'MAG',
      'Bureau': 'BUR',
      'Entrepôt': 'ENT',
      'Terrain': 'TER',
    };
    const prefix = typeMap[type] || type.substring(0, 3).toUpperCase();

    // Code ville (3 premières lettres)
    const villeCode = ville.substring(0, 3).toUpperCase();

    // Identifiant unique basé sur le timestamp
    const uid = Date.now().toString().slice(-4);

    const idm = `${prefix}_P${nbPieces}_${villeCode}_${Math.round(loyer / 1000)}K_${uid}`;

    return NextResponse.json(idm);
  } catch (error: any) {
    console.error('Erreur GET /api/maisons/generate-idm:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'IDM.' },
      { status: 500 }
    );
  }
}
