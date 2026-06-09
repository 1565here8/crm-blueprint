@echo off
title CurioCRM — ELON SHIP
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Program Files\Git\bin;%PATH%"
echo.
echo  ELON SHIP — push code, VPS deploys via GitHub Actions
echo  =====================================================
echo.
node "%~dp0scripts\elon-ship.mjs" --push --open
echo.
pause
