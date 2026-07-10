import { state } from '../state.js';
import { dbg } from '../log.js';
import { beep, playRecipe } from './sfx.js';

/**
 * AudioEngine — looping music + ambience channels with crossfade, and a
 * one-shot sfx player. Content registries (track id → {src, volume, beep})
 * are injected via configureAudio() from the composition root, so core
 * stays free of game-content imports.
 *
 * Scene transitions drive it declaratively through applyScene(sceneAudio):
 * undefined field = keep playing, null = stop, id = crossfade to that track.
 */

let registries = { music: {}, ambience: {}, sfx: {} };
let fadeMsDefault = 800;

export function configureAudio({ music, ambience, sfx, musicFadeMs } = {}) {
  if (music) registries.music = music;
  if (ambience) registries.ambience = ambience;
  if (sfx) registries.sfx = sfx;
  if (musicFadeMs) fadeMsDefault = musicFadeMs;
}

/** One looping channel with volume-ramp crossfade between tracks. */
function makeChannel(kind) {
  return { kind, id: null, el: null, fading: [] };
}
const channels = { music: makeChannel("music"), ambience: makeChannel("ambience") };

function fadeTo(el, target, ms, onDone) {
  const start = el.volume;
  const t0 = Date.now();
  const iv = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / ms);
    try { el.volume = start + (target - start) * k; } catch (e) {}
    if (k >= 1) {
      clearInterval(iv);
      if (onDone) onDone();
    }
  }, 50);
  return iv;
}

function playLoop(chName, id, { fadeMs } = {}) {
  const ch = channels[chName];
  const ms = fadeMs ?? fadeMsDefault;
  if (id === ch.id) return; // already playing (or already stopped)
  ch.id = id;

  // fade out whatever is playing
  if (ch.el) {
    const old = ch.el;
    ch.el = null;
    fadeTo(old, 0, ms, () => { try { old.pause(); } catch (e) {} });
  }
  if (!id || !state.sndOn) return;

  const track = registries[chName][id];
  if (!track || !track.src) return; // declared but no asset yet — silent no-op
  try {
    const el = new Audio(track.src);
    el.loop = true;
    el.volume = 0;
    ch.el = el;
    el.play().catch(() => {});
    fadeTo(el, track.volume ?? 1, ms);
  } catch (e) {
    dbg("playLoop error:", e);
  }
}

export function playMusic(id, opts) {
  playLoop("music", id, opts);
}

export function playAmbience(id, opts) {
  playLoop("ambience", id, opts);
}

export function stopAllLoops() {
  playMusic(null, { fadeMs: 300 });
  playAmbience(null, { fadeMs: 300 });
}

/** One-shot effect: content registry entry (file or beep recipe) or a built-in beep type. */
export function sfx(id) {
  if (!state.sndOn || !id) return;
  const def = registries.sfx[id];
  if (def?.beep) return playRecipe(def.beep);
  if (def?.src) {
    try {
      const el = new Audio(def.src);
      el.volume = def.volume ?? 1;
      el.play().catch(() => {});
    } catch (e) {}
    return;
  }
  beep(id);
}

/**
 * Apply a scene's declarative audio block.
 * @param {{music?:?string, ambience?:?string, enterSfx?:string, musicFadeMs?:number}} [audio]
 */
export function applySceneAudio(audio = {}) {
  if ("music" in audio) playMusic(audio.music, { fadeMs: audio.musicFadeMs });
  if ("ambience" in audio) playAmbience(audio.ambience, { fadeMs: audio.musicFadeMs });
  if (audio.enterSfx) sfx(audio.enterSfx);
}
