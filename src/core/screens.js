import { $, $$ } from './dom.js';

/**
 * Screen navigation with a render registry. Feature modules register a
 * renderer for their screen id at init; showScreen() runs it on entry.
 * This is what breaks the old app.js ↔ feature circular imports.
 */
const renderers = {};

export function registerScreen(id, render) {
  renderers[id] = render;
}

export function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("on"));
  const scr = $("#s-" + id);
  if (scr) scr.classList.add("on");
  $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.s === id));
  window.scrollTo({ top: 0 });
  renderers[id]?.();
}

export function initTabs() {
  $$(".tab").forEach(t => t.addEventListener("click", () => showScreen(t.dataset.s)));
}
