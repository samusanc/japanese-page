# 活用! Katsuyo — Daily Japanese Battles

A mobile-first web app for practicing **Japanese conjugation** (て-form, ない-form, potential, conditionals… all N5–N4 grammar) and **kanji writing** (all 250 N5+N4 kanji with real stroke-order validation) — as daily challenges against your friends, playus-style.

## What's in the box

| File | What it is |
|---|---|
| `index.html` | The whole app (UI + game logic + Supabase client) |
| `kanji-data.js` | Stroke data for all 250 N5/N4 kanji (bundled, works offline) |
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

**5. Deploy** — put the three files (`index.html`, `kanji-data.js`, and this README if you like) anywhere static:
   - **Netlify Drop** (easiest): drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop) → instant URL
   - **Vercel**: `vercel deploy`
   - **GitHub Pages**: push to a repo, enable Pages

Send the URL to your friends. On the Squad tab, one person taps **Create squad code** and shares the 5-letter code; everyone else joins with it. Add the site to your phone's home screen (Share → Add to Home Screen) for an app-like experience.

## How the game works

- **⚡ Grammar Sprint** — 60 seconds, multiple-choice conjugation, combo multipliers, 2 tries/day. Everyone gets the same seeded words each day. Wrong options are *real* learner errors (ら抜き, stem mix-ups, wrong て-groups), so losing teaches you something.
- **✍️ Kanji Writing** — five seeded kanji per day, drawn from memory stroke-by-stroke with your finger. Stroke order and direction are validated; each mistake costs points; a hint flashes after 3 misses. 2 tries/day. Today's kanji stay blurred until you use a try.
- **Kanji Studio (書 tab)** — the full N5/N4 library. For each kanji: **Watch** the stroke order animate, **Trace** over the outline, then **Recall** it from memory. Recall with ≤2 mistakes = mastered ⭐.
- **Season** — your best sprint + best kanji score each day add to your monthly total. Top of the board at month's end takes the crown. New month, fresh race.

## Fair play & limitations (honest notes)

- Attempts are consumed **the moment you start** a challenge, so force-quitting to retry doesn't work — and the server trigger means scores can only improve, never be replaced or lowered.
- Score *generation* still happens on the client (the DB only caps scores at plausible maximums). Full server-authoritative scoring would need Supabase Edge Functions validating each answer — a good v2 if your friend group develops a cheating problem 😄.
- Daily try-limits are tracked per device, not per account.
- Anonymous auth is device-bound: clearing browser data creates a fresh identity.

## Credits

Kanji stroke data derives from **[KanjiVG](https://kanjivg.tagaini.net)** (© Ulrich Apel, CC BY-SA 3.0), packaged via the [hanzi-writer-data-jp](https://github.com/chanind/hanzi-writer-data-jp) project. Drawing/quizzing powered by [Hanzi Writer](https://hanziwriter.org) (MIT). If you redistribute this app, keep the attribution in the footer.
