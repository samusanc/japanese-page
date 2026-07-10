import { state } from '@core/state.js';
import { LS } from '@core/storage.js';
import { $, escapeHtml } from '@core/dom.js';
import { todayStr } from '@core/dates.js';
import { hashStr, mulberry32, pick } from '@core/util.js';
import { speak } from '@core/audio/voice.js';
import { playMusic, sfx, stopAllLoops } from '@core/audio/engine.js';
import { bePostScore } from '@core/backend.js';
import { bumpStreak, saveDayRec } from '@core/daily.js';
import { showScreen } from '@core/screens.js';
import { bus } from '@core/bus.js';
import { kanjiList } from '@modules/kanji/data.js';
import { ctx, vnCheck } from './context.js';
import { TEACHER, CHAR } from '@content/otome/index.js';
import { charState, setCharState } from './state.js';
import { applyScene, vnSpriteSet, vnSay, updHud, burstHearts } from './stage.js';
import { vnQuiz } from './quiz.js';
import { vnSpell, vnWatch, vnStep } from './spell.js';
import { LIVES, QUIZ_POINTS, DAY_CAPS, ROUTE_KANJI_LEVELS, OUTCOME_RULE } from './constants.js';

/** Today's spell kanji for a character's route — one per configured JLPT level. */
export function routeKanji(ch) {
  const rnd = mulberry32(hashStr(todayStr() + "::" + ch.id));
  return ROUTE_KANJI_LEVELS.map(lvl => pick(kanjiList().filter(k => k.l === lvl), rnd));
}

/* ---- scene-node player ----
   Each handler owns one node kind (keyed by its discriminant field).
   Adding a node kind = registerNode("kind", handler) + a typedef in
   content/types.js + a NODE_KINDS entry in content/validate.js. */
const nodeHandlers = {
  scene: n => applyScene(n.scene),
  sfx: n => sfx(n.sfx),
  music: n => playMusic(n.music), // imperative mid-scene sting; scenes cover the common case
  quiz: n => vnQuiz(n.quiz),
  spell: n => vnSpell(n.spell),
  say: n => vnSay(n.who || "n", n.say, n.en),
  bg: n => {
    if (import.meta.env.DEV) console.warn("[otome] legacy {bg} node — use {scene}:", n.bg);
    applyScene(n.bg);
  }
};

export function registerNode(kind, handler) {
  nodeHandlers[kind] = handler;
}

export async function playScenes(nodes) {
  for (const n of nodes) {
    vnCheck();
    const kind = Object.keys(nodeHandlers).find(k => k in n);
    if (!kind) {
      if (import.meta.env.DEV) console.warn("[otome] unknown scene node:", n);
      continue;
    }
    await nodeHandlers[kind](n);
  }
}

async function classroom() {
  const T = TEACHER;
  const vn = ctx.vn;
  const ch = vn.ch;
  applyScene("academy");

  for (const line of T.intro) {
    await vnSay("teacher", line.replace("{CHAR}", ch.persona.name));
  }

  const kc = $("#vnKcards");
  kc.style.display = "";
  kc.innerHTML = vn.kanji.map(k => `<div class="vn-kcard"><div class="kc">${k.c}</div><div class="km">${escapeHtml(k.m)}<br>${escapeHtml(k.r)}</div></div>`).join("");
  speak(vn.kanji[0].r.split("・")[0]);
  await vnSay("teacher", `Today's spell-signs: 「${vn.kanji[0].c}」 (${vn.kanji[0].m}) and 「${vn.kanji[1].c}」 (${vn.kanji[1].m}).`);
  kc.style.display = "none";

  for (const k of vn.kanji) {
    await vnWatch(k);
    await vnStep(k, "trace");
  }

  for (const k of vn.kanji) {
    await vnStep(k, "recall");
  }

  await vnSay("teacher", T.done.replace("{CHAR}", ch.persona.name));
}

