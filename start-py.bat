@echo off
echo ======================================================
echo  WebXR Phong Trung Bay Dong Vat 3D - Python Server
echo ======================================================
echo.

where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay Python trong PATH!
    echo Vui long kiem tra lai cai dat Python 3.
    pause
    exit /b 1
)

echo [OK] Python da san sang. Dang khoi dong may chu...
python server.py
pause
