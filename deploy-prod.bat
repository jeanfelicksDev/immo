@echo off
echo ===================================================
echo   Deploiement ImmoGest vers Vercel (Production)
echo   Architecture : Vercel + Neon PostgreSQL
echo ===================================================
echo.

echo [1/3] Ajout des fichiers modifies...
git add .

echo.
echo [2/3] Commit des modifications...
git commit -m "deploy: mise a jour production ImmoGest" --allow-empty

echo.
echo [3/3] Push vers GitHub (declenche Vercel automatiquement)...
git push origin main
if %errorlevel% neq 0 (
    git push
)

echo.
echo ===================================================
echo   [SUCCES] Deploiement lance avec succes !
echo   - Vercel va reconstruire et deployer en ~1 minute.
echo   - Suivez l'avancement sur : https://vercel.com/dashboard
echo ===================================================
echo.
pause
