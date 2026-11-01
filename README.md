# WebXR Phòng Trưng Bày Động Vật 3D

> Đồ án WebXR – Sinh viên năm 3 | A-Frame + Three.js/WebXR API  
> Tham quan phòng trưng bày động vật ảo với 10 loài 3D tương tác

---

## 📋 Mô tả dự án

Ứng dụng WebXR cho phép người dùng:
- Tham quan **phòng trưng bày ảo** với 10 loài động vật 3D
- **Click/gaze** vào từng loài để xem thông tin chi tiết
- **Di chuyển tự do** bằng phím WASD / chuột
- **Teleport** nhanh đến từng khu bằng nav bar
- Vào **chế độ VR nhập vai** khi có kính tương thích WebXR

---

## 🦁 10 Loài động vật

| # | Tên | Tên khoa học | Tình trạng |
|---|-----|-------------|-----------|
| 1 | 🐘 Voi châu Phi | *Loxodonta africana* | Dễ bị tổn thương |
| 2 | 🐯 Hổ Bengal | *Panthera tigris tigris* | Nguy cấp |
| 3 | 🦒 Hươu cao cổ | *Giraffa camelopardalis* | Dễ bị tổn thương |
| 4 | 🦓 Ngựa vằn | *Equus quagga* | Ít lo ngại |
| 5 | 🦁 Sư tử | *Panthera leo* | Dễ bị tổn thương |
| 6 | 🐻 Gấu nâu | *Ursus arctos* | Ít lo ngại |
| 7 | 🦍 Khỉ đột | *Gorilla gorilla* | Nguy cấp |
| 8 | 🐊 Cá sấu Nile | *Crocodylus niloticus* | Ít lo ngại |
| 9 | 🐧 Chim cánh cụt hoàng đế | *Aptenodytes forsteri* | Dễ bị tổn thương |
| 10 | 🐢 Rùa da | *Dermochelys coriacea* | Dễ bị tổn thương |

---

## 🚀 Cài đặt và chạy

