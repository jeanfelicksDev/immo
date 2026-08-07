import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ImmoGestSuperSecretKey2025!@#ChangeThisInProduction';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nomComplet = (body.NomComplet || body.nomComplet || '').trim();
    const email = (body.Email || body.email || '').trim().toLowerCase();
    const password = body.MotDePasse || body.motDePasse || body.password || '';
    const roleRaw = body.Role !== undefined ? body.Role : body.role;

    if (!nomComplet || !email || !password) {
      return NextResponse.json(
        { error: 'Nom complet, email et mot de passe sont obligatoires.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existing = await query(
      'SELECT id FROM immogest.utilisateurs WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà.' },
        { status: 409 }
      );
    }

    // Convertir le rôle numérique en chaîne
    let role = 'Agent';
    if (roleRaw === 0 || roleRaw === 'Administrateur' || roleRaw === 'Admin') {
      role = 'Administrateur';
    } else if (roleRaw === 1 || roleRaw === 'Gestionnaire' || roleRaw === 'GestionnairePrincipal') {
      role = 'Gestionnaire';
    } else if (roleRaw === 2 || roleRaw === 'Agent') {
      role = 'Agent';
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur
    const { rows } = await query(
      `INSERT INTO immogest.utilisateurs (nom_complet, email, mot_de_passe, role, est_actif)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, nom_complet, email, role`,
      [nomComplet, email, hashedPassword, role]
    );

    const user = rows[0];

    // Générer le JWT
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
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur API Register:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création du compte.' },
      { status: 500 }
    );
  }
}
