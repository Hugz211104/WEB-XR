/**
 * scene-builder.js
 * Xây dựng toàn bộ cảnh 3D: khu trưng bày, mô hình động vật,
 * nhãn tên (billboard – luôn quay về phía camera), nền trang trí,
 * đường đi và hàng rào bằng A-Frame primitives.
 *
 * Mỗi "khu trưng bày" gồm:
 *  - Nền platform tròn (màu theo môi trường sống)
 *  - Mô hình động vật dạng procedural (primitives ghép)
 *  - Biển tên nổi phía trên (tự quay về camera – billboard)
 *  - Collider hình cầu vô hình để bắt sự kiện click
 *
 * CHANGELOG (sửa lỗi):
 *  - Thêm billboard component cho biển tên (luôn hướng camera)
 *  - Fix: clickable sphere dùng class 'clickable' đúng selector
 *  - Fix: tránh duplicate event handlers
 *  - Fix: guard isSceneBuilt chống build 2 lần
 *  - Tối ưu: giảm segment cho sphere xa
 */

'use strict';

/* ─── A-Frame Component: Billboard (luôn quay mặt về camera) ──── */
if (typeof AFRAME !== 'undefined' && !AFRAME.components['billboard']) {
  AFRAME.registerComponent('billboard', {
    schema: {
      lockY: { type: 'boolean', default: true } // chỉ xoay trục Y
    },
    tick: function () {
      const camera = this.el.sceneEl.camera;
      if (!camera) return;

      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);

      const elPos = new THREE.Vector3();
      this.el.object3D.getWorldPosition(elPos);

      if (this.data.lockY) {
        // Chỉ xoay trục Y (biển tên không nghiêng)
        const dx = camPos.x - elPos.x;
        const dz = camPos.z - elPos.z;
        const angle = Math.atan2(dx, dz);
        this.el.object3D.rotation.y = angle;
      } else {
        this.el.object3D.lookAt(camPos);
      }
    }
  });
}

/* ─── Utility: tạo element A-Frame ─────────────────────────────── */
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    e.setAttribute(k, v);
  }
  children.forEach(c => e.appendChild(c));
  return e;
}

function vec3(x, y, z) { return `${x} ${y} ${z}`; }

/* ─── Màu sắc platform theo môi trường ─────────────────────────── */
function getPlatformColor(habitat) {
  if (habitat.includes('châu Phi') || habitat.includes('thảo nguyên')) return '#8B7355';
  if (habitat.includes('rừng nhiệt')) return '#2d5a3d';
  if (habitat.includes('rừng ôn')) return '#5a7a5a';
  if (habitat.includes('Nam Cực') || habitat.includes('biển đóng')) return '#a8d0e6';
  if (habitat.includes('biển') || habitat.includes('đại dương')) return '#1a5276';
  if (habitat.includes('sông') || habitat.includes('đầm')) return '#1e6b4a';
  return '#7a7a5a';
}

