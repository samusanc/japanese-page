import { state } from './state.js';
import { FORM, TYPE_LABEL, SENTENCES } from './data.js';
import { LS, $, $$, escapeHtml, todayStr, mulberry32, hashStr, toast } from './helpers.js';
import { speak, spkBtn, beep } from './audio.js';
import { makePool } from './engine.js';
import { bePostScore } from './config.js';
import { showScreen, bumpStreak } from './app.js';
import { INTRO_SCENES, QUESTION_PROMPTS } from './scenes.js';

const gameEl = () => $("#game");
let timerIv = null;

export function startDaily(charId = 'ren') {
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

  runGame({ mode: "daily", qs: makePool(dailySeedForms(), 80, rnd), timed: true }, charId);
}

export function startPractice() {
  const sel = $$("#chipsVerb .chip.on, #chipsAdj .chip.on").map(c => c.dataset.f);
  if (!sel.length) {
    toast("Pick at least one form");
    return;
  }
  const len = +($("#chipsLen .chip.on")?.dataset.len || 15);
  runGame({ mode: "practice", qs: makePool(sel, len, null), timed: true }, 'ren');
}

export function runGame(cfg, charId = 'ren') {
  state.G = { 
    ...cfg, 
    score: 0, 
    right: 0, 
    wrong: 0, 
    combo: 0, 
    bestCombo: 0, 
    misses: [], 
    over: false, 
    lock: true, 
    triggeredHalf: false,
    scenesList: [],
    sceneIndex: 0,
    partnerCharId: charId
  };
  
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

  // Get character details
  const charData = QUESTION_PROMPTS[charId] || QUESTION_PROMPTS.ren;
  const partnerName = charData.name;
  
  // 1. Build teacher / intro dialogues from Scene JSON
  const introList = INTRO_SCENES[cfg.mode] || INTRO_SCENES.practice;
  introList.forEach(step => {
    state.G.scenesList.push({
      type: "dialogue",
      speaker: step.speaker,
      text_ja: step.text_ja.replace("{partnerName}", partnerName),
      text_en: step.text_en.replace("{partnerName}", partnerName),
      png: step.png || "./placeholder.png",
      bg: step.bg || "bg-classroom",
      sound: step.sound || ""
    });
  });
  
  // 2. Add Countdown step
  state.G.scenesList.push({
    type: "countdown",
    bg: charData.bg || "bg-dojo",
    png: charData.png || "./placeholder.png",
    speaker: partnerName
  });
  
  // 3. Add conjugation question steps dynamically resolved from templates
  cfg.qs.forEach((q) => {
    const mean = cfg.mode === "daily" ? q.item.m.split("⚠")[0].trim() : q.item.m;
    const wordDisplay = q.item.k === q.item.r ? `<span class="otome-word">${q.item.k}</span>` : `<span class="otome-word">${q.item.k}</span>（${q.item.r}）`;
    const typeDisplay = cfg.mode === "practice" ? `［${TYPE_LABEL[q.item.t]}］` : "";

    const wordDisplayEn = q.item.k === q.item.r ? `<span class="otome-word">${q.item.k}</span>` : `<span class="otome-word">${q.item.k}</span> (${q.item.r})`;
    const typeDisplayEn = cfg.mode === "practice" ? ` [${TYPE_LABEL[q.item.t]}]` : "";

    // Calculate a unique hash to pick a prompt template stably
    let hash = 0;
    const seedString = q.item.k + q.fid;
    for (let idx = 0; idx < seedString.length; idx++) {
      hash = (hash * 31 + seedString.charCodeAt(idx)) | 0;
    }
    const prompts = charData.prompts;
    const promptIdx = Math.abs(hash) % prompts.length;
    const promptTemplate = prompts[promptIdx];

    // Format templates
    const textJa = promptTemplate.text_ja
      .replace("{wordDisplay}", wordDisplay)
      .replace("{mean}", mean)
      .replace("{formJp}", FORM[q.fid].jp)
      .replace("{formEn}", FORM[q.fid].en)
      .replace("{typeDisplay}", typeDisplay);

    const textEn = promptTemplate.text_en
      .replace("{wordDisplayEn}", wordDisplayEn)
      .replace("{mean}", mean)
      .replace("{formJp}", FORM[q.fid].jp)
      .replace("{formEn}", FORM[q.fid].en)
      .replace("{typeDisplayEn}", typeDisplayEn);

    state.G.scenesList.push({
      type: "question",
      speaker: partnerName,
      text_ja: textJa,
      text_en: textEn,
      png: charData.png || "./placeholder.png",
      bg: charData.bg || "bg-dojo",
      choices: q.options,
      correct: q.correct,
      questionObj: q
    });
  });

  // Launch unified engine loop
  executeSceneStep();
}

