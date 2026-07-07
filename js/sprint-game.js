import { state } from './state.js';
import { FORM, TYPE_LABEL, SENTENCES, VERBS, ADJS } from './data.js';
import { LS, $, $$, escapeHtml, todayStr, mulberry32, hashStr, toast, shuffle } from './helpers.js';
import { speak, spkBtn, beep } from './audio.js';
import { makeWriter } from './kanji-logic.js';
import { buildQuestion } from './engine.js';
import { bePostScore } from './config.js';
async function appShowScreen(screenId) {
  const app = await import('./app.js');
  app.showScreen(screenId);
}

async function appRenderHome() {
  const app = await import('./app.js');
  app.renderHome();
}
import { dailyKanjiSet } from './kanji-game.js';
import { CHARACTERS, STORIES } from './stories.js';

const gameEl = () => $("#game");
let activeWriter = null;

export function startVnGame(charId) {
  // Determine daily active kanjis for this character
  const CHAR_KEYS = ["prince", "knight", "earl", "archduke", "duchess"];
  const seedRnd = mulberry32(hashStr(todayStr() + "char-seed"));
  const activeChars = shuffle(CHAR_KEYS, seedRnd).slice(0, 3);
  const charIdx = activeChars.indexOf(charId);
  const dailySet = dailyKanjiSet();
  
  // 2 kanjis per character based on daily active index
  const myKanjis = [
    dailySet[(charIdx * 2) % 6],
    dailySet[(charIdx * 2 + 1) % 6]
  ];

  state.G = {
    charId,
    myKanjis,
    stage: "classroom",
    step: 0,
    score: 0,
    failures: 0,
    lives: 2,
    retries: 0,
    over: false
  };

  $("#vnScore").textContent = "0 pts";
  $("#vnLives").style.display = "none";
  gameEl().classList.add("on");
  
  // Hide all panels initially
  $$(".vn-panel").forEach(p => p.style.display = "none");
  
  runClassroom();
}

// =========================================================
// STAGE 1: KANJI CLASSROOM
// =========================================================
function runClassroom() {
  const charData = CHARACTERS[state.G.charId];
  const storyData = STORIES[state.G.charId];
  const kanjis = state.G.myKanjis;
  
  $("#pnlClassroom").style.display = "flex";
  $("#classCanvasCard").style.display = "none";
  $("#btnClassroomStart").style.display = "block";
  
  // Classroom Intro
  $("#teacherText").textContent = storyData.classroomIntro;
  
  $("#btnClassroomStart").onclick = () => {
    $("#btnClassroomStart").style.display = "none";
    $("#classCanvasCard").style.display = "block";
    loadClassroomStep();
  };
}

function loadClassroomStep() {
  if (!state.G) return;
  const kanjis = state.G.myKanjis;
  const step = state.G.step; // 0: Trace K1, 1: Trace K2, 2: Recall K1, 3: Recall K2
  
  if (step >= 4) {
    // Go to story!
    runStory();
    return;
  }
  
  const isRecall = step >= 2;
  const kIndex = step % 2;
  const targetK = kanjis[kIndex];
  
  $("#classKanjiBadge").textContent = isRecall ? `Spell #${kIndex + 1} (Memory)` : `Spell #${kIndex + 1} (Trace)`;
  $("#classKanjiBadge").className = "badge " + (isRecall ? "shu" : "ai");
  $("#classKanjiMean").textContent = targetK.m;
  $("#classTriesCount").textContent = `Attempts: ${state.G.retries + 1}/5`;
  
  const box = $("#classWriterBox");
  box.innerHTML = "";
  
  if (activeWriter) {
    activeWriter = null;
  }
  
  activeWriter = makeWriter(box, targetK.c, { showOutline: !isRecall });
  
  $("#btnClassReset").onclick = () => {
    loadClassroomStep();
  };
  
  $("#btnClassNext").disabled = true;
  $("#btnClassNext").onclick = () => {
    state.G.step++;
    state.G.retries = 0;
    loadClassroomStep();
  };
  
  activeWriter.quiz({
    leniency: 1.25,
    showHintAfterMisses: isRecall ? 999 : 3,
    onMistake: () => {
      beep("no");
      handleClassroomFail();
    },
    onCorrectStroke: () => {
      // Good stroke
    },
    onComplete: () => {
      beep("ok");
      $("#btnClassNext").disabled = false;
    }
  });
}

function handleClassroomFail() {
  if (!state.G) return;
  state.G.retries++;
  if (state.G.retries >= 5) {
    toast("Let's proceed. Focus on the next rune!");
    $("#btnClassNext").disabled = false;
  } else {
    toast(`Incorrect stroke! Let's redraw. Attempt ${state.G.retries + 1}/5`);
    loadClassroomStep();
  }
}

