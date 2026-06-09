@echo off
title Install CurioCRM auto-start
cd /d "%~dp0"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LINK=%STARTUP%\CurioCRM-GO-LIVE-AUTO.bat"

echo Creating startup shortcut...
(
  echo @echo off
  echo cd /d "%~dp0"
  echo start "CurioCRM" /min "%~dp0GO-LIVE-AUTO.bat"
) > "%LINK%"

echo.
echo  DONE.
echo  CurioCRM will start automatically when you log in to Windows.
echo  It runs minimized — look for "CurioCRM AUTO" in the taskbar.
echo.
echo  To remove later: delete this file:
echo  %LINK%
echo.
pause
