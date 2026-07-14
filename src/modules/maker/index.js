import './maker.css';
import html from './maker.html?raw';
import { registerScreen } from '@core/screens.js';
import { $, $$, escapeHtml } from '@core/dom.js';
import { speak } from '@core/audio/voice.js';
import { beep } from '@core/audio/sfx.js';
import { makeWriter, keepInk, bloomInk, strokeGuide } from '@modules/kanji/writer.js';
import { kanjiList } from '@modules/kanji/data.js';
import { CHAR, SCENES } from '@content/otome/index.js';
import { shuffle, resolveAsset } from '@core/util.js';

/** Scene Maker: Builder and interactive preview player for custom visual novel scripts. */

let currentSteps = [];
let activeStepIndex = null;
const deckCache = {};

// Default step structures
const DEFAULTS = {
  say: () => ({ type: "say", who: "prince", say: "挨拶を入力してください。", en: "Enter a greeting." }),
  choices: () => ({
    type: "choices",
    jp: "どちらを選びますか？",
    en: "Which one do you choose?",
    options: [
      { text: "礼儀正しく答える", reaction: "よくできました。", translation: "Well done." },
      { text: "沈黙する", reaction: "…なぜ黙っているのですか？", translation: "…Why are you silent?" }
    ]
  }),
  kanji: () => ({ type: "kanji", kanji: "書", mode: "trace" }),
  cards: () => ({ type: "cards", deck: "starter" })
};

/* ---- Screen Initialization ---- */
export function init() {
  const container = document.getElementById("s-maker");
  if (container) {
    container.innerHTML = html;
    initBuilderEvents();
    renderTimeline();
  }
  registerScreen("maker", () => {
    activeStepIndex = null;
    renderTimeline();
    showEditForm();
  });
}

/* ---- Builder GUI Handlers ---- */
function initBuilderEvents() {
  $("#smStartScene").addEventListener("change", (e) => saveGlobalConfig());
  $("#smStartChar").addEventListener("change", (e) => saveGlobalConfig());

  // Add buttons
  $("#smAddSay").addEventListener("click", () => addStep("say"));
  $("#smAddChoices").addEventListener("click", () => addStep("choices"));
  $("#smAddKanji").addEventListener("click", () => addStep("kanji"));
  $("#smAddCards").addEventListener("click", () => addStep("cards"));

  // Play, Export & Import
  $("#smPlay").addEventListener("click", () => startPreview());
  $("#smExport").addEventListener("click", () => togglePort("export"));
  $("#smImport").addEventListener("click", () => togglePort("import"));
  $("#smPortApply").addEventListener("click", () => applyPort());
  $("#smPortClose").addEventListener("click", () => togglePort(null));

  // Edit Step Field Listeners (Say)
  $("#smSayWho").addEventListener("change", (e) => updateActiveStep("who", e.target.value));
  $("#smSayJp").addEventListener("input", (e) => updateActiveStep("say", e.target.value));
  $("#smSayEn").addEventListener("input", (e) => updateActiveStep("en", e.target.value));

  // Edit Step Field Listeners (Choices)
  $("#smChoiceJp").addEventListener("input", (e) => updateActiveStep("jp", e.target.value));
  $("#smChoiceEn").addEventListener("input", (e) => updateActiveStep("en", e.target.value));
  $("#smAddChoiceOption").addEventListener("click", () => addChoiceOption());

  // Edit Step Field Listeners (Kanji)
  $("#smKanjiChar").addEventListener("input", (e) => updateActiveStep("kanji", e.target.value));
  $$("#smKanjiModeSeg button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("#smKanjiModeSeg button").forEach(b => b.classList.toggle("on", b === btn));
      updateActiveStep("mode", btn.dataset.val);
    });
  });

  // Edit Step Field Listeners (Cards)
  $("#smCardsDeck").addEventListener("change", (e) => updateActiveStep("deck", e.target.value));

  // Load configuration from local storage if exists
  const saved = localStorage.getItem("maker_scene");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      currentSteps = data.steps || [];
      $("#smStartScene").value = data.startScene || "academy";
      $("#smStartChar").value = data.startChar || "prince";
    } catch(e) {}
  }
}

