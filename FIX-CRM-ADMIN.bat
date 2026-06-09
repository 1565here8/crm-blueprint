@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo  CurioCRM (wallstreet-sim) — fix admin.etoropros.com
echo  One click: patch VPS wallstreet-sim + restart
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js not found. Install Node or open this folder in Cursor and run again.
  echo.
  pause
  exit /b 1
)

if not defined ETOROPROS_DEPLOY_HOST set "ETOROPROS_DEPLOY_HOST=80.78.30.85"
if not defined ETOROPROS_DEPLOY_USER set "ETOROPROS_DEPLOY_USER=root"
if not defined ETOROPROS_SSH_KEY set "ETOROPROS_SSH_KEY=%USERPROFILE%\.ssh\njalla_etoropros"

if not exist "%ETOROPROS_SSH_KEY%" (
  echo  ERROR: SSH key not found:
  echo    %ETOROPROS_SSH_KEY%
  echo.
  echo  Copy your Njalla key to that path, or set ETOROPROS_SSH_KEY in .env
  echo  See ETOROPROS-ONLY-THIS-FOLDER.txt
  echo.
  pause
  exit /b 1
)

where ssh >nul 2>&1
if errorlevel 1 (
  echo  ERROR: OpenSSH client not found.
  echo  Windows: Settings - Apps - Optional features - OpenSSH Client
  echo.
  pause
  exit /b 1
)

echo  Host: %ETOROPROS_DEPLOY_HOST%
echo  User: %ETOROPROS_DEPLOY_USER%
echo  Key:  %ETOROPROS_SSH_KEY%
echo.

node scripts/crm-fix-admin-live.mjs
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo  Fix did not complete. Check messages above.
  echo.
  pause
  exit /b %RC%
)

echo.
echo  Opening CRM admin in your browser...
start "" "https://admin.etoropros.com/admin"
echo.
echo  Done. If the page still fails, wait 30 seconds and refresh.
echo.
pause
exit /b 0
