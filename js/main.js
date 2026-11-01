/**
 * main.js
 * Logic chính của WebXR Phòng Trưng Bày Động Vật 3D:
 * - Quản lý UI, HUD, Thông tin loài động vật
 * - Di chuyển, Teleport mượt mà (smooth camera animation)
 * - Tương tác click/raycast 3D bằng chuột và WebXR VR
 * - Hỗ trợ VR controller (laser-controls) cho tay cầm
 * - Chế độ "Tham quan tự động" (Guided Auto Tour) qua 10 loài
 * - Bản đồ radar 2D thu nhỏ (Mini-map)
 * - Tích hợp âm thanh Web Audio & Thuyết minh Web Speech API tiếng Việt
 * - VR in-scene info panel (hiển thị thông tin trong scene khi ở chế độ VR)
 *
 * CHANGELOG (sửa lỗi):
 *  - Fix: race condition buildScene (setTimeout + 'loaded' event)
 *  - Fix: click event handler – sử dụng cả mouse cursor và VR controller
 *  - Fix: WASD không bị block bởi info panel khi đang focus
 *  - Fix: VR enter/exit – bật/tắt laser-controls đúng lúc
 *  - Fix: teleport hướng nhìn – camera luôn quay mặt về phía con vật
 *  - Thêm: VR in-scene info panel (a-text) cho chế độ kính
 *  - Thêm: Hỗ trợ VR controller click (selectstart event)
 */

'use strict';

/* ─── Trạng thái ứng dụng (State) ────────────────────────────────── */
let vrSupported = false;
let isInVR = false;
let infoOpen = false;
let helpVisible = false;
let miniMapVisible = false;
let experienceStarted = false;
let activeAnimalIndex = 0;

// Trạng thái Tham quan tự động (Auto Tour)
let autoTourRunning = false;
let autoTourPaused = false;
let autoTourTimer = null;
let autoTourStep = 0;

/* ─── DOM References ─────────────────────────────────────────────── */
const welcomeScreen    = document.getElementById('welcome-screen');
const gameHud          = document.getElementById('game-hud');
const infoPanel        = document.getElementById('info-panel');
const helpOverlay      = document.getElementById('help-overlay');
const loadingScreen    = document.getElementById('loading-screen');
const crosshair        = document.getElementById('crosshair');
const speciesButtons   = document.getElementById('species-buttons');
const btnVrWelcome     = document.getElementById('btn-vr');
const btnVrHud         = document.getElementById('btn-vr-hud');
const vrStatusText     = document.getElementById('vr-status');
const miniMapContainer = document.getElementById('mini-map-container');
const miniMapCanvas    = document.getElementById('mini-map-canvas');
const autoTourBanner   = document.getElementById('auto-tour-banner');
const tourStatusText   = document.getElementById('tour-status-text');
const btnTourPause     = document.getElementById('btn-tour-pause');
const btnAudioToggle   = document.getElementById('btn-audio-toggle');
const btnSpeakInfo     = document.getElementById('btn-speak-info');
const speakBtnText     = document.getElementById('speak-btn-text');
const infoBadge        = document.getElementById('info-badge');

/* ─── A-Frame References ─────────────────────────────────────────── */
const scene = document.getElementById('main-scene');
const rig   = document.getElementById('rig');
const START_POS = { x: 0, y: 0, z: 12 };

/* ─────────────────────────────────────────────────────────────────
   KHỞI TẠO ỨNG DỤNG
───────────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  checkVRSupport();
  buildSpeciesNav();
  setupMiniMap();

  // Scene build: dùng sự kiện 'loaded' với fallback timeout, nhưng guard bằng isSceneBuilt
  if (scene) {
    if (scene.hasLoaded) {
      buildScene();
      hideLoading();
    } else {
      scene.addEventListener('loaded', () => {
        buildScene();
        hideLoading();
      }, { once: true });
      // Fallback nếu sự kiện 'loaded' không fire
      setTimeout(() => {
        buildScene();
        hideLoading();
      }, 2000);
    }
  }

  setupClickInteraction();
  setupVRControllerInteraction();
  setupKeyboard();
  setupVRModeHandlers();

  // Khởi động vòng lặp vẽ Mini-map
  setInterval(updateMiniMap, 200);
});

/* Ẩn màn hình loading */
function hideLoading() {
  if (!loadingScreen) return;
  loadingScreen.classList.add('hidden');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 500);
}

