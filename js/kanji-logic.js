import { state } from './state.js';
import { LS, $, $$, escapeHtml, toast } from './helpers.js';
import { speak, beep } from './audio.js';

let stWriter = null;
let stKanji = null;
let stMode = "trace";
let stUsedHint = false;
export let kanjiFilter = "5";

export const getKMap = () => {
  return Object.fromEntries(window.KANJI_LIST.map(k => [k.c, k]));
};

export function kanjiLoader(char, onComplete) {
  if (window.KANJI_STROKES && window.KANJI_STROKES[char]) return onComplete(window.KANJI_STROKES[char]);
  fetch("https://cdn.jsdelivr.net/gh/chanind/hanzi-writer-data-jp@latest/data/" + encodeURIComponent(char) + ".json")
    .then(r => { if (!r.ok) throw 0; return r.json(); }).then(onComplete)
    .catch(() => toast("Couldn't load stroke data for " + char));
}

export function writerSize(box) {
  const r = box.getBoundingClientRect();
  return Math.round(Math.min(r.width, r.height));
}

export function makeWriter(box, char, opts) {
  [...box.children].forEach(ch => { if (!ch.classList.contains("stamp")) ch.remove(); });
  const s = writerSize(box);
  return HanziWriter.create(box, char, Object.assign({
    width: s, height: s, padding: 22,
    showCharacter: false,
    strokeColor: "#23262F",
    outlineColor: "#D9D4C5",
    drawingColor: "#2A4B8D",
    drawingWidth: 16,
    charDataLoader: kanjiLoader
  }, opts));
}

export function kprog() { return LS.get("kprog") || {}; }
export function setKprog(c, patch) { const p = kprog(); p[c] = Object.assign(p[c] || {}, patch); LS.set("kprog", p); }
export function isMastered(c) { const p = kprog()[c]; return !!(p && p.rc); }

export function readingChips(k, elId) {
  const parts = k.r.split("・").map(s => s.trim()).filter(Boolean);
  $(elId).innerHTML = parts.map(p => `<button class="reading-chip" data-say="${escapeHtml(p)}">${escapeHtml(p)} <span style="font-size:12px;">🔊</span></button>`).join("");
  return parts;
}

export function renderKanjiTab() {
  const p = kprog();
  const n5Mastered = window.KANJI_LIST.filter(k => k.l === 5 && isMastered(k.c)).length;
  const n4Mastered = window.KANJI_LIST.filter(k => k.l === 4 && isMastered(k.c)).length;
  $("#kstN5").firstChild.textContent = n5Mastered;
  $("#kstN4").firstChild.textContent = n4Mastered;
  
  const grid = $("#kanjiGrid");
  grid.innerHTML = "";
  let list = window.KANJI_LIST;
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

export function renderStars() {
  const p = kprog()[stKanji.c] || {};
  $("#stStars").innerHTML = p.rc ? '<span class="star">⭐</span>' : (p.tr ? '<span class="star" style="opacity:.45">⭐</span>' : "");
}

export function setStudioMode(mode) {
  stMode = mode; stUsedHint = false;
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
    onCorrectStroke: d => { $("#stFeedback").textContent = "✓"; $("#stFeedback").className = "k-feedback"; },
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

export function initKanjiStudioUI() {
  $("#kanjiSeg").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
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
