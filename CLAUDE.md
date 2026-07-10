# 活用! Katsuyo — Daily Japanese Battles

Mobile-first Japanese learning game (otome visual novel + daily kanji drawing +
conjugation sprint + kanji dictionary + squads). Vite + vanilla JS (JSDoc types,
no framework, no TypeScript). Deployed to GitHub Pages by the Actions workflow.

## Commands

- `npm run dev` — dev server (add `?debug=1` to the URL for Eruda + verbose logs)
- `npm test` — Vitest (unit + jsdom boot smoke + content validation)
- `npm run build` / `npm run preview` — production build (relative base for Pages)
- `npm run audio:manifest` — regenerate audio-manifest.json from game content
- `python generate_audio_edge.py` — synthesize missing voice mp3s (edge-tts, incremental)
- `python scripts/build_vocab.py` — rebuild public/vocab/*.json card decks from vocabulary/*.xlsx

## Architecture

```
content/    PURE game data — imports nothing from src/, relative imports only
            (so plain node scripts can load it). grammar/ (VERBS/ADJS/FORMS),
            otome/ (characters/, scenes, teacher, audio registries),
            balance.js (ALL gameplay numbers), theme.js, types.js (JSDoc schema),
            validate.js (runs at dev boot + in CI)
src/core/   services: state, storage(LS), dom($,$$,toast), dates, util(rng),
            bus (events), screens (registerScreen/showScreen — this is what
            replaces cross-module imports), backend (Supabase + solo fallback),
            daily (commitDailyScore/bumpStreak), results (shared result screen),
            settings, log (dbg, ?debug=1-gated), audio/ (voice, sfx, engine, ui)
src/modules/  one folder per feature; each owns its index.js with init(),
            its .html fragment (?raw, injected at init) and its .css:
            conjugation (pure engine), kanji (writer/progress/daily/dictionary),
            otome (VN engine: context/stage/scene player/quiz/spell/route/
            training/srs), sprint (60s game; game.js is a pure state machine),
            cards (Royal Gamble matching game; srs.js is pure), home, squad,
            learn, practice
src/main.js composition root — the only file that imports every module
public/     served verbatim: audio/, bg/, sprites/, kanji-data.js (classic
            script; ONLY src/modules/kanji/data.js reads its window globals)
```

Aliases: `@core` → src/core, `@modules` → src/modules, `@content` → content.

Import rules: core → core only; content → nothing; features → core + content +
conjugation/kanji shared libs; features never import each other's internals
(home, the composition screen, may import public starters like `startRoute`,
`startSprint`, `startKanjiDaily`). Cross-module notifications go through
`@core/bus.js` (`daily:committed`, `profile:changed`, `debug:changed`).

## Adding content (no engine changes needed)

- **Character**: new file in `content/otome/characters/` following the
  CharacterDefinition typedef + one line in `characters/index.js`.
- **Scene**: entry in `content/otome/scenes.js` — bg gradient, optional img,
  `audio:{music,ambience,enterSfx}`, CSS `filter`, `vignette`, `particles`.
- **Music/ambience/sfx**: register in `content/otome/audio.js` (null src is a
  silent no-op until the asset exists), reference from scenes or
  `{sfx:"id"}` / `{music:"id"}` nodes.
- **New scene-node kind**: typedef in `content/types.js` + `registerNode()` in
  `src/modules/otome/route.js` + a `NODE_KINDS` entry in `content/validate.js`.
- **Tuning**: every gameplay number is in `content/balance.js`.
- Broken refs (unknown scene id, quiz word not in VERBS/ADJS…) fail loudly at
  dev boot and in `tests/content-schema.test.js`.

## Invariants — do not break

- `audioId()` in `src/core/audio/voice.js` and `fnv1a64()` in
  `generate_audio_edge.py` must stay hash-identical: 1,400+ pre-generated mp3
  filenames depend on them (locked by `tests/audio-hash.test.js`).
- `public/audio` mp3 filenames are load-bearing — never rename.
- Daily challenges are seeded from the date (`mulberry32(hashStr(todayStr()+…))`)
  so all players get the same daily set — keep seeding deterministic.
- HTML fragments and the JS that queries their ids live in the same module —
  change them together.
- `art-src/` (char*.zip via git LFS) is source art, never part of the build.
