import { $, escapeHtml } from '@core/dom.js';

/** Render a kanji's readings as tappable speaker chips into elId; returns the parts. */
export function readingChips(k, elId) {
  const parts = k.r.split("・").map(s => s.trim()).filter(Boolean);
  $(elId).innerHTML = parts.map(p =>
    `<button class="reading-chip" data-say="${escapeHtml(p)}">${escapeHtml(p)} <span style="font-size:12px;">🔊</span></button>`
  ).join("");
  return parts;
}
