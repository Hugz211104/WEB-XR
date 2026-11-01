/**
 * audio-manager.js
 * Quản lý âm thanh WebXR: Hiệu ứng tương tác (Web Audio API)
 * và Thuyết minh giọng đọc tiếng Việt (Web Speech API).
 * Không phụ thuộc file âm thanh ngoài - chạy 100% offline & ổn định.
 */

class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.speechSynthesis = window.speechSynthesis || null;
    this.ambientPlaying = false;
    this.ambientGain = null;
    this.ambientInterval = null;
    this.muted = false;
    this.currentUtterance = null;
  }

  // Khởi tạo AudioContext sau tương tác của người dùng (tránh lỗi autoplay policy)
  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Âm thanh click / tương tác công nghệ cao (UI chime)
  playClickSound() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Âm thanh dịch chuyển tức thời (teleport sound)
  playTeleportSound() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, this.audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('Teleport sound error:', e);
    }
  }

  // Bật / tắt âm thanh môi trường thiên nhiên giả lập (tiếng gió / chim hót)
  toggleAmbient(enable) {
    if (enable === undefined) enable = !this.ambientPlaying;
    this.init();

    if (enable) {
      if (this.ambientPlaying) return;
      this.ambientPlaying = true;
      this._startNatureAmbiance();
    } else {
      this.ambientPlaying = false;
      if (this.ambientInterval) {
        clearInterval(this.ambientInterval);
        this.ambientInterval = null;
      }
    }
    return this.ambientPlaying;
  }

  _startNatureAmbiance() {
    if (!this.audioCtx || this.muted) return;

    // Giả lập tiếng chim hót ngẫu nhiên mỗi 4-8 giây
    const playBirdChirp = () => {
      if (!this.ambientPlaying || this.muted) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const now = this.audioCtx.currentTime;

        osc.type = 'sine';
        const baseFreq = 2000 + Math.random() * 800;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq + 600, now + 0.08);
        osc.frequency.linearRampToValueAtTime(baseFreq + 200, now + 0.16);

        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(now + 0.25);
      } catch (err) {}
    };

    this.ambientInterval = setInterval(() => {
      if (Math.random() > 0.3) playBirdChirp();
    }, 4500);
  }

  // Thuyết minh bằng giọng nói (Text-To-Speech) tiếng Việt
  speakAnimalInfo(animal, onEndCallback) {
    if (!this.speechSynthesis) {
      console.warn('SpeechSynthesis API not supported.');
      return false;
    }

    // Dừng giọng đọc trước nếu đang nói
    this.stopSpeaking();

    const textToSpeak = `${animal.name}. Tên khoa học: ${animal.sciName}. Môi trường sống: ${animal.habitat}. Thức ăn: ${animal.food}. Đặc điểm: ${animal.desc}.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Tìm giọng tiếng Việt nếu có
    const voices = this.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (e) => {
      console.warn('TTS error:', e);
      this.currentUtterance = null;
      if (onEndCallback) onEndCallback();
    };

    this.currentUtterance = utterance;
    this.speechSynthesis.speak(utterance);
    return true;
  }

  stopSpeaking() {
    if (this.speechSynthesis && this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  isSpeaking() {
    return this.speechSynthesis ? this.speechSynthesis.speaking : false;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopSpeaking();
    }
    return this.muted;
  }
}

// Global instance
const audioMgr = new AudioManager();
