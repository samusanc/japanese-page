import { state } from './state.js';
import { LS, $, $$, escapeHtml, todayStr, yesterdayStr, toast, hashStr, mulberry32, shuffle, pick } from './helpers.js';
import { speak, beep } from './audio.js';
import { bePostScore } from './config.js';
import { VERBS, ADJS, FORMS, FORM } from './data.js';
import { OTOME } from './game-content.js';
import { showScreen, bumpStreak } from './app.js';
import { answer } from './engine.js';

export const CHAR = Object.fromEntries(OTOME.characters.map(c => [c.id, c]));
export let VN = null;
let vnMusicEl = null;

/* ---- per-character monthly state (love/friend/bw/sealed) ---- */
export function otomeState() {
  let s = LS.get("otome");
  if (!s || s.m !== monthStr()) {
    s = { m: monthStr(), chars: {} };
    LS.set("otome", s);
  }
  return s;
}

export function charState(id) {
  return otomeState().chars[id] || { st: "new" };
}

export function setCharState(id, patch) {
  const s = otomeState();
  s.chars[id] = Object.assign(s.chars[id] || { st: "new" }, patch);
  LS.set("otome", s);
}

function monthStr() {
  return todayStr().slice(0, 7);
}

export function todayRoster() {
  const rnd = mulberry32(hashStr(todayStr() + "roster"));
  return shuffle(OTOME.characters.map(c => c.id), rnd).slice(0, 3);
}

export function statusOf(ch, roster) {
  const cs = charState(ch.id);
  const inR = roster.includes(ch.id);
  const today = cs.played === todayStr();
  
  if (cs.st === "love") return { cls: "love", label: "💘 Yours", play: false };
  if (cs.st === "sealed") return { cls: "sealed", label: "⛓ Sealed this season", play: false };
  if (!inR) return { cls: "away", label: "🌙 Returns another day", play: false };
  if (today) return { cls: cs.st === "bw" ? "bw" : (cs.st === "friend" ? "friend" : ""), label: "✔ Seen today", play: false };
  if (cs.st === "bw") return { cls: "bw", label: "🖤 Last chance", play: true };
  if (cs.st === "friend") return { cls: "friend", label: "🤝 Friend — win their heart", play: true };
  return { cls: "", label: "✦ New encounter", play: true };
}

/* ---- stage helpers ---- */
function vnBgSet(id) {
  const b = OTOME.assets.bg[id];
  if (!b) return;
  $("#vnBg").style.background = b.img ? `url(${b.img}) center/cover no-repeat` : b.css;
}

function vnMusicPlay(id) {
  try {
    if (vnMusicEl) {
      vnMusicEl.pause();
      vnMusicEl = null;
    }
    if (!id || !state.sndOn) return;
    const m = OTOME.assets.music[id];
    if (!m || !m.src) return;
    vnMusicEl = new Audio(m.src);
    vnMusicEl.loop = true;
    vnMusicEl.volume = 0.35;
    vnMusicEl.play().catch(() => {});
  } catch (e) {}
}

function vnSpriteSet(who) {
  const el = $("#vnSprite");
  if (who === "n") {
    el.style.opacity = 0;
    return;
  }
  el.style.opacity = 1;
  el.classList.toggle("left", who === "teacher");
  let icon, img = null;
  if (who === "teacher") {
    icon = OTOME.teacher.icon;
    img = OTOME.teacher.img;
  } else if (who === "you") {
    icon = state.profile?.e || "🌸";
  } else {
    const c = CHAR[who] || VN.ch;
    icon = c.icon;
    img = c.img;
  }
  el.innerHTML = img ? `<img src="${img}" alt="">` : icon;
}

function vnWho(who) {
  if (who === "teacher") return OTOME.teacher.name;
  if (who === "you") return state.profile?.n || "You";
  return (CHAR[who] || VN.ch).name;
}

