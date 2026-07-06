import { state } from './state.js';
import { LS, todayStr, monthStr, monthLastDay } from './helpers.js';

export const CONFIG = {
  SUPABASE_URL: "https://wtrcmonzygqhjzqhncoc.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Re0lGgZFGWNfKOAv0Twbqw_0JNcrSpC",
  AUDIO_BASE: "./audio/"
};

export async function beInit() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    state.beError = "not-configured";
    return false;
  }
  if (!window.supabase) {
    state.beError = "Supabase library failed to load (offline?)";
    return false;
  }
  try {
    state.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    let { data: { session } } = await state.sb.auth.getSession();
    if (!session) {
      const { data, error } = await state.sb.auth.signInAnonymously();
      if (error) {
        state.beError = "Sign-in failed: " + error.message + " (is Anonymous sign-in enabled?)";
        state.sb = null;
        return false;
      }
      session = data.session;
    }
    state.uid = session.user.id;
    state.beReady = true;
    return true;
  } catch (e) {
    state.beError = String(e.message || e);
    state.sb = null;
    return false;
  }
}

export async function beSaveProfile() {
  if (!state.beReady) return;
  const { error } = await state.sb.from("profiles").upsert({
    id: state.uid,
    name: state.profile.n,
    emoji: state.profile.e,
    squad_code: state.profile.g || null
  });
  if (error) console.warn("profile save:", error.message);
}

export async function bePostScore(kind, score) {
  if (!state.beReady) return false;
  const day = todayStr();
  const { data } = await state.sb.from("daily_scores").select("sprint,kanji").eq("user_id", state.uid).eq("day", day).maybeSingle();
  const cur = { sprint: data?.sprint || 0, kanji: data?.kanji || 0 };
  cur[kind] = Math.max(cur[kind], score);
  const { error } = await state.sb.from("daily_scores").upsert({ user_id: state.uid, day, ...cur });
  if (error) {
    console.warn("score post:", error.message);
    return false;
  }
  return true;
}

export async function beFetchBoard(code) {
  if (!state.beReady) return null;
  const { data, error } = await state.sb.from("daily_scores")
    .select("user_id,day,sprint,kanji,profiles!inner(name,emoji,squad_code)")
    .eq("profiles.squad_code", code)
    .gte("day", monthStr() + "-01").lte("day", monthLastDay());
  if (error) {
    console.warn("board:", error.message);
    return null;
  }
  const m = {};
  const today = todayStr();
  (data || []).forEach(r => {
    const u = m[r.user_id] || (m[r.user_id] = { pid: r.user_id, n: r.profiles.name, e: r.profiles.emoji, today: 0, dS: 0, dK: 0, total: 0 });
    u.total += (r.sprint || 0) + (r.kanji || 0);
    if (r.day === today) {
      u.today = (r.sprint || 0) + (r.kanji || 0);
      u.dS = r.sprint || 0;
      u.dK = r.kanji || 0;
    }
  });
  return Object.values(m);
}

export function localBoardRow() {
  const d = state.dayRec;
  const month = monthStr();
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("katsuyo:day:" + month)) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        total += (v.sB || 0) + (v.kB || 0);
      } catch (e) {}
    }
  }
  return [{
    pid: state.profile?.pid || "me",
    n: state.profile?.n || "You",
    e: state.profile?.e || "🦊",
    today: (d.sB || 0) + (d.kB || 0),
    dS: d.sB || 0,
    dK: d.kB || 0,
    total
  }];
}

export async function fetchBoard() {
  if (state.beReady && state.profile?.g) {
    const r = await beFetchBoard(state.profile.g);
    if (r) return r;
  }
  return localBoardRow();
}