/* ─── Tạo cây trang trí quanh khu ──────────────────────────────── */
function makeTree(x, y, z, height = 3, color = '#2d5a3d') {
  const trunk = el('a-cylinder', {
    position: vec3(x, y + height * 0.3, z),
    radius: 0.12,
    height: height * 0.6,
    color: '#8B4513',
    'shadow': 'cast:true'
  });
  const canopy1 = el('a-cone', {
    position: vec3(x, y + height * 0.6 + 0.8, z),
    'radius-bottom': height * 0.45,
    'radius-top': 0,
    height: height * 0.7,
    color: color,
    'shadow': 'cast:true'
  });
  const canopy2 = el('a-cone', {
    position: vec3(x, y + height * 0.8 + 0.8, z),
    'radius-bottom': height * 0.35,
    'radius-top': 0,
    height: height * 0.6,
    color: adjustColor(color, 15),
    'shadow': 'cast:true'
  });
  return [trunk, canopy1, canopy2];
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ─── Mô hình 3D từng loài: Hỗ trợ nạp file .glb với fallback procedural ─ */
function buildAnimalModel(animal) {
  const g = el('a-entity', {
    'class': 'animal-model',
    position: vec3(0, 0, 0)
  });
  const s = animal.scale;
  const c = animal.bodyColor;

  // Nhóm mô hình procedural dựng sẵn
  const procGroup = el('a-entity', { id: `proc-${animal.id}` });
  switch (animal.shape) {
    case 'elephant': buildElephant(procGroup, s, c); break;
    case 'tiger':    buildTiger(procGroup, s, c); break;
    case 'giraffe':  buildGiraffe(procGroup, s, c); break;
    case 'zebra':    buildZebra(procGroup, s, c); break;
    case 'lion':     buildLion(procGroup, s, c); break;
    case 'bear':     buildBear(procGroup, s, c); break;
    case 'gorilla':  buildGorilla(procGroup, s, c); break;
    case 'crocodile':buildCrocodile(procGroup, s, c); break;
    case 'penguin':  buildPenguin(procGroup, s, c); break;
    case 'turtle':   buildTurtle(procGroup, s, c); break;
    default:         buildGenericAnimal(procGroup, s, c); break;
  }
  g.appendChild(procGroup);

  // Nếu có file .glb tương ứng
  if (animal.modelUrl) {
    const glbScale = animal.glbScale !== undefined ? animal.glbScale : animal.scale;
    const glbOffsetY = animal.glbOffsetY !== undefined ? animal.glbOffsetY : 0;

    const glbModel = el('a-entity', {
      'gltf-model': animal.modelUrl,
      'class': 'clickable',
      'data-animal': animal.id,
      position: vec3(0, glbOffsetY, 0),
      scale: `${glbScale} ${glbScale} ${glbScale}`,
      'shadow': 'cast:true',
      'animation-mixer': 'clip: *; loop: repeat'
    });

    // Khi file .glb tải thành công thì ẩn mô hình procedural
    glbModel.addEventListener('model-loaded', () => {
      procGroup.setAttribute('visible', 'false');
      console.log(`[Asset 3D] Đã nạp file GLB thành công cho: ${animal.name}`);
    });

    // Nếu chưa có file .glb hoặc lỗi thì tự động giữ nguyên mô hình procedural
    glbModel.addEventListener('model-error', () => {
      glbModel.setAttribute('visible', 'false');
      console.log(`[Asset 3D] Không tìm thấy GLB cho ${animal.name} — dùng mô hình procedural.`);
    });

    g.appendChild(glbModel);
  }

  return g;
}

/* ── Voi ── */
function buildElephant(g, s, c) {
  // Thân
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.8, 0), radius: s*0.55, scale: `${s*1.27} ${s} ${s*0.91}`, color: c, 'shadow':'cast:true' }));
  // Đầu
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.55, s*0.55), radius: s*0.45, color: c, 'shadow':'cast:true' }));
  // Vòi (ống hình trụ cong dùng nhiều đoạn)
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    g.appendChild(el('a-sphere', {
      position: vec3(0, s*(1.3 - t*0.5), s*(0.9 + t*0.25)),
      radius: s*(0.12 - t*0.03),
      color: c
    }));
  }
  // Tai
  g.appendChild(el('a-sphere', { position: vec3(-s*0.5, s*1.5, s*0.3), 'scale': `${s*0.05} ${s*0.45} ${s*0.35}`, color: adjustColor(c,-20), 'shadow':'cast:true' }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.5, s*1.5, s*0.3), 'scale': `${s*0.05} ${s*0.45} ${s*0.35}`, color: adjustColor(c,-20), 'shadow':'cast:true' }));
  // Chân (4 chân)
  [[-0.4,-0.3],[0.4,-0.3],[-0.4,0.3],[0.4,0.3]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.25, lz*s), radius: s*0.14, height: s*0.5, color: c, 'shadow':'cast:true' }));
  });
  // Đuôi
  g.appendChild(el('a-cylinder', { position: vec3(0, s*0.9, -s*0.55), radius: s*0.05, height: s*0.35, rotation: '30 0 0', color: c }));
  // Ngà
  g.appendChild(el('a-cone', { position: vec3(-s*0.15, s*1.25, s*1.1), 'radius-bottom': s*0.07, 'radius-top': 0, height: s*0.4, rotation: '60 -20 0', color: '#FFFACD' }));
  g.appendChild(el('a-cone', { position: vec3(s*0.15, s*1.25, s*1.1), 'radius-bottom': s*0.07, 'radius-top': 0, height: s*0.4, rotation: '60 20 0', color: '#FFFACD' }));
}

