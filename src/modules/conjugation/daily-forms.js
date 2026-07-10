import { hashStr, mulberry32, shuffle } from '@core/util.js';
import { todayStr } from '@core/dates.js';

const DAILY_FORM_POOL = ["te", "ta", "nai", "masu", "tai", "pot", "vol", "ba", "tara", "imp", "aneg", "apast", "ate"];

/**
 * The 5 grammar forms featured today — deterministic per date, so the home
 * card preview and the sprint game always agree.
 */
export function dailySeedForms(dateStr = todayStr()) {
  const rnd = mulberry32(hashStr(dateStr + "forms"));
  return shuffle(DAILY_FORM_POOL, rnd).slice(0, 5);
}
