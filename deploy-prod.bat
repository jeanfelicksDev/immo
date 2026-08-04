@echo off
echo ===================================================
echo   Deploiement Automatique d'ImmoGest en Production
echo ===================================================
echo.

echo [1/3] Ajout des fichiers de configuration de production...
git add .

echo.
echo [2/3] Commit des modifications de production...
git commit -m "fix: allow cascade deletion for proprietaires, maisons, and locataires" --allow-empty

echo.
echo [3/3] Push vers GitHub pour declencher Vercel et Render...
git push origin main
if %errorlevel% neq 0 (
    git push
)

echo.
echo ===================================================
echo   [SUCCES] Code pousse vers GitHub avec succes !
echo   - Vercel et Render ont lance le deploiement.
echo   - Votre application sera en ligne dans ~2 minutes.
echo ===================================================
echo.
pause