/* ── Hổ ── */
function buildTiger(g, s, c) {
  // Thân
  g.appendChild(el('a-box', { position: vec3(0, s*0.55, 0), width: s*0.55, height: s*0.45, depth: s*1.0, color: c, 'shadow':'cast:true' }));
  // Đầu
  g.appendChild(el('a-box', { position: vec3(0, s*0.85, s*0.55), width: s*0.45, height: s*0.38, depth: s*0.4, color: c, 'shadow':'cast:true' }));
  // Mõm
  g.appendChild(el('a-box', { position: vec3(0, s*0.75, s*0.77), width: s*0.25, height: s*0.2, depth: s*0.2, color: '#f5cba7' }));
  // Tai
  g.appendChild(el('a-cone', { position: vec3(-s*0.18, s*1.1, s*0.5), 'radius-bottom': s*0.1, 'radius-top': 0, height: s*0.15, color: c }));
  g.appendChild(el('a-cone', { position: vec3(s*0.18, s*1.1, s*0.5), 'radius-bottom': s*0.1, 'radius-top': 0, height: s*0.15, color: c }));
  // Sọc (trang trí)
  for (let i = 0; i < 4; i++) {
    g.appendChild(el('a-box', { position: vec3(0, s*0.6, s*(0.1 - i*0.2)), width: s*0.56, height: s*0.08, depth: s*0.06, color: '#1a1a1a' }));
  }
  // Chân
  [[-0.22,-0.4],[0.22,-0.4],[-0.22,0.4],[0.22,0.4]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.15, lz*s), radius: s*0.09, height: s*0.3, color: c, 'shadow':'cast:true' }));
  });
  // Đuôi
  g.appendChild(el('a-cylinder', { position: vec3(0, s*0.7, -s*0.65), radius: s*0.05, height: s*0.45, rotation: '30 0 0', color: c }));
}

/* ── Hươu cao cổ ── */
function buildGiraffe(g, s, c) {
  const spotC = '#8B4513';
  // Thân
  g.appendChild(el('a-box', { position: vec3(0, s*0.55, 0), width: s*0.42, height: s*0.45, depth: s*0.75, color: c, 'shadow':'cast:true' }));
  // Cổ dài
  g.appendChild(el('a-cylinder', { position: vec3(0, s*1.45, s*0.3), radius: s*0.12, height: s*1.8, rotation: '15 0 0', color: c, 'shadow':'cast:true' }));
  // Đầu
  g.appendChild(el('a-box', { position: vec3(0, s*2.5, s*0.55), width: s*0.22, height: s*0.2, depth: s*0.35, color: c, 'shadow':'cast:true' }));
  // Tai
  g.appendChild(el('a-cone', { position: vec3(-s*0.13, s*2.65, s*0.48), 'radius-bottom': s*0.06, 'radius-top': 0, height: s*0.14, color: c }));
  g.appendChild(el('a-cone', { position: vec3(s*0.13, s*2.65, s*0.48), 'radius-bottom': s*0.06, 'radius-top': 0, height: s*0.14, color: c }));
  // Ossicones (sừng nhỏ)
  g.appendChild(el('a-cylinder', { position: vec3(-s*0.08, s*2.78, s*0.5), radius: s*0.03, height: s*0.14, color: spotC }));
  g.appendChild(el('a-cylinder', { position: vec3(s*0.08, s*2.78, s*0.5), radius: s*0.03, height: s*0.14, color: spotC }));
  // Đốm
  [[0.1,0.7,0.1],[-0.12,0.65,-0.05],[0.08,0.5,-0.15],[-0.05,0.75,-0.2]].forEach(([dx,dy,dz]) => {
    g.appendChild(el('a-sphere', { position: vec3(dx*s, dy*s, dz*s), radius: s*0.08, color: spotC, opacity: '0.8' }));
  });
  // Chân dài
  [[-0.18,-0.35],[0.18,-0.35],[-0.18,0.35],[0.18,0.35]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.2, lz*s), radius: s*0.07, height: s*0.5, color: c, 'shadow':'cast:true' }));
  });
}

