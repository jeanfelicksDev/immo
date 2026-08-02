# ImmoGest SaaS — Guide de Démarrage Rapide

## 🚀 Démarrage en une commande

```bash
# 1. Copier les variables d'environnement
cp .env.example .env

# 2. Lancer toute la stack (API + Frontend + PostgreSQL + pgAdmin)
docker-compose up -d

# 3. Suivre les logs
docker-compose logs -f
```

| Service   | URL                           | Identifiants par défaut               |
|-----------|-------------------------------|---------------------------------------|
| Frontend  | http://localhost:3000         | admin@immogest.com / Admin@2025!      |
| API       | http://localhost:5000         | —                                     |
| Swagger   | http://localhost:5000/swagger | —                                     |
| pgAdmin   | http://localhost:5050         | admin@immogest.com / Admin@2025!      |
| Health    | http://localhost:5000/health  | —                                     |

---

## 📁 Structure des Fichiers Générés

```
ImmoGest/
├── docker-compose.yml              ← Stack complète
├── .env.example                    ← Template variables d'env
├── database/
│   ├── init.sql                    ← DDL PostgreSQL complet
│   └── seed.sql                    ← Données de test
│
├── backend/
│   ├── Dockerfile                  ← Build multi-stage .NET 8
│   ├── ImmoGest.sln
│   └── src/
│       ├── ImmoGest.Domain/
│       │   ├── Common/BaseEntity.cs        ← Audit fields
│       │   ├── Entities/Entities.cs        ← 7 entités C#
│       │   └── Enums/Enums.cs              ← 5 enums
│       ├── ImmoGest.Application/
│       │   ├── DTOs/DTOs.cs                ← Tous les DTOs
│       │   └── Interfaces/IServices.cs     ← Interfaces services
│       ├── ImmoGest.Infrastructure/
│       │   ├── Data/AppDbContext.cs         ← EF Core + audit auto
│       │   ├── Data/Configurations/        ← Fluent API configs
│       │   ├── Security/JwtService.cs      ← JWT HS256
│       │   └── Services/
│       │       ├── AuthService.cs
│       │       ├── BusinessServices.cs
│       │       ├── ContractServices.cs
│       │       └── PdfService.cs
│       └── ImmoGest.API/
│           ├── Program.cs
│           ├── appsettings.json
│           └── Controllers/Controllers.cs  ← 7 controllers REST
│
└── frontend/
    ├── Dockerfile
    ├── next.config.js
    ├── tailwind.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── login/page.tsx
        │   ├── dashboard/page.tsx
        │   └── depenses/page.tsx
        ├── components/ui.tsx
        └── lib/api.ts
```

---

## 🗄️ Tables PostgreSQL

| Table         | Description                                       |
|---------------|---------------------------------------------------|
| utilisateurs  | Comptes (Admin / Gestionnaire / Agent) + JWT      |
| proprietaires | Propriétaires des biens                           |
| maisons       | Biens immobiliers (IDM unique auto-généré)        |
| locataires    | Locataires avec pièce d'identité                  |
| souscriptions | Contrats de location (caution, avance, durée)     |
| reglements    | Paiements de loyers mensuels (statut auto)        |
| depenses      | Dépenses globales / maison / locataire            |
| audit_logs    | Journal d'audit complet                           |

---

## 📡 Endpoints REST

```
POST   /api/auth/login                  → JWT
GET    /api/dashboard/kpis              → 8 KPIs
GET    /api/proprietaires               → Liste paginée
POST   /api/proprietaires               → Créer
PUT    /api/proprietaires/{id}          → Modifier
DELETE /api/proprietaires/{id}          → Supprimer (Admin)
GET    /api/maisons/generate-idm        → IDM automatique
GET    /api/souscriptions/{id}/print    → PDF contrat
GET    /api/reglements/{id}/recu        → Reçu PDF
GET    /api/reglements/recu-groupes     → Reçus groupés
POST   /api/reglements/batch            → Saisie multiple
GET    /api/depenses?type=              → Filtre par type
POST   /api/depenses/{id}/piece-justificative → Upload PJ
```

---

## 🔐 Matrice des Rôles

| Action                 | Admin | Gestionnaire | Agent |
|------------------------|:-----:|:------------:|:-----:|
| Créer / Modifier       | ✅    | ✅           | ❌    |
| Supprimer              | ✅    | ❌           | ❌    |
| Consulter              | ✅    | ✅           | ✅    |
| Créer des utilisateurs | ✅    | ❌           | ❌    |
| Saisir règlements      | ✅    | ✅           | ✅    |

---

## 🛠️ Développement Local (sans Docker)

```bash
# Backend — PostgreSQL doit tourner localement
cd backend
dotnet restore
dotnet ef migrations add InitialCreate --project src/ImmoGest.Infrastructure --startup-project src/ImmoGest.API
dotnet ef database update --project src/ImmoGest.Infrastructure --startup-project src/ImmoGest.API
dotnet run --project src/ImmoGest.API

# Frontend
cd frontend
npm install
npm run dev
```

---

## 📋 Prochaines Étapes

1. **Migrations EF Core** : générer la migration initiale
2. **Pages frontend** : propriétaires, maisons, locataires, souscriptions, règlements
3. **Tests** : xUnit + Testcontainers pour PostgreSQL
4. **CI/CD** : GitHub Actions → Docker Hub → déploiement cloud
5. **Multi-tenancy** : ajouter `AgenceId` sur chaque entité

---

## ⚠️ Production — Points Critiques

- Changer `JWT_SECRET` (min. 256 bits d'entropie)
- Activer HTTPS
- Configurer les sauvegardes PostgreSQL (`pg_dump`)
- Remplacer la fusion PDF basique par PdfSharp ou iText
