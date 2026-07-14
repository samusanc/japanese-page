import { LS } from '@core/storage.js';
import { $, $$, escapeHtml, toast } from '@core/dom.js';
import { shuffle, resolveAsset } from '@core/util.js';
import { showScreen } from '@core/screens.js';
import { playRecipe } from '@core/audio/sfx.js';
import { speak } from '@core/audio/voice.js';
import { CARDS_HOST, CARD_DECKS, CARDS_BALANCE } from '@content/cards.js';
import { entryKey, attachWeights, learnedEntries, pickReview, applyRound, toWeights } from './srs.js';

/** The Royal Gamble — speed memory matching at the Gambler Prince's table.
 *  Match the prompt cards (Spanish, or readings in kanji mode) to the
 *  Japanese cards before the Prince's hourglass runs out. */

const B = CARDS_BALANCE;

/* ---- table sounds (WebAudio recipes, no assets) ---- */
const SND = {
  tap: () => playRecipe([{ f: 580, at: 0, dur: 0.06, gain: 0.08 }]),
  match: () => playRecipe([
    { f: 392, at: 0, dur: 0.07, gain: 0.1, wave: "triangle" },
    { f: 523, at: 0.07, dur: 0.07, gain: 0.1, wave: "triangle" },
    { f: 659, at: 0.14, dur: 0.07, gain: 0.1, wave: "triangle" },
    { f: 784, at: 0.21, dur: 0.16, gain: 0.1, wave: "triangle" }
  ]),
  mismatch: () => playRecipe([
    { f: 180, at: 0, dur: 0.07, gain: 0.12, wave: "sawtooth" },
    { f: 130, at: 0.06, dur: 0.09, gain: 0.1, wave: "sawtooth" }
  ]),
  tick: () => playRecipe([{ f: 1000, at: 0, dur: 0.015, gain: 0.05, wave: "triangle" }]),
  over: () => playRecipe([
    { f: 300, at: 0, dur: 0.14, gain: 0.1 }, { f: 220, at: 0.14, dur: 0.14, gain: 0.1 },
    { f: 160, at: 0.28, dur: 0.16, gain: 0.1 }, { f: 110, at: 0.44, dur: 0.24, gain: 0.1 }
  ]),
  chip: () => playRecipe([
    { f: 1180, at: 0, dur: 0.04, gain: 0.07, wave: "triangle" },
    { f: 1560, at: 0.05, dur: 0.06, gain: 0.06, wave: "triangle" }
  ]),
  shuffle: () => playRecipe(Array.from({ length: 7 }, (_, i) =>
    ({ f: 750 + Math.random() * 300, at: i * 0.08, dur: 0.03, gain: 0.05, wave: "triangle" })))
};

/* ---- module state ---- */
let G = null;               // active run
const deckCache = {};       // level id -> fetched json
let deckIds = LS.get("cards:decks") || ["starter"];   // multi-select
let gameType = LS.get("cards:type") || "vocab";      // "vocab" | "kanji"
let furigana = LS.get("cards:furigana") !== false;    // normal = kanji + mini reading

// SRS weights are shared across decks (entry keys are stable), so mixing
// levels keeps your progress on every card.
const srsKey = () => `cards:srs:${gameType}`;
const bestKey = () => `cards:best:${gameType}`;

/* ---- deck loading: union of every selected level ---- */
const MANUAL_TRANSLATIONS = {
  "～よう日(月よう日）": "día de la semana (よう日)",
  "よう日": "día de la semana (よう日)",
  "百円": "cien yenes",
  "千円": "mil yenes",
  "一万円": "diez mil yenes",
  "入っています": "estar dentro / estar incluido",
  "旅行中": "durante el viaje / de viaje",
  "子ども用": "para niños",
  "家庭料理": "comida casera / cocina casera",
  "文型": "patrón de frase / estructura gramatical",
  "もう一度": "una vez más / otra vez",
  "～県（埼玉県）": "prefectura (～県)",
  "果てしない": "infinito / sin fin",
  "月": "lunes / luna / mes",
  "火": "martes / fuego",
  "水": "miércoles / agua",
  "木": "jueves / árbol",
  "金": "viernes / oro / dinero",
  "土": "sábado / tierra"
};