function saveGlobalConfig() {
  const data = {
    startScene: $("#smStartScene").value,
    startChar: $("#smStartChar").value,
    steps: currentSteps
  };
  localStorage.setItem("maker_scene", JSON.stringify(data));
}

function addStep(type) {
  const step = DEFAULTS[type]();
  currentSteps.push(step);
  activeStepIndex = currentSteps.length - 1;
  saveGlobalConfig();
  renderTimeline();
  showEditForm();
}

function updateActiveStep(key, val) {
  if (activeStepIndex === null) return;
  currentSteps[activeStepIndex][key] = val;
  saveGlobalConfig();
  
  // Refresh timeline text silently
  const textEl = $(`#stepText-${activeStepIndex}`);
  if (textEl) {
    textEl.textContent = getStepSnippet(currentSteps[activeStepIndex]);
  }
}

function addChoiceOption() {
  if (activeStepIndex === null) return;
  const step = currentSteps[activeStepIndex];
  if (!step.options) step.options = [];
  if (step.options.length >= 4) return; // cap at 4 choices
  
  step.options.push({
    text: "選択肢 Text",
    reaction: "リアクション dialogue.",
    translation: "Reaction translation."
  });
  
  saveGlobalConfig();
  renderChoicesFormList();
}

function getStepSnippet(step) {
  if (step.type === "say") {
    const ch = CHAR[step.who];
    const name = ch ? ch.persona.name : "Narrator";
    return `${name}: "${step.say || ''}"`;
  }
  if (step.type === "choices") return `Branch: "${step.jp || ''}"`;
  if (step.type === "kanji") return `Kanji Spell: 「${step.kanji || ''}」 (${step.mode})`;
  if (step.type === "cards") return `Cards Matching: Deck ${step.deck}`;
  return "";
}

function renderTimeline() {
  const list = $("#smTimelineList");
  list.innerHTML = "";
  
  if (currentSteps.length === 0) {
    list.innerHTML = `<div class="empty">No steps added yet. Add a step below to begin your script!</div>`;
    return;
  }

  currentSteps.forEach((step, idx) => {
    const item = document.createElement("div");
    item.className = `step-item${idx === activeStepIndex ? " active" : ""}`;
    item.innerHTML = `
      <span class="step-badge badge-${step.type}">${step.type}</span>
      <span class="step-text" id="stepText-${idx}">${escapeHtml(getStepSnippet(step))}</span>
      <div class="step-actions">
        <button class="step-btn" data-act="up" data-idx="${idx}" title="Move Up">▲</button>
        <button class="step-btn" data-act="down" data-idx="${idx}" title="Move Down">▼</button>
        <button class="step-btn del" data-act="del" data-idx="${idx}" title="Delete">✕</button>
      </div>
    `;

    item.addEventListener("click", (e) => {
      const btn = e.target.closest(".step-btn");
      if (btn) {
        e.stopPropagation();
        const action = btn.dataset.act;
        const index = parseInt(btn.dataset.idx);
        if (action === "up") moveStep(index, -1);
        if (action === "down") moveStep(index, 1);
        if (action === "del") deleteStep(index);
        return;
      }
      activeStepIndex = idx;
      renderTimeline();
      showEditForm();
    });

    list.appendChild(item);
  });
}

function moveStep(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= currentSteps.length) return;
  const temp = currentSteps[idx];
  currentSteps[idx] = currentSteps[target];
  currentSteps[target] = temp;
  if (activeStepIndex === idx) activeStepIndex = target;
  else if (activeStepIndex === target) activeStepIndex = idx;
  
  saveGlobalConfig();
  renderTimeline();
}

