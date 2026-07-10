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

/** Ink-on-paper default palette (kanji dictionary/daily); callers override. */
const DEFAULT_STYLE = {
  showCharacter: false,
  strokeColor: "#23262F",
  outlineColor: "#D9D4C5",
  drawingColor: "#2A4B8D",
  drawingWidth: 16,
  padding: 22
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
