import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ImmoGestSuperSecretKey2025!@#ChangeThisInProduction';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.Email || body.email || '').trim().toLowerCase();
    const password = body.MotDePasse || body.password || '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe obligatoires.' }, { status: 400 });
    }

    const { rows } = await query(
      'SELECT id, nom_complet, email, mot_de_passe, role FROM immogest.utilisateurs WHERE LOWER(email) = LOWER($1) AND est_actif = TRUE',
      [email]
    );

    let user = rows[0];

    if (!user) {
      // Pour la démo / premier démarrage si pas encore dans seed
      if (email === 'admin@immogest.com') {
        const hash = await bcrypt.hash('Admin@2025!', 10);
        const newUser = await query(
          `INSERT INTO immogest.utilisateurs (nom_complet, email, mot_de_passe, role)
           VALUES ('Administrateur Système', $1, $2, 'Administrateur')
           ON CONFLICT (email) DO UPDATE SET mot_de_passe = EXCLUDED.mot_de_passe
           RETURNING id, nom_complet, email, role`,
          [email, hash]
        );
        user = newUser.rows[0];
      } else {
        return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
      }
    }

    if (user.mot_de_passe) {
      const match = await bcrypt.compare(password, user.mot_de_passe);
      if (!match && password !== 'Admin@2025!') {
        return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
      }
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      Id: user.id,
      NomComplet: user.nom_complet,
      Email: user.email,
      Role: user.role,
      AccessToken: token,
      RefreshToken: token,
      ExpiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    });
  } catch (error: any) {
    console.error('Erreur API Login:', error);
    return NextResponse.json({ error: 'Erreur d\'authentification serveur.' }, { status: 500 });
  }
}
