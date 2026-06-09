@echo off
title Clean Nodes — free RAM, stop local servers
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

if /i "%~1"=="--off" (
  node scripts\clean-nodes.mjs --off
  goto :done
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js not found. Install from https://nodejs.org
  echo  Or manually close: CurioCRM-api window, Ollama, cloudflared
  echo.
  pause
  exit /b 1
)

node scripts\clean-nodes.mjs

:done
echo.
pause
