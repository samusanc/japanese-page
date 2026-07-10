/** Shared visual defaults for the VN stage — per-scene/per-character values override these. */
export const THEME = {
  /** Name-plate text color used over character accent gradients. */
  plateInk: "#2B2347",

  /** Ambient sparkles + burst particles over the stage. */
  particles: {
    color: "#E9C868",
    glyphs: ["✦", "✧", "·"],
    burstGlyphs: ["✦", "✧", "✨", "·", "＊"],
    max: 13,
    intervalMs: 620
  },

  /** Gold "spellcasting" palette for the in-VN HanziWriter. */
  hanzi: {
    strokeColor: "#E9C868",
    outlineColor: "rgba(233,200,104,0.18)",
    drawingColor: "#fff",
    drawingWidth: 18
  }
};
