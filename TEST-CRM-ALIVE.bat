@echo off
echo.
echo  Step 1 — Is the VPS reachable from your PC?
echo  Opening health check in browser...
echo.
start "" "https://etoropros.com/api/health"
timeout /t 2 >nul
echo.
echo  You should see:  {"ok":true,"service":"wallstreet-sim"}
echo.
echo  If that page is blank or error — your PC cannot reach the server
echo  (firewall, VPN, or wrong network). Fix that first.
echo.
pause
