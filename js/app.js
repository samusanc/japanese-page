import { state } from './state.js';
import { CONFIG, beInit, beSaveProfile, bePostScore, fetchBoard } from './config.js';
import { VERBS, ADJS, FORMS, FORM, SENTENCES } from './data.js';
import { LS, $, $$, escapeHtml, todayStr, yesterdayStr, toast, hashStr } from './helpers.js';
import { initAudioUI, speak, spkBtn } from './audio.js';
import { initSprintGameUI, startDaily } from './sprint-game.js';
import { initKanjiGameUI, dailyKanjiSet } from './kanji-game.js';
import { initKanjiStudioUI, renderKanjiTab } from './kanji-logic.js';
import { answer } from './engine.js';

export function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("on"));
  const scr = $("#s-" + id);
  if (scr) scr.classList.add("on");
  $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.s === id));
  window.scrollTo({ top: 0 });
  if (id === "home") renderHome();
  if (id === "group") renderGroup();
  if (id === "kanji") renderKanjiTab();
}

export function renderHome() {
  $("#todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  
  const sLeft = 2 - state.dayRec.sU;
  const b1 = $("#attemptBadge");
  b1.textContent = state.debugMode ? "∞ tries (debug)" : (sLeft > 0 ? `${sLeft} ${sLeft === 1 ? "try" : "tries"} left` : "Done today");
  b1.className = "badge " + (state.debugMode ? "shu" : (sLeft > 0 ? "shu" : "gold"));
  $("#btnDaily").disabled = !state.debugMode && sLeft <= 0;
  $("#btnDaily").textContent = (state.debugMode || sLeft > 0) ? "Play the sprint ▶" : "Come back tomorrow 🌙";
  $("#dailyBestLine").innerHTML = state.dayRec.sB > 0 ? `Your best today: <b style="color:var(--ai)">${state.dayRec.sB} pts</b>` : "";
  
  const df = $("#dailyForms");
  df.innerHTML = "";
  
  const dailySeedForms = () => {
    const DAILY_FORM_POOL = ["te","ta","nai","masu","tai","pot","vol","ba","tara","imp","aneg","apast","ate"];
    const r = () => {
      let h = hashStr(todayStr() + "forms");
      let a = (h + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const a = DAILY_FORM_POOL.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, 5);
  };
  
  dailySeedForms().forEach(fid => {
    const s = document.createElement("span");
    s.className = "chip-sm";
    s.textContent = FORM[fid].jp;
    df.appendChild(s);
  });

  const kLeft = 2 - state.dayRec.kU;
  const b2 = $("#kAttemptBadge");
  b2.textContent = state.debugMode ? "∞ tries (debug)" : (kLeft > 0 ? `${kLeft} ${kLeft === 1 ? "try" : "tries"} left` : "Done today");
  b2.className = "badge " + (state.debugMode ? "ink" : (kLeft > 0 ? "ink" : "gold"));
  $("#btnKanjiDaily").disabled = !state.debugMode && kLeft <= 0;
  $("#btnKanjiDaily").textContent = (state.debugMode || kLeft > 0) ? "Draw today's kanji ▶" : "Come back tomorrow 🌙";
  $("#kDailyBestLine").innerHTML = state.dayRec.kB > 0 ? `Your best today: <b style="color:var(--ai)">${state.dayRec.kB} pts</b>` : "";
  
  const kp = $("#kanjiPreview");
  kp.innerHTML = "";
  dailyKanjiSet().forEach(k => {
    const d = document.createElement("div");
    d.className = "kp" + (state.dayRec.kU > 0 ? "" : " hidden-k");
    d.textContent = k.c;
    kp.appendChild(d);
  });
  
  renderStreak();
  renderStatsStrip();
  renderMiniBoard();
}

export function renderStreak() {
  const s = LS.get("streak");
  const el = $("#streakN");
  if (el) {
    el.textContent = (s && (s.last === todayStr() || s.last === yesterdayStr())) ? s.c : 0;
  }
}

export function bumpStreak() {
  const s = LS.get("streak") || { c: 0, last: "" };
  if (s.last !== todayStr()) {
    s.c = (s.last === yesterdayStr()) ? s.c + 1 : 1;
    s.last = todayStr();
    LS.set("streak", s);
  }
  renderStreak();
}

export async function renderStatsStrip() {
  const st = LS.get("stats") || { r: 0, w: 0 };
  $("#stAcc").textContent = (st.r + st.w) > 0 ? Math.round(100 * st.r / (st.r + st.w)) + "%" : "–";
  const rows = await fetchBoard();
  const seas = rows.slice().sort((a, b) => b.total - a.total);
  const meIdx = seas.findIndex(x => x.pid === (state.uid || state.profile?.pid));
  $("#stRank").textContent = (state.beReady && state.profile?.g && meIdx >= 0) ? "#" + (meIdx + 1) : "–";
  const mine = rows.find(x => x.pid === (state.uid || state.profile?.pid));
  $("#stTotal").textContent = mine ? mine.total : 0;
}

export async function renderMiniBoard() {
  const el = $("#miniBoard");
  if (!state.beReady || !state.profile?.g) {
    el.innerHTML = state.beReady
      ? '<div class="empty">Join a squad to battle your friends.</div>'
      : '<div class="empty">Solo mode — connect Supabase for squad boards.<br>Your scores are saved on this device.</div>';
    return;
  }
  el.innerHTML = '<div class="empty"><span class="spin"></span></div>';
  const rows = (await fetchBoard()).sort((a, b) => b.today - a.today).slice(0, 3);
  el.innerHTML = rows.length && rows.some(r => r.today > 0)
    ? rows.map((r, i) => lbRow(r, i, "today")).join("")
    : '<div class="empty">No scores yet today — be the first! 🥇</div>';
}

export function lbRow(r, i, mode) {
  const sc = mode === "today" ? r.today : r.total;
  const me = r.pid === (state.uid || state.profile?.pid);
  const brk = mode === "today" ? `⚡${r.dS || 0} ・ ✍️${r.dK || 0}` : "";
  return `<div class="row-lb ${me ? "me" : ""}">
    <div class="rank ${i === 0 ? "r1" : ""}">${i === 0 ? "👑" : i + 1}</div>
    <div class="ava">${r.e}</div>
    <div class="nm"><span class="who">${escapeHtml(r.n)}${me ? " (you)" : ""}</span>${brk ? `<span class="brk">${brk}</span>` : ""}</div>
    <div class="sc">${sc}</div></div>`;
}

function buildChips() {
  const cv = $("#chipsVerb");
  const ca = $("#chipsAdj");
  cv.innerHTML = "";
  ca.innerHTML = "";
  FORMS.forEach(f => {
    const b = document.createElement("button");
    b.className = "chip" + (f.id === "te" ? " on" : "");
    b.dataset.f = f.id;
    b.innerHTML = `${f.jp}<span class="lv">${f.lvl}</span>`;
    b.addEventListener("click", () => b.classList.toggle("on"));
    (f.kind === "v" ? cv : ca).appendChild(b);
  });
  $$("#chipsLen .chip").forEach(c => c.addEventListener("click", () => {
    $$("#chipsLen .chip").forEach(x => x.classList.remove("on"));
    c.classList.add("on");
  }));
}

function buildLearn() {
  const wrap = $("#learnList");
  wrap.innerHTML = "";
  const sampleV = ["のむ", "たべる", "いく", "する", "くる"].map(r => VERBS.find(v => v.r === r));
  const sampleA = ["たかい", "いい", "しずか"].map(r => ADJS.find(a => a.r === r));
  FORMS.forEach(f => {
    const samples = f.kind === "v" ? sampleV : (f.iaOnly ? sampleA.filter(a => a.t === "ia") : sampleA);
    const exs = samples.map(w => `<div class="ex"><span>${w.k}（${w.r}）</span><span style="display:flex;align-items:center;gap:8px;"><span class="to">${answer(w, f.id)}</span>${spkBtn(answer(w, f.id))}</span></div>`).join("");
    const s = SENTENCES[f.id];
    const sent = s ? `<div class="sentence">
        <div class="jp"><span>${escapeHtml(s.jp).replace(escapeHtml(s.hi), "<b>" + escapeHtml(s.hi) + "</b>")}</span>${spkBtn(s.jp)}</div>
        <div class="en">${escapeHtml(s.en)}</div></div>` : "";
    const card = document.createElement("div");
    card.className = "card learn-card";
    card.innerHTML = `<button class="learn-head"><span class="fj">${f.jp}</span><span class="fe">${f.en} · ${f.lvl}</span><span class="caret">▸</span></button>
      <div class="learn-body"><div class="rule">${escapeHtml(f.rule)}</div>${sent}${exs}</div>`;
    card.querySelector(".learn-head").addEventListener("click", () => card.classList.toggle("open"));
    wrap.appendChild(card);
  });
}

let boardMode = "today";
export async function renderGroup() {
  const cs = $("#connStatus");
  if (state.beReady) cs.innerHTML = '<span class="conn-dot ok"></span>Connected to Supabase — squads live.';
  else if (state.beError === "not-configured") cs.innerHTML = '<span class="conn-dot"></span>Solo mode — Supabase not configured yet.';
  else cs.innerHTML = '<span class="conn-dot bad"></span>Backend error: ' + escapeHtml(state.beError);
  
  $("#noBackend").style.display = state.beReady ? "none" : "";
  $("#noGroup").style.display = (state.beReady && !state.profile?.g) ? "" : "none";
  $("#hasGroup").style.display = (state.beReady && state.profile?.g) ? "" : "none";
  $("#profileCard").style.display = "";
  $("#pName").textContent = state.profile?.n || "You";
  $("#pAva").textContent = state.profile?.e || "🦊";
  
  const bd = $("#btnToggleDebug");
  if (bd) {
    bd.textContent = state.debugMode ? "ON" : "OFF";
    bd.style.background = state.debugMode ? "var(--ai)" : "var(--line)";
    bd.style.borderColor = state.debugMode ? "var(--ai)" : "var(--line)";
    bd.style.color = state.debugMode ? "#fff" : "var(--ink2)";
  }
  
  if (!(state.beReady && state.profile?.g)) return;
  $("#myCode").textContent = state.profile.g;
  $("#seasonLabel").textContent = new Date().toLocaleDateString(undefined, { month: "long" }) + " season";
  
  const el = $("#boardFull");
  el.innerHTML = '<div class="empty"><span class="spin"></span> Loading…</div>';
  drawBoard(await fetchBoard());
}

export function drawBoard(rows) {
  const el = $("#boardFull");
  const sorted = rows.slice().sort((a, b) => boardMode === "today" ? b.today - a.today : b.total - a.total);
  el.innerHTML = sorted.length
    ? sorted.map((r, i) => lbRow(r, i, boardMode)).join("")
    : '<div class="empty">Nobody has played yet.<br>Share the code and race them today!</div>';
}

const EMOJIS = ["🦊", "🐼", "🐸", "🐙", "🦉", "🐯", "🍙", "🍜", "🍡", "⛩️", "🗻", "🌸", "🎌", "🐱", "🐶", "🎧", "🚀", "👺"];
let selEmo = "🦊";

function buildOnb() {
  const g = $("#onbEmo");
  g.innerHTML = "";
  EMOJIS.forEach(e => {
    const b = document.createElement("button");
    b.className = "emo" + (e === selEmo ? " on" : "");
    b.textContent = e;
    b.addEventListener("click", () => {
      selEmo = e;
      $$("#onbEmo .emo").forEach(x => x.classList.toggle("on", x.textContent === e));
    });
    g.appendChild(b);
  });
}

export function openOnb(edit) {
  $("#onb").classList.add("on");
  if (edit) {
    selEmo = state.profile.e;
    $$("#onbEmo .emo").forEach(x => x.classList.toggle("on", x.textContent === selEmo));
  }
}

(async function init() {
  initAudioUI();
  initSprintGameUI();
  initKanjiGameUI();
  initKanjiStudioUI();

  $$("[data-char]").forEach(slice => {
    slice.addEventListener("click", (e) => {
      e.stopPropagation();
      const clickedCta = e.target.closest(".slice-cta");
      
      // If the slice is not already expanded, expand it and collapse others
      if (!slice.classList.contains("expanded")) {
        $$("[data-char]").forEach(s => s.classList.remove("expanded"));
        slice.classList.add("expanded");
      } else {
        // Already expanded. Click anywhere inside the slice or on the CTA button will start the game.
        slice.style.transition = "flex .45s cubic-bezier(0.4,0,0.2,1), border-color .1s, box-shadow .1s, filter .15s";
        slice.style.filter = "brightness(1.5)";
        const charId = slice.dataset.char;
        setTimeout(() => {
          slice.style.filter = "";
          slice.classList.remove("expanded");
          startDaily(charId);
        }, 220);
      }
    });
  });

  const screenHome = $("#s-home");
  if (screenHome) {
    screenHome.addEventListener("click", () => {
      $$("[data-char]").forEach(s => s.classList.remove("expanded"));
    });
  }

  $$(".tab").forEach(t => t.addEventListener("click", () => showScreen(t.dataset.s)));
  const gg = $("#goGroup");
  if (gg) gg.addEventListener("click", () => showScreen("group"));

  const st = $("#segToday");
  if (st) st.addEventListener("click", async () => {
    boardMode = "today";
    $("#segToday").classList.add("on");
    $("#segSeason").classList.remove("on");
    drawBoard(await fetchBoard());
  });
  const ss = $("#segSeason");
  if (ss) ss.addEventListener("click", async () => {
    boardMode = "season";
    $("#segSeason").classList.add("on");
    $("#segToday").classList.remove("on");
    drawBoard(await fetchBoard());
  });
  const br = $("#btnRefresh");
  if (br) br.addEventListener("click", renderGroup);

  const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  function genCode() {
    let c = "";
    for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }

  const bc = $("#btnCreate");
  if (bc) bc.addEventListener("click", async () => {
    state.profile.g = genCode();
    LS.set("profile", state.profile);
    await beSaveProfile();
    if (state.dayRec.sB) await bePostScore("sprint", state.dayRec.sB);
    if (state.dayRec.kB) await bePostScore("kanji", state.dayRec.kB);
    toast("Squad created! Share the code 🎉");
    renderGroup();
  });

  const bj = $("#btnJoin");
  if (bj) bj.addEventListener("click", async () => {
    const c = $("#joinCode").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(c)) {
      toast("Codes are 4–8 letters/numbers");
      return;
    }
    state.profile.g = c;
    LS.set("profile", state.profile);
    await beSaveProfile();
    if (state.dayRec.sB) await bePostScore("sprint", state.dayRec.sB);
    if (state.dayRec.kB) await bePostScore("kanji", state.dayRec.kB);
    toast("Joined squad " + c + " ✓");
    renderGroup();
  });

  const bcp = $("#btnCopy");
  if (bcp) bcp.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.profile.g);
      toast("Code copied — send it to friends!");
    } catch (e) {
      toast("Code: " + state.profile.g);
    }
  });

  const bl = $("#btnLeave");
  if (bl) bl.addEventListener("click", async () => {
    state.profile.g = null;
    LS.set("profile", state.profile);
    await beSaveProfile();
    toast("Left the squad");
    renderGroup();
  });

  const be = $("#btnEditProfile");
  if (be) be.addEventListener("click", () => {
    $("#onbName").value = state.profile.n;
    $("#onbCode").value = state.profile.g || "";
    openOnb(true);
  });

  const bd = $("#btnToggleDebug");
  if (bd) bd.addEventListener("click", () => {
    state.debugMode = !state.debugMode;
    bd.textContent = state.debugMode ? "ON" : "OFF";
    bd.style.background = state.debugMode ? "var(--ai)" : "var(--line)";
    bd.style.borderColor = state.debugMode ? "var(--ai)" : "var(--line)";
    bd.style.color = state.debugMode ? "#fff" : "var(--ink2)";
    renderHome();
    toast(state.debugMode ? "Debug mode: Infinite Tries active!" : "Debug mode: Disabled");
  });

  const og = $("#onbGo");
  if (og) og.addEventListener("click", async () => {
    const n = $("#onbName").value.trim() || "Player";
    const code = $("#onbCode").value.trim().toUpperCase();
    state.profile = state.profile || { pid: Math.random().toString(36).slice(2, 10) };
    state.profile.n = n;
    state.profile.e = selEmo;
    if (/^[A-Z0-9]{4,8}$/.test(code)) state.profile.g = code;
    LS.set("profile", state.profile);
    await beSaveProfile();
    $("#onb").classList.remove("on");
    renderHome();
    toast("ようこそ, " + n + "! 🎌");
  });

  buildChips();
  buildLearn();
  buildOnb();
  
  state.profile = LS.get("profile");
  state.dayRec = LS.get("day:" + todayStr()) || { sU: 0, sB: 0, kU: 0, kB: 0 };
  
  renderHome();
  if (!state.profile) openOnb(false);
  
  const ok = await beInit();
  if (ok && state.profile) await beSaveProfile();
  renderHome();
})();