function cleanString(str) {
  if (!str) return "";
  return str.replace(/[（）()]/g, "")
            .replace(/[な|に|の|ます|る|う]$/, "")
            .trim();
}

async function loadPool() {
  const allDecks = ["starter", "elementary1", "elementary2", "preintermediate", "intermediate1", "intermediate2"];
  await Promise.all(allDecks.map(async id => {
    if (deckCache[id]) return;
    const res = await fetch(`./vocab/${id}.json`);
    if (!res.ok) throw new Error("deck fetch failed: " + id);
    deckCache[id] = await res.json();
  }));

  const globalVocab = [];
  allDecks.forEach(id => {
    if (deckCache[id]) globalVocab.push(...deckCache[id].vocab);
  });

  const cleanVocab = globalVocab.map(v => ({
    ...v,
    cleanJa: cleanString(v.ja),
    cleanKana: cleanString(v.kana)
  }));

  const seen = new Set();
  const pool = [];
  for (const id of deckIds) {
    for (const e of (gameType === "kanji" ? deckCache[id].kanji : deckCache[id].vocab)) {
      let item = { ...e };
      if (gameType === "kanji") {
        const manual = MANUAL_TRANSLATIONS[e.ja] || MANUAL_TRANSLATIONS[cleanString(e.ja)];
        if (manual) {
          item.es = manual;
        } else {
          const cleanKJa = cleanString(e.ja.split(/[（(]/)[0]);
          const cleanKKana = cleanString(e.kana.split(/[（(]/)[0]);
          const match = globalVocab.find(v => v.ja === e.ja || v.kana === e.kana)
            || cleanVocab.find(v => v.cleanJa === cleanKJa || v.cleanKana === cleanKKana)
            || globalVocab.find(v => v.ja.includes(cleanKJa) || v.kana.includes(cleanKKana));
          item.es = match ? match.es : "";
        }
      }
      const k = entryKey(item);
      if (!seen.has(k)) {
        seen.add(k);
        pool.push(item);
      }
    }
  }
  return attachWeights(pool, LS.get(srsKey()) || {});
}

function saveWeights() {
  if (G) LS.set(srsKey(), toWeights(G.pool));
}

/* ---- panels ---- */
function showPanel(name) {
  ["cdStart", "cdReview", "cdPlay", "cdOver"].forEach(id =>
    $("#" + id).classList.toggle("on", id === "cd" + name));
}

export function openCards() {
  renderStart();
  showPanel("Start");
}

/** One-time content dressing: backdrop, dealer portraits, name plate. */
function dressTable() {
  if (CARDS_HOST.bg) $("#s-cards").style.setProperty("--cd-bg", `url('${resolveAsset(CARDS_HOST.bg)}')`);
  ["cdHostImg", "cdDealImg", "cdDealerImg", "cdOverImg"].forEach(id => {
    const img = $("#" + id);
    if (!img) return;
    if (CARDS_HOST.img) img.src = resolveAsset(CARDS_HOST.img);
    else img.style.display = "none"; // fall back to the 🃏 icon behind it
  });
  $("#cdDealerPlate").textContent = CARDS_HOST.name;
}

/* ---- stacking chips: 10 per stack, a new colour per stack ---- */
const CHIP_COLORS = ["gold", "ruby", "emerald", "sapphire"];
const CHIPS_PER_STACK = 10;
const MAX_STACKS = 5;

function renderChipTray(el, chips, animateLast) {
  const stacks = Math.ceil(chips / CHIPS_PER_STACK);
  const shown = Math.min(stacks, MAX_STACKS);
  let html = "";
  for (let sIdx = 0; sIdx < shown; sIdx++) {
    // when overflowing, show the LAST stacks so the newest chip is visible
    const stackNo = stacks - shown + sIdx;
    const inStack = Math.min(CHIPS_PER_STACK, chips - stackNo * CHIPS_PER_STACK);
    const color = CHIP_COLORS[stackNo % CHIP_COLORS.length];
    let chipsHtml = "";
    for (let i = 0; i < inStack; i++) {
      const isNewest = animateLast && stackNo === stacks - 1 && i === inStack - 1;
      const jitter = ((stackNo * 7 + i * 3) % 5) - 2; // deterministic wobble
      chipsHtml += `<i class="cd-chip ${color}${isNewest ? " drop" : ""}" style="bottom:${i * 6}px;left:${jitter}px;z-index:${i};"></i>`;
    }
    html += `<div class="cd-stack">${chipsHtml}</div>`;
  }
  if (stacks > MAX_STACKS) html = `<span class="cd-stack-more">+${(stacks - MAX_STACKS) * CHIPS_PER_STACK}</span>` + html;
  el.innerHTML = html;
}

export function closeCards() {
  stopTimer();
  if (G) {
    applyRoundWeights();
    saveWeights();
  }
  G = null;
  showScreen("home");
}

/* ---- start screen ---- */
function renderStart() {
  $("#cdHostName").textContent = CARDS_HOST.name;
  $("#cdHostTitle").textContent = CARDS_HOST.title;
  $("#cdHostLine").textContent = CARDS_HOST.lines.welcome;
  $("#cdBest").textContent = LS.get(bestKey()) || 0;

  const dl = $("#cdDecks");
  dl.innerHTML = "";
  CARD_DECKS.forEach(d => {
    const b = document.createElement("button");
    b.className = "cd-deck-btn" + (deckIds.includes(d.id) ? " on" : "");
    b.innerHTML = `${escapeHtml(d.label)}<span class="lv">${escapeHtml(d.sub)}</span>`;
    b.addEventListener("click", () => {
      if (deckIds.includes(d.id)) {
        if (deckIds.length === 1) return; // the Prince insists on at least one deck
        deckIds = deckIds.filter(x => x !== d.id);
      } else {
        deckIds = [...deckIds, d.id];
      }
      LS.set("cards:decks", deckIds);
      renderStart();
    });
    dl.appendChild(b);
  });

  $$("#cdType button").forEach(b => b.classList.toggle("on", b.dataset.t === gameType));
  const fw = $("#cdFuriWrap");
  fw.style.display = gameType === "kanji" ? "none" : "";
  $("#cdFuri").classList.toggle("on", furigana);
  $("#cdFuri").textContent = furigana ? "ふりがな ON" : "ふりがな OFF";
}

/* ---- run lifecycle ---- */
async function newRun(mode) {
  let pool;
  try {
    pool = await loadPool();
  } catch (e) {
    toast("Couldn't load the deck — check your connection");
    return;
  }
  G = {
    mode,
    pool,
    session: [],          // entries dealt so far this run
    pairsOnTable: B.startPairs,
    chips: 0,
    peak: 0,
    round: null,
    reviewQueue: [],
    reviewIdx: 0,
    busy: false,
    sel: null
  };
  $("#cdChips").textContent = "0";
  renderChipTray($("#cdChipTray"), 0, false);

  if (mode === "practice") {
    const learned = learnedEntries(pool);
    if (learned.length < B.startPairs) {
      toast(CARDS_HOST.lines.notEnough);
      return startReview();
    }
    G.session = shuffle(learned).slice();
    G.pairsOnTable = B.startPairs;
    showPanel("Play");
    dealRound();
  } else {
    startReview();
  }
}

/* ---- review: the Prince deals new cards ---- */
function startReview() {
  const sessionKeys = new Set(G.session.map(entryKey));
  G.reviewQueue = pickReview(G.pool, sessionKeys);
  G.reviewQueue.forEach(e => { if (e.points === null) e.points = 0; }); // mark as dealt
  G.reviewIdx = 0;
  $("#cdDealLine").textContent = G.session.length ? CARDS_HOST.lines.dealAgain : CARDS_HOST.lines.deal;
  showPanel("Review");
  showReviewCard();
}

function cardFaceHtml(e) {
  const showFuri = gameType === "vocab" && furigana && e.ja !== e.kana;
  return `${showFuri ? `<span class="cd-furi">${escapeHtml(e.kana)}</span>` : ""}<span class="cd-ja">${escapeHtml(e.ja)}</span>`;
}

function showReviewCard() {
  const e = G.reviewQueue[G.reviewIdx];
  $("#cdReviewCount").textContent = `Card ${G.reviewIdx + 1} of ${G.reviewQueue.length}`;
  $("#cdReviewPrompt").textContent = gameType === "kanji" ? `${e.kana} · ${e.es}` : e.es;
  $("#cdReviewJa").innerHTML = cardFaceHtml(e);
  $("#cdReviewNext").textContent = G.reviewIdx === G.reviewQueue.length - 1 ? "TO THE TABLE ▶" : "NEXT CARD ▶";
  speak(e.kana);
}

function nextReviewCard() {
  SND.tap();
  if (G.reviewIdx < G.reviewQueue.length - 1) {
    G.reviewIdx++;
    showReviewCard();
  } else {
    G.session = [...G.session, ...G.reviewQueue];
    G.pairsOnTable = G.session.length === B.startPairs ? B.startPairs : G.pairsOnTable + 1;
    showPanel("Play");
    dealRound();
  }
}

/* ---- the table ---- */
function dealRound() {
  G.sel = null;
  G.busy = true;
  stopTimer();
  $("#cdTopGrid").innerHTML = "";
  $("#cdBotGrid").innerHTML = "";

  SND.shuffle();
  $("#cdTopDeck").classList.add("shuffling");
  $("#cdBotDeck").classList.add("shuffling");

  const n = Math.min(G.pairsOnTable, G.session.length);
  const pairs = shuffle(G.session).slice(0, n);
  G.round = {
    pairs,
    activeKeys: new Set(pairs.map(entryKey)),
    matchedKeys: new Set(),
    mismatchedKeys: new Set(),
    matchedCount: 0
  };
  G.peak = Math.max(G.peak, n * 2);

  setTimeout(() => {
    $("#cdTopDeck").classList.remove("shuffling");
    $("#cdBotDeck").classList.remove("shuffling");

    const top = shuffle(pairs.map((p, i) => ({ p, i, side: "top" })));
    const bot = shuffle(pairs.map((p, i) => ({ p, i, side: "bot" })));

    top.forEach(c => $("#cdTopGrid").appendChild(makeCard(c)));
    bot.forEach(c => $("#cdBotGrid").appendChild(makeCard(c)));
    fitGrids(n);

    // staggered deal from the side decks, flipping face-up on arrival
    const dealt = [];
    const topEls = [...$("#cdTopGrid").children];
    const botEls = [...$("#cdBotGrid").children];
    for (let i = 0; i < n; i++) {
      if (topEls[i]) dealt.push({ el: topEls[i], deck: $("#cdTopDeck") });
      if (botEls[i]) dealt.push({ el: botEls[i], deck: $("#cdBotDeck") });
    }
    dealt.forEach((d, i) => {
      const cr = d.el.getBoundingClientRect();
      const dr = d.deck.getBoundingClientRect();
      d.el.classList.add("face-down");
      d.el.style.transition = "none";
      d.el.style.transform = `translate(${dr.left - cr.left}px, ${dr.top - cr.top}px)`;
      void d.el.offsetHeight;
      setTimeout(() => {
        d.el.style.transition = "transform .6s cubic-bezier(.25,.8,.25,1)";
        d.el.style.transform = "translate(0,0)";
        d.el.classList.remove("face-down");
      }, i * 70);
    });

    setTimeout(() => {
      G.busy = false;
      dealt.forEach(d => {
        d.el.style.transition = "";
        d.el.style.transform = "";
      });
      startTimer(n * B.secondsPerPair * 1000);
    }, dealt.length * 70 + 620);
  }, 700);
}

function makeCard({ p, i, side }) {
  const el = document.createElement("button");
  el.className = "cd-card " + (side === "top" ? "cd-prompt" : "cd-answer");
  const face = side === "top"
    ? `<span class="cd-prompt-text">${escapeHtml(p.es)}</span>`
    : cardFaceHtml(p);
  el.innerHTML = `
    <span class="cd-inner">
      <span class="cd-front"><span class="cd-pip tl">⚜</span><span class="cd-pip br">⚜</span>${face}</span>
      <span class="cd-back"><span class="cd-back-crest">👑</span></span>
    </span>`;
  el.dataset.pair = i;
  el.dataset.side = side;
  el.addEventListener("click", () => onCard(el, p, i, side));
  return el;
}

function fitGrids(n) {
  const cols = n <= 4 ? n : (n <= 6 ? 3 : (n <= 8 ? 4 : 5));
  const rows = Math.ceil(n / cols);
  ["#cdTopGrid", "#cdBotGrid"].forEach(sel => {
    const grid = $(sel);
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const h = Math.max(48, Math.floor(((grid.clientHeight || 120) - 6 * (rows - 1)) / rows));
    [...grid.children].forEach(c => { c.style.height = h + "px"; });
  });
}

function onCard(el, p, i, side) {
  if (!G || G.busy || el.classList.contains("matched")) return;
  SND.tap();

  if (G.sel && G.sel.el === el) {
    el.classList.remove("selected");
    G.sel = null;
    return;
  }
  if (!G.sel || G.sel.side === side) {
    if (G.sel) G.sel.el.classList.remove("selected");
    el.classList.add("selected");
    G.sel = { el, p, i, side };
    return;
  }

  const first = G.sel;
  G.sel = null;
  if (first.i === i) {
    matchFound(first, { el, p, i });
  } else {
    mismatch(first, { el, p, i });
  }
}

function matchFound(a, b) {
  G.busy = true;
  const key = entryKey(b.p);
  G.round.matchedKeys.add(key);
  G.round.matchedCount++;
  SND.match();
  speak(b.p.kana); // hear the word as the cards clear

  [a, b].forEach(c => {
    c.el.classList.add("matched");
    const deck = c.el.dataset.side === "top" ? $("#cdTopDeck") : $("#cdBotDeck");
    const cr = c.el.getBoundingClientRect();
    const dr = deck.getBoundingClientRect();
    c.el.style.transition = "transform .6s cubic-bezier(.25,.8,.25,1), opacity .5s ease";
    c.el.style.transform = `translate(${dr.left - cr.left}px, ${dr.top - cr.top}px) rotateY(180deg) scale(.5)`;
    c.el.style.opacity = "0";
  });

  G.chips += B.chipsPerMatch;
  $("#cdChips").textContent = G.chips;
  chipFloat();
  renderChipTray($("#cdChipTray"), G.chips, true);
  SND.chip();
  const best = LS.get(bestKey()) || 0;
  if (G.chips > best) {
    LS.set(bestKey(), G.chips);
    $("#cdBest").textContent = G.chips;
  }

  if (G.round.matchedCount === G.round.pairs.length) {
    stopTimer();
    setTimeout(() => {
      G.busy = false;
      applyRoundWeights();
      saveWeights();
      SND.chip();
      const more = G.pairsOnTable < G.session.length;
      $("#cdLevelLine").textContent = more ? CARDS_HOST.lines.clear : CARDS_HOST.lines.allClear;
      $("#cdLevelNext").textContent = more ? `RAISE THE STAKES (+1 CARD)` : `THE PRINCE DEALS ${B.reviewBatch} MORE`;
      $("#cdLevelModal").classList.add("on");
    }, 650);
  } else {
    setTimeout(() => { G.busy = false; }, 300);
  }
}

function mismatch(a, b) {
  G.busy = true;
  SND.mismatch();
  G.round.mismatchedKeys.add(entryKey(a.p));
  G.round.mismatchedKeys.add(entryKey(b.p));
  [a.el, b.el].forEach(el => el.classList.add("shake"));
  if (navigator.vibrate) navigator.vibrate(40);
  setTimeout(() => {
    [a.el, b.el].forEach(el => el.classList.remove("shake", "selected"));
    G.busy = false;
  }, 240);
}

function chipFloat() {
  const el = $("#cdChipFloat");
  el.textContent = "+" + B.chipsPerMatch + " 🪙";
  el.classList.remove("go");
  void el.offsetWidth;
  el.classList.add("go");
}

function applyRoundWeights() {
  if (!G || !G.round) return;
  applyRound(G.pool, G.round.activeKeys, G.round.matchedKeys, G.round.mismatchedKeys);
  G.round = null;
}

/* ---- timer ---- */
let timerId = null;
let endsAt = 0;
let limit = 0;
let lastSec = -1;

function startTimer(ms) {
  stopTimer();
  limit = ms;
  endsAt = Date.now() + ms;
  lastSec = -1;
  timerId = setInterval(() => {
    const left = endsAt - Date.now();
    if (left <= 0) {
      updateTimer(0);
      gameOver();
      return;
    }
    updateTimer(left);
    const sec = Math.floor(left / 1000);
    if (left < B.lowTimeMs && sec !== lastSec) {
      lastSec = sec;
      SND.tick();
    }
  }, 50);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateTimer(left) {
  $("#cdTimerFill").style.transform = `scaleX(${Math.max(0, left / limit)})`;
  $("#cdTimerFill").classList.toggle("low", left < B.lowTimeMs);
  $("#cdTimerText").textContent = (left / 1000).toFixed(1) + "s";
}

/* ---- game over ---- */
function gameOver() {
  stopTimer();
  SND.over();
  applyRoundWeights();
  saveWeights();
  $("#cdOverLine").textContent = G.chips >= 10 ? CARDS_HOST.lines.win : CARDS_HOST.lines.lose;
  $("#cdFinalChips").textContent = G.chips;
  $("#cdFinalPeak").textContent = G.peak;
  renderChipTray($("#cdOverTray"), G.chips, false);
  showPanel("Over");
}

/* ---- ledger (progress) ---- */
function showLedger() {
  SND.tap();
  loadPool().then(pool => {
    const learned = learnedEntries(pool);
    $("#cdLedgerWon").textContent = learned.length;
    $("#cdLedgerLeft").textContent = pool.length - learned.length;
    $("#cdLedgerList").innerHTML = pool.map(e => {
      const isL = e.points !== null;
      const sub = gameType === "kanji" ? `${e.kana} · ${e.es}` : `${e.kana !== e.ja ? e.kana + " · " : ""}${e.es}`;
      return `<div class="cd-ledger-row ${isL ? "won" : ""}">
        <div class="w"><span class="ja">${escapeHtml(e.ja)}</span><span class="sub">${escapeHtml(sub)}</span></div>
        <span class="badge ${isL ? "gold" : "ink"}">${isL ? e.points + " pts" : "🔒"}</span>
      </div>`;
    }).join("");
    $("#cdLedgerModal").classList.add("on");
  });
}

/* ---- wiring ---- */
export function initGame() {
  dressTable();
  $("#cdLearn").addEventListener("click", () => { SND.tap(); newRun("learn"); });
  $("#cdPractice").addEventListener("click", () => { SND.tap(); newRun("practice"); });
  $("#cdReviewNext").addEventListener("click", nextReviewCard);
  $("#cdQuit").addEventListener("click", () => { SND.tap(); gameOver(); });
  $("#cdClose").addEventListener("click", () => { SND.tap(); closeCards(); });
  $("#cdOverAgain").addEventListener("click", () => { SND.tap(); newRun("practice"); });
  $("#cdOverMenu").addEventListener("click", () => { SND.tap(); renderStart(); showPanel("Start"); });

  $("#cdLevelNext").addEventListener("click", () => {
    $("#cdLevelModal").classList.remove("on");
    if (G.pairsOnTable < G.session.length) {
      G.pairsOnTable++;
      dealRound();
    } else {
      startReview();
    }
  });
  $("#cdLevelMenu").addEventListener("click", () => {
    $("#cdLevelModal").classList.remove("on");
    saveWeights();
    renderStart();
    showPanel("Start");
  });

  $$("#cdType button").forEach(b => b.addEventListener("click", () => {
    gameType = b.dataset.t;
    LS.set("cards:type", gameType);
    renderStart();
  }));
  $("#cdFuri").addEventListener("click", () => {
    furigana = !furigana;
    LS.set("cards:furigana", furigana);
    renderStart();
  });

  $("#cdLedger").addEventListener("click", showLedger);
  $("#cdLedgerClose").addEventListener("click", () => $("#cdLedgerModal").classList.remove("on"));
  $("#cdLedgerReset").addEventListener("click", () => {
    if (confirm("Reset all won cards on this table?")) {
      LS.set(srsKey(), {});
      $("#cdLedgerModal").classList.remove("on");
      toast("The Prince shuffles a fresh deck 🃏");
    }
  });

  window.addEventListener("resize", () => {
    if (G && G.round && $("#cdPlay").classList.contains("on")) fitGrids(G.round.pairs.length);
  });
}
