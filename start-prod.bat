@echo off
echo ===================================================
echo   Lancement d'ImmoGest SaaS en Mode Production
echo ===================================================
echo.

:: Vérifier si Docker est disponible
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Docker n'est pas detecte. Veillez lancer Docker Desktop d'abord.
    pause
    exit /b 1
)

echo [1/3] Verification des conteneurs en cours...
docker compose down

echo.
echo [2/3] Build et Lancement des conteneurs (Postgres, API, Frontend, pgAdmin)...
docker compose up -d --build

echo.
echo [3/3] Verification de l'etat des services...
docker compose ps

echo.
echo ===================================================
echo   Application disponible sur :
echo   - Frontend  : http://localhost:3000
echo   - Backend   : http://localhost:5055
echo   - pgAdmin   : http://localhost:5050
echo ===================================================
echo.
pause
