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

  /** Gold "spellcasting" palette for the in-VN HanziWriter.
   *  Reference strokes are translucent so the player's white ink stays
   *  visible for comparison; highlightColor is the stroke-guide animation. */
  hanzi: {
    strokeColor: "rgba(233,200,104,0.55)",
    outlineColor: "rgba(233,200,104,0.18)",
    drawingColor: "#fff",
    drawingWidth: 18,
    highlightColor: "#F5E3B8"
  },

  /** Solid gold used when the teacher demonstrates strokes (watch mode). */
  hanziDemoStroke: "#E9C868"
};
