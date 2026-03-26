@echo off
set PORT=3000
echo Checking if Competitor Social Scraper server is running on port %PORT%...

netstat -ano | findstr :%PORT% > nul
if %errorlevel% equ 0 (
    echo Server already running.
) else (
    echo Installing dependencies...
    call npm install
    echo Starting local server...
    start /b node server.mjs
    echo Waiting for server to initialize...
    timeout /t 5 /nobreak > nul
)

echo Opening application in browser...
start http://localhost:%PORT%
exit