export function executeSceneStep() {
  if (!state.G || state.G.over) return;
  
  const stepIdx = state.G.sceneIndex;
  const steps = state.G.scenesList;
  
  if (stepIdx >= steps.length) {
    endGame();
    return;
  }
  
  const step = steps[stepIdx];
  
  // Update background wrapper gradient
  const gameBg = $("#gameBg");
  if (gameBg) {
    gameBg.className = "game-bg";
    if (step.bg) gameBg.classList.add(step.bg);
  }
  
  // Update character portrait
  const charImg = $("#gameCharImg");
  if (charImg) {
    charImg.src = step.png || "./placeholder.png";
    if (state.G.partnerCharId === "sora" && step.speaker === "Sora") {
      charImg.style.filter = "hue-rotate(240deg) brightness(0.95) saturate(1.1)";
    } else {
      charImg.style.filter = "";
    }
  }
  
  // Set speaker name plate
  const speakerName = $("#gameSpeakerName");
  if (speakerName) {
    speakerName.textContent = step.speaker || "";
  }
  
  // Clear any result overlay elements from previous round
  $("#stamp").classList.remove("hit");
  $("#floatpts").classList.remove("go");
  $("#explain").style.display = "none";
  $("#btnNext").style.display = "none";
  
  if (step.type === "dialogue") {
    // Show VN dialogues style (Tap to continue)
    $("#gameTapHint").style.display = "flex";
    $("#choices").style.display = "none";
    $("#choices").innerHTML = "";
    
    const dialogueText = $("#gameDialogueText");
    if (dialogueText) {
      dialogueText.innerHTML = `
        <div class="dialogue-ja">${step.text_ja}</div>
        <div class="dialogue-en">${step.text_en}</div>
      `;
    }
    $("#gameDialogueText").classList.remove("show-translation");
    
    // Play dialogue audio if specified
    if (step.sound) {
      speak(step.sound);
    }
    
    state.G.lock = false;
  }
  else if (step.type === "countdown") {
    // Hide inputs/hints during countdown
    $("#gameTapHint").style.display = "none";
    $("#choices").style.display = "none";
    $("#choices").innerHTML = "";
    
    const dialogueText = $("#gameDialogueText");
    if (dialogueText) {
      dialogueText.innerHTML = `<div class="dialogue-ja" style="text-align:center; font-weight:900; font-size:18px;">準備はいいですか？</div>`;
    }
    
    _beginCountdown();
  }
  else if (step.type === "question") {
    // Show multiple-choice buttons
    $("#gameTapHint").style.display = "none";
    $("#choices").style.display = "grid";
    
    const dialogueText = $("#gameDialogueText");
    if (dialogueText) {
      dialogueText.innerHTML = `
        <div class="dialogue-ja">${step.text_ja}</div>
        <div class="dialogue-en">${step.text_en}</div>
      `;
    }
    $("#gameDialogueText").classList.remove("show-translation");
    
    // Render the choices
    const ch = $("#choices");
    ch.innerHTML = "";
    step.choices.forEach(op => {
      const b = document.createElement("button");
      b.className = "choice";
      b.textContent = op;
      b.addEventListener("click", () => onAnswer(b, op, step));
      ch.appendChild(b);
    });
    
    state.G.lock = false;
  }
}

function _beginCountdown() {
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
      state.G.sceneIndex++; // Advance past the countdown scene
      executeSceneStep();
      if (state.G.timed) startTimer();
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

export function onAnswer(btn, op, step) {
  if (!state.G || state.G.lock || state.G.over) return;
  state.G.lock = true;
  const q = step.questionObj;
  const isRight = op === step.correct;
  
  $$("#choices .choice").forEach(b => {
    b.disabled = true;
    if (b.textContent === step.correct) b.classList.add("right");
  });
  
  speak(step.correct);
  
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
        state.G.sceneIndex++;
        executeSceneStep();
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
          state.G.sceneIndex++;
          executeSceneStep();
        }
      }, 900);
    } else {
      showExplain(step);
    }
  }
}

export function showExplain(step) {
  const e = $("#explain");
  const q = step.questionObj;
  const s = SENTENCES[q.fid];
  e.innerHTML = `Correct: <b>${step.correct}</b> ${spkBtn(step.correct)} — ${escapeHtml(q.item.k)} is a <b>${TYPE_LABEL[q.item.t]}</b>.<br><br>${escapeHtml(FORM[q.fid].rule).replace(/\n/g, "<br>")}` +
    (s ? `<div class="sentence" style="margin-top:10px;"><div class="jp"><span>${escapeHtml(s.jp).replace(escapeHtml(s.hi), "<b>" + escapeHtml(s.hi) + "</b>")}</span>${spkBtn(s.jp)}</div><div class="en">${escapeHtml(s.en)}</div></div>` : "");
  e.style.display = "block";
  const nb = $("#btnNext");
  nb.style.display = "block";
  nb.onclick = () => {
    if (state.G) {
      state.G.sceneIndex++;
      executeSceneStep();
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
  $("#btnDaily").addEventListener("click", (e) => {
    // Default to Ren for standard button click
    startDaily('ren');
  });
  $("#btnPractice").addEventListener("click", startPractice);

  // Unified dialogue progression click handler
  $("#qcard").addEventListener("click", (e) => {
    if (!state.G || state.G.lock || state.G.over) return;
    
    // Ensure we don't handle clicks that were meant for choices, floatpts, nextbtn etc.
    if (e.target.closest("#choices") || e.target.closest("#explain") || e.target.closest("#btnNext") || e.target.closest(".explain") || e.target.closest(".nextbtn") || e.target.closest("#count")) {
      return;
    }
    
    const step = state.G.scenesList[state.G.sceneIndex];
    if (!step) return;
    
    if (step.type === "dialogue") {
      state.G.lock = true;
      state.G.sceneIndex++;
      executeSceneStep();
    } else if (step.type === "question") {
      $("#gameDialogueText").classList.toggle("show-translation");
    }
  });
}
