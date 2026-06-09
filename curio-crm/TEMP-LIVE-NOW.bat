@echo off
title CurioCRM - Temporary Live Link
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo  TEMP LIVE - works while VPS access is broken
echo  Keep this window OPEN.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo Building site first...
  call npm run build
)

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo Installing cloudflared...
  winget install -e --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
)

echo Starting app on port 3002...
start "CurioCRM-api" cmd /k "set PORT=3002&& npm start"

echo Waiting 8 seconds...
ping -n 9 127.0.0.1 >nul

echo.
echo  YOUR TEMP LINK appears below in ~10 sec:
echo  Copy it and open in browser. Share that link until CurioCRM.com is fixed.
echo.
cloudflared tunnel --url http://127.0.0.1:3002
pause
