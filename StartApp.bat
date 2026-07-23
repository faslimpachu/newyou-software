@echo off
setlocal

set PORT=3000

cd /d "%~dp0"

REM Check if the app is already running
curl -s http://localhost:%PORT% >nul 2>&1
if not errorlevel 1 (
    start "" msedge --app=http://localhost:%PORT%
    exit /b
)

REM Start the server
start "NewYou HMS Server" /min cmd /c "npm run start"

REM Wait until the server is ready
:wait
timeout /t 1 /nobreak >nul
curl -s http://localhost:%PORT% >nul 2>&1
if errorlevel 1 goto wait

REM Open in Edge App mode
start "" msedge --app=http://localhost:%PORT%

endlocal