function deleteStep(idx) {
  currentSteps.splice(idx, 1);
  if (activeStepIndex === idx) activeStepIndex = null;
  else if (activeStepIndex > idx) activeStepIndex--;
  
  saveGlobalConfig();
  renderTimeline();
  showEditForm();
}

/* ---- Edit Forms Rendering ---- */
function showEditForm() {
  // Hide all forms first
  $("#smEmptyEdit").style.display = "none";
  $("#smFormSay").style.display = "none";
  $("#smFormChoices").style.display = "none";
  $("#smFormKanji").style.display = "none";
  $("#smFormCards").style.display = "none";

  if (activeStepIndex === null || !currentSteps[activeStepIndex]) {
    $("#smEmptyEdit").style.display = "flex";
    return;
  }

  const step = currentSteps[activeStepIndex];
  if (step.type === "say") {
    $("#smFormSay").style.display = "block";
    $("#smSayWho").value = step.who || "n";
    $("#smSayJp").value = step.say || "";
    $("#smSayEn").value = step.en || "";
  } else if (step.type === "choices") {
    $("#smFormChoices").style.display = "block";
    $("#smChoiceJp").value = step.jp || "";
    $("#smChoiceEn").value = step.en || "";
    renderChoicesFormList();
  } else if (step.type === "kanji") {
    $("#smFormKanji").style.display = "block";
    $("#smKanjiChar").value = step.kanji || "";
    const mode = step.mode || "trace";
    $$("#smKanjiModeSeg button").forEach(b => b.classList.toggle("on", b.dataset.val === mode));
  } else if (step.type === "cards") {
    $("#smFormCards").style.display = "block";
    $("#smCardsDeck").value = step.deck || "starter";
  }
}

function renderChoicesFormList() {
  const container = $("#smChoicesList");
  container.innerHTML = "";
  if (activeStepIndex === null) return;
  const step = currentSteps[activeStepIndex];
  if (!step.options) step.options = [];

  step.options.forEach((op, oIdx) => {
    const card = document.createElement("div");
    card.className = "choice-edit-card";
    card.innerHTML = `
      <div class="choice-edit-header">
        <span class="choice-title">Option ${oIdx + 1}</span>
        <button class="step-btn del" data-o-idx="${oIdx}" style="padding:2px 6px;">Remove</button>
      </div>
      <div class="choice-fields">
        <input type="text" class="inp op-text" data-o-idx="${oIdx}" placeholder="Button Text (JP)" value="${escapeHtml(op.text || '')}">
        <input type="text" class="inp op-react" data-o-idx="${oIdx}" placeholder="Reaction Speech (JP)" value="${escapeHtml(op.reaction || '')}">
        <input type="text" class="inp op-trans" data-o-idx="${oIdx}" placeholder="Reaction Translation (EN)" value="${escapeHtml(op.translation || '')}">
      </div>
    `;

    card.querySelector(".del").addEventListener("click", (e) => {
      step.options.splice(oIdx, 1);
      saveGlobalConfig();
      renderChoicesFormList();
    });

    card.querySelector(".op-text").addEventListener("input", (e) => {
      step.options[oIdx].text = e.target.value;
      saveGlobalConfig();
    });

    card.querySelector(".op-react").addEventListener("input", (e) => {
      step.options[oIdx].reaction = e.target.value;
      saveGlobalConfig();
    });

    card.querySelector(".op-trans").addEventListener("input", (e) => {
      step.options[oIdx].translation = e.target.value;
      saveGlobalConfig();
    });

    container.appendChild(card);
  });
}

/* ---- JSON Export/Import ---- */
let activePortMode = null; // "export" or "import"

