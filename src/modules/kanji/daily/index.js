import '../kanji.css';
import html from './kanji-daily.html?raw';
import { state } from '@core/state.js';
import { $, escapeHtml, toast } from '@core/dom.js';
import { speak } from '@core/audio/voice.js';
import { beep } from '@core/audio/sfx.js';
import { showScreen } from '@core/screens.js';
import { commitDailyScore, saveDayRec } from '@core/daily.js';
import { showResults } from '@core/results.js';
import { makeWriter } from '../writer.js';
import { isMastered, setKprog } from '../progress.js';
import { readingChips } from '../readings.js';
import { dailyKanjiSet } from '../daily-set.js';

/** Daily kanji drawing game (2 tries/day): draw today's 5 kanji from memory;
 *  3 mistakes reveals the outline and requeues the kanji for a half-value pass. */

const TRIES_PER_DAY = 2;
let kWriter = null;

export function startKanjiDaily() {
  if (state.dayRec.kU >= TRIES_PER_DAY && !state.debugMode) {
    toast("No tries left today");
    return;
  }
  if (!state.debugMode) {
    state.dayRec.kU++;
    saveDayRec();
  }
  state.KG = {
    queue: dailyKanjiSet().map(k => ({ k, requeue: false })),
    done: [],
    cur: null,
    score: 0,
    results: [],
    over: false,
    mistakes: 0,
    revealed: false
  };
  $("#kScore").textContent = "0";
  $("#kgame").classList.add("on");
  nextKanji();
}

function renderKProgress() {
  if (!state.KG) return;
  const el = $("#kProgress");
  el.innerHTML = "";
  const total = state.KG.done.length + (state.KG.cur ? 1 : 0) + state.KG.queue.length;
  for (let i = 0; i < total; i++) {
    const d = document.createElement("div");
    d.className = "pd" + (i < state.KG.done.length ? (state.KG.done[i].pts > 0 ? " ok" : "") : (i === state.KG.done.length && state.KG.cur ? " cur" : ""));
    el.appendChild(d);
  }
}

function failCurrent(reason) {
  if (!state.KG || state.KG.over || state.KG.revealed || !kWriter) return;
  state.KG.revealed = true;
  kWriter.showOutline();
  beep("no");
  if (navigator.vibrate) navigator.vibrate([50, 40, 50]);
  $("#kFeedback").textContent = reason === "hint"
    ? "Outline revealed — trace it, it comes back at the end"
    : "3 mistakes — trace the shadow, it comes back at the end";
  $("#kFeedback").className = "k-feedback bad";
  $("#kHint").disabled = true;

  const skipBtn = $("#kSkip");
  if (skipBtn) skipBtn.style.display = "block";

  if (isMastered(state.KG.cur.k.c)) {
    setKprog(state.KG.cur.k.c, { rc: false });
    toast(state.KG.cur.k.c + " dropped from mastered — win it back!");
  }
  if (!state.KG.cur.requeue) {
    state.KG.queue.push({ k: state.KG.cur.k, requeue: true });
    renderKProgress();
  }
}

