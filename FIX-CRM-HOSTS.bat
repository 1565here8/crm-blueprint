@echo off
setlocal
echo.
echo  CurioCRM — fix "dead" redirect (typo domain has no public DNS)
echo.
echo  ADD THIS EXACT LINE to your hosts file:
echo.
echo    80.78.30.85 crm.xtoropro.com
echo.
echo  Spelling: x-t-o-r-o-p-r-o  (NOT xtorpro, NOT etoropros)
echo.
echo  Opening hosts file in Notepad AS ADMINISTRATOR...
echo  Click YES on the UAC prompt, paste the line at the bottom, SAVE.
echo.
powershell -NoProfile -Command "Start-Process notepad 'C:\Windows\System32\drivers\etc\hosts' -Verb RunAs"
echo.
echo  After you save hosts, press any key to flush DNS...
pause >nul
ipconfig /flushdns
echo.
echo  Opening CRM (use this URL after hosts fix):
start "" "https://crm.xtoropro.com/admin"
echo.
pause
