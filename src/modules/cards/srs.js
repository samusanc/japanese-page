import { CARDS_BALANCE } from '@content/cards.js';

/** Pure SRS/deck-selection logic for the card table — no DOM, unit-tested. */

export const entryKey = e => e.ja + "|" + e.kana + "|" + (e.es || "");

/** Attach stored SRS weights to a freshly loaded pool. */
export function attachWeights(pool, weights) {
  return pool.map(e => ({ ...e, points: weights[entryKey(e)] ?? null }));
}

/** Entries the player has already been dealt (present in the weight map). */
export function learnedEntries(pool) {
  return pool.filter(e => e.points !== null);
}

/**
 * Pick the next batch of unseen cards to deal, highest SRS weight first
 * (never-seen cards weigh 0 until first dealt; overdue cards bubble up).
 */
export function pickReview(pool, sessionKeys, n = CARDS_BALANCE.reviewBatch) {
  const candidates = pool
    .filter(e => !sessionKeys.has(entryKey(e)))
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, n);
  return candidates.length ? candidates : pool.slice(0, n);
}

/**
 * End-of-round weight adjustment. Mutates entry.points.
 * @param {Array} pool          all entries (points attached)
 * @param {Set} activeKeys      keys on the table this round
 * @param {Set} matchedKeys     keys matched this round
 * @param {Set} mismatchedKeys  keys involved in a wrong pairing
 */
export function applyRound(pool, activeKeys, matchedKeys, mismatchedKeys) {
  const S = CARDS_BALANCE.srs;
  for (const e of pool) {
    const k = entryKey(e);
    const started = e.points !== null;
    if (activeKeys.has(k)) {
      if (matchedKeys.has(k)) {
        e.points = mismatchedKeys.has(k)
          ? (e.points ?? 0) + S.matchedSloppy
          : Math.max(S.floor, (e.points ?? 0) + S.matchedClean);
      } else {
        e.points = (e.points ?? 0) + S.leftOnTable;
      }
    } else if (started) {
      e.points += S.notInRound;
    }
  }
}

/** Serializable weight map for storage (only entries that have been dealt). */
export function toWeights(pool) {
  const w = {};
  for (const e of pool) {
    if (e.points !== null) w[entryKey(e)] = e.points;
  }
  return w;
}