function nextKanji() {
  if (!state.KG || state.KG.over) return;
  state.KG.cur = state.KG.queue.shift() || null;
  if (!state.KG.cur) {
    endKanjiDaily();
    return;
  }
  state.KG.mistakes = 0;
  state.KG.revealed = false;
  const skipBtn = $("#kSkip");
  if (skipBtn) skipBtn.style.display = "block";
  const { k, requeue } = state.KG.cur;
  renderKProgress();
  $("#kMean").textContent = k.m + (requeue ? "  (round 2!)" : "");
  readingChips(k, "#kRead");
  speak(k.r.split("・")[0]);
  $("#kFeedback").textContent = requeue ? "From memory this time — up to 50 pts" : "";
  $("#kFeedback").className = "k-feedback";
  $("#kHint").disabled = false;

  kWriter = makeWriter($("#kWriterBox"), k.c, { showOutline: false });
  kWriter.quiz({
    leniency: 1.2,
    showHintAfterMisses: 999,
    onMistake: () => {
      if (!state.KG || state.KG.revealed) return;
      state.KG.mistakes++;
      if (state.KG.mistakes >= 3) {
        failCurrent("mistakes");
        return;
      }
      $("#kFeedback").textContent = `✕ ${3 - state.KG.mistakes} ${3 - state.KG.mistakes === 1 ? "miss" : "misses"} left before the shadow`;
      $("#kFeedback").className = "k-feedback bad";
      beep("no");
      if (navigator.vibrate) navigator.vibrate(40);
    },
    onCorrectStroke: () => {
      if (!state.KG || state.KG.revealed) return;
      $("#kFeedback").textContent = "✓";
      $("#kFeedback").className = "k-feedback";
    },
    onComplete: sum => {
      if (!state.KG || state.KG.over) return;
      const { k, requeue } = state.KG.cur;
      let pts = 0;
      if (!state.KG.revealed) {
        pts = requeue ? Math.max(10, 50 - 10 * sum.totalMistakes) : Math.max(20, 100 - 12 * sum.totalMistakes);
      }
      state.KG.score += pts;
      state.KG.done.push({ c: k.c, m: k.m, mistakes: sum.totalMistakes, pts, revealed: state.KG.revealed, requeue });
      state.KG.results = state.KG.done;
      $("#kScore").textContent = state.KG.score;
      if (pts > 0) {
        beep("ok");
        const stp = $("#kStamp");
        stp.classList.remove("hit");
        void stp.offsetWidth;
        stp.classList.add("hit");
        setTimeout(() => {
          stp.classList.remove("hit");
          if (state.KG && !state.KG.over) nextKanji();
        }, 900);
      } else {
        setTimeout(() => {
          if (state.KG && !state.KG.over) nextKanji();
        }, 1100);
      }
    }
  });
}

async function endKanjiDaily(quit) {
  if (!state.KG || state.KG.over) return;
  state.KG.over = true;
  beep("end");

  const { score, results } = state.KG;
  const { postLine } = await commitDailyScore("kanji", score);

  $("#kgame").classList.remove("on");
  const left = TRIES_PER_DAY - state.dayRec.kU;
  showResults({
    score,
    kind: "✍️ Kanji writing",
    stats: [
      { v: results.filter(r => r.mistakes === 0 && !r.revealed).length, label: "Perfect" },
      { v: results.filter(r => r.revealed).length, label: "Revealed" },
      { v: results.length, label: "Drawn" }
    ],
    postLine: postLine + (quit ? "<br>(ended early — the try was still used)" : ""),
    listTitle: "Today's kanji",
    listHtml: results.length
      ? results.map(r => `<div class="wl-row ${r.revealed ? "bad" : (r.mistakes === 0 ? "good" : "")}"><span style="font-family:var(--disp);font-weight:700;">${r.c}${r.requeue ? " ↻" : ""}　<span style="font-weight:500;color:var(--ink2);font-size:12.5px;">${escapeHtml(r.m)}</span></span><span class="a">${r.revealed ? "revealed 👁" : (r.mistakes === 0 ? "perfect ✓" : r.mistakes + " miss")} ・ +${r.pts}</span></div>`).join("")
      : '<div class="empty">No kanji completed.</div>',
    again: {
      disabled: !state.debugMode && left <= 0,
      label: state.debugMode ? "Draw again (debug) ▶" : (left > 0 ? "Use last try ▶" : "No tries left"),
      onClick: () => {
        showScreen("home");
        startKanjiDaily();
      }
    }
  });
  state.KG = null;
}

export function init() {
  document.body.insertAdjacentHTML("beforeend", html);
  $("#kHint").addEventListener("click", () => failCurrent("hint"));
  $("#kQuit").addEventListener("click", () => { if (state.KG && !state.KG.over) endKanjiDaily(true); });
  // #btnKanjiDaily lives in the home screen's markup; home wires it to startKanjiDaily.

  const skipBtn = $("#kSkip");
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      if (!state.KG || state.KG.over || !state.KG.cur) return;
      const { k, requeue } = state.KG.cur;
      state.KG.done.push({ c: k.c, m: k.m, mistakes: state.KG.mistakes, pts: 0, revealed: true, requeue });
      state.KG.results = state.KG.done;
      skipBtn.style.display = "none";
      nextKanji();
    });
  }
}
