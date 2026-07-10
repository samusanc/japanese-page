import { LS } from '@core/storage.js';
import { shuffle, mulberry32 } from '@core/util.js';
import { kanjiList } from '@modules/kanji/data.js';
import { CHARACTERS } from '@content/otome/index.js';
import { SRS_INTERVALS_MS } from './constants.js';

/** Lightweight spaced repetition. kind: "ksrs" (kanji) | "fsrs" (grammar forms). */
export function srsBump(kind, key, ok) {
  const m = LS.get(kind) || {};
  const r = m[key] || { s: 0, t: 0 };
  r.s = ok ? Math.min(5, r.s + 1) : Math.max(0, r.s - 2);
  r.t = Date.now();
  m[key] = r;
  LS.set(kind, m);
}

/** Overdue ratio; never-seen items get top priority. */
export function srsDue(kind, key) {
  const r = (LS.get(kind) || {})[key];
  if (!r) return 9 + Math.random();
  return (Date.now() - r.t) / SRS_INTERVALS_MS[r.s];
}

export function srsPickKanji(n, lvl) {
  const pool = kanjiList().filter(k => !lvl || k.l === lvl);
  return shuffle(pool.slice(), mulberry32(Date.now() >>> 0))
    .sort((a, b) => srsDue("ksrs", b.c) - srsDue("ksrs", a.c)).slice(0, n);
}

/** All quiz phrases embedded in the character routes, tagged with the speaker. */
export function declPhrases() {
  const out = [];
  CHARACTERS.forEach(c => c.route.intro.forEach(nd => {
    if (nd.quiz) out.push(Object.assign({ who: c.id }, nd.quiz));
  }));
  return out;
}

export function srsPickForms(n, chosen) {
  const all = declPhrases();
  let pool = (chosen && chosen.length) ? all.filter(p => chosen.includes(p.form)) : all.slice();
  if (!pool.length) pool = all.slice();
  pool = shuffle(pool, mulberry32(Date.now() >>> 0));
  if (!chosen || !chosen.length) pool.sort((a, b) => srsDue("fsrs", b.form) - srsDue("fsrs", a.form));
  const res = [];
  for (let i = 0; res.length < n; i++) res.push(pool[i % pool.length]);
  return res;
}
