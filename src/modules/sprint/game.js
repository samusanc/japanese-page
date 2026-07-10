import { makePool } from '@modules/conjugation/engine.js';
import { dailySeedForms } from '@modules/conjugation/daily-forms.js';
import { mulberry32, hashStr } from '@core/util.js';
import { todayStr } from '@core/dates.js';

/** Pure sprint state machine — no DOM, no timers. The index.js driver owns
 *  the clock and rendering; everything here is unit-testable. */

export const SPRINT = {
  durationMs: 60000,
  poolSize: 40,
  basePoints: 100,
  comboStep: 0.1,   // each streak step adds +10% …
  comboMax: 2       // … capped at ×2
};

/** New run over today's featured forms (same 5 shown on the home card).
 *  Seeded per (date, attempt) so a retry gets different questions. */
export function createSprint({ dateStr = todayStr(), attempt = 1 } = {}) {
  const forms = dailySeedForms(dateStr);
  const rnd = mulberry32(hashStr(dateStr + "sprint" + attempt));
  return {
    pool: makePool(forms, SPRINT.poolSize, rnd),
    idx: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    right: 0,
    wrong: 0,
    misses: []
  };
}

export function currentQuestion(g) {
  return g.pool[g.idx % g.pool.length];
}

/** Apply an answer. Returns {right, pts, q} for the UI to render. */
export function answerCurrent(g, picked) {
  const q = currentQuestion(g);
  const right = picked === q.correct;
  let pts = 0;
  if (right) {
    const mult = Math.min(SPRINT.comboMax, 1 + SPRINT.comboStep * g.combo);
    pts = Math.round(SPRINT.basePoints * mult);
    g.score += pts;
    g.combo++;
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    g.right++;
  } else {
    g.combo = 0;
    g.wrong++;
    g.misses.push({ item: q.item, fid: q.fid, correct: q.correct, picked });
  }
  g.idx++;
  return { right, pts, q };
}
