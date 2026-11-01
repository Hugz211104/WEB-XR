@echo off
title WebXR 3D Animals Server
cd /d "%~dp0"

echo ======================================================
echo  WebXR 3D Animals Gallery - Starting Server...
echo ======================================================
echo.

:: 1. Thu chay bang Python neu co
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Dang khoi dong may chu bang Python 3...
    python server.py
    if %ERRORLEVEL% equ 0 goto end
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Dang khoi dong may chu bang Python Launcher...
    py server.py
    if %ERRORLEVEL% equ 0 goto end
)

:: 2. Thu chay bang Node.js neu co
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Dang khoi dong may chu bang Node.js...
    node server.js
    if %ERRORLEVEL% equ 0 goto end
)

:: 3. Fallback chay bang PowerShell Server tich hop san tren Windows
echo [OK] Khoi dong may chu bang PowerShell Server...
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" -Port 3000

:end
pause
