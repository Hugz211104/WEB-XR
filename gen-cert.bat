@echo off
echo ====================================================
echo  Tao Chung Chi SSL Tu Ky (Self-Signed Certificate)
echo  Danh cho WebXR HTTPS tren LAN / Kinh VR
echo ====================================================
echo.

where openssl >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay openssl.
    echo Cai dat Git for Windows (co kem OpenSSL) hoac tai:
    echo https://slproweb.com/products/Win32OpenSSL.html
    echo.
    pause
    exit /b 1
)

if not exist certs mkdir certs

echo Dang tao private key va certificate...
openssl req -x509 -newkey rsa:2048 -keyout certs\key.pem -out certs\cert.pem -days 365 -nodes -subj "/CN=localhost/O=WebXR Animals/C=VN" -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"

if %ERRORLEVEL% == 0 (
    echo.
    echo [OK] Tao cert thanh cong!
    echo   certs\key.pem  - Private key
    echo   certs\cert.pem - Certificate
    echo.
    echo Chay server voi HTTPS:
    echo   node server.js --https
    echo.
    echo Tren kinh VR: Mo trinh duyet va vao:
    echo   https://^<IP-may-tinh^>:3443
    echo   (Chap nhan canh bao cert tu ky lan dau)
) else (
    echo.
    echo [LOI] Tao cert that bai. Kiem tra openssl.
)
pause
