@echo off
title Factory Course Demo
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js first, then restart this file.
  pause
  exit /b 1
)
if not exist "node_modules\vue\dist\vue.global.prod.js" (
  echo Run npm install in this folder first.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:5173 in your browser after startup.
call npm.cmd start
pause
