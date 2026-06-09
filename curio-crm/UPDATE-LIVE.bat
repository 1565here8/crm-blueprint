@echo off
title CurioCRM - Push changes live
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo  UPDATE LIVE SITE
echo  ================
echo.

echo [1/3] Building frontend...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo [2/3] Restarting app on port 3002...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
ping -n 3 127.0.0.1 >nul
start "CurioCRM-api" cmd /k "cd /d %~dp0 && node scripts\start-live.mjs"

echo [3/3] Waiting for app...
ping -n 8 127.0.0.1 >nul

echo.
echo  DONE. Hard-refresh the site: Ctrl+Shift+R
echo  Keep GO-LIVE.bat open (tunnel). Only the app restarted.
echo.
pause