### Yêu cầu
- **Node.js** v16+ ([nodejs.org](https://nodejs.org))
- Trình duyệt hiện đại: Chrome 90+, Firefox 90+, Edge 90+

### Chạy nhanh (Windows)
```bat
double-click start.bat
```
Hoặc mở terminal:
```bash
cd d:\Code\webxr-animals
node server.js
```
Mở trình duyệt: **http://localhost:3000**

---

## 🥽 Chế độ VR nhập vai (immersive-vr)

### Yêu cầu
- Kính VR tương thích WebXR (Meta Quest 2/3, HTC Vive, v.v.)
- Kết nối cùng mạng LAN với máy tính chạy server
- **Bắt buộc HTTPS** (localhost được miễn trừ)

### Tạo chứng chỉ SSL cho LAN
```bat
double-click gen-cert.bat
```
Sau đó chạy server HTTPS:
```bash
node server.js --https
```
Trên kính VR: mở trình duyệt → `https://<IP-máy-tính>:3443`  
(Chấp nhận cảnh báo cert tự ký lần đầu)

---

## 🕹️ Điều khiển

| Phím / Thao tác | Chức năng |
|----------------|-----------|
| `W A S D` | Di chuyển tiến/lui/trái/phải |
| `↑ ↓ ← →` | Di chuyển bằng phím mũi tên |
| Giữ + kéo chuột | Nhìn xung quanh |
| Click chuột | Chọn xem thông tin động vật |
| `R` | Về vị trí ban đầu |
| `H` | Ẩn/hiện hướng dẫn |
| `Esc` | Đóng bảng thông tin |
| `1` – `0` | Teleport nhanh tới loài 1–10 |
| Nút `🥽 VR` | Vào chế độ VR nhập vai |

---

## 📁 Cấu trúc dự án

```
webxr-animals/
├── index.html          # Trang chính (A-Frame scene + UI)
├── server.js           # Máy chủ Node.js (HTTP + HTTPS)
├── start.bat           # Khởi động nhanh (Windows)
├── gen-cert.bat        # Tạo SSL cert cho HTTPS/VR
├── README.md           # Tài liệu này
├── css/
│   └── style.css       # Giao diện UI overlay
├── js/
│   ├── animals-data.js # Dữ liệu 10 loài động vật
│   ├── scene-builder.js# Xây dựng scene 3D A-Frame
│   └── main.js         # Logic UI, VR, tương tác
└── assets/             # (Thư mục để đặt .glb khi có)
    └── models/
```

---

## 🔧 Thêm mô hình GLB thực (tùy chọn)

Dự án hiện sử dụng **procedural primitives** (hình học A-Frame ghép lại) để đảm bảo chạy được ngay mà không cần tải asset ngoài.

Để thay thế bằng mô hình GLB thực:

1. Tải file `.glb` từ nguồn có phép (Sketchfab CC-BY/CC0, Google Poly, v.v.)
2. Đặt vào `assets/models/`
3. Trong `index.html`, thêm vào `<a-assets>`:
   ```html
   <a-asset-item id="voi" src="assets/models/elephant.glb"></a-asset-item>
   ```
4. Trong `scene-builder.js`, thay hàm `buildAnimalModel()` cho loài tương ứng:
   ```javascript
   // Thay buildElephant() bằng:
   const model = el('a-gltf-model', { src: '#voi', scale: '1 1 1' });
   g.appendChild(model);
   ```

---

## 📊 Ca kiểm thử (Test Cases)

| # | Chức năng | Điều kiện | Kết quả kỳ vọng |
|---|-----------|-----------|----------------|
| TC01 | Hiển thị 10 loài | Mở trang → bắt đầu | Thấy 10 khu trưng bày |
| TC02 | Xem thông tin | Click vào từng mô hình | Bảng info hiện đúng dữ liệu |
| TC03 | Di chuyển WASD | Nhấn W/A/S/D | Camera di chuyển tự nhiên |
| TC04 | Teleport nav | Nhấn nút nav bar | Teleport mượt đến khu |
| TC05 | Reset vị trí | Nhấn R | Về điểm xuất phát |
| TC06 | Keyboard 1–10 | Nhấn phím số | Teleport đến loài tương ứng |
| TC07 | Nút VR | Có kính VR tương thích | Vào chế độ immersive-vr |
| TC08 | Thoát VR | Nhấn nút thoát VR | Về chế độ desktop, UI hiện lại |
| TC09 | Gaze VR | Nhìn vào mô hình ≥2s | Highlight ring sáng lên |
| TC10 | Di động | Trình duyệt mobile | Chạm để chọn, kéo để nhìn |

---

## 📝 Nguồn tham khảo

- **A-Frame**: https://aframe.io (MIT License)
- **A-Frame Extras**: https://github.com/c-frame/aframe-extras (MIT License)
- **WebXR Device API**: https://www.w3.org/TR/webxr/
- **MDN WebXR Guide**: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
- Dữ liệu động vật: IUCN Red List (https://www.iucnredlist.org)

---

## ⚙️ Thiết bị & Cấu hình

**Thiết bị phát triển:**
- Laptop/PC Windows với RAM ≥ 8 GB (khuyến nghị 16 GB)
- Chuột và bàn phím
- Mạng Internet để tải thư viện CDN

**Phần mềm:**
- VS Code (IDE)
- Node.js v16+ (server)
- Chrome / Edge / Firefox (trình duyệt)
- HTML5 + CSS3 + JavaScript ES6+
- A-Frame v1.6.0 (WebXR framework)

**Thiết bị VR (cần để nghiệm thu VR):**
- Kính VR tương thích WebXR immersive-vr
- (VD: Meta Quest 2/3 với trình duyệt Meta Browser / Firefox Reality)
- Kết nối cùng mạng LAN, truy cập qua HTTPS

---

*Đồ án môn Công nghệ Web 3D / WebXR – Sinh viên năm 3*
