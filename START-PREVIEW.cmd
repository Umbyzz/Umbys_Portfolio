@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js LTS, then open this launcher again.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8767"
node tools\preview.cjs
pause
