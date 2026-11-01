/**
 * server.js
 * Máy chủ WebXR HTTP/HTTPS viết bằng Node.js tiêu chuẩn (không cần cài npm packages).
 * Chạy: node server.js
 * Hoặc: npm start
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { exec } = require('child_process');

let PORT_HTTP  = process.env.PORT || 8080;
const PORT_HTTPS = 3443;
const ROOT_DIR   = __dirname;

/* ─── MIME types ─────────────────────────────────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.glb':  'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin':  'application/octet-stream',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.wasm': 'application/wasm',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
};

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function openBrowser(url) {
  const start = (process.platform === 'darwin' ? 'open': process.platform === 'win32' ? 'start': 'xdg-open');
  exec(`${start} ${url}`, (err) => {
    if (err) console.log(`  👉 Mở trình duyệt tại: ${url}`);
  });
}

/* ─── Request handler ────────────────────────────────────────────── */
function handleRequest(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT_DIR, decodeURIComponent(urlPath));

  // Bảo mật: tránh path traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 Không tìm thấy: ${urlPath}`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Lỗi máy chủ');
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': data.length,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

/* ─── Khởi động HTTP Server ──────────────────────────────────────── */
function startServer(port) {
  const server = http.createServer(handleRequest);

  server.listen(port, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`\n======================================================`);
    console.log(`🌿 WEBXR PHÒNG TRƯNG BÀY ĐỘNG VẬT 3D - NODE.JS SERVER`);
    console.log(`======================================================`);
    console.log(`  🖥️  Chạy tại máy:       http://localhost:${port}`);
    console.log(`  📱 Mạng nội bộ (LAN):  http://${localIp}:${port}`);
    console.log(`======================================================`);
    console.log(`  Nhấn Ctrl+C để dừng máy chủ.\n`);

    openBrowser(`http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Cổng ${port} đã có ứng dụng dùng. Đang thử cổng ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Lỗi khởi động server:', err.message);
    }
  });
}

startServer(PORT_HTTP);

/* ─── HTTPS Server (Tùy chọn cho kính VR thực tế) ─────────────────── */
if (process.argv.includes('--https')) {
  const certPath = path.join(__dirname, 'certs');
  try {
    const keyFile = path.join(certPath, 'key.pem');
    const certFile = path.join(certPath, 'cert.pem');
    if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
      const opts = {
        key:  fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile)
      };
      const httpsServer = https.createServer(opts, handleRequest);
      httpsServer.listen(PORT_HTTPS, '0.0.0.0', () => {
        console.log(`  🔒 HTTPS (Kính VR):   https://localhost:${PORT_HTTPS}`);
      });
    }
  } catch (e) {
    console.warn(`  ⚠️ HTTPS chưa sẵn sàng: ${e.message}`);
  }
}