// =========================================================
// STAGE 2: STORY DIALOGUE
// =========================================================
function runStory() {
  if (!state.G) return;
  state.G.stage = "story";
  state.G.step = 0; // Represents the scene index

  $("#pnlClassroom").style.display = "none";
  $("#pnlStory").style.display = "flex";

  const charData = CHARACTERS[state.G.charId];
  $("#storySilhouette").textContent = charData.avatar;
  $("#storyName").textContent = charData.fullName;
  $("#storySpeaker").textContent = charData.name;

  // Visual layout backgrounds
  $("#game").style.background = `url('./bg/academy-crest.png') no-repeat center center`;
  $("#game").style.backgroundSize = "cover";

  loadStoryScene();
}

function loadStoryScene() {
  if (!state.G) return;
  const storyData = STORIES[state.G.charId];
  const sceneIdx = state.G.step;

  if (sceneIdx >= storyData.scenes.length) {
    // Go to battle!
    runBattle();
    return;
  }

  const scene = storyData.scenes[sceneIdx];
  $("#qDialogue").innerHTML = `
    <div class="dialogue-ja">${scene.dialogue}</div>
    <div class="dialogue-en" style="display: none;">${scene.dialogueEn}</div>
  `;
  $("#qDialogue").classList.remove("show-translation");

  // Dynamic Distractor construction from engine.js
  const prompt = scene.prompt;
  const item = VERBS.find(v => v.k === prompt.word || v.r === prompt.word) ||
               ADJS.find(a => a.k === prompt.word || a.r === prompt.word);
  
  const q = buildQuestion(item, prompt.form, mulberry32(Math.random() * 1000));
  
  const ch = $("#choices");
  ch.innerHTML = "";
  q.options.forEach(op => {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = op;
    b.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent toggling translation on choice clicks
      onStoryAnswer(b, op, q.correct);
    });
    ch.appendChild(b);
  });
}

function onStoryAnswer(btn, selection, correct) {
  if (!state.G || state.G.lock === true) return;
  state.G.lock = true; // Temporary lock

  const isRight = selection === correct;
  $$("#choices .choice").forEach(b => {
    b.disabled = true;
    if (b.textContent === correct) b.classList.add("right");
  });

  if (isRight) {
    beep("ok");
    btn.classList.add("right");
    state.G.score += 100;
    $("#vnScore").textContent = `${state.G.score} pts`;
    toast("Correct! Rizz increases! ✨");
  } else {
    beep("no");
    btn.classList.add("wrong");
    state.G.failures++;
    toast("Missed! Love interest was not impressed.");
  }

  setTimeout(() => {
    state.G.lock = false;
    state.G.step++;
    loadStoryScene();
  }, 1000);
}

// =========================================================
// STAGE 3: BATTLE SPELLCASTING
// =========================================================
function runBattle() {
  if (!state.G) return;
  state.G.stage = "battle";
  state.G.step = 0; // Kanji index (0 or 1)

  $("#pnlStory").style.display = "none";
  $("#pnlBattle").style.display = "flex";
  $("#vnLives").style.display = "block";

  const charData = CHARACTERS[state.G.charId];
  const storyData = STORIES[state.G.charId];
  
  $("#battleSilhouette").textContent = charData.avatar;
  $("#battleName").textContent = charData.fullName;
  $("#battleIntroText").textContent = storyData.battle.text;

  // Render Hearts
  renderVnLives();
  loadBattleKanji();
}

function renderVnLives() {
  if (!state.G) return;
  const l = state.G.lives;
  $("#vnLives").textContent = l > 0 ? "❤️ ".repeat(l) : "💔 Defeated";
}

