@echo off
title SmartGridFaultAI Launcher
echo =======================================================
echo          Starting SmartGridFaultAI Services
echo =======================================================
echo.

echo [1/2] Launching Backend Server on http://127.0.0.1:8000 ...
start "SmartGridFaultAI - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python run_backend.py"

echo [2/2] Launching Frontend Development Server on http://localhost:5173 ...
start "SmartGridFaultAI - Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo Both services have been started in separate windows!
echo - Web Dashboard: http://localhost:5173
echo - API Documentation: http://127.0.0.1:8000/docs
echo =======================================================
