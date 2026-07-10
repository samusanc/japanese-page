import { describe, it, expect } from 'vitest';
import { createSprint, currentQuestion, answerCurrent, SPRINT } from '../src/modules/sprint/game.js';
import { dailySeedForms } from '@modules/conjugation/daily-forms.js';

const DATE = '2026-07-10';

describe('createSprint', () => {
  it('is deterministic for the same date + attempt', () => {
    const a = createSprint({ dateStr: DATE, attempt: 1 });
    const b = createSprint({ dateStr: DATE, attempt: 1 });
    expect(JSON.stringify(a.pool)).toBe(JSON.stringify(b.pool));
  });

  it('differs between attempts (retry ≠ replay)', () => {
    const a = createSprint({ dateStr: DATE, attempt: 1 });
    const b = createSprint({ dateStr: DATE, attempt: 2 });
    expect(JSON.stringify(a.pool)).not.toBe(JSON.stringify(b.pool));
  });

  it("draws only from the day's featured forms", () => {
    const forms = new Set(dailySeedForms(DATE));
    const g = createSprint({ dateStr: DATE, attempt: 1 });
    expect(g.pool.length).toBe(SPRINT.poolSize);
    g.pool.forEach(q => expect(forms.has(q.fid), q.fid).toBe(true));
  });
});

describe('scoring', () => {
  it('ramps the combo multiplier: 100, 110, 120 … capped at 200', () => {
    const g = createSprint({ dateStr: DATE, attempt: 1 });
    const gained = [];
    for (let i = 0; i < 12; i++) {
      const q = currentQuestion(g);
      const { right, pts } = answerCurrent(g, q.correct);
      expect(right).toBe(true);
      gained.push(pts);
    }
    expect(gained.slice(0, 3)).toEqual([100, 110, 120]);
    expect(gained[10]).toBe(200); // 11th correct: combo 10 → ×2 cap
    expect(gained[11]).toBe(200); // stays capped
    expect(g.score).toBe(gained.reduce((a, b) => a + b, 0));
    expect(g.bestCombo).toBe(12);
  });

  it('a wrong answer resets the combo and records the miss', () => {
    const g = createSprint({ dateStr: DATE, attempt: 1 });
    answerCurrent(g, currentQuestion(g).correct);
    answerCurrent(g, currentQuestion(g).correct);

    const q = currentQuestion(g);
    const wrongPick = q.options.find(o => o !== q.correct);
    const { right, pts } = answerCurrent(g, wrongPick);
    expect(right).toBe(false);
    expect(pts).toBe(0);
    expect(g.combo).toBe(0);
    expect(g.wrong).toBe(1);
    expect(g.misses).toHaveLength(1);
    expect(g.misses[0].correct).toBe(q.correct);
    expect(g.misses[0].picked).toBe(wrongPick);

    // next correct answer is back to base points
    const { pts: pts2 } = answerCurrent(g, currentQuestion(g).correct);
    expect(pts2).toBe(SPRINT.basePoints);
  });

  it('wraps around when the pool is exhausted', () => {
    const g = createSprint({ dateStr: DATE, attempt: 1 });
    g.idx = SPRINT.poolSize; // past the end
    expect(currentQuestion(g)).toBe(g.pool[0]);
  });
});
