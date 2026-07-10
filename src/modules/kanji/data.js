/**
 * Sole reader of the globals set by public/kanji-data.js (a 575KB classic
 * script kept out of the module graph on purpose). Everything else imports
 * from here, never from window directly.
 *
 * Entry shape: { c: "一", l: 5|4 (JLPT N-level), m: "meaning", r: "よみ・ヨミ" }
 */
export function kanjiList() {
  return (typeof window !== "undefined" && window.KANJI_LIST) || [];
}

/** Offline stroke data for a character, or undefined (writer falls back to CDN). */
export function strokeData(char) {
  return typeof window !== "undefined" && window.KANJI_STROKES
    ? window.KANJI_STROKES[char]
    : undefined;
}
