import { LS } from '@core/storage.js';
import { todayStr, monthStr } from '@core/dates.js';
import { hashStr, mulberry32, shuffle } from '@core/util.js';
import { CHARACTERS } from '@content/otome/index.js';
import { ROSTER_SIZE } from './constants.js';

/** Per-character romance state, reset monthly. st ∈ new/love/friend/bw/sealed */
export function otomeState() {
  let s = LS.get("otome");
  if (!s || s.m !== monthStr()) {
    s = { m: monthStr(), chars: {} };
    LS.set("otome", s);
  }
  return s;
}

export function charState(id) {
  return otomeState().chars[id] || { st: "new" };
}

export function setCharState(id, patch) {
  const s = otomeState();
  s.chars[id] = Object.assign(s.chars[id] || { st: "new" }, patch);
  LS.set("otome", s);
}

/** Today's deterministic pick of characters available to court. */
export function todayRoster() {
  const rnd = mulberry32(hashStr(todayStr() + "roster"));
  return shuffle(CHARACTERS.map(c => c.id), rnd).slice(0, ROSTER_SIZE);
}
