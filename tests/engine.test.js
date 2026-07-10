// Characterization tests for the conjugation engine — pinned BEFORE the
// modularization refactor so any behavior drift is caught immediately.
import { describe, it, expect } from 'vitest';
import { answer, buildQuestion, makePool } from '@modules/conjugation/engine.js';
import { VERBS, ADJS } from '@content/grammar/words.js';
import { FORMS } from '@content/grammar/forms.js';
import { mulberry32 } from '@core/util.js';

const V = r => VERBS.find(v => v.r === r);
const A = r => ADJS.find(a => a.r === r);

describe('godan conjugation', () => {
  const cases = {
    のむ: { te: 'のんで', ta: 'のんだ', tara: 'のんだら', nai: 'のまない', masu: 'のみます', tai: 'のみたい', pot: 'のめる', vol: 'のもう', ba: 'のめば', imp: 'のめ', pass: 'のまれる', caus: 'のませる', dict: 'のむ' },
    かう: { te: 'かって', nai: 'かわない', masu: 'かいます' },       // う → わ in nai
    かく: { te: 'かいて', ta: 'かいた' },
    およぐ: { te: 'およいで', ta: 'およいだ' },
    はなす: { te: 'はなして', ta: 'はなした' },
    まつ: { te: 'まって' },
    しぬ: { te: 'しんで' },
    あそぶ: { te: 'あそんで' },
    かえる: { te: 'かえって', nai: 'かえらない', pot: 'かえれる' }, // ⚠godan despite る
  };
  for (const [r, forms] of Object.entries(cases)) {
    for (const [fid, expected] of Object.entries(forms)) {
      it(`${r} ${fid} → ${expected}`, () => expect(answer(V(r), fid)).toBe(expected));
    }
  }
  it('行く irregular te/ta (いって, not いいて)', () => {
    expect(answer(V('いく'), 'te')).toBe('いって');
    expect(answer(V('いく'), 'ta')).toBe('いった');
    expect(answer(V('いく'), 'tara')).toBe('いったら');
  });
});

describe('ichidan conjugation', () => {
  const t = { te: 'たべて', ta: 'たべた', nai: 'たべない', masu: 'たべます', tai: 'たべたい', pot: 'たべられる', vol: 'たべよう', ba: 'たべれば', tara: 'たべたら', imp: 'たべろ', pass: 'たべられる', caus: 'たべさせる' };
  for (const [fid, expected] of Object.entries(t)) {
    it(`たべる ${fid} → ${expected}`, () => expect(answer(V('たべる'), fid)).toBe(expected));
  }
});

describe('irregular する / くる', () => {
  const suru = { te: 'して', ta: 'した', nai: 'しない', masu: 'します', pot: 'できる', vol: 'しよう', ba: 'すれば', imp: 'しろ', pass: 'される', caus: 'させる' };
  for (const [fid, expected] of Object.entries(suru)) {
    it(`する ${fid} → ${expected}`, () => expect(answer(V('する'), fid)).toBe(expected));
  }
  it('compound する verbs keep their stem', () => {
    expect(answer(V('べんきょうする'), 'masu')).toBe('べんきょうします');
    expect(answer(V('べんきょうする'), 'pot')).toBe('べんきょうできる');
  });
  const kuru = { te: 'きて', ta: 'きた', nai: 'こない', masu: 'きます', pot: 'こられる', vol: 'こよう', ba: 'くれば', imp: 'こい', pass: 'こられる', caus: 'こさせる' };
  for (const [fid, expected] of Object.entries(kuru)) {
    it(`くる ${fid} → ${expected}`, () => expect(answer(V('くる'), fid)).toBe(expected));
  }
});

describe('adjective conjugation', () => {
  const takai = { apres: 'たかい', aneg: 'たかくない', apast: 'たかかった', apneg: 'たかくなかった', ate: 'たかくて', aadv: 'たかく' };
  for (const [fid, expected] of Object.entries(takai)) {
    it(`たかい ${fid} → ${expected}`, () => expect(answer(A('たかい'), fid)).toBe(expected));
  }
  it('いい is irregular (よ- stem)', () => {
    expect(answer(A('いい'), 'aneg')).toBe('よくない');
    expect(answer(A('いい'), 'apast')).toBe('よかった');
    expect(answer(A('いい'), 'apneg')).toBe('よくなかった');
    expect(answer(A('いい'), 'ate')).toBe('よくて');
    expect(answer(A('いい'), 'aadv')).toBe('よく');
  });
  const shizuka = { aneg: 'しずかじゃない', apast: 'しずかだった', apneg: 'しずかじゃなかった', ate: 'しずかで' };
  for (const [fid, expected] of Object.entries(shizuka)) {
    it(`しずか (na) ${fid} → ${expected}`, () => expect(answer(A('しずか'), fid)).toBe(expected));
  }
});

describe('every word × every applicable form produces an answer', () => {
  for (const f of FORMS) {
    const words = f.kind === 'v' ? VERBS : (f.iaOnly ? ADJS.filter(a => a.t === 'ia') : ADJS);
    it(`form ${f.id} covers ${words.length} words`, () => {
      for (const w of words) {
        const out = answer(w, f.id);
        expect(out, `${w.r} + ${f.id}`).toBeTypeOf('string');
        expect(out.length, `${w.r} + ${f.id}`).toBeGreaterThan(0);
      }
    });
  }
});

describe('buildQuestion', () => {
  it('always includes the correct answer once among 4 unique options', () => {
    const rnd = mulberry32(42);
    for (const f of FORMS) {
      const words = f.kind === 'v' ? VERBS : (f.iaOnly ? ADJS.filter(a => a.t === 'ia') : ADJS);
      for (const w of words) {
        const q = buildQuestion(w, f.id, rnd);
        expect(q.correct).toBe(answer(w, f.id));
        expect(q.options, `${w.r}+${f.id}`).toContain(q.correct);
        expect(new Set(q.options).size, `${w.r}+${f.id} options unique`).toBe(q.options.length);
        expect(q.options.length, `${w.r}+${f.id} option count`).toBe(4);
      }
    }
  });
});

describe('makePool', () => {
  it('is deterministic for a given seed', () => {
    const a = makePool(['te', 'nai', 'masu'], 20, mulberry32(7));
    const b = makePool(['te', 'nai', 'masu'], 20, mulberry32(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('only uses requested forms', () => {
    const pool = makePool(['te', 'aneg'], 30, mulberry32(3));
    expect(pool.every(q => q.fid === 'te' || q.fid === 'aneg')).toBe(true);
    expect(pool.length).toBe(30);
  });
});