/* ── Ngựa vằn ── */
function buildZebra(g, s, c) {
  // Thân (trắng)
  g.appendChild(el('a-box', { position: vec3(0, s*0.6, 0), width: s*0.5, height: s*0.5, depth: s*1.0, color: '#ffffff', 'shadow':'cast:true' }));
  // Đầu
  g.appendChild(el('a-box', { position: vec3(0, s*0.95, s*0.58), width: s*0.32, height: s*0.35, depth: s*0.45, color: '#ffffff', 'shadow':'cast:true' }));
  // Mõm
  g.appendChild(el('a-box', { position: vec3(0, s*0.78, s*0.82), width: s*0.2, height: s*0.2, depth: s*0.22, color: '#ffe0cc' }));
  // Tai
  g.appendChild(el('a-cone', { position: vec3(-s*0.12, s*1.16, s*0.55), 'radius-bottom': s*0.07, 'radius-top': 0, height: s*0.14, color: '#ffffff' }));
  g.appendChild(el('a-cone', { position: vec3(s*0.12, s*1.16, s*0.55), 'radius-bottom': s*0.07, 'radius-top': 0, height: s*0.14, color: '#ffffff' }));
  // Bờm
  g.appendChild(el('a-box', { position: vec3(0, s*1.0, s*0.3), width: s*0.06, height: s*0.18, depth: s*0.55, color: '#1a1a1a' }));
  // Sọc đen dọc thân
  for (let i = 0; i < 5; i++) {
    g.appendChild(el('a-box', { position: vec3(0, s*0.65, s*(0.35 - i*0.17)), width: s*0.51, height: s*0.08, depth: s*0.08, color: '#1a1a1a' }));
  }
  // Chân (sọc)
  [[-0.22,-0.4],[0.22,-0.4],[-0.22,0.4],[0.22,0.4]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.2, lz*s), radius: s*0.09, height: s*0.45, color: '#ffffff', 'shadow':'cast:true' }));
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.3, lz*s), radius: s*0.092, height: s*0.07, color: '#1a1a1a' }));
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.1, lz*s), radius: s*0.092, height: s*0.07, color: '#1a1a1a' }));
  });
  // Đuôi
  g.appendChild(el('a-cylinder', { position: vec3(0, s*0.75, -s*0.6), radius: s*0.04, height: s*0.3, rotation: '25 0 0', color: '#1a1a1a' }));
}

/* ── Sư tử ── */
function buildLion(g, s, c) {
  // Thân
  g.appendChild(el('a-box', { position: vec3(0, s*0.55, 0), width: s*0.55, height: s*0.45, depth: s*1.0, color: c, 'shadow':'cast:true' }));
  // Đầu + bờm
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.9, s*0.55), radius: s*0.28, color: '#b8860b', 'shadow':'cast:true' }));
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.9, s*0.55), radius: s*0.22, color: c }));
  // Mõm
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.82, s*0.77), radius: s*0.12, color: '#f5cba7' }));
  // Mũi
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.85, s*0.86), radius: s*0.04, color: '#8B4513' }));
  // Tai
  g.appendChild(el('a-cone', { position: vec3(-s*0.2, s*1.15, s*0.48), 'radius-bottom': s*0.1, 'radius-top': 0, height: s*0.14, color: c }));
  g.appendChild(el('a-cone', { position: vec3(s*0.2, s*1.15, s*0.48), 'radius-bottom': s*0.1, 'radius-top': 0, height: s*0.14, color: c }));
  // Chân
  [[-0.23,-0.4],[0.23,-0.4],[-0.23,0.4],[0.23,0.4]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.18, lz*s), radius: s*0.09, height: s*0.37, color: c, 'shadow':'cast:true' }));
  });
  // Đuôi với chùm
  g.appendChild(el('a-cylinder', { position: vec3(0, s*0.75, -s*0.62), radius: s*0.04, height: s*0.42, rotation: '25 0 0', color: c }));
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.55, -s*0.88), radius: s*0.1, color: '#8B4513' }));
}

/* ── Gấu ── */
function buildBear(g, s, c) {
  // Thân lớn tròn
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.6, 0), 'radius': s*0.55, 'scale': '1 0.9 1', color: c, 'shadow':'cast:true' }));
  // Đầu
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.3, s*0.42), radius: s*0.35, color: c, 'shadow':'cast:true' }));
  // Mõm nhô
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.2, s*0.75), radius: s*0.18, color: adjustColor(c, 20) }));
  // Mũi
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.25, s*0.92), radius: s*0.07, color: '#1a1a1a' }));
  // Tai tròn
  g.appendChild(el('a-sphere', { position: vec3(-s*0.25, s*1.62, s*0.35), radius: s*0.12, color: c }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.25, s*1.62, s*0.35), radius: s*0.12, color: c }));
  // Chân to
  [[-0.35,-0.2],[0.35,-0.2],[-0.32,0.2],[0.32,0.2]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.2, lz*s), radius: s*0.16, height: s*0.42, color: c, 'shadow':'cast:true' }));
  });
}

