/**
 * Regenerates audio-manifest.json from the game content — every string the
 * app can speak, with the voice each line should be synthesized in.
 *
 *   npm run audio:manifest        (runs via vite-node so @aliases resolve)
 *   python generate_audio_edge.py (then synthesizes only the missing mp3s)
 *
 * Character-attributed lines (yells, quiz sentences) are emitted twice:
 * once flat in the default voice (runtime fallback) and once under
 * audio/<char>/ in the character's own voice.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VERBS, ADJS } from '@content/grammar/words.js';
import { FORMS, SENTENCES } from '@content/grammar/forms.js';
import { answer } from '@modules/conjugation/engine.js';
import { CHARACTERS, TEACHER } from '@content/otome/index.js';
import { BALANCE } from '@content/balance.js';
import { audioId } from '@core/audio/voice.js';

const root = p => fileURLToPath(new URL('../' + p, import.meta.url));

// kanji readings come from the classic-script globals
const win = {};
new Function('window', readFileSync(root('public/kanji-data.js'), 'utf8'))(win);

const DEFAULT = { voice: BALANCE.audio.defaultTtsVoice, rate: BALANCE.audio.defaultRate };

const items = new Map(); // file -> item (dedup)

function add(text, { voice = DEFAULT.voice, rate = DEFAULT.rate, pitch, dir } = {}) {
  if (!text) return;
  const file = (dir ? dir + '/' : '') + audioId(text) + '.mp3';
  if (!items.has(file)) items.set(file, { text, file, voice, rate, ...(pitch ? { pitch } : {}) });
}

/* ---- grammar: every conjugated answer + example sentences ---- */
for (const f of FORMS) {
  const words = f.kind === 'v' ? VERBS : (f.iaOnly ? ADJS.filter(a => a.t === 'ia') : ADJS);
  for (const w of words) add(answer(w, f.id));
}
for (const w of [...VERBS, ...ADJS]) add(w.r);
for (const s of Object.values(SENTENCES)) add(s.jp);

/* ---- kanji readings ---- */
for (const k of win.KANJI_LIST) {
  for (const part of k.r.split('・').map(s => s.trim()).filter(Boolean)) add(part);
}

/* ---- UI ---- */
add('こんにちは');

/* ---- otome: yells + filled quiz sentences, flat AND per-character voice ---- */
const findWord = r => VERBS.find(v => v.r === r) || ADJS.find(a => a.r === r);
const quizAnswer = q => {
  if (q.form === 'dict' || q.form === 'aplain') return findWord(q.word)?.r;
  const item = findWord(q.word);
  return item ? answer(item, q.form) : null;
};

function speakables(ch) {
  const out = [];
  for (const y of ch.yells || []) out.push(y.jp);
  const nodes = ch.route ? [...ch.route.intro, ...ch.route.trouble,
    ...ch.route.endings.love, ...ch.route.endings.friend, ...ch.route.endings.fail] : [];
  for (const n of nodes) {
    if (n.quiz) {
      const a = quizAnswer(n.quiz);
      if (a) out.push(n.quiz.jp.replace('＿＿', a));
    }
  }
  return out;
}

for (const ch of CHARACTERS) {
  const v = ch.voice || {};
  for (const text of speakables(ch)) {
    add(text); // flat fallback, default voice
    add(text, { voice: v.ttsVoice, rate: v.rate, pitch: v.pitch, dir: v.dir || ch.id });
  }
}
for (const y of TEACHER.yells) {
  add(y.jp);
  add(y.jp, { voice: TEACHER.voice.ttsVoice, rate: TEACHER.voice.rate, dir: TEACHER.voice.dir || 'teacher' });
}

const manifest = {
  voice_suggestion: DEFAULT.voice,
  format: 'audio-24khz-48kbitrate-mono-mp3',
  count: items.size,
  items: [...items.values()]
};
writeFileSync(root('audio-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`audio-manifest.json written: ${items.size} items ` +
  `(${manifest.items.filter(i => i.file.includes('/')).length} per-character)`);