function updHud() {
  $("#vnScore").textContent = VN.score;
  const el = $("#vnHearts");
  if (el) {
    el.style.display = VN.training ? "none" : "flex";
    if (!VN.training) {
      const pct = (VN.lives / 2) * 100;
      const label = VN.lives === 2 ? "⚜️ Wards: Stable" : (VN.lives === 1 ? "⚡ Wards: Fractured" : "💔 Wards: Broken");
      el.innerHTML = `
        <div class="royal-bar-container">
          <div class="royal-bar-label">${label}</div>
          <div class="royal-bar-frame">
            <div class="royal-bar-fill" style="width: ${Math.max(0, pct)}%;"></div>
          </div>
        </div>
      `;
    }
  }
}

function vnCheck() {
  if (!VN || VN.quit) throw "quit";
}

function vnTap() {
  return new Promise(res => {
    VN._tap = res;
  });
}

export function initVnEvents() {
  $("#vnDialog").addEventListener("click", () => {
    if (!VN) return;
    if (VN._typing) {
      VN._skipType = true;
      return;
    }
    const t = VN._tap;
    VN._tap = null;
    if (t) t();
  });

  $("#vnQuit").addEventListener("click", () => {
    if (!VN) return;
    const v = VN;
    const inStory = !v.training && v.stage !== "class";
    v.quit = true;
    if (v._tap) {
      const t = v._tap;
      v._tap = null;
      t();
    }
    if (v._res) {
      const r = v._res;
      v._res = null;
      r({ totalMistakes: 99, s: { totalMistakes: 99 }, revealed: true });
    }
    if (inStory) {
      applyOutcome(v, "fail");
      toast("You fled the story… " + v.ch.name + " won't forget this. 💔");
    }
    closeVN();
  });
  
  // Ambient sparks
  setInterval(() => {
    if (!VN) return;
    const st = document.querySelector("#vn .vn-stage");
    if (!st || st.querySelectorAll(".sparkle").length > 13) return;
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = pick(["✦", "✧", "·"]);
    s.style.left = (2 + Math.random() * 96) + "%";
    s.style.fontSize = (7 + Math.random() * 11) + "px";
    s.style.animationDuration = (6 + Math.random() * 7) + "s";
    st.appendChild(s);
    setTimeout(() => {
      s.remove();
    }, 14000);
  }, 620);
}

function vnYell() {
  const src = VN.training ? OTOME.teacher : VN.ch;
  const y = src.yells[VN.yellIdx++ % src.yells.length];
  const el = $("#vnYell");
  el.classList.toggle("left", !!VN.training);
  el.innerHTML = escapeHtml(y.jp) + `<span class="en">${escapeHtml(y.en)}</span>`;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
  speak(y.jp);
  if (navigator.vibrate) navigator.vibrate(50);
}

