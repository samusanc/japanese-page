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
let _activeAudio = null;

export function ttsFallback(text) {
  const time = new Date().toISOString().slice(11, 23);
  console.log(`[Audio Debug ${time}] ttsFallback("${text}") called`);
  try {
    if (!window.speechSynthesis) {
      console.log(`[Audio Debug ${time}] ttsFallback: window.speechSynthesis not supported`);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.92;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("ja"));
    console.log(`[Audio Debug ${time}] ttsFallback: voice found=${v ? v.name : "none"}`);
    if (v) u.voice = v;
    console.log(`[Audio Debug ${time}] ttsFallback: calling speechSynthesis.cancel()`);
    speechSynthesis.cancel();
    console.log(`[Audio Debug ${time}] ttsFallback: calling speechSynthesis.speak()`);
    speechSynthesis.speak(u);
  } catch (e) {
    console.log(`[Audio Debug ${time}] ttsFallback error:`, e);
  }
}

export function speak(text) {
  const time = new Date().toISOString().slice(11, 23);
  console.log(`[Audio Debug ${time}] speak("${text}") called`);
  if (!state.sndOn) {
    console.log(`[Audio Debug ${time}] speak: sound is disabled (state.sndOn=false), ignoring`);
    return;
  }
  if (!text) {
    console.log(`[Audio Debug ${time}] speak: text is empty, ignoring`);
    return;
  }
  if (_activeAudio) {
    try {
      console.log(`[Audio Debug ${time}] speak: pausing active audio track`);
      _activeAudio.pause();
      _activeAudio.currentTime = 0;
    } catch (e) {
      console.log(`[Audio Debug ${time}] speak: error pausing active audio:`, e);
    }
  }
  const id = audioId(text);
  let a = _audioEls[id];
  console.log(`[Audio Debug ${time}] speak: id="${id}", cachedStatus=${a ? (a === "bad" ? "bad" : "AudioObject") : "none"}`);
  if (a === "bad") {
    console.log(`[Audio Debug ${time}] speak: cached status is bad, routing to ttsFallback`);
    return ttsFallback(text);
  }
  if (!a) {
    const src = CONFIG.AUDIO_BASE + id + ".mp3";
    console.log(`[Audio Debug ${time}] speak: creating new Audio element for "${src}"`);
    a = new Audio(src);
    a.preload = "auto";
    a.addEventListener("error", (e) => {
      const etime = new Date().toISOString().slice(11, 23);
      console.log(`[Audio Debug ${etime}] ERROR EVENT fired on Audio element for id="${id}" (text="${text}")`);
      _audioEls[id] = "bad";
      ttsFallback(text);
    });
    _audioEls[id] = a;
  }
  try {
    console.log(`[Audio Debug ${time}] speak: calling speechSynthesis.cancel() to abort active speech`);
    speechSynthesis && speechSynthesis.cancel();
  } catch (e) {
    console.log(`[Audio Debug ${time}] speak: speechSynthesis.cancel() error:`, e);
  }
  _activeAudio = a;
  a.currentTime = 0;
  console.log(`[Audio Debug ${time}] speak: calling audio.play() for id="${id}"`);
  const pr = a.play();
  if (pr && pr.catch) {
    pr.catch((err) => {
      const ctime = new Date().toISOString().slice(11, 23);
      console.log(`[Audio Debug ${ctime}] play().catch triggered for id="${id}". Error Name: "${err ? err.name : 'unknown'}", Message: "${err ? err.message : 'none'}"`);
      if (err && err.name === "NotAllowedError") {
        console.log(`[Audio Debug ${ctime}] play().catch: NotAllowedError detected, calling ttsFallback`);
        ttsFallback(text);
      }
    });
  }
}

export function spkBtn(text, big) {
  return `<button class="spk${big ? " big" : ""}" data-say="${escapeHtml(text)}" aria-label="play audio">🔊</button>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-say]");
  if (b) {
    const time = new Date().toISOString().slice(11, 23);
    console.log(`[Audio Debug ${time}] Click event on data-say button: "${b.dataset.say}"`);
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
  const time = new Date().toISOString().slice(11, 23);
  console.log(`[Audio Debug ${time}] beep("${type}") called`);
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
  } catch (e) {
    console.log(`[Audio Debug ${time}] beep error:`, e);
  }
}