function loadBattleKanji() {
  if (!state.G) return;
  const kanjis = state.G.myKanjis;
  const kIdx = state.G.step;

  if (kIdx >= 2) {
    // End the game!
    resolveVnEnding();
    return;
  }

  const targetK = kanjis[kIdx];
  const storyData = STORIES[state.G.charId];
  
  const phrase = storyData.battle.kanjiPrompts[kIdx];
  $("#battleSpellMean").textContent = targetK.m;
  $("#battleIntroText").innerHTML = phrase.replace(`{kanji${kIdx+1}}`, `<b style="color:var(--ai);font-size:16px;">${targetK.m}</b>`);

  const box = $("#battleWriterBox");
  box.innerHTML = "";

  if (activeWriter) {
    activeWriter = null;
  }

  // Draw in blank
  const outlineSoftly = state.G.lives <= 0;
  activeWriter = makeWriter(box, targetK.c, { showOutline: outlineSoftly });
  
  $("#btnBattleReset").onclick = () => {
    loadBattleKanji();
  };

  const bubble = $("#battleCharBubble");
  bubble.classList.remove("show");

  activeWriter.quiz({
    leniency: 1.2,
    showHintAfterMisses: outlineSoftly ? 3 : 999,
    onMistake: () => {
      beep("no");
      if (state.G.lives > 0) {
        state.G.lives--;
        renderVnLives();
        
        // Shout triggers
        const charData = CHARACTERS[state.G.charId];
        bubble.textContent = charData.yells.wrong;
        bubble.classList.add("show");
        
        setTimeout(() => bubble.classList.remove("show"), 3500);

        if (state.G.lives <= 0) {
          toast("No lives left! Outline appearing softly...");
          loadBattleKanji();
        }
      }
    },
    onCorrectStroke: () => {
      // Good stroke
    },
    onComplete: sum => {
      beep("ok");
      let pts = 0;
      if (state.G.lives > 0) {
        pts = sum.totalMistakes === 0 ? 150 : 80;
      }
      state.G.score += pts;
      $("#vnScore").textContent = `${state.G.score} pts`;

      const stp = $("#battleSpellBadge");
      stp.textContent = "Cast Successful! 🔮";
      stp.style.background = "var(--matcha)";
      
      setTimeout(() => {
        stp.textContent = "Cast spell";
        stp.style.background = "var(--ai)";
        state.G.step++;
        loadBattleKanji();
      }, 1200);
    }
  });
}

// =========================================================
// STAGE 4: ENDING RESOLVER
// =========================================================
async function resolveVnEnding() {
  if (!state.G || state.G.over) return;
  state.G.over = true;

  $("#pnlBattle").style.display = "none";
  $("#vnLives").style.display = "none";
  $("#pnlResults").style.display = "flex";

  if (activeWriter) {
    activeWriter = null;
  }

  const { charId, score, failures, lives } = state.G;
  const charData = CHARACTERS[charId];
  
  // Calculate total fails (story conjugation fails + lost lives)
  const lostLives = 2 - lives;
  const totalFails = failures + lostLives;

  let ending = "neglect";
  let title = "Neglect Ending";
  let desc = charData.endings.neglect;
  let emoji = "💔";

  if (totalFails === 0) {
    ending = "love";
    title = "Love Ending 💖";
    desc = charData.endings.love;
    emoji = "💖";
  } else if (totalFails <= 2) {
    ending = "friend";
    title = "Friend Ending 🤝";
    desc = charData.endings.friend;
    emoji = "🤝";
  }

  $("#resEndingEmoji").textContent = emoji;
  $("#resEndingTitle").textContent = title;
  $("#resEndingDesc").textContent = desc;
  $("#resTotalScore").textContent = score;
  
  // Calculate perfect spell counts
  const perfectKanji = (lives > 0 && totalFails === failures) ? 2 : (lives > 0 ? 1 : 0);
  $("#resPerfectKanji").textContent = perfectKanji;
  $("#resGrammarMistakes").textContent = failures;

  // Day stats updates
  const rec = state.dayRec.chars[charId] || { status: "playable", triesLeft: 2, score: 0 };
  
  if (ending === "love") {
    rec.status = "completed";
  } else {
    rec.status = "failed";
    if (!state.debugMode) {
      rec.triesLeft = Math.max(0, rec.triesLeft - 1);
    }
  }
  rec.score = Math.max(rec.score, score);
  state.dayRec.chars[charId] = rec;

  // Calculate day total
  const total = Object.values(state.dayRec.chars).reduce((sum, c) => sum + (c.score || 0), 0);
  state.dayRec.totalScore = total;
  state.dayRec.sB = total;
  state.dayRec.kB = total;
  
  LS.set("day:" + todayStr(), state.dayRec);
  appRenderHome();

  // Sync online score
  if (state.beReady && !state.debugMode) {
    await bePostScore("sprint", total);
  }

  // Button actions
  $("#btnVnResHome").onclick = () => {
    gameEl().classList.remove("on");
    appShowScreen("home");
  };

  const again = $("#btnVnResAgain");
  const left = rec.triesLeft;
  again.disabled = rec.status !== "completed" && left <= 0 && !state.debugMode;
  again.textContent = state.debugMode ? "Retry (debug) ▶" : (rec.status === "completed" ? "Practice again ▶" : (left > 0 ? "Use last try ▶" : "No tries left"));
  
  again.onclick = () => {
    startVnGame(charId);
  };
}

export function initSprintGameUI() {
  const bq = $("#btnQuit");
  if (bq) {
    bq.addEventListener("click", () => {
      if (activeWriter) {
        activeWriter = null;
      }
      gameEl().classList.remove("on");
      state.G = null;
      appShowScreen("home");
    });
  }
}