/* ── Khỉ đột ── */
function buildGorilla(g, s, c) {
  // Thân lớn
  g.appendChild(el('a-box', { position: vec3(0, s*0.65, 0), width: s*0.62, height: s*0.75, depth: s*0.55, color: c, 'shadow':'cast:true' }));
  // Đầu
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.32, s*0.08), radius: s*0.3, color: c, 'shadow':'cast:true' }));
  // Mặt dẹp
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.25, s*0.36), radius: s*0.22, color: '#4a4a4a' }));
  // Mũi phẳng
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.28, s*0.55), radius: s*0.1, color: '#2a2a2a' }));
  // Tai
  g.appendChild(el('a-sphere', { position: vec3(-s*0.33, s*1.32, s*0.05), radius: s*0.1, color: c }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.33, s*1.32, s*0.05), radius: s*0.1, color: c }));
  // Cánh tay dài
  g.appendChild(el('a-cylinder', { position: vec3(-s*0.6, s*0.85, 0), radius: s*0.1, height: s*0.75, rotation: '0 0 70', color: c, 'shadow':'cast:true' }));
  g.appendChild(el('a-cylinder', { position: vec3(s*0.6, s*0.85, 0), radius: s*0.1, height: s*0.75, rotation: '0 0 -70', color: c, 'shadow':'cast:true' }));
  // Chân
  [[-0.2,-0.12],[0.2,-0.12]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.2, lz*s), radius: s*0.13, height: s*0.42, color: c, 'shadow':'cast:true' }));
  });
  // Sọc bạc ở lưng
  g.appendChild(el('a-box', { position: vec3(0, s*0.7, -s*0.28), width: s*0.63, height: s*0.45, depth: s*0.04, color: '#aaaaaa' }));
}

/* ── Cá sấu ── */
function buildCrocodile(g, s, c) {
  // Thân dài dẹt
  g.appendChild(el('a-box', { position: vec3(0, s*0.18, 0), width: s*0.38, height: s*0.22, depth: s*1.6, color: c, 'shadow':'cast:true' }));
  // Đầu nhọn
  g.appendChild(el('a-box', { position: vec3(0, s*0.18, s*0.95), width: s*0.32, height: s*0.18, depth: s*0.5, color: c, 'shadow':'cast:true' }));
  g.appendChild(el('a-cone', { position: vec3(0, s*0.18, s*1.32), 'radius-bottom': s*0.15, 'radius-top': s*0.02, height: s*0.35, rotation: '90 0 0', color: c }));
  // Hàm dưới
  g.appendChild(el('a-box', { position: vec3(0, s*0.1, s*1.0), width: s*0.28, height: s*0.08, depth: s*0.65, color: adjustColor(c,10) }));
  // Mắt
  g.appendChild(el('a-sphere', { position: vec3(-s*0.15, s*0.3, s*0.85), radius: s*0.07, color: '#f39c12' }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.15, s*0.3, s*0.85), radius: s*0.07, color: '#f39c12' }));
  // Đuôi
  g.appendChild(el('a-cone', { position: vec3(0, s*0.2, -s*1.1), 'radius-bottom': s*0.16, 'radius-top': s*0.02, height: s*0.7, rotation: '-90 0 0', color: c }));
  // Vẩy lưng
  for (let i = 0; i < 6; i++) {
    g.appendChild(el('a-cone', { position: vec3(0, s*0.32, s*(0.5 - i*0.22)), 'radius-bottom': s*0.06, 'radius-top': 0, height: s*0.12, color: adjustColor(c,-15) }));
  }
  // Chân ngắn
  [[-0.25,-0.55],[0.25,-0.55],[-0.22,0.55],[0.22,0.55]].forEach(([lx,lz]) => {
    g.appendChild(el('a-cylinder', { position: vec3(lx*s, s*0.1, lz*s), radius: s*0.07, height: s*0.18, rotation: '0 0 80', color: c, 'shadow':'cast:true' }));
  });
}