function togglePort(mode) {
  activePortMode = mode;
  const panel = $("#smPortPanel");
  const area = $("#smPortArea");
  if (!mode) {
    panel.style.display = "none";
    return;
  }
  panel.style.display = "block";
  if (mode === "export") {
    const data = {
      startScene: $("#smStartScene").value,
      startChar: $("#smStartChar").value,
      steps: currentSteps
    };
    area.value = JSON.stringify(data, null, 2);
    area.select();
  } else {
    area.value = "";
    area.placeholder = "Paste JSON scene configuration here...";
  }
}

function applyPort() {
  if (activePortMode !== "import") return;
  const raw = $("#smPortArea").value.trim();
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    currentSteps = data.steps || [];
    $("#smStartScene").value = data.startScene || "academy";
    $("#smStartChar").value = data.startChar || "prince";
    activeStepIndex = currentSteps.length > 0 ? 0 : null;
    saveGlobalConfig();
    renderTimeline();
    showEditForm();
    togglePort(null);
    beep("ok");
  } catch (err) {
    alert("Invalid JSON format! Make sure to copy the exported code exactly.");
    beep("no");
  }
}

/* ================= PREVIEW CUSTOM PLAY RUNNER ================= */
let previewQuit = false;
let previewResolveTap = null;

async function startPreview() {
  if (currentSteps.length === 0) {
    alert("Timeline is empty! Add some dialogue or tasks to play the scene.");
    return;
  }

  // Set active stage overlay state
  const overlay = $("#makerPreview");
  overlay.classList.add("on");
  previewQuit = false;

  const quitBtn = $("#mpQuit");
  const handler = () => {
    previewQuit = true;
    if (previewResolveTap) {
      previewResolveTap();
      previewResolveTap = null;
    }
    closePreview();
  };
  quitBtn.onclick = handler;

  // Initialize visual scene config
  const startBg = $("#smStartScene").value;
  applyPreviewScene(startBg);
  
  const startChar = $("#smStartChar").value;
  previewSpriteSet(startChar);

  // Setup dialog tap resolver
  const dialogBox = $("#mpDialog");
  dialogBox.onclick = () => {
    if (previewResolveTap) {
      previewResolveTap();
      previewResolveTap = null;
    }
  };

  try {
    for (let i = 0; i < currentSteps.length; i++) {
      if (previewQuit) break;
      const step = currentSteps[i];
      if (step.type === "say") {
        await playPreviewSay(step);
      } else if (step.type === "choices") {
        await playPreviewChoices(step);
      } else if (step.type === "kanji") {
        await playPreviewKanji(step);
      } else if (step.type === "cards") {
        await playPreviewCards(step);
      }
    }
  } catch(e) {
    console.error("Preview error:", e);
  } finally {
    closePreview();
  }
}

function closePreview() {
  $("#makerPreview").classList.remove("on");
  const canvas = $("#mpWriterBox");
  if (canvas) canvas.innerHTML = '<div class="stamp" id="mpStamp">正解</div>';
  $("#mpCardsOverlay").style.display = "none";
}

function applyPreviewScene(id) {
  const sc = SCENES[id] || { bg: "linear-gradient(168deg,#120D1F 0%,#241B36 48%,#57431E 135%)" };
  const el = $("#mpBg");
  if (el) {
    el.style.background = sc.img ? `url('${resolveAsset(sc.img)}') center/cover no-repeat` : sc.bg;
    el.style.filter = sc.filter || "";
  }
}

function previewSpriteSet(charId) {
  const el = $("#mpSprite");
  if (!el) return;
  if (charId === "n") {
    el.style.opacity = 0;
    return;
  }
  el.style.opacity = 1;
  el.classList.toggle("left", charId === "teacher");
  let imgUrl = null;
  if (charId === "teacher") {
    imgUrl = resolveAsset("./sprites/teacher.png");
  } else {
    const ch = CHAR[charId];
    if (ch && ch.sprites && ch.sprites.default) {
      imgUrl = resolveAsset(ch.sprites.default);
    }
  }
  el.innerHTML = imgUrl ? `<img src="${imgUrl}" alt="">` : "🌸";
}

