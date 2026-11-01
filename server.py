#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
server.py
Máy chủ phát triển WebXR viết bằng Python 3 (không cần cài thêm thư viện ngoài).
Chạy: python server.py
Tự động mở trình duyệt: http://localhost:8080
"""

import http.server
import socketserver
import socket
import os
import sys
import webbrowser

# Đảm bảo mã hóa UTF-8 trên Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8080
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# Bổ sung MIME types cho mô hình 3D và WebXR
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.bin': 'application/octet-stream',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wasm': 'application/wasm'
}

class WebXRRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in MIME_TYPES:
            return MIME_TYPES[ext]
        return super().guess_type(path)

    def end_headers(self):
        # Header cần thiết cho WebXR và hiệu năng cao
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Rút gọn log console cho sạch
        sys.stdout.write(f"  [{self.log_date_time_string()}] {args[0]}\n")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def main():
    os.chdir(ROOT_DIR)
    local_ip = get_local_ip()
    port = PORT

    # Thử bind port, nếu bận thì tăng dần
    httpd = None
    for p in range(port, port + 10):
        try:
            httpd = socketserver.TCPServer(('', p), WebXRRequestHandler)
            port = p
            break
        except OSError:
            continue

    if not httpd:
        print(f"❌ Không thể mở cổng từ {PORT} đến {PORT+10}. Vui lòng kiểm tra lại!")
        sys.exit(1)

    print("\n" + "=" * 55)
    print("🌿 WEBXR PHÒNG TRƯNG BÀY ĐỘNG VẬT 3D - PYTHON SERVER")
    print("=" * 55)
    print(f"  🖥️  Chạy tại máy:       http://localhost:{port}")
    print(f"  📱 Mạng nội bộ (LAN):  http://{local_ip}:{port}")
    print("=" * 55)
    print("  Nhấn Ctrl+C để dừng máy chủ.\n")

    # Mở trình duyệt sau 0.5s
    webbrowser.open(f"http://localhost:{port}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Đã dừng máy chủ thành công.")
        httpd.server_close()

if __name__ == '__main__':
    main()
