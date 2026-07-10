/**
 * Audio registries for the otome VN. Drop an mp3 under public/ and set its
 * path in `src` — the engine skips null srcs gracefully, so entries can be
 * declared before the assets exist.
 */

/** Looping background music, crossfaded on scene changes. */
export const MUSIC = {
  academy: { src: null, volume: 0.35 },
  waltz:   { src: null, volume: 0.35 },
  tension: { src: null, volume: 0.35 },
  love:    { src: null, volume: 0.35 }
};

/** Looping ambience beds (rain, crowd, wind…) — independent of music. */
export const AMBIENCE = {
  // wind:  { src: "./sfx/wind.mp3", volume: 0.4 },
};

/**
 * One-shot sound effects for {sfx:"id"} nodes and scene enterSfx.
 * Either { src } for a file, or { beep: [{f, at, dur, gain, wave?}] } for a
 * synthesized WebAudio recipe (like the built-in ok/no/end/tick).
 */
export const SFX = {
  // glassBreak: { src: "./sfx/glass.mp3", volume: 0.8 },
  // chime: { beep: [{ f: 880, at: 0, dur: 0.1, gain: 0.1 }, { f: 1320, at: 0.1, dur: 0.2, gain: 0.1 }] },
};
