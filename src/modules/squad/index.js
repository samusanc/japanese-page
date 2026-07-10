import './squad.css';
import html from './squad.html?raw';
import onbHtml from './onboarding.html?raw';
import { state } from '@core/state.js';
import { LS } from '@core/storage.js';
import { $, $$, escapeHtml, toast } from '@core/dom.js';
import { beSaveProfile, bePostScore, fetchBoard } from '@core/backend.js';
import { registerScreen } from '@core/screens.js';
import { setDebugMode } from '@core/settings.js';
import { bus } from '@core/bus.js';
import { lbRow } from './board.js';

/** Squad screen (connection status, leaderboard, squad create/join) plus the
 *  profile card, debug toggle and the onboarding modal. */

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

  renderDebugBtn();

  if (!(state.beReady && state.profile?.g)) return;
  $("#myCode").textContent = state.profile.g;
  $("#seasonLabel").textContent = new Date().toLocaleDateString(undefined, { month: "long" }) + " season";

  const el = $("#boardFull");
  el.innerHTML = '<div class="empty"><span class="spin"></span> Loading…</div>';
  drawBoard(await fetchBoard());
}

function renderDebugBtn() {
  const bd = $("#btnToggleDebug");
  if (!bd) return;
  bd.textContent = state.debugMode ? "ON" : "OFF";
  bd.style.background = state.debugMode ? "var(--ai)" : "var(--line)";
  bd.style.borderColor = state.debugMode ? "var(--ai)" : "var(--line)";
  bd.style.color = state.debugMode ? "#fff" : "var(--ink2)";
}

function drawBoard(rows) {
  const el = $("#boardFull");
  const sorted = rows.slice().sort((a, b) => boardMode === "today" ? b.today - a.today : b.total - a.total);
  el.innerHTML = sorted.length
    ? sorted.map((r, i) => lbRow(r, i, boardMode)).join("")
    : '<div class="empty">Nobody has played yet.<br>Share the code and race them today!</div>';
}

/* ---- onboarding modal ---- */
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

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCode() {
  let c = "";
  for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

async function saveSquadAndSync() {
  LS.set("profile", state.profile);
  await beSaveProfile();
  if (state.dayRec.sB) await bePostScore("sprint", state.dayRec.sB);
  if (state.dayRec.kB) await bePostScore("kanji", state.dayRec.kB);
}

export function init() {
  $("#s-group").innerHTML = html;
  document.body.insertAdjacentHTML("beforeend", onbHtml);
  registerScreen("group", renderGroup);
  buildOnb();

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

  const bc = $("#btnCreate");
  if (bc) bc.addEventListener("click", async () => {
    state.profile.g = genCode();
    await saveSquadAndSync();
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
    await saveSquadAndSync();
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
    setDebugMode(!state.debugMode);
    renderDebugBtn();
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
    bus.emit("profile:changed");
    toast("ようこそ, " + n + "! 🎌");
  });
}
