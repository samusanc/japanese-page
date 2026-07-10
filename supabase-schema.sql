-- ============================================================
-- 活用! Katsuyo — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- profiles ----------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default 'Player' check (char_length(name) <= 20),
  emoji      text not null default '🦊'     check (char_length(emoji) <= 8),
  squad_code text                            check (squad_code ~ '^[A-Z0-9]{4,8}$'),
  updated_at timestamptz not null default now()
);

-- ---------- daily scores (one row per player per day) ----------
create table public.daily_scores (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  sprint     int  not null default 0 check (sprint between 0 and 6000),
  kanji      int  not null default 0 check (kanji  between 0 and 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index daily_scores_day_idx on public.daily_scores (day);
create index profiles_squad_idx   on public.profiles (squad_code);

-- ---------- server-side fair play: a score can only improve ----------
-- Even a tampered client cannot lower or overwrite a better score.
create or replace function public.keep_best_score()
returns trigger language plpgsql as $$
begin
  new.sprint     := greatest(new.sprint, old.sprint);
  new.kanji      := greatest(new.kanji,  old.kanji);
  new.updated_at := now();
  return new;
end $$;

create trigger keep_best before update on public.daily_scores
for each row execute function public.keep_best_score();

-- ---------- row level security ----------
alter table public.profiles     enable row level security;
alter table public.daily_scores enable row level security;

-- Anyone signed in can read names/emoji/squads (needed to render leaderboards)…
create policy "profiles are readable"
  on public.profiles for select to authenticated using (true);

-- …but you can only create/update YOUR row.
create policy "insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Scores: readable by all signed-in players, writable only for yourself.
create policy "scores are readable"
  on public.daily_scores for select to authenticated using (true);
create policy "insert own scores"
  on public.daily_scores for insert to authenticated with check (auth.uid() = user_id);
create policy "update own scores"
  on public.daily_scores for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Done! Now enable Anonymous sign-ins:
-- Dashboard → Authentication → Sign In / Providers → enable "Anonymous sign-ins"