/* ---- gold particle magic ---- */
function particleBurst(el, n, big) {
  try {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < (n || 12); i++) {
      const s = document.createElement("div");
      s.textContent = pick(["✦", "✧", "✨", "·", "＊"]);
      s.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;z-index:99;pointer-events:none;color:#E9C868;font-size:${big ? 14 + Math.random() * 14 : 8 + Math.random() * 8}px;text-shadow:0 0 8px rgba(233,200,104,.9);`;
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2;
      const d = (big ? 70 : 34) + Math.random() * (big ? 90 : 44);
      s.animate([
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - (big ? 26 : 10)}px) scale(${big ? 1.5 : 1.1})`, opacity: 0 }
      ], {
        duration: 650 + Math.random() * 550,
        easing: "cubic-bezier(.2,.8,.3,1)"
      }).onfinish = () => s.remove();
    }
  } catch (err) {}
}

/* ---- dialogue with typewriter ---- */
async function vnSay(who, text, en) {
  vnCheck();
  vnSpriteSet(who);
  const nm = $("#vnName");
  nm.style.display = who === "n" ? "none" : "";
  nm.textContent = vnWho(who);
  
  if (who !== "n" && who !== "you" && who !== "teacher") {
    const c = CHAR[who] || VN.ch;
    nm.style.background = `linear-gradient(135deg,${c.accent},${c.accent2})`;
    nm.style.color = "#2B2347";
  } else {
    nm.style.background = "";
    nm.style.color = "";
  }
  
  const txt = $("#vnText");
  $("#vnNext").style.visibility = "hidden";
  VN._typing = true;
  VN._skipType = false;
  for (let i = 0; i <= text.length; i++) {
    if (VN._skipType) break;
    txt.innerHTML = escapeHtml(text.slice(0, i));
    await new Promise(r => setTimeout(r, 15));
    vnCheck();
  }
  txt.innerHTML = escapeHtml(text) + (en ? `<span class="en">${escapeHtml(en)}</span>` : "");
  VN._typing = false;
  $("#vnNext").style.visibility = "visible";
  await vnTap();
  vnCheck();
}

/* ---- in-story conjugation quiz ---- */
function findWord(r) {
  return VERBS.find(v => v.r === r) || ADJS.find(a => a.r === r);
}

function quizAnswerFor(item, form) {
  if (form === "dict" || form === "aplain") return item.r;
  return answer(item, form);
}

function quizOptionsFor(item, form) {
  if (form === "dict") {
    return shuffle([
      item.r,
      vconj(item.r, item.t, "te", item.x),
      vconj(item.r, item.t, "masu", item.x),
      vconj(item.r, item.t, "nai", item.x)
    ]);
  }
  if (form === "aplain") {
    return shuffle([
      item.r,
      aconj(item.r, item.t, "aneg"),
      aconj(item.r, item.t, "apast"),
      aconj(item.r, item.t, "ate")
    ]);
  }
  return buildQuestion(item, form, null).options;
}

function vconj(r, t, form, x) {
  const mockItem = { r, t, x };
  try {
    return answer(mockItem, form);
  } catch (e) {
    return r;
  }
}
function aconj(r, t, form) {
  const mockItem = { r, t, x: false };
  try {
    return answer(mockItem, form);
  } catch (e) {
    return r;
  }
}
function buildQuestion(item, form) {
  const ans = quizAnswerFor(item, form);
  const pool = (item.t === "ia" || item.t === "na") ? ADJS : VERBS;
  const filtered = pool.filter(v => v.r !== item.r);
  const alt = shuffle(filtered).slice(0, 3).map(v => quizAnswerFor(v, form));
  return { options: shuffle([ans, ...alt]) };
}

async function vnQuiz(q) {
  vnCheck();
  const item = findWord(q.word);
  if (!item) {
    console.warn("quiz word missing:", q.word);
    return;
  }
  if (q.who && CHAR[q.who]) vnSpriteSet(q.who);
  const correct = quizAnswerFor(item, q.form);
  const options = quizOptionsFor(item, q.form);
  VN.curA = correct;
  
  const jpEl = $("#vnQuizJp");
  const chEl = $("#vnChoices");
  jpEl.style.display = "";
  chEl.style.display = "";
  $("#vnSprite").style.opacity = 0.3;
  jpEl.innerHTML = escapeHtml(q.jp).replace("＿＿", '<span class="blank">＿＿</span>') + `<span class="en">${escapeHtml(q.en)}</span>`;
  $("#vnName").style.display = "none";
  $("#vnText").innerHTML = `<i style="color:var(--ink2)">Answer with the right form — ${escapeHtml(formJp(q.form))}…</i>`;
  $("#vnNext").style.visibility = "hidden";
  
  const picked = await new Promise(res => {
    VN._res = res;
    chEl.innerHTML = "";
    options.forEach(op => {
      const b = document.createElement("button");
      b.className = "choice";
      b.style.fontSize = "16px";
      b.style.padding = "13px 6px";
      b.textContent = op;
      b.addEventListener("click", () => {
        if (VN && VN._res) {
          const r = VN._res;
          VN._res = null;
          r(op);
        }
      });
      chEl.appendChild(b);
    });
  });
  
  vnCheck();
  const right = picked === correct;
  [...chEl.children].forEach(b => {
    b.disabled = true;
    if (b.textContent === correct) b.classList.add("right");
    if (b.textContent === picked && !right) b.classList.add("wrong");
  });
  
  jpEl.innerHTML = escapeHtml(q.jp).replace("＿＿", `<span class="blank" style="color:${right ? "var(--matcha)" : "var(--shu)"};border-color:currentColor;">${escapeHtml(correct)}</span>`) + `<span class="en">${escapeHtml(q.en)}</span>`;
  speak(q.jp.replace("＿＿", correct));
  srsBump("fsrs", q.form, right);
  
  if (right) {
    VN.gPts += 50;
    VN.score += 50;
    beep("ok");
    $("#vnText").innerHTML = "Correct! ✦";
    const rb = [...chEl.children].find(b => b.textContent === correct);
    if (rb) particleBurst(rb, 10, false);
  } else {
    VN.fails++;
    beep("no");
    vnYell();
    $("#vnText").innerHTML = `The right form was 「<b>${escapeHtml(correct)}</b>」.`;
  }
  
  updHud();
  $("#vnNext").style.visibility = "visible";
  await vnTap();
  vnCheck();
  jpEl.style.display = "none";
  chEl.style.display = "none";
  $("#vnSprite").style.opacity = 1;
  VN.curA = null;
}

/* ---- spell casting (battle + training share this) ---- */
function kanjiLoader(char, onComplete) {
  if (window.KANJI_STROKES && window.KANJI_STROKES[char]) return onComplete(window.KANJI_STROKES[char]);
  fetch("https://cdn.jsdelivr.net/gh/chanind/hanzi-writer-data-jp@latest/data/" + encodeURIComponent(char) + ".json")
    .then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(onComplete)
    .catch(() => toast("Couldn't load stroke data for " + char));
}

function writerSize(box) {
  const r = box.getBoundingClientRect();
  return Math.round(Math.min(r.width, r.height));
}

function makeWriter(box, char, opts) {
  [...box.children].forEach(ch => { if (!ch.classList.contains("stamp")) ch.remove(); });
  const s = writerSize(box);
  return HanziWriter.create(box, char, Object.assign({
    width: s, height: s, padding: 22,
    showCharacter: false,
    strokeColor: "#E9C868",
    outlineColor: "rgba(233,200,104,0.18)",
    drawingColor: "#fff",
    drawingWidth: 18,
    charDataLoader: kanjiLoader
  }, opts));
}

async function castKanji(k, battle) {
  vnCheck();
  VN.curK = k.c;
  const area = $("#vnWriterArea");
  const box = $("#vnWriterBox");
  area.style.display = "";
  $("#vnSprite").style.opacity = 0.25;
  $("#vnName").style.display = "none";
  $("#vnText").innerHTML = `Cast the sign! <b style="font-family:var(--disp)">${escapeHtml(k.m)}</b> 「${escapeHtml(k.r)}」 — from memory!`;
  $("#vnNext").style.visibility = "hidden";
  $("#vnWFeedback").textContent = "";
  speak(k.r.split("・")[0]);
  let mistakes = 0, revealed = false;
  const skipBtn = $("#vnSkip");
  if (skipBtn) {
    skipBtn.style.display = "none";
    skipBtn.onclick = () => {
      skipBtn.style.display = "none";
      const r = VN && VN._res;
      if (VN) VN._res = null;
      if (r) r({ revealed: true, s: { totalMistakes: 99 } });
    };
  }
  
  const sum = await new Promise(res => {
    VN._res = res;
    const w = makeWriter(box, k.c, { showOutline: false });
    w.quiz({
      leniency: 1.2,
      showHintAfterMisses: 999,
      onMistake: () => {
        if (!VN || VN.quit) return;
        mistakes++;
        beep("no");
        vnYell();
        if (mistakes >= 3 && !revealed) {
          revealed = true;
          if (battle) {
            VN.lives = Math.max(0, VN.lives - 1);
            updHud();
          }
          w.showOutline();
          $("#vnWFeedback").textContent = "The sign fades in softly — trace it!";
          $("#vnWFeedback").className = "k-feedback bad";
          if (skipBtn) skipBtn.style.display = "block";
        } else if (!revealed) {
          $("#vnWFeedback").textContent = `✕ ${3 - mistakes} ${3 - mistakes === 1 ? "miss" : "misses"} before the sign fades in`;
          $("#vnWFeedback").className = "k-feedback bad";
        }
      },
      onCorrectStroke: () => {
        if (!revealed) {
          $("#vnWFeedback").textContent = "✓";
          $("#vnWFeedback").className = "k-feedback";
          particleBurst(box, 4, false);
        }
      },
      onComplete: s => {
        if (skipBtn) skipBtn.style.display = "none";
        const r = VN && VN._res;
        if (VN) VN._res = null;
        if (r) r({ s, revealed });
      }
    });
  });
  
  vnCheck();
  srsBump("ksrs", k.c, !sum.revealed && sum.s.totalMistakes <= 2);
  const pts = sum.revealed ? 30 : Math.max(40, 100 - 15 * sum.s.totalMistakes);
  if (battle && sum.revealed) VN.fails++;
  VN.wPts += pts;
  VN.score += pts;
  updHud();
  
  if (!sum.revealed) {
    const stp = $("#vnStamp");
    stp.classList.remove("hit");
    void stp.offsetWidth;
    stp.classList.add("hit");
    beep("ok");
    box.classList.remove("cast");
    void box.offsetWidth;
    box.classList.add("cast");
    particleBurst(box, 18, true);
  }
  
  await new Promise(r => setTimeout(r, 950));
  $("#vnStamp").classList.remove("hit");
  box.classList.remove("cast");
  area.style.display = "none";
  $("#vnSprite").style.opacity = 1;
  VN.curK = null;
  vnCheck();
  return !sum.revealed && sum.s.totalMistakes <= 2;
}

async function vnSpell(idx) {
  return castKanji(VN.kanji[idx], true);
}

/* ---- classroom (no timer, ≤5 attempts per step) ---- */
async function vnWatch(k) {
  vnCheck();
  $("#vnName").style.display = "";
  $("#vnName").textContent = OTOME.teacher.name;
  $("#vnName").style.background = "";
  $("#vnName").style.color = "";
  $("#vnText").innerHTML = escapeHtml(OTOME.teacher.watch) + ` 「<b>${k.c}</b>・${escapeHtml(k.r)}」`;
  $("#vnNext").style.visibility = "hidden";
  
  const area = $("#vnWriterArea");
  area.style.display = "";
  $("#vnSprite").style.opacity = 0.25;
  $("#vnWFeedback").textContent = "watch the strokes…";
  $("#vnWFeedback").className = "k-feedback";
  
  await new Promise(res => {
    VN._res = res;
    const w = makeWriter($("#vnWriterBox"), k.c, { showCharacter: true, showOutline: false, strokeAnimationSpeed: 1.05, delayBetweenStrokes: 240 });
    setTimeout(() => w.animateCharacter({
      onComplete: () => setTimeout(() => {
        const r = VN && VN._res;
        if (VN) VN._res = null;
        if (r) r();
      }, 450)
    }), 250);
  });
  
  vnCheck();
  area.style.display = "none";
  $("#vnSprite").style.opacity = 1;
}

async function vnStep(k, mode) {
  const T = OTOME.teacher;
  const area = $("#vnWriterArea");
  await vnSay("teacher", (mode === "trace" ? T.trace : T.recall) + ` — 「${k.m}」`);
  
  for (let a = 1; a <= 5; a++) {
    vnCheck();
    VN.curK = k.c;
    area.style.display = "";
    $("#vnSprite").style.opacity = 0.25;
    $("#vnName").style.display = "none";
    $("#vnText").innerHTML = (mode === "trace" ? "Trace the guide" : "From memory") + `: <b>${escapeHtml(k.m)}</b> 「${escapeHtml(k.r)}」 <span style="color:var(--ink2)">— attempt ${a}/5</span>`;
    $("#vnNext").style.visibility = "hidden";
    $("#vnWFeedback").textContent = "";
    
    const s = await new Promise(res => {
      VN._res = res;
      const w = makeWriter($("#vnWriterBox"), k.c, { showOutline: mode === "trace" });
      w.quiz({
        leniency: 1.25,
        showHintAfterMisses: mode === "trace" ? 3 : 999,
        onMistake: () => {
          $("#vnWFeedback").textContent = "✕ order & direction, apprentice!";
          $("#vnWFeedback").className = "k-feedback bad";
          beep("no");
        },
        onCorrectStroke: () => {
          $("#vnWFeedback").textContent = "✓";
          $("#vnWFeedback").className = "k-feedback";
        },
        onComplete: x => {
          const r = VN && VN._res;
          if (VN) VN._res = null;
          if (r) r(x);
        }
      });
    });
    
    vnCheck();
    area.style.display = "none";
    $("#vnSprite").style.opacity = 1;
    
    if (s.totalMistakes <= 2) {
      const pts = s.totalMistakes === 0 ? 15 : 8;
      VN.wPts += pts;
      VN.score += pts;
      updHud();
      beep("ok");
      particleBurst($("#vnWriterBox"), 10, true);
      if (mode === "recall") srsBump("ksrs", k.c, a === 1);
      break;
    }
    
    if (mode === "recall" && a === 5) srsBump("ksrs", k.c, false);
    if (a < 5) await vnSay("teacher", pick(OTOME.teacher.retry));
    else await vnSay("teacher", "…We move on. But drill that sign in the Kanji studio later, apprentice.");
  }
  VN.curK = null;
}

async function classroom() {
  const T = OTOME.teacher;
  const ch = VN.ch;
  vnBgSet("academy");
  vnMusicPlay("academy");
  
  for (const line of T.intro) {
    await vnSay("teacher", line.replace("{CHAR}", ch.name));
  }
  
  const kc = $("#vnKcards");
  kc.style.display = "";
  kc.innerHTML = VN.kanji.map(k => `<div class="vn-kcard"><div class="kc">${k.c}</div><div class="km">${escapeHtml(k.m)}<br>${escapeHtml(k.r)}</div></div>`).join("");
  speak(VN.kanji[0].r.split("・")[0]);
  await vnSay("teacher", `Today's spell-signs: 「${VN.kanji[0].c}」 (${VN.kanji[0].m}) and 「${VN.kanji[1].c}」 (${VN.kanji[1].m}).`);
  kc.style.display = "none";
  
  for (const k of VN.kanji) {
    await vnWatch(k);
    await vnStep(k, "trace");
  }
  
  for (const k of VN.kanji) {
    await vnStep(k, "recall");
  }
  
  await vnSay("teacher", T.done.replace("{CHAR}", ch.name));
}

/* ---- scene player ---- */
async function playScenes(nodes) {
  for (const n of nodes) {
    vnCheck();
    if (n.bg) {
      vnBgSet(n.bg);
      continue;
    }
    if ("music" in n) {
      vnMusicPlay(n.music);
      continue;
    }
    if (n.quiz) {
      await vnQuiz(n.quiz);
      continue;
    }
    if ("spell" in n) {
      await vnSpell(n.spell);
      continue;
    }
    if (n.say) {
      await vnSay(n.who || "n", n.say, n.en);
    }
  }
}

/* ---- route lifecycle ---- */
export async function startRoute(id) {
  const ch = CHAR[id];
  VN = {
    ch,
    kanji: routeKanji(ch),
    fails: 0,
    lives: 2,
    score: 0,
    gPts: 0,
    wPts: 0,
    quit: false,
    yellIdx: 0,
    stage: "class",
    _tap: null,
    _res: null
  };
  
  $("#vn").classList.add("on");
  $("#vnQuizJp").style.display = "none";
  $("#vnChoices").style.display = "none";
  $("#vnWriterArea").style.display = "none";
  $("#vnKcards").style.display = "none";
  $("#vnEnding").classList.remove("on");
  
  updHud();
  vnSpriteSet(id);
  vnBgSet("academy");
  
  try {
    await classroom();
    VN.stage = "story";
    await playScenes(ch.intro);
    VN.stage = "battle";
    await playScenes(ch.trouble);
    await finishRoute();
  } catch (e) {
    if (e !== "quit") console.error(e);
  }
}

function outcomeOf(v) {
  const total = v.ch.intro.filter(n => n.quiz).length + 2;
  if (v.fails === 0) return "love";
  if (v.fails >= Math.ceil(total / 2)) return "fail";
  return "friend";
}

function applyOutcome(v, outcome) {
  const cur = charState(v.ch.id).st;
  const st = outcome === "love" ? "love" : outcome === "friend" ? "friend" : (cur === "bw" ? "sealed" : "bw");
  setCharState(v.ch.id, { st, played: todayStr() });
  
  const stx = LS.get("stats") || { r: 0, w: 0 };
  stx.r += Math.round(v.gPts / 50);
  stx.w += v.fails;
  LS.set("stats", stx);
  
  state.dayRec.sB = Math.min(6000, state.dayRec.sB + v.gPts);
  state.dayRec.kB = Math.min(1000, state.dayRec.kB + v.wPts);
  
  LS.set("day:" + todayStr(), state.dayRec);
  bumpStreak();
  
  if (state.beReady) {
    bePostScore("sprint", state.dayRec.sB);
    bePostScore("kanji", state.dayRec.kB);
  }
  return st;
}

async function finishRoute() {
  const v = VN;
  const outcome = outcomeOf(v);
  await playScenes(v.ch.endings[outcome]);
  applyOutcome(v, outcome);
  
  const oc = outcome === "love" ? { t: "💘 A Heart Won!", c: "var(--rose)" }
           : outcome === "friend" ? { t: "🤝 Friends… for now", c: "var(--vio)" }
           : { t: "💔 Rejected", c: "var(--ink2)" };
           
  $("#vnEndCard").innerHTML = `
    <div style="font-size:44px;">${v.ch.img ? `<img src="${v.ch.img}" style="height:80px;border-radius:16px;${outcome === "fail" ? "filter:grayscale(1);" : ""}">` : v.ch.icon}</div>
    <div class="big-oc" style="color:${oc.t}">${oc.t}</div>
    <p class="sub" style="margin-bottom:12px;">${escapeHtml(v.ch.name)} · fails: ${v.fails} · grammar +${v.gPts} · writing +${v.wPts}</p>
    <div class="res-score" style="padding:0 0 10px;"><div class="n" style="font-size:44px;">${v.score}</div><div class="k">route score</div></div>
    <button class="btn" id="vnEndBtn">Return to the Academy ✦</button>`;
    
  $("#vnEnding").classList.add("on");
  if (outcome === "love") burstHearts();
  vnMusicPlay(null);
  $("#vnEndBtn").addEventListener("click", () => closeVN());
}

function burstHearts() {
  const st = $("#vnEnding");
  for (let i = 0; i < 12; i++) {
    const h = document.createElement("div");
    h.className = "heartburst";
    h.textContent = pick(["⚜️", "👑", "✨", "✦", "💖"]);
    h.style.left = (10 + Math.random() * 80) + "%";
    h.style.top = (35 + Math.random() * 40) + "%";
    h.style.animationDelay = (Math.random() * 0.9) + "s";
    st.appendChild(h);
    setTimeout(() => h.remove(), 2300);
  }
}

function closeVN() {
  vnMusicPlay(null);
  $("#vn").classList.remove("on");
  VN = null;
  showScreen("home");
}

/* =========================================================
   SPACED REPETITION
   ========================================================= */
const SRS_IV = [4 * 3600000, 86400000, 3 * 86400000, 7 * 86400000, 14 * 86400000, 30 * 86400000];

export function srsBump(kind, key, ok) {
  const m = LS.get(kind) || {};
  const r = m[key] || { s: 0, t: 0 };
  r.s = ok ? Math.min(5, r.s + 1) : Math.max(0, r.s - 2);
  r.t = Date.now();
  m[key] = r;
  LS.set(kind, m);
}

export function srsDue(kind, key) {
  const r = (LS.get(kind) || {})[key];
  if (!r) return 9 + Math.random(); // never seen → top priority
  return (Date.now() - r.t) / SRS_IV[r.s]; // overdue ratio
}

export function srsPickKanji(n, lvl) {
  const pool = window.KANJI_LIST.filter(k => !lvl || k.l === lvl);
  return shuffle(pool.slice(), mulberry32(Date.now() >>> 0))
    .sort((a, b) => srsDue("ksrs", b.c) - srsDue("ksrs", a.c)).slice(0, n);
}

function declPhrases() {
  const out = [];
  OTOME.characters.forEach(c => c.intro.forEach(nd => {
    if (nd.quiz) out.push(Object.assign({ who: c.id }, nd.quiz));
  }));
  return out;
}

export function srsPickForms(n, chosen) {
  const all = declPhrases();
  let pool = (chosen && chosen.length) ? all.filter(p => chosen.includes(p.form)) : all.slice();
  if (!pool.length) pool = all.slice();
  pool = shuffle(pool, mulberry32(Date.now() >>> 0));
  if (!chosen || !chosen.length) pool.sort((a, b) => srsDue("fsrs", b.form) - srsDue("fsrs", a.form));
  const res = [];
  for (let i = 0; res.length < n; i++) res.push(pool[i % pool.length]);
  return res;
}

export function routeKanji(ch) {
  const rnd = mulberry32(hashStr(todayStr() + "::" + ch.id));
  return [pick(window.KANJI_LIST.filter(k => k.l === 5), rnd), pick(window.KANJI_LIST.filter(k => k.l === 4), rnd)];
}

/* =========================================================
   TRAINING HALL
   ========================================================= */
export async function startTraining(kind, opts) {
  const host = CHAR[todayRoster()[0]] || OTOME.characters[0];
  VN = {
    training: true,
    kind,
    ch: host,
    kanji: [],
    fails: 0,
    lives: 2,
    score: 0,
    gPts: 0,
    wPts: 0,
    quit: false,
    yellIdx: 0,
    stage: "train",
    clean: 0,
    total: 0,
    _tap: null,
    _res: null
  };
  
  $("#vn").classList.add("on");
  $("#vnQuizJp").style.display = "none";
  $("#vnChoices").style.display = "none";
  $("#vnWriterArea").style.display = "none";
  $("#vnKcards").style.display = "none";
  $("#vnEnding").classList.remove("on");
  
  updHud();
  vnSpriteSet("teacher");
  vnBgSet("academy");
  vnMusicPlay("academy");
  const T = OTOME.teacher;
  
  try {
    if (kind === "kanji") {
      await vnSay("teacher", T.train.introK);
      const set = srsPickKanji(opts.n, opts.lvl);
      VN.total = set.length;
      for (let i = 0; i < set.length; i++) {
        const k = set[i];
        await vnSay("teacher", `Sign ${i + 1} of ${set.length}: 「${k.m}」（${k.r}）. Cast!`);
        if (await castKanji(k, false)) VN.clean++;
      }
    } else {
      await vnSay("teacher", T.train.introF);
      const qs = srsPickForms(opts.n, opts.forms);
      VN.total = qs.length;
      for (const q of qs) await vnQuiz(q);
      VN.clean = VN.total - VN.fails;
    }
    await vnSay("teacher", T.train.done);
    trainingEnd();
  } catch (err) {
    if (err !== "quit") console.error(err);
  }
}

function trainingEnd() {
  const v = VN;
  $("#vnEndCard").innerHTML = `
    <div style="font-size:44px;">${OTOME.teacher.img ? `<img src="${OTOME.teacher.img}" style="height:80px;border-radius:16px;">` : OTOME.teacher.icon}</div>
    <div class="big-oc" style="color:var(--gold)">Training complete ✦</div>
    <p class="sub" style="margin-bottom:12px;">${v.kind === "kanji" ? "Signs cast cleanly" : "Declarations delivered"}: <b style="color:var(--gold)">${v.clean}/${v.total}</b><br>The arcana recorded everything — weak ${v.kind === "kanji" ? "signs" : "forms"} will return sooner.</p>
    <div class="res-score" style="padding:0 0 10px;"><div class="n" style="font-size:44px;">${v.score}</div><div class="k">practice score</div></div>
    <button class="btn gold" id="vnEndBtn">Leave the hall ✦</button>`;
  $("#vnEnding").classList.add("on");
  vnMusicPlay(null);
  $("#vnEndBtn").addEventListener("click", () => {
    closeVN();
    showScreen("practice");
  });
}

export function formJp(f) {
  return FORM[f] ? FORM[f].jp : (f === "dict" ? "辞書形" : "形容詞・現在");
}
