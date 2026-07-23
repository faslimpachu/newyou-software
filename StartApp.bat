@echo off
cd /d "%~dp0"

start "" /min cmd /c "npm run start"

:wait
timeout /t 1 >nul
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 goto wait

start "" http://localhost:3000