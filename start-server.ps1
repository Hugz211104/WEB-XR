param([int]$Port = 3000)
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "WebXR Dong Vat 3D - PowerShell Server" -ForegroundColor Green
Write-Host "Dang chay tai: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Nhan Ctrl+C de dung." -ForegroundColor Yellow
Write-Host ""

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".mp3"  = "audio/mpeg"
    ".woff2"= "font/woff2"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "[OK] Server dang chay. Mo trinh duyet..." -ForegroundColor Green
    Start-Process "http://localhost:$Port"

    while ($listener.IsListening) {
        $context  = $listener.GetContext()
        $request  = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.AbsolutePath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        $urlPath = [System.Uri]::UnescapeDataString($urlPath)

        $relative = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $relative))

        if (-not $filePath.StartsWith($Root)) {
            $response.StatusCode = 403
            $response.OutputStream.Close()
            continue
        }

        if ([System.IO.File]::Exists($filePath)) {
            $ext  = [System.IO.Path]::GetExtension($filePath).ToLower()
            if ($MimeTypes.ContainsKey($ext)) {
                $mime = $MimeTypes[$ext]
            } else {
                $mime = "application/octet-stream"
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.Headers.Add("Cache-Control", "no-cache")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  200 $urlPath" -ForegroundColor DarkGray
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $notFound.Length
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
            Write-Host "  404 $urlPath" -ForegroundColor Yellow
        }

        $response.OutputStream.Close()
    }
} catch {
    Write-Host "Loi: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) { $listener.Stop() }
    Write-Host "Server da dung." -ForegroundColor Yellow
}
