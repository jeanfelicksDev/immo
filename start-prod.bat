@echo off
echo ===================================================
echo   ImmoGest - Outils de Developpement Local
echo   (PostgreSQL + pgAdmin via Docker)
echo ===================================================
echo.

:: Vérifier si Docker est disponible
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Docker n'est pas detecte. Veuillez lancer Docker Desktop d'abord.
    pause
    exit /b 1
)

echo [1/3] Arret des conteneurs existants...
docker compose down

echo.
echo [2/3] Lancement de PostgreSQL et pgAdmin...
docker compose up -d

echo.
echo [3/3] Verification de l'etat des services...
docker compose ps

echo.
echo ===================================================
echo   Services disponibles :
echo   - pgAdmin   : http://localhost:5050
echo     (Email: admin@immogest.com / Mdp: Admin@2025!)
echo   - PostgreSQL: localhost:5433
echo.
echo   Pour l'application, utilisez :
echo   - Production : https://immogest-app-ten.vercel.app
echo   - Dev local  : cd frontend && npm run dev
echo ===================================================
echo.
pause
