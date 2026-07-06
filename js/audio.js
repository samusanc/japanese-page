import { state } from './state.js';
import { CONFIG } from './config.js';
import { LS, escapeHtml } from './helpers.js';

state.sndOn = LS.get("sound") !== false;

const _enc = new TextEncoder();
const _aidCache = new Map();

export function audioId(text) {
  if (_aidCache.has(text)) return _aidCache.get(text);
  let h = 0xcbf29ce484222325n;
  for (const b of _enc.encode(text)) {
    h ^= BigInt(b);
    h = (h * 0x100000001b3n) & 0xFFFFFFFFFFFFFFFFn;
  }
  const id = h.toString(16).padStart(16, "0");
  _aidCache.set(text, id);
  return id;
}

const _audioEls = {};

export function ttsFallback(text) {
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.92;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("ja"));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}

export function speak(text) {
  if (!state.sndOn || !text) return;
  const id = audioId(text);
  let a = _audioEls[id];
  if (a === "bad") return ttsFallback(text);
  if (!a) {
    a = new Audio(CONFIG.AUDIO_BASE + id + ".mp3");
    a.preload = "auto";
    _audioEls[id] = a;
  }
  try {
    speechSynthesis && speechSynthesis.cancel();
  } catch (e) {}
  a.currentTime = 0;
  const pr = a.play();
  if (pr && pr.catch) {
    pr.catch(() => {
      _audioEls[id] = "bad";
      ttsFallback(text);
    });
  }
}

export function spkBtn(text, big) {
  return `<button class="spk${big ? " big" : ""}" data-say="${escapeHtml(text)}" aria-label="play audio">🔊</button>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-say]");
  if (b) {
    e.stopPropagation();
    speak(b.dataset.say);
  }
});

export function renderSoundToggle() {
  const b = document.querySelector("#soundToggle");
  if (!b) return;
  b.textContent = state.sndOn ? "🔊" : "🔇";
  b.classList.toggle("off", !state.sndOn);
}

export function initAudioUI() {
  const toggleBtn = document.querySelector("#soundToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      state.sndOn = !state.sndOn;
      LS.set("sound", state.sndOn);
      renderSoundToggle();
      if (state.sndOn) {
        speak("こんにちは");
      } else {
        try {
          speechSynthesis.cancel();
        } catch (e) {}
      }
    });
  }
  renderSoundToggle();
}

let actx = null;
export function beep(type) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const play = (f, st, d, g, w) => {
      const o = actx.createOscillator();
      const gn = actx.createGain();
      o.type = w || "sine";
      o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, t + st);
      gn.gain.exponentialRampToValueAtTime(g, t + st + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + st + d);
      o.connect(gn).connect(actx.destination);
      o.start(t + st);
      o.stop(t + st + d + 0.02);
    };
    if (type === "ok") {
      play(660, 0, 0.09, 0.12);
      play(990, 0.08, 0.12, 0.12);
    } else if (type === "no") {
      play(180, 0, 0.18, 0.14, "square");
    } else if (type === "end") {
      play(523, 0, 0.12, 0.12);
      play(659, 0.11, 0.12, 0.12);
      play(784, 0.22, 0.2, 0.12);
    } else if (type === "tick") {
      play(880, 0, 0.05, 0.06);
    }
  } catch (e) {}
}