function resetStage() {
  $("#vn").classList.add("on");
  $("#vnQuizJp").style.display = "none";
  $("#vnChoices").style.display = "none";
  $("#vnWriterArea").style.display = "none";
  $("#vnKcards").style.display = "none";
  $("#vnEnding").classList.remove("on");
}

export async function startRoute(id) {
  const ch = CHAR[id];
  ctx.vn = {
    ch,
    kanji: routeKanji(ch),
    fails: 0,
    lives: LIVES,
    score: 0,
    gPts: 0,
    wPts: 0,
    quit: false,
    yellIdx: 0,
    stage: "class",
    _tap: null,
    _res: null
  };

  resetStage();
  updHud();
  vnSpriteSet(id);
  applyScene("academy");

  try {
    await classroom();
    ctx.vn.stage = "story";
    await playScenes(ch.route.intro);
    ctx.vn.stage = "battle";
    await playScenes(ch.route.trouble);
    await finishRoute();
  } catch (e) {
    if (e !== "quit") console.error(e);
  }
}

export function outcomeOf(v) {
  const quizzes = v.ch.route.intro.filter(n => n.quiz).length;
  const spells = v.ch.route.trouble.filter(n => "spell" in n).length;
  return OUTCOME_RULE(v.fails, quizzes + spells);
}

export function applyOutcome(v, outcome) {
  const cur = charState(v.ch.id).st;
  const st = outcome === "love" ? "love" : outcome === "friend" ? "friend" : (cur === "bw" ? "sealed" : "bw");
  setCharState(v.ch.id, { st, played: todayStr() });

  const stx = LS.get("stats") || { r: 0, w: 0 };
  stx.r += Math.round(v.gPts / QUIZ_POINTS);
  stx.w += v.fails;
  LS.set("stats", stx);

  state.dayRec.sB = Math.min(DAY_CAPS.grammar, state.dayRec.sB + v.gPts);
  state.dayRec.kB = Math.min(DAY_CAPS.writing, state.dayRec.kB + v.wPts);

  saveDayRec();
  bumpStreak();

  if (state.beReady) {
    bePostScore("sprint", state.dayRec.sB);
    bePostScore("kanji", state.dayRec.kB);
  }
  bus.emit("daily:committed", { kind: "otome" });
  return st;
}

async function finishRoute() {
  const v = ctx.vn;
  const outcome = outcomeOf(v);
  await playScenes(v.ch.route.endings[outcome]);
  applyOutcome(v, outcome);

  const oc = outcome === "love" ? { t: "💘 A Heart Won!", c: "var(--rose)" }
           : outcome === "friend" ? { t: "🤝 Friends… for now", c: "var(--vio)" }
           : { t: "💔 Rejected", c: "var(--ink2)" };

  const img = v.ch.sprites.default;
  $("#vnEndCard").innerHTML = `
    <div style="font-size:44px;">${img ? `<img src="${img}" style="height:80px;border-radius:16px;${outcome === "fail" ? "filter:grayscale(1);" : ""}">` : v.ch.icon}</div>
    <div class="big-oc" style="color:${oc.t}">${oc.t}</div>
    <p class="sub" style="margin-bottom:12px;">${escapeHtml(v.ch.persona.name)} · fails: ${v.fails} · grammar +${v.gPts} · writing +${v.wPts}</p>
    <div class="res-score" style="padding:0 0 10px;"><div class="n" style="font-size:44px;">${v.score}</div><div class="k">route score</div></div>
    <button class="btn" id="vnEndBtn">Return to the Academy ✦</button>`;

  $("#vnEnding").classList.add("on");
  if (outcome === "love") burstHearts();
  playMusic(null);
  $("#vnEndBtn").addEventListener("click", () => closeVN());
}

export function closeVN() {
  stopAllLoops();
  $("#vn").classList.remove("on");
  ctx.vn = null;
  showScreen("home");
}
