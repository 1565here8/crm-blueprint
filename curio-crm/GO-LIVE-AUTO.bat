@echo off
title CurioCRM AUTO - do not close
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\cloudflared;%PATH%"

echo.
echo  CurioCRM AUTO-LIVE
echo  ===================
echo  Keeps site online. Auto-restarts if app or tunnel crashes.
echo  Public: https://www.CurioCRM.com
echo  Admin:  https://admin.CurioCRM.com/admin
echo.

where node >nul 2>&1 || (echo Install Node.js from nodejs.org & pause & exit /b 1)
where cloudflared >nul 2>&1 || winget install -e --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements

if not exist "dist\index.html" (
  echo First run — building site...
  call npm run build
)

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
ping -n 2 127.0.0.1 >nul

node scripts\watch-live.mjs
pause
