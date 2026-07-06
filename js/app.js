import { state } from './state.js';
import { CONFIG, beInit, beSaveProfile, bePostScore, fetchBoard } from './config.js';
import { VERBS, ADJS, FORMS, FORM, SENTENCES } from './data.js';
import { LS, $, $$, escapeHtml, todayStr, yesterdayStr, toast, mulberry32, hashStr, shuffle } from './helpers.js';
import { initAudioUI, speak, spkBtn } from './audio.js';
import { initSprintGameUI, startVnGame } from './sprint-game.js';
import { CHARACTERS } from './stories.js';
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
  
  const CHAR_KEYS = ["prince", "knight", "earl", "archduke", "duchess"];
  const seedRnd = mulberry32(hashStr(todayStr() + "char-seed"));
  const activeChars = shuffle(CHAR_KEYS, seedRnd).slice(0, 3);
  
  // Safe load of day record
  state.dayRec = LS.get("day:" + todayStr()) || { chars: {}, totalScore: 0 };
  if (!state.dayRec.chars) state.dayRec.chars = {};
  
  activeChars.forEach(cid => {
    if (!state.dayRec.chars[cid]) {
      state.dayRec.chars[cid] = { status: "playable", triesLeft: 2, score: 0 };
    }
  });
  LS.set("day:" + todayStr(), state.dayRec);
  
  const totalScore = Object.values(state.dayRec.chars).reduce((sum, c) => sum + (c.score || 0), 0);
  state.dayRec.totalScore = totalScore;
  state.dayRec.sB = totalScore;
  state.dayRec.kB = totalScore;
  
  $("#dailyTotalBadge").textContent = state.debugMode ? "∞ tries (debug)" : `${totalScore} pts today`;
  
  const om = $("#otomeMenu");
  if (om) {
    om.innerHTML = "";
    activeChars.forEach((cid, idx) => {
      const charData = CHARACTERS[cid];
      const rec = state.dayRec.chars[cid] || { status: "playable", triesLeft: 2, score: 0 };
      
      const slice = document.createElement("div");
      slice.className = "otome-menu-slice";
      if (rec.status === "completed") {
        slice.classList.add("vn-completed-gold");
      }
      
      // Style diagonal colors for a translucent crystal look
      const red = parseInt(charData.color.slice(1,3), 16);
      const green = parseInt(charData.color.slice(3,5), 16);
      const blue = parseInt(charData.color.slice(5,7), 16);
      slice.style.background = `linear-gradient(135deg, rgba(${red}, ${green}, ${blue}, 0.35) 0%, rgba(35, 38, 47, 0.2) 100%)`;
      slice.style.backdropFilter = "blur(8px)";
      slice.style.webkitBackdropFilter = "blur(8px)";
      
      // Silhouette filters
      let filtersClass = "";
      if (rec.status === "failed") filtersClass = "vn-failed-bw";
      
      let badgeHTML = "";
      if (rec.status === "completed") {
        badgeHTML = `<span class="badge gold">Completed 💖</span>`;
      } else if (rec.status === "failed" && rec.triesLeft <= 0 && !state.debugMode) {
        badgeHTML = `<span class="badge" style="background:var(--line); color:var(--ink2);">0 tries left 💔</span>`;
      } else {
        badgeHTML = `<span class="badge ${rec.triesLeft === 1 ? "shu" : "ink"}">${state.debugMode ? "∞" : rec.triesLeft} ${rec.triesLeft === 1 ? "try" : "tries"} left</span>`;
      }
      
      slice.innerHTML = `
        <div class="otome-menu-slice-content ${filtersClass}">
          <div class="otome-menu-slice-name">${charData.emoji} ${charData.fullName}</div>
          <div class="otome-menu-slice-title">${charData.title}</div>
          <div style="font-size: 11px; margin-top: 4px; opacity: 0.85;">Best Score: ${rec.score} pts</div>
        </div>
        ${badgeHTML}
      `;
      
      slice.addEventListener("click", () => {
        if (rec.status !== "completed" && rec.triesLeft <= 0 && !state.debugMode) {
          toast("No tries left for " + charData.name + " today");
          return;
        }
        startVnGame(cid);
      });
      
      om.appendChild(slice);
    });
  }
  
  renderStreak();
  renderStatsStrip();
  renderMiniBoard();
}

export function renderStreak() {
  const s = LS.get("streak");
  $("#streakN").textContent = (s && (s.last === todayStr() || s.last === yesterdayStr())) ? s.c : 0;
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
  const isRizzler = i === 0 && mode === "today";
  const nameHTML = isRizzler 
    ? `<span class="who rizzler-glow">${escapeHtml(r.n)} 👑 <span class="rizzler-title">Amazing Rizzler</span>${me ? " (you)" : ""}</span>`
    : `<span class="who">${escapeHtml(r.n)}${me ? " (you)" : ""}</span>`;
  return `<div class="row-lb ${me ? "me" : ""} ${isRizzler ? "rizzler-row" : ""}">
    <div class="rank ${i === 0 ? "r1" : ""}">${i === 0 ? "👑" : i + 1}</div>
    <div class="ava">${r.e}</div>
    <div class="nm">${nameHTML}${brk ? `<span class="brk">${brk}</span>` : ""}</div>
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
  
  state.profile = LS.get("profile") || { pid: "player-" + Math.random().toString(36).slice(2, 6), n: "Student", e: "🔮" };
  LS.set("profile", state.profile);
  state.dayRec = LS.get("day:" + todayStr()) || { sU: 0, sB: 0, kU: 0, kB: 0 };
  
  renderHome();
  
  beInit().then(async (ok) => {
    if (ok && state.profile) {
      await beSaveProfile();
      renderHome();
    }
  });
})();
