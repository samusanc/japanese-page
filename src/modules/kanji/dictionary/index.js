import '../kanji.css';
import html from './dictionary.html?raw';
import studioHtml from './studio.html?raw';
import { $, $$, toast } from '@core/dom.js';
import { speak } from '@core/audio/voice.js';
import { beep } from '@core/audio/sfx.js';
import { registerScreen } from '@core/screens.js';
import { kanjiList } from '../data.js';
import { makeWriter } from '../writer.js';
import { kprog, setKprog, isMastered } from '../progress.js';
import { readingChips } from '../readings.js';

/** Kanji dictionary tab (browse grid + mastery stats) and the studio modal
 *  with its three practice modes: watch / trace / recall. */

let stWriter = null;
let stKanji = null;
let stMode = "trace";
let stUsedHint = false;
let kanjiFilter = "5";

export function renderKanjiTab() {
  const p = kprog();
  const list0 = kanjiList();
  const n5Mastered = list0.filter(k => k.l === 5 && isMastered(k.c)).length;
  const n4Mastered = list0.filter(k => k.l === 4 && isMastered(k.c)).length;
  $("#kstN5").firstChild.textContent = n5Mastered;
  $("#kstN4").firstChild.textContent = n4Mastered;

  const grid = $("#kanjiGrid");
  grid.innerHTML = "";
  let list = list0;
  if (kanjiFilter === "5" || kanjiFilter === "4") list = list.filter(k => k.l === +kanjiFilter);
  else if (kanjiFilter === "done") list = list.filter(k => isMastered(k.c));
  else if (kanjiFilter === "todo") list = list.filter(k => !isMastered(k.c));

  if (!list.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;">Nothing here yet — go draw some kanji!</div>';
    return;
  }
  list.forEach(k => {
    const b = document.createElement("button");
    b.className = "ktile" + (isMastered(k.c) ? " done" : "");
    const st = p[k.c] || {};
    b.innerHTML = `${k.c}<div class="dots"><div class="dot ${st.tr ? "on" : ""}"></div><div class="dot ${st.rc ? "on" : ""}"></div></div>`;
    b.addEventListener("click", () => openStudio(k));
    grid.appendChild(b);
  });
}

export function openStudio(k) {
  stKanji = k;
  $("#studio").classList.add("on");
  $("#stChar").textContent = k.c;
  $("#stLvl").textContent = "N" + k.l;
  $("#stMean").textContent = k.m;
  const parts = readingChips(k, "#stRead");
  if (parts.length) speak(parts[0]);
  renderStars();
  setStudioMode("trace");
}

function renderStars() {
  const p = kprog()[stKanji.c] || {};
  $("#stStars").innerHTML = p.rc ? '<span class="star">⭐</span>' : (p.tr ? '<span class="star" style="opacity:.45">⭐</span>' : "");
}

function setStudioMode(mode) {
  stMode = mode;
  stUsedHint = false;
  ["mWatch", "mTrace", "mRecall"].forEach(id => {
    const btn = $("#" + id);
    if (btn) btn.classList.toggle("on",
      (mode === "watch" && id === "mWatch") || (mode === "trace" && id === "mTrace") || (mode === "recall" && id === "mRecall"));
  });
  $("#stFeedback").textContent = "";
  $("#stFeedback").className = "k-feedback";
  $("#stHint").style.display = mode === "recall" ? "" : "none";
  $("#stHint").disabled = false;
  const box = $("#stWriterBox");
  if (mode === "watch") {
    stWriter = makeWriter(box, stKanji.c, { showCharacter: true, showOutline: false, strokeAnimationSpeed: 1.1, delayBetweenStrokes: 260 });
    const loop = () => { if (stMode === "watch" && $("#studio").classList.contains("on")) stWriter.animateCharacter({ onComplete: () => setTimeout(loop, 900) }); };
    setTimeout(loop, 150);
    return;
  }
  stWriter = makeWriter(box, stKanji.c, { showOutline: mode === "trace" });
  stWriter.quiz({
    leniency: 1.2,
    showHintAfterMisses: mode === "recall" ? 999 : 3,
    onMistake: () => {
      $("#stFeedback").textContent = "✕ not quite — stroke order & direction matter";
      $("#stFeedback").className = "k-feedback bad";
      beep("no");
    },
    onCorrectStroke: () => { $("#stFeedback").textContent = "✓"; $("#stFeedback").className = "k-feedback"; },
    onComplete: sum => {
      beep("ok");
      const stp = $("#stStamp");
      stp.classList.remove("hit"); void stp.offsetWidth; stp.classList.add("hit");
      const m = sum.totalMistakes;
      if (mode === "trace") setKprog(stKanji.c, { tr: true });
      if (mode === "recall") {
        if (stUsedHint) {
          $("#stFeedback").textContent = "Finished with the outline — try again from memory";
          $("#stFeedback").className = "k-feedback bad";
        }
        else if (m <= 2) {
          setKprog(stKanji.c, { rc: true });
          toast(stKanji.c + " mastered! ⭐");
          $("#stFeedback").textContent = m === 0 ? "Perfect! 完璧!" : `Mastered with ${m} mistake${m === 1 ? "" : "s"}`;
        }
        else {
          $("#stFeedback").textContent = `${m} mistakes — almost! Mastery needs ≤2`;
          $("#stFeedback").className = "k-feedback bad";
        }
      } else {
        $("#stFeedback").textContent = m === 0 ? "Perfect! 完璧!" : `Done with ${m} mistake${m === 1 ? "" : "s"}`;
      }
      speak(stKanji.r.split("・")[0]);
      renderStars();
      setTimeout(() => { stp.classList.remove("hit"); if (stMode === mode) setStudioMode(mode); }, 1700);
    }
  });
}

export function init() {
  $("#s-kanji").innerHTML = html;
  document.body.insertAdjacentHTML("beforeend", studioHtml);
  registerScreen("kanji", renderKanjiTab);

  $("#kanjiSeg").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    kanjiFilter = b.dataset.f;
    $$("#kanjiSeg button").forEach(x => x.classList.toggle("on", x === b));
    renderKanjiTab();
  });

  $("#stHint").addEventListener("click", () => {
    if (!stWriter || stMode !== "recall" || stUsedHint) return;
    stUsedHint = true;
    stWriter.showOutline();
    $("#stHint").disabled = true;
    $("#stFeedback").textContent = "Outline revealed — finish it, but this run won't count as mastered";
    $("#stFeedback").className = "k-feedback bad";
  });

  $("#mWatch").addEventListener("click", () => setStudioMode("watch"));
  $("#mTrace").addEventListener("click", () => setStudioMode("trace"));
  $("#mRecall").addEventListener("click", () => setStudioMode("recall"));
  $("#stClose").addEventListener("click", () => { $("#studio").classList.remove("on"); stWriter = null; renderKanjiTab(); });
}