async function previewTap() {
  return new Promise(res => {
    previewResolveTap = res;
  });
}

// 1. Dialogue Step
async function playPreviewSay(step) {
  if (previewQuit) return;
  $("#mpChoices").style.display = "none";
  $("#mpWriterArea").style.display = "none";
  $("#mpCardsOverlay").style.display = "none";

  previewSpriteSet(step.who);
  
  const ch = CHAR[step.who];
  const nameplate = $("#mpName");
  if (step.who === "n") {
    nameplate.style.display = "none";
    $("#mpSprite").style.opacity = 0.4;
  } else {
    nameplate.style.display = "block";
    nameplate.textContent = charName(step.who);
    $("#mpSprite").style.opacity = 1;
  }

  const textEl = $("#mpText");
  textEl.innerHTML = "";
  
  // Speak audio
  if (step.who !== "n" && step.say) {
    speak(step.say, ch ? ch.voice : null);
  }

  // Simple typewrite simulation
  const rawText = step.say || "";
  const enText = step.en ? `<div class="en" style="margin-top:4px; font-size:13px; color:var(--ink2);">${escapeHtml(step.en)}</div>` : "";
  
  $("#mpNext").style.visibility = "hidden";
  
  // Fast render
  textEl.innerHTML = escapeHtml(rawText) + enText;
  $("#mpNext").style.visibility = "visible";
  
  await previewTap();
}

function charName(who) {
  if (who === "teacher") return "Archmage Corvina";
  const ch = CHAR[who];
  return ch ? ch.persona.name : "???";
}

// 2. Choices Step
async function playPreviewChoices(step) {
  if (previewQuit) return;
  $("#mpWriterArea").style.display = "none";
  $("#mpCardsOverlay").style.display = "none";

  $("#mpName").style.display = "none";
  $("#mpSprite").style.opacity = 0.5;

  const textEl = $("#mpText");
  textEl.innerHTML = escapeHtml(step.jp || "何と答える？") + 
    (step.en ? `<div class="en" style="margin-top:4px; font-size:13px; color:var(--ink2);">${escapeHtml(step.en)}</div>` : "");
  
  $("#mpNext").style.visibility = "hidden";

  const chEl = $("#mpChoices");
  chEl.innerHTML = "";
  chEl.style.display = "flex";

  const options = step.options || [];
  
  const pickedIdx = await new Promise(res => {
    options.forEach((op, opIdx) => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.textContent = op.text || "Option";
      btn.addEventListener("click", () => {
        res(opIdx);
      });
      chEl.appendChild(btn);
    });
    // Fallback if quit
    previewResolveTap = () => res(-1);
  });

  chEl.style.display = "none";
  if (previewQuit || pickedIdx === -1) return;

  // React
  const chosen = options[pickedIdx];
  if (chosen && (chosen.reaction || chosen.translation)) {
    $("#mpSprite").style.opacity = 1;
    textEl.innerHTML = `「${escapeHtml(chosen.reaction || '')}」` + 
      (chosen.translation ? `<div class="en" style="margin-top:4px; font-size:13px; color:var(--ink2);">${escapeHtml(chosen.translation)}</div>` : "");
    
    // Play speech
    const startChar = $("#smStartChar").value;
    const ch = CHAR[startChar];
    if (chosen.reaction) speak(chosen.reaction, ch ? ch.voice : null);

    $("#mpNext").style.visibility = "visible";
    await previewTap();
  }
}