/* ── Chim cánh cụt ── */
function buildPenguin(g, s, c) {
  // Thân hình trứng đứng (trắng bụng, đen lưng)
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.65, 0), radius: s*0.4, 'scale': '0.7 1 0.6', color: '#1a1a2e', 'shadow':'cast:true' }));
  // Bụng trắng
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.6, s*0.18), radius: s*0.3, 'scale': '0.5 0.85 0.5', color: '#ffffff' }));
  // Đầu
  g.appendChild(el('a-sphere', { position: vec3(0, s*1.15, 0), radius: s*0.28, color: '#1a1a2e', 'shadow':'cast:true' }));
  // Mỏ màu cam
  g.appendChild(el('a-cone', { position: vec3(0, s*1.12, s*0.3), 'radius-bottom': s*0.06, 'radius-top': s*0.01, height: s*0.18, rotation: '90 0 0', color: '#FF8C00' }));
  // Mắt
  g.appendChild(el('a-sphere', { position: vec3(-s*0.12, s*1.22, s*0.22), radius: s*0.05, color: '#ffffff' }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.12, s*1.22, s*0.22), radius: s*0.05, color: '#ffffff' }));
  g.appendChild(el('a-sphere', { position: vec3(-s*0.12, s*1.22, s*0.26), radius: s*0.03, color: '#111' }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.12, s*1.22, s*0.26), radius: s*0.03, color: '#111' }));
  // Cánh
  g.appendChild(el('a-box', { position: vec3(-s*0.42, s*0.7, 0), width: s*0.08, height: s*0.5, depth: s*0.22, rotation: '0 0 15', color: '#1a1a2e', 'shadow':'cast:true' }));
  g.appendChild(el('a-box', { position: vec3(s*0.42, s*0.7, 0), width: s*0.08, height: s*0.5, depth: s*0.22, rotation: '0 0 -15', color: '#1a1a2e', 'shadow':'cast:true' }));
  // Chân màu cam
  g.appendChild(el('a-cylinder', { position: vec3(-s*0.12, s*0.12, s*0.1), radius: s*0.07, height: s*0.25, color: '#FF8C00', 'shadow':'cast:true' }));
  g.appendChild(el('a-cylinder', { position: vec3(s*0.12, s*0.12, s*0.1), radius: s*0.07, height: s*0.25, color: '#FF8C00', 'shadow':'cast:true' }));
  // Bàn chân
  g.appendChild(el('a-sphere', { position: vec3(-s*0.12, s*0.0, s*0.18), radius: s*0.1, 'scale': '1.5 0.3 1.2', color: '#FF8C00' }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.12, s*0.0, s*0.18), radius: s*0.1, 'scale': '1.5 0.3 1.2', color: '#FF8C00' }));
  // Vệt vàng ở đầu (hoàng đế)
  g.appendChild(el('a-sphere', { position: vec3(-s*0.15, s*1.18, s*0.12), radius: s*0.08, 'scale': '0.5 0.7 0.6', color: '#FFD700' }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.15, s*1.18, s*0.12), radius: s*0.08, 'scale': '0.5 0.7 0.6', color: '#FFD700' }));
}

/* ── Rùa ── */
function buildTurtle(g, s, c) {
  // Mai tròn lồi
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.35, 0), radius: s*0.55, 'scale': '1 0.55 0.85', color: c, 'shadow':'cast:true' }));
  // Hoa văn mai (đốm hex)
  const panelC = adjustColor(c, -25);
  [[0,0],[0.25,0.18],[-0.25,0.18],[0.25,-0.18],[-0.25,-0.18],[0,-0.28]].forEach(([dx,dz]) => {
    g.appendChild(el('a-sphere', { position: vec3(dx*s, s*0.6, dz*s), radius: s*0.14, 'scale': '1 0.25 1', color: panelC }));
  });
  // Đầu
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.28, s*0.6), radius: s*0.2, color: '#2C7A4B', 'shadow':'cast:true' }));
  // Mắt
  g.appendChild(el('a-sphere', { position: vec3(-s*0.09, s*0.34, s*0.78), radius: s*0.04, color: '#FFD700' }));
  g.appendChild(el('a-sphere', { position: vec3(s*0.09, s*0.34, s*0.78), radius: s*0.04, color: '#FFD700' }));
  // Vây (4 chân dẹt)
  g.appendChild(el('a-box', { position: vec3(-s*0.55, s*0.18, s*0.1), width: s*0.35, height: s*0.08, depth: s*0.22, rotation: '0 -20 0', color: '#2C7A4B', 'shadow':'cast:true' }));
  g.appendChild(el('a-box', { position: vec3(s*0.55, s*0.18, s*0.1), width: s*0.35, height: s*0.08, depth: s*0.22, rotation: '0 20 0', color: '#2C7A4B', 'shadow':'cast:true' }));
  g.appendChild(el('a-box', { position: vec3(-s*0.48, s*0.18, -s*0.25), width: s*0.3, height: s*0.07, depth: s*0.18, rotation: '0 30 0', color: '#2C7A4B', 'shadow':'cast:true' }));
  g.appendChild(el('a-box', { position: vec3(s*0.48, s*0.18, -s*0.25), width: s*0.3, height: s*0.07, depth: s*0.18, rotation: '0 -30 0', color: '#2C7A4B', 'shadow':'cast:true' }));
  // Đuôi nhỏ
  g.appendChild(el('a-cone', { position: vec3(0, s*0.22, -s*0.6), 'radius-bottom': s*0.08, 'radius-top': 0, height: s*0.2, rotation: '-80 0 0', color: '#2C7A4B' }));
}