/* ─────────────────────────────────────────────────────────────────
   KIỂM TRA HỖ TRỢ WEBXR IMMERSIVE-VR
───────────────────────────────────────────────────────────────── */
async function checkVRSupport() {
  if (!navigator.xr) {
    vrStatusText.textContent = '💻 Trình duyệt không có WebXR API. Chế độ 3D máy tính sẵn sàng!';
    return;
  }
  try {
    vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
    if (vrSupported) {
      btnVrWelcome.style.display = 'block';
      btnVrHud.style.display = 'flex';
      vrStatusText.textContent = '✅ Đã phát hiện kính VR tương thích (WebXR Immersive-VR)!';
      vrStatusText.style.color = '#2ecc71';
    } else {
      vrStatusText.textContent = '💻 Chế độ 3D trên máy tính (chuột + bàn phím) hoạt động đầy đủ.';
    }
  } catch (e) {
    vrStatusText.textContent = '💻 Chế độ 3D desktop sẵn sàng.';
  }
}

/* ─────────────────────────────────────────────────────────────────
   BẮT ĐẦU TRẢI NGHIỆM / VỀ MENU
───────────────────────────────────────────────────────────────── */
function startExperience() {
  audioMgr.init();
  audioMgr.playClickSound();
  audioMgr.toggleAmbient(true);

  welcomeScreen.style.display = 'none';
  gameHud.style.display = 'block';
  miniMapContainer.style.display = 'block';
  miniMapVisible = true;
  experienceStarted = true;
}

function showWelcome() {
  stopAutoTour();
  audioMgr.stopSpeaking();
  closeInfo();
  helpOverlay.style.display = 'none';
  helpVisible = false;
  gameHud.style.display = 'none';
  miniMapContainer.style.display = 'none';
  welcomeScreen.style.display = 'flex';
  experienceStarted = false;
}

/* ─────────────────────────────────────────────────────────────────
   VÀO / THOÁT CHẾ ĐỘ VR + QUẢN LÝ CONTROLLERS
───────────────────────────────────────────────────────────────── */
function enterVR() {
  if (!vrSupported) {
    alert('Không phát hiện kính VR kết nối. Bạn có thể trải nghiệm toàn diện bằng chế độ 3D trên máy tính!');
    return;
  }
  // Đảm bảo experience đã bắt đầu
  if (!experienceStarted) {
    startExperience();
  }
  scene.enterVR();
}

