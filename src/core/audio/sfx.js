import { dbg } from '../log.js';

/** Synthesized WebAudio sound effects (no asset files needed). */
let actx = null;

/** Built-in UI feedback recipes; game content can define more via the
 *  SFX registry (played through core/audio/engine.js). */
const BUILTIN = {
  ok:   [{ f: 660, at: 0, dur: 0.09, gain: 0.12 }, { f: 990, at: 0.08, dur: 0.12, gain: 0.12 }],
  no:   [{ f: 180, at: 0, dur: 0.18, gain: 0.14, wave: "square" }],
  end:  [{ f: 523, at: 0, dur: 0.12, gain: 0.12 }, { f: 659, at: 0.11, dur: 0.12, gain: 0.12 }, { f: 784, at: 0.22, dur: 0.2, gain: 0.12 }],
  tick: [{ f: 880, at: 0, dur: 0.05, gain: 0.06 }]
};

/** Play a beep recipe: array of {f (Hz), at (s), dur (s), gain, wave?}. */
export function playRecipe(steps) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    for (const s of steps) {
      const o = actx.createOscillator();
      const gn = actx.createGain();
      o.type = s.wave || "sine";
      o.frequency.value = s.f;
      gn.gain.setValueAtTime(0.0001, t + s.at);
      gn.gain.exponentialRampToValueAtTime(s.gain, t + s.at + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + s.at + s.dur);
      o.connect(gn).connect(actx.destination);
      o.start(t + s.at);
      o.stop(t + s.at + s.dur + 0.02);
    }
  } catch (e) {
    dbg("playRecipe error:", e);
  }
}

export function beep(type) {
  const r = BUILTIN[type];
  if (r) playRecipe(r);
}

/** Very short mechanical tick for typewriter character-by-character animation. */
export function typewriterClack() {
  playRecipe([{ f: 1200, at: 0, dur: 0.018, gain: 0.045, wave: "triangle" }]);
}
