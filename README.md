# 活用! Katsuyo — Daily Japanese Battles

A mobile-first web app for practicing **Japanese conjugation** (て-form, ない-form, potential, conditionals… all N5–N4 grammar) and **kanji writing** (all 250 N5+N4 kanji with real stroke-order validation) — as daily challenges against your friends, playus-style.

## What's in the box

| File | What it is |
|---|---|
| `index.html` | The whole app (UI + game logic + Supabase client + audio engine) |
| `kanji-data.js` | Stroke data for all 250 N5/N4 kanji (bundled, works offline) |
| `audio-manifest.json` | Every text the app can speak (1,230 clips) with its filename |
| `generate_audio.py` | Batch script: synthesizes all clips with Azure TTS into `audio/` |
| `supabase-schema.sql` | Database tables, security policies, fair-play trigger |
| `README.md` | This file |

The app **works immediately in solo mode** — just open `index.html` in a browser. Scores save to your device. To unlock squads and shared leaderboards, connect Supabase (free, ~5 minutes):

## Backend setup (Supabase)

**1. Create a project** — go to [supabase.com](https://supabase.com), sign up (free tier is plenty), and create a new project.

**2. Create the database** — in your project dashboard, open **SQL Editor → New query**, paste the entire contents of `supabase-schema.sql`, and click **Run**. This creates:
   - `profiles` (name, avatar, squad code)
   - `daily_scores` (one row per player per day: sprint + kanji points)
   - Row Level Security so players can only ever write **their own** rows
   - A database trigger so a day's score **can only go up** — even a tampered client can't overwrite a better score

**3. Enable anonymous sign-in** — go to **Authentication → Sign In / Providers** and switch on **Anonymous sign-ins**. Players get a device-bound identity with zero signup friction (no emails, no passwords).

**4. Connect the app** — in the dashboard go to **Project Settings → API** and copy the **Project URL** and the **anon public** key. Open `index.html` and paste them into the `CONFIG` block near the top:

```js
const CONFIG = {
  SUPABASE_URL: "https://yourproject.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi..."
};
```

**5. Deploy (GitHub Pages)** — since you're hosting on GitHub Pages:
   1. Create a repo and put `index.html`, `kanji-data.js`, and the `audio/` folder (see below) at its root
   2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / root → Save
   3. Your app is live at `https://yourname.github.io/reponame/` in ~a minute

Send the URL to your friends. On the Squad tab, one person taps **Create squad code** and shares the 5-letter code; everyone else joins with it. Add the site to your phone's home screen (Share → Add to Home Screen) for an app-like experience.

## Audio setup (Azure TTS)

The app speaks everything: every verb/adjective in every conjugated form, every kanji reading, and an example sentence for each grammar form. Clips are pre-generated once with **Azure neural TTS** (ja-JP-NanamiNeural — the most natural Japanese voice) and served as static files from your GitHub Pages repo. Until the clips exist, the app automatically falls back to your phone's built-in Japanese voice, so audio works day one either way.

**One-time generation (~10 minutes):**
1. Azure portal → Create resource → **Speech service**. The **free F0 tier** is more than enough: the entire manifest is ~4,800 characters against a 500,000-character monthly free quota.
2. From the resource's *Keys and Endpoint* page, copy **Key 1** and the **Region**.
3. Run the batch script next to `audio-manifest.json`:
   ```bash
   pip install requests
   AZURE_SPEECH_KEY=your_key AZURE_SPEECH_REGION=your_region python3 generate_audio.py
   ```
4. It writes 1,230 small MP3s (~15–25 MB total) into `audio/`. Commit that folder to your Pages repo next to `index.html`. Done — the app finds each clip by a hash of its text, so no code changes are needed.

The script skips files that already exist, so it's safe to re-run after adding words. Want a male voice? `AZURE_TTS_VOICE=ja-JP-KeitaNeural python3 generate_audio.py`. The full list of sentences/words being voiced is human-readable inside `audio-manifest.json`. A 🔊 toggle in the app header mutes everything.

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
