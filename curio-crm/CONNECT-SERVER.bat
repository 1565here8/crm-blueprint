@echo off
title Connect to CurioCRM Server
echo.
echo  Connecting to your server...
echo  If it works you will see: root@unlimitedwealth
echo.
ssh -i "%USERPROFILE%\.ssh\njalla_key" root@80.78.30.85
echo.
if errorlevel 1 (
  echo  FAILED - key not saved in Njalla yet.
  echo  Open Njalla website, VPS page, Change SSH key, paste your key, Save, Restart VPS.
  echo.
)
pause
