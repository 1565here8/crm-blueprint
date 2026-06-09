@echo off
title Copy this key to GitHub Secrets
echo.
echo  Copy EVERYTHING below the line into GitHub secret VPS_SSH_KEY
echo  GitHub: ethor770 - Settings - Secrets - Actions - New secret
echo.
echo  VPS_HOST = 80.78.30.85
echo  VPS_USER = root
echo.
echo ========== START COPY ==========
type "%USERPROFILE%\.ssh\njalla_key"
echo ========== END COPY ==========
echo.
pause
