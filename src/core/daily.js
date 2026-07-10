import { state } from './state.js';
import { LS } from './storage.js';
import { todayStr, yesterdayStr } from './dates.js';
import { bePostScore } from './backend.js';
import { bus } from './bus.js';
import { toast } from './dom.js';

export function loadDayRec() {
  state.dayRec = LS.get("day:" + todayStr()) || { sU: 0, sB: 0, kU: 0, kB: 0 };
}

export function saveDayRec() {
  LS.set("day:" + todayStr(), state.dayRec);
}

export function getStreak() {
  const s = LS.get("streak");
  return (s && (s.last === todayStr() || s.last === yesterdayStr())) ? s.c : 0;
}

export function bumpStreak() {
  const s = LS.get("streak") || { c: 0, last: "" };
  if (s.last !== todayStr()) {
    s.c = (s.last === yesterdayStr()) ? s.c + 1 : 1;
    s.last = todayStr();
    LS.set("streak", s);
  }
}

/**
 * Standard "daily best" commit used by the daily games (kanji, sprint):
 * keep today's max, persist, bump streak, post to the backend when available.
 * Returns a human-readable postLine for the result screen.
 * @param {"sprint"|"kanji"} kind
 * @param {number} score
 */
export async function commitDailyScore(kind, score) {
  if (state.debugMode) {
    toast("Debug mode active: Results ignored.");
    return { postLine: "Debug mode: Score not saved or uploaded." };
  }
  const key = kind === "kanji" ? "kB" : "sB";
  state.dayRec[key] = Math.max(state.dayRec[key], score);
  saveDayRec();
  bumpStreak();
  let postLine;
  if (state.beReady) {
    const ok = await bePostScore(kind, state.dayRec[key]);
    postLine = ok
      ? (state.profile?.g ? `Posted to squad <b>${state.profile.g}</b> ✓` : "Saved online ✓")
      : "Couldn't reach the server — saved on this device.";
  } else {
    postLine = "Saved on this device (solo mode).";
  }
  bus.emit("daily:committed", { kind, score });
  return { postLine };
}
