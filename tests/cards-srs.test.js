import { describe, it, expect } from 'vitest';
import { entryKey, attachWeights, learnedEntries, pickReview, applyRound, toWeights } from '../src/modules/cards/srs.js';
import { CARDS_BALANCE } from '@content/cards.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const S = CARDS_BALANCE.srs;
const mk = (ja, kana, es) => ({ ja, kana, es });
const pool5 = () => attachWeights(
  [mk('私', 'わたし', 'yo'), mk('父', 'ちち', 'padre'), mk('母', 'はは', 'madre'),
   mk('водá', 'みず', 'agua'), mk('火', 'ひ', 'fuego')], {});

describe('cards SRS', () => {
  it('unseen entries have null points and are not persisted', () => {
    const pool = pool5();
    expect(pool.every(e => e.points === null)).toBe(true);
    expect(toWeights(pool)).toEqual({});
    expect(learnedEntries(pool)).toHaveLength(0);
  });

  it('attachWeights restores stored points', () => {
    const stored = { [entryKey(mk('父', 'ちち', 'padre'))]: 4 };
    const pool = attachWeights([mk('父', 'ちち', 'padre'), mk('火', 'ひ', 'fuego')], stored);
    expect(pool[0].points).toBe(4);
    expect(pool[1].points).toBe(null);
    expect(learnedEntries(pool)).toHaveLength(1);
  });

  it('pickReview prefers overdue (high points), then unseen, skipping the session', () => {
    const pool = pool5();
    pool[0].points = 6;   // overdue — dealt before, keeps escaping
    pool[1].points = -5;  // well-known
    const session = new Set([entryKey(pool[2])]); // 母 already on the table
    const picked = pickReview(pool, session, 3);
    expect(picked.map(e => e.ja)).toEqual(['私', 'водá', '火']); // overdue first, unseen next, known last
  });

  it('applyRound: clean match ↓, sloppy match ↑, left on table ↑, benched learned ↑', () => {
    const pool = pool5();
    pool.forEach(e => { e.points = 0; }); // everything dealt once
    const k = i => entryKey(pool[i]);
    applyRound(pool,
      new Set([k(0), k(1), k(2)]),   // active
      new Set([k(0), k(1)]),          // matched
      new Set([k(1)])                 // 父 was fumbled first
    );
    expect(pool[0].points).toBe(S.matchedClean);   // clean → appears less
    expect(pool[1].points).toBe(S.matchedSloppy);  // sloppy → appears more
    expect(pool[2].points).toBe(S.leftOnTable);    // timed out on the table
    expect(pool[3].points).toBe(S.notInRound);     // benched
  });

  it('clean matches never sink below the floor', () => {
    const pool = pool5();
    pool[0].points = S.floor;
    applyRound(pool, new Set([entryKey(pool[0])]), new Set([entryKey(pool[0])]), new Set());
    expect(pool[0].points).toBe(S.floor);
  });

  it('never-dealt entries stay unseen through a round', () => {
    const pool = pool5();
    pool[0].points = 0;
    applyRound(pool, new Set([entryKey(pool[0])]), new Set([entryKey(pool[0])]), new Set());
    expect(pool[1].points).toBe(null); // benched but never dealt — untouched
  });
});

describe('generated vocab decks', () => {
  const load = id => JSON.parse(readFileSync(
    fileURLToPath(new URL(`../public/vocab/${id}.json`, import.meta.url)), 'utf8'));

  it('all six decks exist with vocab and kanji pools', () => {
    for (const id of ['starter', 'elementary1', 'elementary2', 'preintermediate', 'intermediate1', 'intermediate2']) {
      const d = load(id);
      expect(d.vocab.length, id).toBeGreaterThan(400);
      expect(d.kanji.length, id).toBeGreaterThan(50);
      d.vocab.slice(0, 50).forEach(e => {
        expect(e.ja, id).toBeTruthy();
        expect(e.kana, id).toBeTruthy();
        expect(e.es, id).toBeTruthy();
      });
      d.kanji.slice(0, 50).forEach(e => {
        expect(e.ja, id).toBeTruthy();
        expect(e.kana, id).toBeTruthy();
      });
    }
  });

  it('intermediate readings have accent digits stripped', () => {
    const d = load('intermediate1');
    d.vocab.forEach(e => expect(e.kana).not.toMatch(/[0-9]/));
  });
});