function setupVRModeHandlers() {
  scene.addEventListener('enter-vr', () => {
    isInVR = true;
    // Ẩn UI overlay HTML (chỉ hiện UI 3D trong scene)
    document.getElementById('ui-overlay').style.display = 'none';

    // Bật VR controllers
    const leftHand = document.getElementById('left-hand');
    const rightHand = document.getElementById('right-hand');
    if (leftHand) leftHand.setAttribute('visible', 'true');
    if (rightHand) rightHand.setAttribute('visible', 'true');

    // Bật gaze cursor cho VR headset (không dùng tay cầm)
    const cursorDesktop = document.getElementById('cursor-desktop');
    if (cursorDesktop) {
      cursorDesktop.setAttribute('cursor', 'rayOrigin: entity; fuse: true; fuseTimeout: 1500');
      cursorDesktop.setAttribute('geometry', 'primitive: ring; radiusInner: 0.008; radiusOuter: 0.014');
      cursorDesktop.setAttribute('material', 'color: #2ecc71; shader: flat; opacity: 0.8');
      cursorDesktop.setAttribute('position', '0 0 -1');
    }

    console.log('[VR] Đã vào chế độ VR Immersive');
  });

  scene.addEventListener('exit-vr', () => {
    isInVR = false;
    document.getElementById('ui-overlay').style.display = 'block';

    // Ẩn VR controllers
    const leftHand = document.getElementById('left-hand');
    const rightHand = document.getElementById('right-hand');
    if (leftHand) leftHand.setAttribute('visible', 'false');
    if (rightHand) rightHand.setAttribute('visible', 'false');

    // Reset cursor về mouse mode
    const cursorDesktop = document.getElementById('cursor-desktop');
    if (cursorDesktop) {
      cursorDesktop.setAttribute('cursor', 'rayOrigin: mouse; fuse: false');
      cursorDesktop.removeAttribute('geometry');
      cursorDesktop.removeAttribute('material');
      cursorDesktop.removeAttribute('position');
    }

    // Ẩn VR info panel
    const vrInfoPanel = document.getElementById('vr-info-panel');
    if (vrInfoPanel) vrInfoPanel.setAttribute('visible', 'false');

    if (!experienceStarted) welcomeScreen.style.display = 'flex';

    console.log('[VR] Đã thoát chế độ VR');
  });
}

/* ─────────────────────────────────────────────────────────────────
   THANH ĐIỀU HƯỚNG LOÀI (SPECIES NAV)
───────────────────────────────────────────────────────────────── */
function buildSpeciesNav() {
  speciesButtons.innerHTML = '';
  ANIMALS.forEach((animal, i) => {
    const btn = document.createElement('button');
    btn.className = 'species-nav-btn';
    btn.id = `nav-btn-${animal.id}`;
    btn.innerHTML = `${animal.emoji} ${i + 1}. ${animal.name}`;
    btn.addEventListener('click', () => {
      audioMgr.playClickSound();
      activeAnimalIndex = i;
      teleportToAnimal(animal);
    });
    speciesButtons.appendChild(btn);
  });
}

