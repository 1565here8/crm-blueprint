@echo off
setlocal
cd /d "%~dp0"

echo.
echo  CURIONILABS - sync gate from My_network_App + upload Porkbun
echo  https://curionilabs.com  (static HTML only — API on Jersey Node)
echo  IMPORTANT: Delete old dist/assets on Porkbun if an old React build remains.
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo  Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  npm install...
  call npm install
  if errorlevel 1 goto :fail
)

echo  Building...
call npm run build
if errorlevel 1 goto :fail

if exist ".env.porkbun" (
  echo  Uploading dist to Porkbun FTP...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\upload-porkbun-ftp.ps1"
  if errorlevel 1 goto :fail
  echo.
  echo  DONE - open https://curionilabs.com
) else (
  echo.
  echo  No .env.porkbun yet - built only.
  echo  Copy .env.porkbun.example to .env.porkbun
  echo  Paste FTP creds from Porkbun Static Hosting page, then run this bat again.
  echo  Or upload dist\ manually in Porkbun file manager.
  start "" "%~dp0dist"
)

echo.
pause
exit /b 0

:fail
echo  Failed.
pause
exit /b 1
