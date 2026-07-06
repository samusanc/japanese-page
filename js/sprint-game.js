import { state } from './state.js';
import { FORM, TYPE_LABEL, SENTENCES } from './data.js';
import { LS, $, $$, escapeHtml, todayStr, mulberry32, hashStr, toast } from './helpers.js';
import { speak, spkBtn, beep } from './audio.js';
import { makePool } from './engine.js';
import { bePostScore } from './config.js';
import { showScreen, bumpStreak } from './app.js';

const gameEl = () => $("#game");
let timerIv = null;

export function startDaily() {
  if (state.dayRec.sU >= 2 && !state.debugMode) {
    toast("No tries left today");
    return;
  }
  if (!state.debugMode) {
    state.dayRec.sU++;
    LS.set("day:" + todayStr(), state.dayRec);
  }
  const rnd = mulberry32(hashStr(todayStr() + "::katsuyo"));
  
  const dailySeedForms = () => {
    const DAILY_FORM_POOL = ["te","ta","nai","masu","tai","pot","vol","ba","tara","imp","aneg","apast","ate"];
    const rndForms = mulberry32(hashStr(todayStr() + "forms"));
    const shuf = (arr, r) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    return shuf(DAILY_FORM_POOL, rndForms).slice(0, 5);
  };

  runGame({ mode: "daily", qs: makePool(dailySeedForms(), 80, rnd), timed: true });
}

export function startPractice() {
  const sel = $$("#chipsVerb .chip.on, #chipsAdj .chip.on").map(c => c.dataset.f);
  if (!sel.length) {
    toast("Pick at least one form");
    return;
  }
  const len = +($("#chipsLen .chip.on")?.dataset.len || 15);
  runGame({ mode: "practice", qs: makePool(sel, len, null), timed: true });
}

export function runGame(cfg) {
  state.G = { ...cfg, i: 0, score: 0, right: 0, wrong: 0, combo: 0, bestCombo: 0, misses: [], over: false, lock: true, triggeredHalf: false };
  $("#gScore").textContent = "0";
  $("#gCombo").textContent = "";
  $("#timerwrap").style.visibility = cfg.timed ? "visible" : "hidden";
  const bar = $("#timerbar");
  bar.style.width = "100%";
  bar.classList.remove("low");
  gameEl().classList.add("on");
  
  const bubble = $("#charBubble");
  if (bubble) {
    bubble.classList.remove("show");
    bubble.textContent = "";
  }
  
  const cEl = $("#count");
  const nEl = $("#countN");
  cEl.classList.add("on");
  
  let c = 3;
  nEl.textContent = c;
  const iv = setInterval(() => {
    c--;
    if (c <= 0) {
      clearInterval(iv);
      cEl.classList.remove("on");
      state.G.lock = false;
      renderQ();
      if (cfg.timed) startTimer();
    } else {
      nEl.textContent = c;
      nEl.style.animation = "none";
      void nEl.offsetWidth;
      nEl.style.animation = "pop .8s ease";
    }
  }, 800);
}

export function startTimer() {
  const t0 = Date.now();
  timerIv = setInterval(() => {
    if (!state.G) {
      clearInterval(timerIv);
      return;
    }
    const rem = 60 - (Date.now() - t0) / 1000;
    const bar = $("#timerbar");
    bar.style.width = Math.max(0, (rem / 60) * 100) + "%";
    if (rem <= 10) bar.classList.add("low");
    if (rem <= 30 && !state.G.triggeredHalf) {
      state.G.triggeredHalf = true;
      triggerHalfDialogue();
    }
    if (rem <= 0) {
      clearInterval(timerIv);
      endGame();
    }
  }, 100);
}

