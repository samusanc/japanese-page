import html from './sprint.html?raw';
import { state } from '@core/state.js';
import { $, escapeHtml, toast } from '@core/dom.js';
import { beep } from '@core/audio/sfx.js';
import { spkBtn } from '@core/audio/ui.js';
import { commitDailyScore, saveDayRec } from '@core/daily.js';
import { showResults } from '@core/results.js';
import { showScreen } from '@core/screens.js';
import { FORM, TYPE_LABEL } from '@content/grammar/forms.js';
import { createSprint, currentQuestion, answerCurrent, SPRINT } from './game.js';

/** 60-second conjugation sprint (2 tries/day) over today's featured forms.
 *  DOM driver around the pure state machine in game.js. */

const TRIES_PER_DAY = 2;
let g = null;          // active game state (from createSprint)
let timerId = null;
let endsAt = 0;
let lastTickSec = -1;
let locked = false;    // input lock between questions
let attemptNo = 0;

export function startSprint() {
  if (state.dayRec.sU >= TRIES_PER_DAY && !state.debugMode) {
    toast("No tries left today");
    return;
  }
  if (!state.debugMode) {
    state.dayRec.sU++;
    saveDayRec();
  }
  attemptNo++;
  g = createSprint({ attempt: state.dayRec.sU + "." + attemptNo });
  locked = true;
  lastTickSec = -1;

  $("#sprScore").textContent = "0";
  $("#sprCombo").textContent = "";
  $("#sprExplain").style.display = "none";
  $("#sprChoices").innerHTML = "";
  $("#timerbar").style.width = "100%";
  $("#timerbar").classList.remove("low");
  $("#game").classList.add("on");

  countdown(3);
}

function countdown(n) {
  const c = $("#count");
  c.classList.add("on");
  $("#countN").textContent = n;
  beep("tick");
  if (n > 1) {
    setTimeout(() => countdown(n - 1), 800);
  } else {
    setTimeout(() => {
      c.classList.remove("on");
      beginRun();
    }, 800);
  }
}

function beginRun() {
  endsAt = Date.now() + SPRINT.durationMs;
  locked = false;
  timerId = setInterval(tick, 100);
  showQuestion();
}

function tick() {
  const left = endsAt - Date.now();
  if (left <= 0) {
    endSprint();
    return;
  }
  const bar = $("#timerbar");
  bar.style.width = (100 * left / SPRINT.durationMs) + "%";
  const sec = Math.ceil(left / 1000);
  if (sec <= 5) {
    bar.classList.add("low");
    if (sec !== lastTickSec) {
      lastTickSec = sec;
      beep("tick");
    }
  }
}

function showQuestion() {
  if (!g) return;
  const q = currentQuestion(g);
  const f = FORM[q.fid];
  $("#sprForm").textContent = f.jp;
  $("#sprFormEn").textContent = `${f.en} · ${f.lvl}`;
  $("#sprWord").textContent = q.item.k;
  $("#sprKana").textContent = q.item.r;
  $("#sprMean").textContent = q.item.m;
  $("#sprType").textContent = TYPE_LABEL[q.item.t];
  $("#sprExplain").style.display = "none";

  const ch = $("#sprChoices");
  ch.innerHTML = "";
  q.options.forEach(op => {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = op;
    b.addEventListener("click", () => onAnswer(b, op));
    ch.appendChild(b);
  });
}

function onAnswer(btn, picked) {
  if (!g || locked) return;
  locked = true;
  const { right, pts, q } = answerCurrent(g, picked);

  [...$("#sprChoices").children].forEach(b => {
    b.disabled = true;
    if (b.textContent === q.correct) b.classList.add("right");
    if (b === btn && !right) b.classList.add("wrong");
  });

  $("#sprScore").textContent = g.score;
  $("#sprCombo").textContent = g.combo >= 2 ? `🔥 combo ×${Math.min(SPRINT.comboMax, 1 + SPRINT.comboStep * (g.combo - 1)).toFixed(1)}` : "";

  if (right) {
    beep("ok");
    const fp = $("#sprPts");
    fp.textContent = "+" + pts;
    fp.classList.remove("go");
    void fp.offsetWidth;
    fp.classList.add("go");
    setTimeout(next, 350);
  } else {
    beep("no");
    const ex = $("#sprExplain");
    ex.innerHTML = `The answer was 「<b>${escapeHtml(q.correct)}</b>」<br><span style="white-space:pre-line">${escapeHtml(FORM[q.fid].rule)}</span>`;
    ex.style.display = "";
    setTimeout(next, 1500); // the clock keeps running — mistakes cost time
  }
}

function next() {
  if (!g) return;
  locked = false;
  showQuestion();
}

async function endSprint(quit) {
  if (!g) return;
  clearInterval(timerId);
  timerId = null;
  const run = g;
  g = null;
  beep("end");

  const { postLine } = await commitDailyScore("sprint", run.score);

  $("#game").classList.remove("on");
  const left = TRIES_PER_DAY - state.dayRec.sU;
  showResults({
    score: run.score,
    kind: "⚡ Conjugation sprint",
    stats: [
      { v: run.right, label: "Right" },
      { v: run.wrong, label: "Missed" },
      { v: run.bestCombo, label: "Best combo" }
    ],
    postLine: postLine + (quit ? "<br>(ended early — the try was still used)" : ""),
    listTitle: "Missed answers",
    listHtml: run.misses.length
      ? run.misses.map(m => `<div class="wl-row bad"><span style="font-family:var(--jp);font-weight:700;">${escapeHtml(m.item.k)}（${escapeHtml(m.item.r)}）<span style="font-weight:500;color:var(--ink2);font-size:12.5px;"> → ${escapeHtml(FORM[m.fid].jp)}</span></span><span class="a" style="display:flex;align-items:center;gap:6px;">${escapeHtml(m.correct)} ${spkBtn(m.correct)}</span></div>`).join("")
      : '<div class="empty">Flawless — nothing missed! 🎉</div>',
    again: {
      disabled: !state.debugMode && left <= 0,
      label: state.debugMode ? "Sprint again (debug) ▶" : (left > 0 ? "Use last try ▶" : "No tries left"),
      onClick: () => {
        showScreen("home");
        startSprint();
      }
    }
  });
}

export function init() {
  document.body.insertAdjacentHTML("beforeend", html);
  $("#sprQuit").addEventListener("click", () => {
    if (g) endSprint(true);
  });
}
