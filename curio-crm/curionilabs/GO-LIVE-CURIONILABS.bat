@echo off
setlocal
cd /d "%~dp0"
echo.
echo  curionilabs.com -> Porkbun Static Hosting (no VPS)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\porkbun-go-live.ps1"
set EC=%ERRORLEVEL%
echo.
pause
exit /b %EC%
