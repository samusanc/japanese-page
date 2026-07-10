import { state } from '../state.js';
import { CONFIG } from '../backend.js';
import { dbg } from '../log.js';

/**
 * Voice playback: pre-generated mp3 clips looked up by FNV-1a hash of the
 * text (audio/<hash>.mp3, produced offline by generate_audio_edge.py),
 * with Web Speech synthesis as fallback.
 *
 * ⚠ audioId() must stay hash-identical to fnv1a64() in generate_audio_edge.py
 *   — 1,230 pre-generated mp3 filenames depend on it (locked by
 *   tests/audio-hash.test.js).
 */
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
  dbg(`ttsFallback("${text}")`);
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.92;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("ja"));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {
    dbg("ttsFallback error:", e);
  }
}

/**
 * @param {string} text
 * @param {{dir?:string}} [voice]  Per-character voice folder (audio/<dir>/<hash>.mp3).
 *   Missing per-character clips fall back to the flat legacy path, then to TTS —
 *   so voice folders can be generated incrementally.
 */
export function speak(text, voice) {
  if (!state.sndOn || !text) return;
  if (_activeAudio) {
    try {
      _activeAudio.pause();
      _activeAudio.currentTime = 0;
    } catch (e) {}
  }
  const id = audioId(text);
  const dir = voice?.dir;
  const key = (dir || "") + "|" + id;
  let a = _audioEls[key];
  dbg(`speak("${text}") id=${id} dir=${dir || "-"} cached=${a ? (a === "bad" ? "bad" : "yes") : "no"}`);
  if (a === "bad") return ttsFallback(text);
  if (!a) {
    a = new Audio(CONFIG.AUDIO_BASE + (dir ? dir + "/" : "") + id + ".mp3");
    a.preload = "auto";
    let triedFlat = !dir;
    a.addEventListener("error", () => {
      if (!triedFlat) {
        triedFlat = true;
        dbg(`no per-voice clip for id=${id} — trying flat path`);
        a.src = CONFIG.AUDIO_BASE + id + ".mp3";
        a.load();
        a.play().catch(() => {});
        return;
      }
      dbg(`audio error for id=${id} ("${text}") — falling back to TTS`);
      _audioEls[key] = "bad";
      ttsFallback(text);
    });
    _audioEls[key] = a;
  }
  try {
    speechSynthesis && speechSynthesis.cancel();
  } catch (e) {}
  _activeAudio = a;
  a.currentTime = 0;
  const pr = a.play();
  if (pr && pr.catch) {
    pr.catch(err => {
      dbg(`play() rejected for id=${id}: ${err?.name}`);
      if (err && err.name === "NotAllowedError") ttsFallback(text);
    });
  }
}