// 3. Kanji Drawing Step
async function playPreviewKanji(step) {
  if (previewQuit) return;
  $("#mpChoices").style.display = "none";
  $("#mpCardsOverlay").style.display = "none";

  const char = step.kanji || "書";
  
  // Fetch kanji metadata
  const data = kanjiList().find(k => k.c === char) || { c: char, m: "sign", r: "よみ" };
  
  const area = $("#mpWriterArea");
  const box = $("#mpWriterBox");
  area.style.display = "block";
  $("#mpSprite").style.opacity = 0.25;
  $("#mpName").style.display = "none";
  $("#mpText").innerHTML = (step.mode === "trace" ? "Trace the guide" : "From memory") + `: <b>${escapeHtml(data.m)}</b> 「${escapeHtml(data.r)}」`;
  $("#mpNext").style.visibility = "hidden";
  $("#mpWFeedback").textContent = "";

  const skipBtn = $("#mpSkip");
  skipBtn.style.display = "block";

  let w;
  const guide = strokeGuide(() => w);
  let mistakes = 0;
  let revealed = false;

  await new Promise(res => {
    // Connect skip button
    skipBtn.onclick = () => {
      skipBtn.style.display = "none";
      res();
    };
    
    // Fallback if preview quit
    previewResolveTap = res;

    w = makeWriter(box, char, {
      showOutline: step.mode === "trace",
      width: 180,
      height: 180,
      strokeColor: "#FFF6DE",
      outlineColor: "rgba(255,255,255,0.08)",
      drawingColor: "#E9C868",
      drawingWidth: 14,
      showHintAfterMisses: 2
    });

    w.quiz({
      leniency: 22,
      onMistake: d => {
        guide.trackMistake(d);
        beep("no");
        if (step.mode === "recall") {
          mistakes++;
          if (mistakes >= 3 && !revealed) {
            revealed = true;
            guide.reveal();
            $("#mpWFeedback").textContent = "Follow the glowing stroke!";
            $("#mpWFeedback").className = "k-feedback bad";
          } else if (!revealed) {
            const left = 3 - mistakes;
            $("#mpWFeedback").textContent = `✕ ${left} ${left === 1 ? "miss" : "misses"} before outline`;
            $("#mpWFeedback").className = "k-feedback bad";
          }
        } else {
          $("#mpWFeedback").textContent = "✕ order & direction, apprentice!";
          $("#mpWFeedback").className = "k-feedback bad";
        }
      },
      onCorrectStroke: d => {
        keepInk(box);
        guide.trackCorrect(d);
        $("#mpWFeedback").textContent = "✓";
        $("#mpWFeedback").className = "k-feedback";
        particleBurstPreview(box, 3);
      },
      onComplete: () => {
        skipBtn.style.display = "none";
        res();
      }
    });
  });

  area.style.display = "none";
  $("#mpSprite").style.opacity = 1;
  box.classList.remove("cast");
  
  if (previewQuit) return;

  // Complete stamp effect
  beep("ok");
  const stp = $("#mpStamp");
  stp.classList.add("hit");
  bloomInk(box, { color: "#FFF6DE", glow: "rgba(233,200,104,1)" });
  box.classList.add("cast");
  particleBurstPreview(box, 14);

  await new Promise(r => setTimeout(r, 1300));
  stp.classList.remove("hit");
  box.classList.remove("cast");
  box.innerHTML = '<div class="stamp" id="mpStamp">正解</div>';
}

