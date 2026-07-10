import { isDebugQuery } from './settings.js';

/** Debug-gated logger — silent unless the page was opened with ?debug=1. */
export function dbg(...args) {
  if (!isDebugQuery) return;
  console.log("[" + new Date().toISOString().slice(11, 23) + "]", ...args);
}
