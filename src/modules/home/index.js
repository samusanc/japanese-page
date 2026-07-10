import './home.css';
import html from './home.html?raw';
import { state } from '@core/state.js';
import { LS } from '@core/storage.js';
import { $, $$ } from '@core/dom.js';
import { todayStr } from '@core/dates.js';
import { getStreak } from '@core/daily.js';
import { fetchBoard } from '@core/backend.js';
import { registerScreen, showScreen } from '@core/screens.js';
import { bus } from '@core/bus.js';
import { FORM } from '@content/grammar/forms.js';
import { dailySeedForms } from '@modules/conjugation/daily-forms.js';
import { dailyKanjiSet } from '@modules/kanji/daily-set.js';
import { CHAR, charState, setCharState, todayRoster, startRoute } from '@modules/otome/index.js';
import { startKanjiDaily } from '@modules/kanji/daily/index.js';
import { startSprint } from '@modules/sprint/index.js';
import { startCards } from '@modules/cards/index.js';
import { lbRow } from '@modules/squad/board.js';

/** Home screen: daily cards, streak/stats strip, mini leaderboard and the
 *  character-select slices for today's otome roster. */

export function renderHome() {
  $("#todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const sLeft = 2 - state.dayRec.sU;
  const b1 = $("#attemptBadge");
  b1.textContent = state.debugMode ? "∞ tries (debug)" : (sLeft > 0 ? `${sLeft} ${sLeft === 1 ? "try" : "tries"} left` : "Done today");
  b1.className = "badge " + (state.debugMode ? "shu" : (sLeft > 0 ? "shu" : "gold"));
  $("#btnDaily").disabled = !state.debugMode && sLeft <= 0;
  $("#btnDaily").textContent = (state.debugMode || sLeft > 0) ? "⚡ Play the sprint ▶" : "Come back tomorrow 🌙";
  $("#dailyBestLine").innerHTML = state.dayRec.sB > 0 ? `Your best today: <b style="color:var(--ai)">${state.dayRec.sB} pts</b>` : "";

  const df = $("#dailyForms");
  df.innerHTML = "";
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
  $("#btnKanjiDaily").textContent = (state.debugMode || kLeft > 0) ? "✍️ Draw today's kanji ▶" : "Come back tomorrow 🌙";
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
  renderCompanions();
}

/** Fill the character slices with today's roster + romance status. */
function renderCompanions() {
  const roster = todayRoster();
  const slices = $$(".char-slice");

  roster.forEach((charId, idx) => {
    const ch = CHAR[charId];
    const slice = slices[idx];
    if (!slice || !ch) return;
    slice.dataset.char = charId;
    const nameEl = slice.querySelector(".slice-name");
    const roleEl = slice.querySelector(".slice-role");
    const tagEl = slice.querySelector(".slice-tagline");
    const bgEl = slice.querySelector(".slice-bg");

    if (nameEl) nameEl.textContent = ch.persona.name;
    if (roleEl) roleEl.textContent = ch.persona.title;
    if (tagEl) tagEl.textContent = ch.persona.tagline;
    if (ch.sprites.default) {
      slice.style.setProperty('--char-img', `url('${ch.sprites.default}')`);
    } else {
      slice.style.setProperty('--char-img', 'none');
    }
    slice.style.setProperty('--char-accent-glow', ch.colors.accent + '22');
    slice.style.setProperty('--char-accent-glow-hi', ch.colors.accent + '55');
    if (bgEl) bgEl.style.background = "";

    const cs = charState(charId);

    slice.classList.remove("st-love", "st-friend", "st-fail", "st-uncompleted");
    if (cs.st === "love") slice.classList.add("st-love");
    else if (cs.st === "friend") slice.classList.add("st-friend");
    else if (cs.st === "bw") slice.classList.add("st-fail");
    else slice.classList.add("st-uncompleted");

    const dbgPanel = slice.querySelector(".slice-dbg-panel");
    if (dbgPanel) dbgPanel.style.display = state.debugMode ? "flex" : "none";

    const ctaEl = slice.querySelector(".slice-cta");
    if (ctaEl) {
      if (cs.st === "love") ctaEl.textContent = "💘 Yours";
      else if (cs.st === "friend") ctaEl.textContent = "🤝 Friend";
      else if (cs.st === "bw") ctaEl.textContent = "Retry ✦";
      else ctaEl.textContent = "Begin ›";
    }
  });
}

function renderStreak() {
  const el = $("#streakN");
  if (el) el.textContent = getStreak();
}

async function renderStatsStrip() {
  const st = LS.get("stats") || { r: 0, w: 0 };
  $("#stAcc").textContent = (st.r + st.w) > 0 ? Math.round(100 * st.r / (st.r + st.w)) + "%" : "–";
  const rows = await fetchBoard();
  const seas = rows.slice().sort((a, b) => b.total - a.total);
  const meIdx = seas.findIndex(x => x.pid === (state.uid || state.profile?.pid));
  $("#stRank").textContent = (state.beReady && state.profile?.g && meIdx >= 0) ? "#" + (meIdx + 1) : "–";
  const mine = rows.find(x => x.pid === (state.uid || state.profile?.pid));
  $("#stTotal").textContent = mine ? mine.total : 0;
}

async function renderMiniBoard() {
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

export function init() {
  $("#s-home").innerHTML = html;
  registerScreen("home", renderHome);
  bus.on("daily:committed", renderHome);
  bus.on("profile:changed", renderHome);
  bus.on("debug:changed", renderHome);

  $$("[data-char]").forEach(slice => {
    slice.addEventListener("click", (e) => {
      e.stopPropagation();

      const clickedDebug = e.target.closest(".slice-dbg-btn");
      if (clickedDebug) {
        e.preventDefault();
        const action = clickedDebug.dataset.act; // "love", "friend", "bw"
        const charId = slice.dataset.char;
        setCharState(charId, { st: action, played: todayStr() });
        renderCompanions();
        slice.classList.remove("expanded");
        slice.style.filter = "";
        return;
      }

      const clickedCta = e.target.closest(".slice-cta");

      if (clickedCta) {
        slice.style.transition = "flex .45s cubic-bezier(0.4,0,0.2,1), border-color .1s, box-shadow .1s, filter .15s";
        slice.style.filter = "grayscale(0) blur(0px) brightness(1.5)";
        const charId = slice.dataset.char;
        setTimeout(() => {
          slice.style.filter = "";
          slice.classList.remove("expanded");
          startRoute(charId);
        }, 220);
      } else {
        if (!slice.classList.contains("expanded")) {
          $$("[data-char]").forEach(s => s.classList.remove("expanded"));
          slice.classList.add("expanded");
        } else {
          slice.classList.remove("expanded");
        }
      }
    });
  });

  const screenHome = $("#s-home");
  if (screenHome) {
    screenHome.addEventListener("click", () => {
      $$("[data-char]").forEach(s => s.classList.remove("expanded"));
    });
  }

  const gg = $("#goGroup");
  if (gg) gg.addEventListener("click", () => showScreen("group"));

  $("#btnKanjiDaily").addEventListener("click", startKanjiDaily);
  $("#btnDaily").addEventListener("click", startSprint);
  $("#btnCards").addEventListener("click", startCards);
}