export function triggerHalfDialogue() {
  const phrases = [
    "どうしたの？時間がなくなっちゃうよ…",
    "ねえ、まだ終わらないの？待たせないでよ。",
    "焦らさないで、早く君の答えを聞かせて？",
    "ちょっと、難しすぎる？手伝ってあげようか？",
    "時間、半分しかないよ？君ならできるって信じてるけど…"
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const bubble = $("#charBubble");
  if (bubble) {
    bubble.textContent = phrase;
    bubble.classList.add("show");
  }
}

export function renderQ() {
  if (!state.G) return;
  const q = state.G.qs[state.G.i];
  if (!q) {
    endGame();
    return;
  }
  $("#qForm").textContent = FORM[q.fid].jp;
  $("#qFormEn").textContent = FORM[q.fid].en;
  $("#qWord").textContent = q.item.k;
  $("#qKana").textContent = q.item.r;
  $("#qKana").style.display = q.item.k === q.item.r ? "none" : "";
  $("#qMean").textContent = state.G.mode === "daily" ? q.item.m.split("⚠")[0].trim() : q.item.m;
  $("#qType").textContent = TYPE_LABEL[q.item.t];
  $("#qType").style.display = state.G.mode === "practice" ? "" : "none";
  $("#qSpk").innerHTML = state.G.mode === "practice" ? spkBtn(q.item.r) : "";
  $("#explain").style.display = "none";
  $("#btnNext").style.display = "none";

  // Dialogue construction for Otome theme (Japanese and English Translation)
  const mean = state.G.mode === "daily" ? q.item.m.split("⚠")[0].trim() : q.item.m;
  const wordDisplay = q.item.k === q.item.r ? `<span class="otome-word">${q.item.k}</span>` : `<span class="otome-word">${q.item.k}</span>（${q.item.r}）`;
  const typeDisplay = state.G.mode === "practice" ? `［${TYPE_LABEL[q.item.t]}］` : "";

  const wordDisplayEn = q.item.k === q.item.r ? `<span class="otome-word">${q.item.k}</span>` : `<span class="otome-word">${q.item.k}</span> (${q.item.r})`;
  const typeDisplayEn = state.G.mode === "practice" ? ` [${TYPE_LABEL[q.item.t]}]` : "";

  const promptsJa = [
    `ねえ、${wordDisplay}（意味: 「${mean}」）を<span class="otome-form">${FORM[q.fid].jp}</span>（${FORM[q.fid].en}）にしてくれる？${typeDisplay}`,
    `${wordDisplay}（意味: 「${mean}」）の<span class="otome-form">${FORM[q.fid].jp}</span>（${FORM[q.fid].en}）形が分からないんだ。教えて！${typeDisplay}`,
    `${wordDisplay}（意味: 「${mean}」）の<span class="otome-form">${FORM[q.fid].jp}</span>（${FORM[q.fid].en}）形、知ってる？${typeDisplay}`,
    `${wordDisplay}（意味: 「${mean}」）を<span class="otome-form">${FORM[q.fid].jp}</span>（${FORM[q.fid].en}）形に活用してみよう！${typeDisplay}`
  ];

  const promptsEn = [
    `Hey, can you help me conjugate ${wordDisplayEn} ("${mean}") into the <span class="otome-form">${FORM[q.fid].jp}</span> (${FORM[q.fid].en})?${typeDisplayEn}`,
    `I'm stuck on this one! What is ${wordDisplayEn} ("${mean}") in the <span class="otome-form">${FORM[q.fid].jp}</span> (${FORM[q.fid].en})?${typeDisplayEn}`,
    `Do you know the <span class="otome-form">${FORM[q.fid].jp}</span> (${FORM[q.fid].en}) form of ${wordDisplayEn} ("${mean}")?${typeDisplayEn}`,
    `Let's see if we can conjugate ${wordDisplayEn} ("${mean}") to the <span class="otome-form">${FORM[q.fid].jp}</span> (${FORM[q.fid].en})!${typeDisplayEn}`
  ];

  let hash = 0;
  const seedString = q.item.k + q.fid;
  for (let idx = 0; idx < seedString.length; idx++) {
    hash = (hash * 31 + seedString.charCodeAt(idx)) | 0;
  }
  const promptIdx = Math.abs(hash) % promptsJa.length;

  $("#qDialogue").innerHTML = `
    <div class="dialogue-ja">${promptsJa[promptIdx]}</div>
    <div class="dialogue-en">${promptsEn[promptIdx]}</div>
  `;
  $("#qDialogue").classList.remove("show-translation");
  
  const ch = $("#choices");
  ch.innerHTML = "";
  q.options.forEach(op => {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = op;
    b.addEventListener("click", () => onAnswer(b, op, q));
    ch.appendChild(b);
  });
  state.G.lock = false;
}

export function onAnswer(btn, op, q) {
  if (!state.G || state.G.lock || state.G.over) return;
  state.G.lock = true;
  const isRight = op === q.correct;
  $$("#choices .choice").forEach(b => {
    b.disabled = true;
    if (b.textContent === q.correct) b.classList.add("right");
  });
  speak(q.correct);
  if (isRight) {
    btn.classList.add("right");
    state.G.combo++;
    state.G.bestCombo = Math.max(state.G.bestCombo, state.G.combo);
    const pts = 100 + Math.min(5, state.G.combo - 1) * 20;
    state.G.score += pts;
    state.G.right++;
    $("#gScore").textContent = state.G.score;
    $("#gCombo").textContent = state.G.combo > 1 ? `COMBO ×${state.G.combo} 🔥` : "";
    
    const st = $("#stamp");
    st.classList.remove("hit");
    void st.offsetWidth;
    st.classList.add("hit");
    
    const fp = $("#floatpts");
    fp.textContent = "+" + pts;
    fp.classList.remove("go");
    void fp.offsetWidth;
    fp.classList.add("go");
    
    beep("ok");
    setTimeout(() => {
      if (state.G && !state.G.over) {
        state.G.i++;
        nextStep();
      }
    }, state.G.timed ? 420 : 600);
  } else {
    btn.classList.add("wrong");
    state.G.combo = 0;
    state.G.wrong++;
    $("#gCombo").textContent = "";
    state.G.misses.push(q);
    beep("no");
    if (navigator.vibrate) navigator.vibrate(60);
    if (state.G.timed) {
      setTimeout(() => {
        if (state.G && !state.G.over) {
          state.G.i++;
          nextStep();
        }
      }, 900);
    } else {
      showExplain(q);
    }
  }
}

export function nextStep() {
  $("#stamp").classList.remove("hit");
  renderQ();
}

export function showExplain(q) {
  const e = $("#explain");
  const s = SENTENCES[q.fid];
  e.innerHTML = `Correct: <b>${q.correct}</b> ${spkBtn(q.correct)} — ${escapeHtml(q.item.k)} is a <b>${TYPE_LABEL[q.item.t]}</b>.<br><br>${escapeHtml(FORM[q.fid].rule).replace(/\n/g, "<br>")}` +
    (s ? `<div class="sentence" style="margin-top:10px;"><div class="jp"><span>${escapeHtml(s.jp).replace(escapeHtml(s.hi), "<b>" + escapeHtml(s.hi) + "</b>")}</span>${spkBtn(s.jp)}</div><div class="en">${escapeHtml(s.en)}</div></div>` : "");
  e.style.display = "block";
  const nb = $("#btnNext");
  nb.style.display = "block";
  nb.onclick = () => {
    if (state.G) {
      state.G.i++;
      $("#stamp").classList.remove("hit");
      renderQ();
    }
  };
}

export async function endGame(quit) {
  if (!state.G || state.G.over) return;
  state.G.over = true;
  clearInterval(timerIv);
  beep("end");
  
  const bubble = $("#charBubble");
  if (bubble) bubble.classList.remove("show");
  
  const { mode, score, right, wrong, bestCombo, misses } = state.G;
  const st = LS.get("stats") || { r: 0, w: 0 };
  st.r += right;
  st.w += wrong;
  LS.set("stats", st);
  
  let postLine = "";
  if (mode === "daily") {
    if (state.debugMode) {
      postLine = "Debug mode: Score not saved or uploaded.";
      toast("Debug mode active: Results ignored.");
    } else {
      state.dayRec.sB = Math.max(state.dayRec.sB, score);
      LS.set("day:" + todayStr(), state.dayRec);
      bumpStreak();
      if (state.beReady) {
        const ok = await bePostScore("sprint", state.dayRec.sB);
        postLine = ok ? (state.profile?.g ? `Posted to squad <b>${state.profile.g}</b> ✓` : `Saved online ✓ — <a href="#" id="resJoinLink" style="color:var(--ai);font-weight:700;">join a squad</a> to compete!`) : "Couldn't reach the server — saved on this device.";
      } else {
        postLine = "Saved on this device (solo mode).";
      }
    }
  } else {
    postLine = "Practice run complete.";
  }
  
  gameEl().classList.remove("on");
  $("#resScore").textContent = score;
  $("#resKind").textContent = mode === "daily" ? "⚡ Grammar sprint" : "Practice run";
  $("#resRight").textContent = right;
  $("#resRightK").textContent = "Correct";
  $("#resWrong").textContent = wrong;
  $("#resWrongK").textContent = "Missed";
  $("#resCombo").textContent = "×" + bestCombo;
  $("#resComboK").textContent = "Best combo";
  $("#resPostLine").innerHTML = postLine + (quit ? "<br>(ended early — the try was still used)" : "");
  $("#resListTitle").textContent = "Review your misses";
  $("#resList").innerHTML = misses.length
    ? misses.map(q => `<div class="wl-row bad"><span>${escapeHtml(q.item.k)}（${q.item.r}）→ ${FORM[q.fid].jp}</span><span class="a">${q.correct}</span></div>`).join("")
    : '<div class="empty">Perfect run — nothing missed! 🎉</div>';
  
  const again = $("#btnResAgain");
  if (mode === "daily") {
    const left = 2 - state.dayRec.sU;
    again.disabled = !state.debugMode && left <= 0;
    again.textContent = state.debugMode ? "Play again (debug) ▶" : (left > 0 ? "Use last try ▶" : "No tries left");
    again.onclick = () => {
      showScreen("home");
      startDaily();
    };
  } else {
    again.disabled = false;
    again.textContent = "Drill again ▶";
    again.onclick = () => {
      showScreen("practice");
      startPractice();
    };
  }
  showScreen("result");
  const jl = $("#resJoinLink");
  if (jl) jl.addEventListener("click", e => { e.preventDefault(); showScreen("group"); });
  state.G = null;
}

export function initSprintGameUI() {
  $("#btnQuit").addEventListener("click", () => {
    if (state.G && !state.G.over && state.G.mode === "daily") {
      endGame(true);
    } else {
      clearInterval(timerIv);
      gameEl().classList.remove("on");
      state.G = null;
      showScreen("home");
    }
  });

  $("#btnResHome").addEventListener("click", () => showScreen("home"));
  $("#btnDaily").addEventListener("click", startDaily);
  $("#btnPractice").addEventListener("click", startPractice);

  // Dialogue tap-to-translate event listener
  $("#qcard").addEventListener("click", () => {
    $("#qDialogue").classList.toggle("show-translation");
  });
}