/* ── Mặc định ── */
function buildGenericAnimal(g, s, c) {
  g.appendChild(el('a-sphere', { position: vec3(0, s*0.5, 0), radius: s*0.5, color: c, 'shadow':'cast:true' }));
}

/* ─── Tạo khu trưng bày (exhibit) ──────────────────────────────── */
function buildExhibit(animal, scene) {
  const { pos, scale: s } = animal;
  const platColor = getPlatformColor(animal.habitat);
  const exhibits = scene.querySelector('#exhibits');

  const container = el('a-entity', {
    id: `exhibit-${animal.id}`,
    position: vec3(pos.x, 0, pos.z),
    'class': 'clickable exhibit-container',
    'data-animal': animal.id
  });

  /* Platform tròn */
  const platform = el('a-cylinder', {
    position: vec3(0, 0.05, 0),
    radius: 4.5,
    height: 0.3,
    color: platColor,
    'class': 'clickable',
    'data-animal': animal.id,
    'shadow': 'receive: true',
    material: 'roughness: 0.95; metalness: 0'
  });
  container.appendChild(platform);

  /* Viền platform */
  const rim = el('a-torus', {
    position: vec3(0, 0.2, 0),
    radius: 4.5,
    'radius-tubular': 0.12,
    color: adjustColor(platColor, -20),
    rotation: '90 0 0'
  });
  container.appendChild(rim);

  /* Mô hình động vật */
  const animalEntity = el('a-entity', {
    id: `animal-${animal.id}`,
    position: vec3(0, 0.35, 0),
    'animation': `property: rotation; to: 0 360 0; loop: true; dur: 12000; easing: linear`
  });
  const model = buildAnimalModel(animal);
  animalEntity.appendChild(model);
  container.appendChild(animalEntity);

  /* Số thứ tự */
  const idx = ANIMALS.findIndex(a => a.id === animal.id) + 1;

  /* Biển tên nổi – có billboard component để luôn quay về phía camera */
  const nameBoard = el('a-entity', {
    position: vec3(0, 4.2 + s * 0.5, 0),
    billboard: 'lockY: true'
  });

  // Nền biển
  const nameBg = el('a-plane', {
    width: 3.5, height: 1.0,
    color: '#0a1e0f',
    material: 'transparent: true; opacity: 0.85; side: double',
    rotation: '0 0 0'
  });
  nameBoard.appendChild(nameBg);

  // Tên tiếng Việt
  const nameText = el('a-text', {
    value: `${idx}. ${animal.name}`,
    align: 'center',
    color: '#ffffff',
    width: 3.2,
    'wrap-count': 20,
    position: vec3(0, 0.22, 0.01),
    font: 'roboto'
  });
  nameBoard.appendChild(nameText);

  // Tên khoa học
  const sciText = el('a-text', {
    value: animal.sciName,
    align: 'center',
    color: '#8ecf9e',
    width: 2.8,
    'wrap-count': 25,
    position: vec3(0, -0.12, 0.01),
    font: 'roboto'
  });
  nameBoard.appendChild(sciText);
  container.appendChild(nameBoard);

  /* Hình trụ phát sáng (glowing post) dưới biển tên */
  const post = el('a-cylinder', {
    position: vec3(0, 2.2, 0),
    radius: 0.05,
    height: 2.0,
    color: '#8ecf9e',
    material: 'emissive: #2ecc71; emissiveIntensity: 0.3'
  });
  container.appendChild(post);

  /* Invisible click sphere – dùng class 'clickable' để raycaster nhận diện */
  const clickSphere = el('a-sphere', {
    'class': 'clickable',
    'data-animal': animal.id,
    position: vec3(0, s * 0.8 + 0.35, 0),
    radius: Math.max(2.8, s * 1.8),
    material: 'transparent: true; opacity: 0; depthWrite: false; side: double',
  });
  clickSphere.dataset.animal = animal.id;
  container.appendChild(clickSphere);

  /* Listener trực tiếp trên container để click chuột luôn nhận diện */
  container.addEventListener('click', () => {
    if (typeof handleAnimalClick === 'function') {
      handleAnimalClick(container);
    }
  });

  /* Hover glow ring */
  const hoverRing = el('a-torus', {
    id: `ring-${animal.id}`,
    position: vec3(0, 0.22, 0),
    radius: 4.2,
    'radius-tubular': 0.06,
    color: '#2ecc71',
    rotation: '90 0 0',
    material: 'emissive: #2ecc71; emissiveIntensity: 0.25'
  });
  container.appendChild(hoverRing);

  /* Ambient point light cho khu */
  const light = el('a-light', {
    type: 'point',
    position: vec3(0, 5, 0),
    color: '#ffffff',
    intensity: 0.5,
    distance: 12
  });
  container.appendChild(light);

  exhibits.appendChild(container);
}