function particleBurstPreview(box, count) {
  const r = box.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "heartburst";
    el.textContent = "⚜";
    el.style.left = `${cx + (Math.random() * 40 - 20)}px`;
    el.style.top = `${cy + (Math.random() * 40 - 20)}px`;
    el.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
    el.style.setProperty("--dy", `${(Math.random() - 0.5) * 160}px`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

// 4. Cards Step
async function playPreviewCards(step) {
  if (previewQuit) return;
  $("#mpChoices").style.display = "none";
  $("#mpWriterArea").style.display = "none";

  const overlay = $("#mpCardsOverlay");
  const listJa = $("#mpGridJa");
  const listEn = $("#mpGridEn");

  $("#mpCardsDeckName").textContent = `Match the Terms — ${step.deck.toUpperCase()}`;
  listJa.innerHTML = "<div class='empty'>Loading deck…</div>";
  listEn.innerHTML = "";
  overlay.style.display = "flex";

  let vocabList = [];
  try {
    vocabList = await getDeck(step.deck);
  } catch (err) {
    console.error("Cards fetch failed:", err);
    vocabList = [
      { ja: "水", es: "agua" },
      { ja: "魚", es: "pescado" },
      { ja: "月", es: "luna" }
    ];
  }

  // Pick 3 random vocabulary
  const shuffledDeck = shuffle(vocabList.slice());
  const selected = shuffledDeck.slice(0, 3);

  // Setup match states
  const jaCards = selected.map((item, idx) => ({ id: idx, val: item.ja, type: "ja" }));
  const enCards = selected.map((item, idx) => ({ id: idx, val: item.es, type: "en" }));

  // Shuffle display positions
  const dispJa = shuffle(jaCards.slice());
  const dispEn = shuffle(enCards.slice());

  // Render cards
  listJa.innerHTML = "";
  listEn.innerHTML = "";

  let selectedJa = null;
  let selectedEn = null;
  let matchesLeft = 3;

  const checkMatch = (res) => {
    if (selectedJa !== null && selectedEn !== null) {
      const cardJaEl = $(`[data-card-type="ja"][data-card-id="${selectedJa}"]`);
      const cardEnEl = $(`[data-card-type="en"][data-card-id="${selectedEn}"]`);

      if (selectedJa === selectedEn) {
        // MATCH!
        beep("ok");
        cardJaEl.classList.add("matched");
        cardEnEl.classList.add("matched");
        cardJaEl.classList.remove("selected");
        cardEnEl.classList.remove("selected");
        matchesLeft--;
        if (matchesLeft === 0) {
          setTimeout(() => {
            overlay.style.display = "none";
            res();
          }, 800);
        }
      } else {
        // MISMATCH!
        beep("no");
        cardJaEl.classList.add("wrong");
        cardEnEl.classList.add("wrong");
        cardJaEl.classList.remove("selected");
        cardEnEl.classList.remove("selected");
        setTimeout(() => {
          cardJaEl.classList.remove("wrong");
          cardEnEl.classList.remove("wrong");
        }, 300);
      }
      selectedJa = null;
      selectedEn = null;
    }
  };

  await new Promise(res => {
    // Fallback if preview quit
    previewResolveTap = res;

    const renderColumn = (colEl, dispList) => {
      dispList.forEach(item => {
        const card = document.createElement("button");
        card.className = "maker-card";
        card.textContent = item.val;
        card.dataset.cardId = item.id;
        card.dataset.cardType = item.type;
        
        card.addEventListener("click", () => {
          if (card.classList.contains("matched")) return;
          
          if (item.type === "ja") {
            if (selectedJa === item.id) {
              selectedJa = null;
              card.classList.remove("selected");
            } else {
              if (selectedJa !== null) {
                $(`[data-card-type="ja"][data-card-id="${selectedJa}"]`).classList.remove("selected");
              }
              selectedJa = item.id;
              card.classList.add("selected");
            }
          } else {
            if (selectedEn === item.id) {
              selectedEn = null;
              card.classList.remove("selected");
            } else {
              if (selectedEn !== null) {
                $(`[data-card-type="en"][data-card-id="${selectedEn}"]`).classList.remove("selected");
              }
              selectedEn = item.id;
              card.classList.add("selected");
            }
          }
          checkMatch(res);
        });
        colEl.appendChild(card);
      });
    };

    renderColumn(listJa, dispJa);
    renderColumn(listEn, dispEn);
  });

  overlay.style.display = "none";
}

async function getDeck(id) {
  if (deckCache[id]) return deckCache[id];
  const res = await fetch(`./vocab/${id}.json`);
  if (!res.ok) throw new Error("deck fetch failed: " + id);
  const data = await res.json();
  deckCache[id] = data.vocab || data;
  return deckCache[id];
}
