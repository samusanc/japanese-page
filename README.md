# 活用! Katsuyo — Daily Japanese Battles

A mobile-first web app for practicing **Japanese conjugation** (て-form, ない-form, potential, conditionals… all N5–N4 grammar) and **kanji writing** (all 250 N5+N4 kanji with real stroke-order validation) — as daily challenges against your friends, playus-style.

## What's in the box

| Path | What it is |
|---|---|
| `src/main.js` | Composition root — boots core services + every feature module |
| `src/core/` | Services: navigation, storage, backend, daily scores, audio engine… |
| `src/modules/` | One folder per feature: otome VN engine, sprint, kanji daily/dictionary, home, squad, learn, practice — each owns its JS + HTML fragment + CSS |
| `content/` | Pure game data: characters, scenes, grammar, balance numbers, JSDoc schema + validator. Add characters/scenes here, never touch the engine |
| `public/` | Served as-is: voice mp3s, backgrounds, sprites, kanji stroke data |
| `scripts/build-audio-manifest.mjs` | Regenerates `audio-manifest.json` from the content |
| `generate_audio_edge.py` | Synthesizes missing voice clips with free edge-tts |
| `supabase-schema.sql` | Database tables, security policies, fair-play trigger |
| `CLAUDE.md` | Architecture guide (import rules, invariants, how to add content) |

**Development:** `npm install`, then `npm run dev`. Run tests with `npm test`. Open the app with `?debug=1` for the Eruda mobile console + verbose logs.

The app **works immediately in solo mode** — scores save to your device. To unlock squads and shared leaderboards, connect Supabase (free, ~5 minutes):

## Backend setup (Supabase)

**1. Create a project** — go to [supabase.com](https://supabase.com), sign up (free tier is plenty), and create a new project.

**2. Create the database** — in your project dashboard, open **SQL Editor → New query**, paste the entire contents of `supabase-schema.sql`, and click **Run**. This creates:
   - `profiles` (name, avatar, squad code)
   - `daily_scores` (one row per player per day: sprint + kanji points)
   - Row Level Security so players can only ever write **their own** rows
   - A database trigger so a day's score **can only go up** — even a tampered client can't overwrite a better score

**3. Enable anonymous sign-in** — go to **Authentication → Sign In / Providers** and switch on **Anonymous sign-ins**. Players get a device-bound identity with zero signup friction (no emails, no passwords).

**4. Connect the app** — in the dashboard go to **Project Settings → API** and copy the **Project URL** and the **anon public** key into the `CONFIG` block at the top of `src/core/backend.js`.

**5. Deploy (GitHub Pages)** — push to `main`. The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs the tests, builds with Vite and deploys `dist/` to Pages automatically (enable **Settings → Pages → Source: GitHub Actions** once). Your app is live at `https://yourname.github.io/reponame/`.

Send the URL to your friends. On the Squad tab, one person taps **Create squad code** and shares the 5-letter code; everyone else joins with it. Add the site to your phone's home screen (Share → Add to Home Screen) for an app-like experience.

## Audio setup (free edge-tts)

The app speaks everything: every verb/adjective in every conjugated form, every kanji reading, example sentences and the otome characters' lines. Clips are pre-generated with **Microsoft Edge's free neural TTS** (no API keys) and served as static files. Until a clip exists, the app automatically falls back to your phone's built-in Japanese voice, so audio works day one either way.

**Generation (incremental — only missing clips are synthesized):**
```bash
npm run audio:manifest          # regenerate the manifest from the game content
pip install edge-tts
python generate_audio_edge.py   # writes mp3s into public/audio/
```

Each otome character has their own voice (`voice:` in `content/otome/characters/*.js` — voice name, rate, pitch); their lines land in `public/audio/<character>/`, shared clips stay flat. Commit `public/audio/` and the deploy picks it up. The full list of voiced text is human-readable in `audio-manifest.json`. A 🔊 toggle in the app mutes everything.

## How the game works

- **⚡ Grammar Sprint** — 60 seconds, multiple-choice conjugation, combo multipliers, 2 tries/day. Everyone gets the same seeded words each day, and you *hear* every correct form as it's revealed. Wrong options are *real* learner errors (ら抜き, stem mix-ups, wrong て-groups), so losing teaches you something.
- **✍️ Kanji Writing** — five seeded kanji per day, drawn from memory on a blank canvas, stroke order and direction validated. **Three mistakes (or tapping Hint) reveals the full shadow outline: you trace it to learn it, score 0 for that pass, and the kanji is requeued at the end of the day's list for a second attempt from memory (worth up to half points).** No brute-forcing past a kanji you can't actually write. Failing a kanji you'd mastered drops it back to "to learn."
- **Kanji Studio (書 tab)** — the full N5/N4 library with audio for every reading. **Watch** the stroke order animate, **Trace** the outline, then **Recall** from memory. Recall with ≤2 mistakes = mastered ⭐. Using the hint reveals the outline but disqualifies that run — assisted completion never counts as autonomous recall.
- **Learn (学 tab)** — every grammar form with its rule, a natural example sentence (with audio and the conjugated word highlighted), and live conjugated examples you can tap to hear.
- **Season** — your best sprint + best kanji score each day add to your monthly total. Top of the board at month's end takes the crown. New month, fresh race.

## Fair play & limitations (honest notes)

- Attempts are consumed **the moment you start** a challenge, so force-quitting to retry doesn't work — and the server trigger means scores can only improve, never be replaced or lowered.
- Score *generation* still happens on the client (the DB only caps scores at plausible maximums). Full server-authoritative scoring would need Supabase Edge Functions validating each answer — a good v2 if your friend group develops a cheating problem 😄.
- Daily try-limits are tracked per device, not per account.
- Anonymous auth is device-bound: clearing browser data creates a fresh identity.

## Credits

Kanji stroke data derives from **[KanjiVG](https://kanjivg.tagaini.net)** (© Ulrich Apel, CC BY-SA 3.0), packaged via the [hanzi-writer-data-jp](https://github.com/chanind/hanzi-writer-data-jp) project. Drawing/quizzing powered by [Hanzi Writer](https://hanziwriter.org) (MIT). If you redistribute this app, keep the attribution in the footer.
