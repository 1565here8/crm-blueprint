@echo off
cd /d "%~dp0"
echo Syncing gate HTML from My_network_App...
node scripts\build-invite-gate.mjs
if errorlevel 1 exit /b 1
echo Done. index.html + dist\index.html updated.
exit /b 0
