@echo off
setlocal
title CurioCRM - Publish to Live

set "PROJECT=C:\Users\torah\Desktop\wallstreet-sim"
set "GIT="
if exist "C:\Program Files\Git\bin\git.exe" set "GIT=C:\Program Files\Git\bin\git.exe"
if exist "C:\Program Files (x86)\Git\bin\git.exe" set "GIT=C:\Program Files (x86)\Git\bin\git.exe"

if not defined GIT (
  echo Git is not installed. Install from https://git-scm.com/download/win
  pause
  exit /b 1
)

cd /d "%PROJECT%" || exit /b 1

if not exist ".git" (
  echo First-time setup: linking to GitHub 1565here8/ethor770 ...
  "%GIT%" init
  "%GIT%" branch -M main
  "%GIT%" remote add origin https://github.com/1565here8/ethor770.git
  echo.
  echo If push fails, log in when the browser opens, then run this file again.
  echo.
)

echo.
echo === Files changed ===
"%GIT%" status -sb
echo.

set /p MSG=Commit message (or press Enter for "update"): 
if "%MSG%"=="" set "MSG=update"

"%GIT%" add -A
"%GIT%" commit -m "%MSG%" 2>nul
if errorlevel 1 (
  echo Nothing new to publish, or commit failed.
  pause
  exit /b 1
)

echo.
echo === Pushing to GitHub main - live deploy starts in ~2-3 min ===
"%GIT%" push -u origin main
if errorlevel 1 (
  echo.
  echo Push failed. Sign in to GitHub in the browser if asked, then run publish-live.bat again.
  pause
  exit /b 1
)

echo.
echo Done. Check deploy: https://github.com/1565here8/ethor770/actions
echo Live site: https://CurioCRM.com  (after VPS is set up)
echo.
pause
