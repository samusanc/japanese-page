import { LS } from '@core/storage.js';

/** Per-kanji progress: { tr: traced once, rc: recalled from memory (mastered) } */
export function kprog() {
  return LS.get("kprog") || {};
}

export function setKprog(c, patch) {
  const p = kprog();
  p[c] = Object.assign(p[c] || {}, patch);
  LS.set("kprog", p);
}

export function isMastered(c) {
  const p = kprog()[c];
  return !!(p && p.rc);
}
