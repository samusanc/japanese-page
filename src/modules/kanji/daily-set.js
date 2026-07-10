import { hashStr, mulberry32, shuffle } from '@core/util.js';
import { todayStr } from '@core/dates.js';
import { kanjiList } from './data.js';

/** Today's 5 kanji (3×N5 + 2×N4) — deterministic per date. */
export function dailyKanjiSet(dateStr = todayStr()) {
  const rnd = mulberry32(hashStr(dateStr + "kanji"));
  const n5 = kanjiList().filter(k => k.l === 5);
  const n4 = kanjiList().filter(k => k.l === 4);
  return [...shuffle(n5, rnd).slice(0, 3), ...shuffle(n4, rnd).slice(0, 2)];
}
