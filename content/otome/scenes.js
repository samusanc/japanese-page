/**
 * Scene registry — the full audiovisual state of the VN stage.
 * Every field except bg is optional; defaults come from content/theme.js.
 *
 * A scene may declare (all optional):
 *   img:       background art (wins over the bg gradient)
 *   audio:     { music, ambience, enterSfx, musicFadeMs } — ids from ./audio.js;
 *              undefined = keep playing, null = stop
 *   filter:    CSS filter applied to the backdrop, e.g. "saturate(.7) brightness(.85)"
 *   vignette:  CSS background overlaid on the backdrop, e.g. a radial-gradient
 *   particles: { color, glyphs, density, max } — ambient sparkle overrides
 *
 * @type {Object<string, import('../types.js').SceneDefinition>}
 */
export const SCENES = {
  academy: {
    bg: "linear-gradient(168deg,#120D1F 0%,#241B36 48%,#57431E 135%)",
    img: "./bg/magic-training.png",
    audio: { music: "academy" },
  },

  ballroom: {
    bg: "linear-gradient(160deg,#3a2455 0%,#7b4b8f 50%,#d9a0c0 100%)",
    img: null,
    audio: { music: "waltz" },
  },

  garden: {
    bg: "linear-gradient(165deg,#1f4d43 0%,#4e8a6a 55%,#c9e6b8 100%)",
    img: "./bg/magic-green-forest.png",
    audio: { music: "academy" },
  },

  night: {
    bg: "linear-gradient(170deg,#0A0814 0%,#1B1738 55%,#3A3168 110%)",
    img: "./bg/magic-forest-night.png",
    /* no audio key — entering keeps whatever music is playing */
  },

  storm: {
    bg: "linear-gradient(165deg,#20142e 0%,#5e2445 55%,#a63c52 100%)",
    img: "./bg/magic-forest-night.png",
    audio: { music: "tension" },
  },

  rose: {
    bg: "linear-gradient(160deg,#5e2445 0%,#b0507e 55%,#f7c8d8 100%)",
    img: "./bg/park-moonlight.png",
    audio: { music: "love" },
  },

  study: {
    bg: "linear-gradient(165deg,#09090b,#181510)",
    img: "./bg/crown-prince-study.png",
    audio: { music: "tension" },
  }
};
