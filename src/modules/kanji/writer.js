import HanziWriter from 'hanzi-writer';
import { toast } from '@core/dom.js';
import { strokeData } from './data.js';

/** Single home of the HanziWriter integration (the only module that touches
 *  the HanziWriter global). Other modules pass style overrides via opts. */

const STROKE_DATA_CDN = "https://cdn.jsdelivr.net/gh/chanind/hanzi-writer-data-jp@latest/data/";

export function kanjiLoader(char, onComplete) {
  const local = strokeData(char);
  if (local) return onComplete(local);
  fetch(STROKE_DATA_CDN + encodeURIComponent(char) + ".json")
    .then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(onComplete)
    .catch(() => toast("Couldn't load stroke data for " + char));
}

export function writerSize(box) {
  const r = box.getBoundingClientRect();
  return Math.round(Math.min(r.width, r.height));
}

/** How forgiving stroke matching is (1 = hanzi-writer default). Raised so
 *  strokes drawn smaller/bigger than the template still count. */
export const QUIZ_LENIENCY = 1.5;

/** After this many misses on ONE stroke, hanzi-writer softly animates the
 *  expected stroke (in highlightColor) — the stroke-order guide. */
export const HINT_AFTER_MISSES = 3;

/** Ink-on-paper default palette (kanji dictionary/daily); callers override. */
const DEFAULT_STYLE = {
  showCharacter: false,
  // Matched reference strokes render translucent so the player's own ink
  // (kept via keepInk below) stays visible next to them for comparison.
  strokeColor: "rgba(35,38,47,0.55)",
  outlineColor: "#D9D4C5",
  drawingColor: "#2A4B8D",
  drawingWidth: 16,
  highlightColor: "#7EA6FF",
  padding: 14
};

export function makeWriter(box, char, opts) {
  [...box.children].forEach(ch => { if (!ch.classList.contains("stamp")) ch.remove(); });
  const s = writerSize(box);
  return HanziWriter.create(box, char, Object.assign(
    { width: s, height: s, charDataLoader: kanjiLoader },
    DEFAULT_STYLE,
    opts
  ));
}

/**
 * Preserve the player's ink for an ACCEPTED stroke — called from
 * onCorrectStroke. hanzi-writer fades every raw stroke out after ~300ms
 * (which is what auto-erases mistakes), so to keep the good ones we clone
 * the just-drawn path (the last <path> in the svg) into a static ink layer
 * before the original fades.
 */
export function keepInk(box) {
  const svg = box.querySelector("svg");
  if (!svg) return;
  const paths = svg.querySelectorAll("path");
  const src = paths[paths.length - 1];
  if (!src) return;
  const clone = src.cloneNode();
  clone.removeAttribute("opacity");
  clone.style.opacity = "0.9";
  clone.classList.add("hw-ink");
  src.parentNode.appendChild(clone);
}

/**
 * Rune activation: on completion the player's own ink ignites stroke by
 * stroke — color shifts to spell-gold with a growing glow, then the whole
 * glyph flashes. Styles live in src/styles/overlays.css (.hw-ink.bloom).
 */
export function bloomInk(box, { color = "#F5E3B8", glow = "rgba(233,200,104,0.95)" } = {}) {
  const inks = box.querySelectorAll("svg path.hw-ink");
  inks.forEach((p, i) => {
    setTimeout(() => {
      p.style.setProperty("--bloom-color", color);
      p.style.setProperty("--bloom-glow", glow);
      p.classList.add("bloom");
    }, i * 70);
  });
  const svg = box.querySelector("svg");
  if (svg) {
    setTimeout(() => {
      svg.classList.add("bloom-flash");
      setTimeout(() => svg.classList.remove("bloom-flash"), 900);
    }, inks.length * 70 + 100);
  }
}

/**
 * Progressive stroke guide for "revealed" mode: instead of showing the whole
 * kanji outline, softly animates ONLY the stroke the player must draw next
 * (earlier strokes are already inked on the paper). Feed it the quiz
 * callbacks' data; call reveal() when the player runs out of tries.
 */
export function strokeGuide(getWriter) {
  let cur = 0;
  let on = false;
  let timer = null;
  const show = () => {
    const w = getWriter();
    if (!w || !on) return;
    try { w.highlightStroke(cur); } catch (e) {}
  };
  return {
    trackMistake(d) {
      if (d) cur = d.strokeNum;
      if (on) {
        clearTimeout(timer);
        timer = setTimeout(show, 250);
      }
    },
    trackCorrect(d) {
      if (d) cur = d.strokeNum + 1;
      if (on && d && d.strokesRemaining > 0) {
        clearTimeout(timer);
        timer = setTimeout(show, 450);
      }
    },
    reveal() {
      on = true;
      show();
    },
    stop() {
      on = false;
      clearTimeout(timer);
    }
  };
}