/* ─────────────────────────────────────────────────────────────────
   TELEPORT & RESET CAMERA
───────────────────────────────────────────────────────────────── */
function teleportToAnimal(animal, showInfo = true) {
  audioMgr.playTeleportSound();

  const radAngle = Math.atan2(animal.pos.x, animal.pos.z);
  const dist = 7.5; // Khoảng cách đứng nhìn vừa tầm
  const tx = animal.pos.x - Math.sin(radAngle) * dist;
  const tz = animal.pos.z - Math.cos(radAngle) * dist;

  // Di chuyển camera rig mượt mà
  rig.setAttribute('animation__tp', {
    property: 'position',
    to: `${tx} 0 ${tz}`,
    dur: 750,
    easing: 'easeInOutCubic'
  });

  // Highlight nút nav tương ứng
  document.querySelectorAll('.species-nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById(`nav-btn-${animal.id}`);
  if (navBtn) {
    navBtn.classList.add('active');
    navBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  highlightExhibit(animal.id);

  if (showInfo) {
    setTimeout(() => {
      showAnimalInfo(animal.id);
    }, 400);
  }
}

function resetCamera() {
  audioMgr.playTeleportSound();
  rig.setAttribute('animation__tp', {
    property: 'position',
    to: `${START_POS.x} ${START_POS.y} ${START_POS.z}`,
    dur: 800,
    easing: 'easeInOutCubic'
  });
  document.querySelectorAll('.species-nav-btn').forEach(b => b.classList.remove('active'));
  closeInfo();
}

/* ─────────────────────────────────────────────────────────────────
   HIỂN THỊ THÔNG TIN LOÀI (INFO PANEL – HTML + VR 3D)
───────────────────────────────────────────────────────────────── */
function showAnimalInfo(animalId) {
  const animal = ANIMALS.find(a => a.id === animalId);
  if (!animal) return;

  activeAnimalIndex = ANIMALS.findIndex(a => a.id === animalId);

  // === HTML UI (desktop mode) ===
  infoBadge.textContent = `Loài ${activeAnimalIndex + 1}/10`;
  document.getElementById('info-emoji').textContent = animal.emoji;
  document.getElementById('info-name').textContent = animal.name;
  document.getElementById('info-sci-name').textContent = animal.sciName;
  document.getElementById('info-habitat').textContent = animal.habitat;
  document.getElementById('info-food').textContent = animal.food;
  document.getElementById('info-size').textContent = animal.size;
  document.getElementById('info-weight').textContent = animal.weight;
  document.getElementById('info-region').textContent = animal.region;
  document.getElementById('info-status').textContent = animal.status;
  document.getElementById('info-desc').textContent = animal.desc;
  document.getElementById('info-fun-fact').textContent = animal.funFact;

  // Cập nhật trạng thái nút đọc thuyết minh
  btnSpeakInfo.classList.remove('active');
  speakBtnText.textContent = 'Thuyết minh';

  infoPanel.style.display = 'block';
  infoOpen = true;

  // === VR In-Scene Info Panel (khi đang ở VR) ===
  if (isInVR) {
    updateVRInfoPanel(animal);
  }
}

function updateVRInfoPanel(animal) {
  const vrPanel = document.getElementById('vr-info-panel');
  if (!vrPanel) return;

  // Đặt panel phía trước camera trong VR
  const camera = document.getElementById('main-camera');
  if (camera) {
    const camEl = camera.object3D;
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camEl.quaternion);
    const camWorldPos = new THREE.Vector3();
    camEl.getWorldPosition(camWorldPos);

    vrPanel.setAttribute('position', {
      x: camWorldPos.x + dir.x * 2,
      y: camWorldPos.y + dir.y * 0.5,
      z: camWorldPos.z + dir.z * 2
    });

    // Quay panel về phía camera
    vrPanel.object3D.lookAt(camWorldPos);
    vrPanel.object3D.rotateY(Math.PI); // A-Frame text mặt trước hướng +Z
  }

  const idx = ANIMALS.findIndex(a => a.id === animal.id) + 1;

  document.getElementById('vr-info-name').setAttribute('value', `${idx}. ${animal.name}`);
  document.getElementById('vr-info-sci').setAttribute('value', animal.sciName);
  document.getElementById('vr-info-habitat').setAttribute('value', `Moi truong: ${animal.habitat}`);
  document.getElementById('vr-info-food').setAttribute('value', `Thuc an: ${animal.food}`);

  // Giới hạn description cho VR (tránh quá dài)
  const shortDesc = animal.desc.length > 120 ? animal.desc.substring(0, 117) + '...' : animal.desc;
  document.getElementById('vr-info-desc').setAttribute('value', shortDesc);

  vrPanel.setAttribute('visible', 'true');
}

function closeInfo() {
  audioMgr.stopSpeaking();
  infoPanel.style.display = 'none';
  infoOpen = false;

  // Ẩn VR info panel nếu đang hiện
  const vrPanel = document.getElementById('vr-info-panel');
  if (vrPanel) vrPanel.setAttribute('visible', 'false');
}

function prevAnimal() {
  audioMgr.playClickSound();
  activeAnimalIndex = (activeAnimalIndex - 1 + ANIMALS.length) % ANIMALS.length;
  const prev = ANIMALS[activeAnimalIndex];
  teleportToAnimal(prev);
}

function nextAnimal() {
  audioMgr.playClickSound();
  activeAnimalIndex = (activeAnimalIndex + 1) % ANIMALS.length;
  const next = ANIMALS[activeAnimalIndex];
  teleportToAnimal(next);
}

/* ── Thuyết minh giọng đọc tiếng Việt ───────────────────────────── */
function speakCurrentInfo() {
  const current = ANIMALS[activeAnimalIndex];
  if (!current) return;

  if (audioMgr.isSpeaking()) {
    audioMgr.stopSpeaking();
    btnSpeakInfo.classList.remove('active');
    speakBtnText.textContent = 'Thuyết minh';
  } else {
    btnSpeakInfo.classList.add('active');
    speakBtnText.textContent = 'Đang đọc...';
    audioMgr.speakAnimalInfo(current, () => {
      btnSpeakInfo.classList.remove('active');
      speakBtnText.textContent = 'Thuyết minh';
    });
  }
}

/* ─────────────────────────────────────────────────────────────────
   CHẾ ĐỘ THAM QUAN TỰ ĐỘNG (GUIDED AUTO TOUR)
───────────────────────────────────────────────────────────────── */
function toggleAutoTour() {
  if (autoTourRunning) {
    stopAutoTour();
  } else {
    startAutoTour();
  }
}

function startAutoTour() {
  autoTourRunning = true;
  autoTourPaused = false;
  autoTourStep = 0;
  autoTourBanner.style.display = 'flex';
  btnTourPause.textContent = '⏸️ Tạm dừng';
  document.getElementById('btn-tour-toggle').classList.add('active');

  runTourStep();
}

function runTourStep() {
  if (!autoTourRunning || autoTourPaused) return;

  if (autoTourStep >= ANIMALS.length) {
    tourStatusText.textContent = '🎉 Đã hoàn thành chuyến tham quan 10 loài!';
    setTimeout(() => stopAutoTour(), 3500);
    return;
  }

  const animal = ANIMALS[autoTourStep];
  tourStatusText.textContent = `🚶‍♂️ Tham quan: [${autoTourStep + 1}/10] ${animal.name}`;

  teleportToAnimal(animal, true);

  // Tự động thuyết minh
  setTimeout(() => {
    if (autoTourRunning && !autoTourPaused) {
      speakCurrentInfo();
    }
  }, 600);

  // Sau 7 giây chuyển sang loài tiếp theo
  autoTourTimer = setTimeout(() => {
    if (autoTourRunning && !autoTourPaused) {
      autoTourStep++;
      runTourStep();
    }
  }, 7500);
}

function togglePauseTour() {
  if (!autoTourRunning) return;
  autoTourPaused = !autoTourPaused;

  if (autoTourPaused) {
    clearTimeout(autoTourTimer);
    audioMgr.stopSpeaking();
    btnTourPause.textContent = '▶️ Tiếp tục';
    tourStatusText.textContent = `⏸️ Tạm dừng tại: ${ANIMALS[autoTourStep].name}`;
  } else {
    btnTourPause.textContent = '⏸️ Tạm dừng';
    runTourStep();
  }
}

function stopAutoTour() {
  autoTourRunning = false;
  autoTourPaused = false;
  clearTimeout(autoTourTimer);
  audioMgr.stopSpeaking();
  autoTourBanner.style.display = 'none';
  document.getElementById('btn-tour-toggle').classList.remove('active');
}

/* ─────────────────────────────────────────────────────────────────
   BẢN ĐỒ MINI RADAR 2D (MINI-MAP)
───────────────────────────────────────────────────────────────── */
function setupMiniMap() {
  if (!miniMapCanvas) return;

  // Click vào điểm trên Mini-map để teleport đến loài gần nhất
  miniMapCanvas.addEventListener('click', (e) => {
    const rect = miniMapCanvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const mx = e.clientX - rect.left - cx;
    const my = e.clientY - rect.top - cy;

    // Quy đổi tọa độ radar (-50 đến 50 scene units)
    const scale = 50 / (rect.width / 2);
    const sceneX = mx * scale;
    const sceneZ = my * scale;

    // Tìm con vật gần nhất
    let nearest = null;
    let minDist = Infinity;
    ANIMALS.forEach(animal => {
      const d = Math.hypot(animal.pos.x - sceneX, animal.pos.z - sceneZ);
      if (d < minDist) {
        minDist = d;
        nearest = animal;
      }
    });

    if (nearest) {
      teleportToAnimal(nearest);
    }
  });
}

function updateMiniMap() {
  if (!miniMapCanvas || !miniMapVisible || !experienceStarted) return;

  const ctx = miniMapCanvas.getContext('2d');
  const w = miniMapCanvas.width;
  const h = miniMapCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const worldRadius = 45; // Bán kính radar 45m

  ctx.clearRect(0, 0, w, h);

  // Vòng tròn radar nền
  ctx.fillStyle = '#0d2315';
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctx.fill();

  // Các vòng tròn đồng tâm
  ctx.strokeStyle = 'rgba(46, 204, 113, 0.25)';
  ctx.lineWidth = 1;
  [0.33, 0.66, 0.95].forEach(r => {
    ctx.beginPath();
    ctx.arc(cx, cy, (cx - 2) * r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Đường chữ thập
  ctx.beginPath();
  ctx.moveTo(cx, 4); ctx.lineTo(cx, h - 4);
  ctx.moveTo(4, cy); ctx.lineTo(w - 4, cy);
  ctx.stroke();

  // Vẽ 10 loài động vật (icon emoji)
  const mapScale = (cx - 14) / worldRadius;
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ANIMALS.forEach(animal => {
    const px = cx + animal.pos.x * mapScale;
    const py = cy + animal.pos.z * mapScale;

    // Vòng tròn nhỏ quanh icon
    ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillText(animal.emoji, px, py);
  });

  // Lấy vị trí người chơi
  const camPos = rig.getAttribute('position') || START_POS;
  const userX = cx + camPos.x * mapScale;
  const userY = cy + camPos.z * mapScale;

  // Điểm đánh dấu người chơi (chấm đỏ phát sáng)
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(userX, userY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function toggleMiniMap() {
  audioMgr.playClickSound();
  miniMapVisible = !miniMapVisible;
  miniMapContainer.style.display = miniMapVisible ? 'block' : 'none';
}

/* ── Bật / tắt âm thanh ─────────────────────────────────────────── */
function toggleAudio() {
  const isMuted = audioMgr.toggleMute();
  if (isMuted) {
    btnAudioToggle.textContent = '🔇';
    btnAudioToggle.title = 'Bật âm thanh';
  } else {
    btnAudioToggle.textContent = '🔊';
    btnAudioToggle.title = 'Tắt âm thanh';
    audioMgr.playClickSound();
  }
}

/* ─────────────────────────────────────────────────────────────────
   TƯƠNG TÁC CLICK 3D (RAYCASTER – Desktop)
───────────────────────────────────────────────────────────────── */
function setupClickInteraction() {
  // Sử dụng click event trên scene – hoạt động với mouse raycaster
  scene.addEventListener('click', (e) => {
    if (!experienceStarted) return;
    handleAnimalClick(e.target);
  });
}

/* ─────────────────────────────────────────────────────────────────
   TƯƠNG TÁC VR CONTROLLER (laser-controls selectstart)
───────────────────────────────────────────────────────────────── */
function setupVRControllerInteraction() {
  // Khi scene sẵn sàng, gắn event listener cho VR controllers
  const attachControllerEvents = () => {
    const leftHand = document.getElementById('left-hand');
    const rightHand = document.getElementById('right-hand');

    [leftHand, rightHand].forEach(hand => {
      if (!hand) return;

      // Khi controller click (trigger press)
      hand.addEventListener('selectstart', () => {
        if (!experienceStarted) return;
        const raycasterComp = hand.components.raycaster;
        if (raycasterComp) {
          const intersections = raycasterComp.intersections;
          if (intersections && intersections.length > 0) {
            handleAnimalClick(intersections[0].object.el);
          }
        }
      });

      // Hover effect (khi laser chỉ vào clickable)
      hand.addEventListener('raycaster-intersection', (e) => {
        const els = e.detail.els;
        if (els && els.length > 0) {
          const target = els[0];
          const animalId = target.dataset && target.dataset.animal;
          if (animalId) {
            highlightExhibit(animalId);
          }
        }
      });
    });
  };

  // Đợi scene loaded
  if (scene.hasLoaded) {
    attachControllerEvents();
  } else {
    scene.addEventListener('loaded', attachControllerEvents, { once: true });
  }

  // VR close button click
  const vrCloseBtn = document.getElementById('vr-info-close');
  if (vrCloseBtn) {
    vrCloseBtn.addEventListener('click', () => {
      closeInfo();
    });
  }
}

/* ─── Xử lý click chung (cả desktop và VR) ─────────────────────── */
function handleAnimalClick(target) {
  if (!target) return;

  // Kiểm tra click vào VR close button
  if (target.id === 'vr-info-close') {
    closeInfo();
    return;
  }

  // Kiểm tra data-animal
  const animalId = target.dataset && target.dataset.animal;
  if (animalId) {
    audioMgr.playClickSound();
    showAnimalInfo(animalId);
    highlightExhibit(animalId);
    return;
  }

  // Traverse parents để tìm data-animal (trường hợp click vào child element)
  let parent = target.parentElement;
  let depth = 0;
  while (parent && depth < 5) {
    const parentAnimalId = parent.dataset && parent.dataset.animal;
    if (parentAnimalId) {
      audioMgr.playClickSound();
      showAnimalInfo(parentAnimalId);
      highlightExhibit(parentAnimalId);
      return;
    }
    parent = parent.parentElement;
    depth++;
  }
}

function highlightExhibit(animalId) {
  const ring = document.getElementById(`ring-${animalId}`);
  if (ring) {
    ring.setAttribute('material', 'emissive: #2ecc71; emissiveIntensity: 1.5');
    setTimeout(() => {
      ring.setAttribute('material', 'emissive: #2ecc71; emissiveIntensity: 0.25');
    }, 800);
  }
}

/* ─────────────────────────────────────────────────────────────────
   PHÍM TẮT BÀN PHÍM
───────────────────────────────────────────────────────────────── */
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Không xử lý phím tắt khi đang focus vào input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toUpperCase()) {
      case 'R':
        if (experienceStarted && !isInVR) resetCamera();
        break;
      case 'T':
        if (experienceStarted && !isInVR) toggleAutoTour();
        break;
      case 'M':
        if (experienceStarted && !isInVR) toggleMiniMap();
        break;
      case 'H':
        if (experienceStarted && !isInVR) toggleHelp();
        break;
      case 'ESCAPE':
        if (infoOpen) closeInfo();
        else if (helpVisible) toggleHelp();
        break;
      case 'ARROWLEFT':
        if (infoOpen && !isInVR) { e.preventDefault(); prevAnimal(); }
        break;
      case 'ARROWRIGHT':
        if (infoOpen && !isInVR) { e.preventDefault(); nextAnimal(); }
        break;
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9': case '0':
        if (experienceStarted && !isInVR) {
          const idx = e.key === '0' ? 9 : parseInt(e.key) - 1;
          if (ANIMALS[idx]) {
            activeAnimalIndex = idx;
            teleportToAnimal(ANIMALS[idx]);
          }
        }
        break;
      case 'ENTER':
        if (!experienceStarted) startExperience();
        break;
    }
  });
}

function toggleHelp() {
  audioMgr.playClickSound();
  helpVisible = !helpVisible;
  helpOverlay.style.display = helpVisible ? 'block' : 'none';
  document.getElementById('btn-help-toggle').textContent = helpVisible ? '✖' : '❓';
}
