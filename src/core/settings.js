import { state } from './state.js';
import { LS } from './storage.js';
import { bus } from './bus.js';

/** True when the page was opened with ?debug=1 — enables Eruda + verbose logs. */
export const isDebugQuery =
  typeof location !== "undefined" && new URLSearchParams(location.search).has("debug");

export function initSettings() {
  state.sndOn = LS.get("sound") !== false;
}

/** Toggle "infinite tries" debug mode (the squad-screen switch). */
export function setDebugMode(on) {
  state.debugMode = on;
  bus.emit("debug:changed", on);
}