/* ─── Tạo cây trang trí ────────────────────────────────────────── */
function buildTrees(scene) {
  const treesEl = scene.querySelector('#trees');
  const positions = [
    [-8,0,-8],[-8,0,8],[8,0,-8],[8,0,8],
    [-15,0,0],[15,0,0],[0,0,-15],[0,0,15],
    [-12,0,-12],[12,0,-12],[-12,0,12],[12,0,12],
    [-35,0,-10],[35,0,-10],[-35,0,10],[35,0,10],
    [-10,0,-35],[10,0,-35],[-10,0,35],[10,0,35]
  ];
  positions.forEach(([x,,z]) => {
    const h = 3 + Math.random() * 3;
    const cols = ['#2d5a3d','#3a6b4a','#1e4d2b','#4a7c59'];
    const c = cols[Math.floor(Math.random() * cols.length)];
    makeTree(x, 0, z, h, c).forEach(t => treesEl.appendChild(t));
  });
}

/* ─── Hàng rào viền ────────────────────────────────────────────── */
function buildBoundary(scene) {
  const boundEl = scene.querySelector('#boundary');
  const size = 48;
  const postCount = 16;
  for (let i = 0; i < postCount; i++) {
    const t = (i / postCount) * 2 * Math.PI;
    const bx = Math.cos(t) * size;
    const bz = Math.sin(t) * size;
    boundEl.appendChild(el('a-cylinder', {
      position: vec3(bx, 1.0, bz),
      radius: 0.2, height: 2.0, color: '#8B4513'
    }));
  }
  // Đường rào ngang
  [0,90,180,270].forEach(rot => {
    boundEl.appendChild(el('a-cylinder', {
      position: vec3(0, 0.8, 0),
      rotation: `0 ${rot} 90`,
      radius: 0.06,
      height: size * 2 - 1,
      color: '#A0522D'
    }));
    boundEl.appendChild(el('a-cylinder', {
      position: vec3(0, 1.3, 0),
      rotation: `0 ${rot} 90`,
      radius: 0.06,
      height: size * 2 - 1,
      color: '#A0522D'
    }));
  });
}

/* ─── Bầu trời sao (trang trí) ─────────────────────────────────── */
function buildStarParticles(scene) {
  // Thêm mặt trời
  const sun = el('a-sphere', {
    position: '80 60 -100',
    radius: 12,
    color: '#FFF8DC',
    material: 'emissive: #FFD700; emissiveIntensity: 0.5'
  });
  scene.appendChild(sun);

  // Mây đơn giản
  const cloudPositions = [
    [30, 22, -40], [-40, 20, -35], [20, 25, -60], [-20, 18, -50]
  ];
  cloudPositions.forEach(([cx, cy, cz]) => {
    [[-1,0,0],[0,0,0],[1,0,0],[0,0,1],[-0.5,0.4,0],[0.5,0.4,0]].forEach(([dx,dy,dz]) => {
      scene.appendChild(el('a-sphere', {
        position: vec3(cx + dx * 4, cy + dy * 2, cz + dz * 3),
        radius: 3 + Math.random() * 2,
        color: '#ffffff',
        material: 'transparent: true; opacity: 0.88',
        'segments-width': 6,
        'segments-height': 6
      }));
    });
  });
}

/* ─── BUILD SCENE ──────────────────────────────────────────────── */
let isSceneBuilt = false;

function buildScene() {
  if (isSceneBuilt) return;
  const scene = document.querySelector('a-scene');
  if (!scene) return;

  isSceneBuilt = true;

  ANIMALS.forEach(animal => {
    try {
      buildExhibit(animal, scene);
    } catch (e) {
      console.error('Lỗi dựng khu:', animal.name, e);
    }
  });

  try { buildTrees(scene); } catch (e) { console.warn(e); }
  try { buildBoundary(scene); } catch (e) { console.warn(e); }
  try { buildStarParticles(scene); } catch (e) { console.warn(e); }

  console.log('[SceneBuilder] Đã dựng thành công', ANIMALS.length, 'khu trưng bày động vật 3D!');
}
