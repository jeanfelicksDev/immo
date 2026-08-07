# ImmoGest SaaS — Plateforme de Gestion Immobilière

Application web de gestion immobilière pour agents, gestionnaires et propriétaires bailleurs.

## Architecture de Production

```
Navigateur
    ↓
Vercel (Next.js 14)
    ├── Interface Utilisateur (React + Tailwind)
    └── API Routes (/app/api/*)
            ↓
     Neon PostgreSQL Cloud (Serverless)
```

**Aucun backend séparé.** Toute la logique métier est dans les routes API Next.js.

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend + API | Next.js 14 (App Router) |
| Base de données | Neon PostgreSQL (Cloud Serverless) |
| Hébergement | Vercel |
| Auth | JWT (bcryptjs + jsonwebtoken) |
| UI | Tailwind CSS + CSS Variables |

## Déploiement en Production

Chaque push sur `main` déclenche automatiquement un déploiement Vercel.

```powershell
.\deploy-prod.bat
```

## Développement Local

### Prérequis
- Node.js 20+
- npm 10+

### Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

Créez un fichier `frontend/.env.local` :

```env
DATABASE_URL=postgresql://neondb_owner:...@neon.tech/neondb?sslmode=require
JWT_SECRET=votre_cle_secrete_min_32_caracteres
```

## Structure du Projet

```
Immo/
├── frontend/                 # Application Next.js (Vercel)
│   ├── src/app/              # Pages et routes UI
│   ├── src/app/api/          # Routes API (PostgreSQL direct)
│   └── src/lib/db.ts         # Pool de connexion PostgreSQL
├── database/
│   ├── init.sql              # Schéma DDL de référence
│   └── seed.sql              # Données initiales
├── docker-compose.yml        # Dev local : pgAdmin uniquement
├── deploy-prod.bat           # Script de déploiement Vercel
└── vercel.json               # Configuration Vercel
```

## Compte Admin par Défaut

| Email | Mot de passe |
|-------|--------------|
| `admin@immogest.com` | `Admin@2025!` |

> ⚠️ Changez le mot de passe à la première connexion en production.
