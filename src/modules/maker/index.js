import './maker.css';
import html from './maker.html?raw';
import { registerScreen } from '@core/screens.js';
import { $, $$, escapeHtml } from '@core/dom.js';
import { speak } from '@core/audio/voice.js';
import { beep, typewriterClack } from '@core/audio/sfx.js';
import { playMusic, playAmbience } from '@core/audio/engine.js';
import { makeWriter, keepInk, bloomInk, strokeGuide } from '@modules/kanji/writer.js';
import { kanjiList } from '@modules/kanji/data.js';
import { CHAR, SCENES } from '@content/otome/index.js';
import { shuffle, resolveAsset } from '@core/util.js';
import { playCardsMiniRound } from '@modules/cards/game.js';
import { LS } from '@core/storage.js';

/** Scene Maker: Builder and interactive preview player for custom visual novel scripts. */

let currentSteps = [];
let activeStepIndex = null;
let editState = null; // Holds temporary uncommitted changes of the active step
let selectedStartScene = "academy";
let selectedStartChar = "prince";
const deckCache = {};

// Default step structures
const DEFAULTS = {
  say: () => ({ type: "say", char: selectedStartChar, bg: selectedStartScene, blur: true, say: "挨拶を入力してください。", en: "Enter a greeting.", music: "continue", ambience: "continue" }),
  choices: () => ({
    type: "choices",
    char: selectedStartChar,
    bg: selectedStartScene,
    blur: true,
    choiceMode: "free",
    ordered: false,
    music: "continue",
    ambience: "continue",
    jp: "どちらを選びますか？",
    en: "Which one do you choose?",
    options: [
      { text: "礼儀正しく答える", reaction: "よくできました。", translation: "Well done.", good: true, order: 1 },
      { text: "沈黙する", reaction: "…なぜ黙っているのですか？", translation: "…Why are you silent?", good: false, order: 2 }
    ]
  }),
  kanji: () => ({ type: "kanji", char: selectedStartChar, bg: selectedStartScene, blur: true, kanji: "書", mode: "trace", music: "continue", ambience: "continue" }),
  cards: () => ({ type: "cards", char: selectedStartChar, bg: selectedStartScene, blur: true, deck: "starter", music: "continue", ambience: "continue" })
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
    editState = null;
    renderTimeline();
    showEditForm();
    renderCharPicker();
    renderBgPicker();
  });
}

/* ---- Builder GUI Handlers ---- */
function initBuilderEvents() {
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

  // Save Step & Reset buttons
  $("#smPlayStep").addEventListener("click", () => startSinglePreview());
  $("#smSaveStep").addEventListener("click", () => saveStepData());
  $("#smResetStep").addEventListener("click", () => resetStepData());

  // Edit Step Field Listeners (Say)
  $("#smSayJp").addEventListener("input", (e) => updateActiveStep("say", e.target.value));
  $("#smSayEn").addEventListener("input", (e) => updateActiveStep("en", e.target.value));

  // Edit Step Field Listeners (Choices)
  $("#smChoiceJp").addEventListener("input", (e) => updateActiveStep("jp", e.target.value));
  $("#smChoiceEn").addEventListener("input", (e) => updateActiveStep("en", e.target.value));
  $("#smAddChoiceOption").addEventListener("click", () => addChoiceOption());

  // Choices mode segment
  $$("#smChoiceModeSeg button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("#smChoiceModeSeg button").forEach(b => b.classList.toggle("on", b === btn));
      updateActiveStep("choiceMode", btn.dataset.val);
      renderChoicesFormList();
    });
  });

  // Ordered toggle
  $("#smChoiceOrdered").addEventListener("change", (e) => {
    updateActiveStep("ordered", e.target.checked);
    renderChoicesFormList();
  });

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

  // Audio section
  $("#smStepMusic").addEventListener("change", (e) => updateActiveStep("music", e.target.value));
  $("#smStepAmbience").addEventListener("change", (e) => updateActiveStep("ambience", e.target.value));

  // Blur Toggle listener
  const blurBtn = $("#smBlurToggle");
  if (blurBtn) {
    blurBtn.addEventListener("change", (e) => {
      if (editState) {
        editState.blur = e.target.checked;
        checkUnsavedChanges();
      }
    });
  }

  // Vibration test listeners
  $("#smVibTap").addEventListener("click", () => {
    if (navigator.vibrate) navigator.vibrate(18);
  });
  $("#smVibChoice").addEventListener("click", () => {
    if (navigator.vibrate) navigator.vibrate(25);
  });
  $("#smVibMatch").addEventListener("click", () => {
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
  });
  $("#smVibTick").addEventListener("click", () => {
    if (navigator.vibrate) navigator.vibrate(12);
  });

  // Load configuration from local storage if exists
  const saved = LS.get("maker:scene");
  if (saved) {
    try {
      currentSteps = saved.steps || [];
      selectedStartScene = saved.startScene || "academy";
      selectedStartChar = saved.startChar || "prince";
    } catch(e) {}
  }

  renderCharPicker();
  renderBgPicker();
}

function saveGlobalConfig() {
  const data = {
    startScene: selectedStartScene,
    startChar: selectedStartChar,
    steps: currentSteps
  };
  LS.set("maker:scene", data);
}

function addStep(type) {
  const step = DEFAULTS[type]();
  currentSteps.push(step);
  activeStepIndex = currentSteps.length - 1;
  editState = JSON.parse(JSON.stringify(step));
  
  saveGlobalConfig();
  renderTimeline();
  showEditForm();
  renderCharPicker();
  renderBgPicker();
  
  const blurBtn = $("#smBlurToggle");
  if (blurBtn) {
    blurBtn.checked = editState.blur !== false;
  }
  checkUnsavedChanges();
}

function updateActiveStep(key, val) {
  if (activeStepIndex === null || !editState) return;
  editState[key] = val;
  checkUnsavedChanges();
}

function checkUnsavedChanges() {
  if (activeStepIndex === null || !currentSteps[activeStepIndex] || !editState) {
    setSaveHighlight(false);
    return;
  }
  const saved = JSON.stringify(currentSteps[activeStepIndex]);
  const current = JSON.stringify(editState);
  setSaveHighlight(saved !== current);
}

function setSaveHighlight(highlight) {
  const btn = $("#smSaveStep");
  if (btn) {
    btn.classList.toggle("highlighted", highlight);
  }
}

function saveStepData() {
  if (activeStepIndex === null || !editState) return;
  currentSteps[activeStepIndex] = JSON.parse(JSON.stringify(editState));
  saveGlobalConfig();
  renderTimeline();
  checkUnsavedChanges();
  beep("ok");
}

function resetStepData() {
  if (activeStepIndex === null || !currentSteps[activeStepIndex]) return;
  editState = JSON.parse(JSON.stringify(currentSteps[activeStepIndex]));
  selectedStartChar = editState.char;
  selectedStartScene = editState.bg;
  showEditForm();
  renderCharPicker();
  renderBgPicker();
  
  const blurBtn = $("#smBlurToggle");
  if (blurBtn) {
    blurBtn.checked = editState.blur !== false;
  }
  checkUnsavedChanges();
  beep("no");
}

function addChoiceOption() {
  if (activeStepIndex === null || !editState) return;
  if (!editState.options) editState.options = [];
  if (editState.options.length >= 4) return; // cap at 4 choices
  
  editState.options.push({
    text: "選択肢 Text",
    reaction: "リアクション dialogue.",
    translation: "Reaction translation.",
    good: true,
    order: editState.options.length + 1
  });
  
  renderChoicesFormList();
  checkUnsavedChanges();
}

function getStepSnippet(step) {
  const ch = CHAR[step.char];
  const name = ch ? ch.persona.name : (step.char === "teacher" ? "Archmage Corvina" : "Narrator");
  
  if (step.type === "say") {
    return `${name}: "${step.say || ''}"`;
  }
  if (step.type === "choices") return `Branch [${name}]: "${step.jp || ''}"`;
  if (step.type === "kanji") return `Kanji Spell [${name}]: 「${step.kanji || ''}」 (${step.mode})`;
  if (step.type === "cards") return `Cards Matching [${name}]: Deck ${step.deck}`;
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
      editState = JSON.parse(JSON.stringify(currentSteps[idx]));
      selectedStartChar = editState.char;
      selectedStartScene = editState.bg;
      
      renderTimeline();
      showEditForm();
      renderCharPicker();
      renderBgPicker();
      
      const blurBtn = $("#smBlurToggle");
      if (blurBtn) {
        blurBtn.checked = editState.blur !== false;
      }
      checkUnsavedChanges();
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
  if (activeStepIndex === idx) {
    activeStepIndex = null;
    editState = null;
  } else if (activeStepIndex > idx) {
    activeStepIndex--;
  }
  
  saveGlobalConfig();
  renderTimeline();
  showEditForm();
  renderCharPicker();
  renderBgPicker();
  checkUnsavedChanges();
}

/* ---- Edit Forms Rendering ---- */
function showEditForm() {
  // Hide all forms first
  $("#smEmptyEdit").style.display = "none";
  $("#smFormSay").style.display = "none";
  $("#smFormChoices").style.display = "none";
  $("#smFormKanji").style.display = "none";
  $("#smFormCards").style.display = "none";
  $("#smAudioSection").style.display = "none";
  $("#smEditActions").style.display = "none";

  const blurContainer = $(".sm-toggle-container");
  if (blurContainer) blurContainer.style.opacity = "0.3";

  if (activeStepIndex === null || !currentSteps[activeStepIndex] || !editState) {
    $("#smEmptyEdit").style.display = "flex";
    return;
  }

  if (blurContainer) blurContainer.style.opacity = "1";
  $("#smEditActions").style.display = "flex";
  $("#smAudioSection").style.display = "";

  const step = editState;

  // Populate shared audio dropdowns
  $("#smStepMusic").value = step.music || "continue";
  $("#smStepAmbience").value = step.ambience || "continue";

  if (step.type === "say") {
    $("#smFormSay").style.display = "block";
    $("#smSayJp").value = step.say || "";
    $("#smSayEn").value = step.en || "";
  } else if (step.type === "choices") {
    $("#smFormChoices").style.display = "block";
    $("#smChoiceJp").value = step.jp || "";
    $("#smChoiceEn").value = step.en || "";
    // Restore choice mode segment
    const cm = step.choiceMode || "free";
    $$("#smChoiceModeSeg button").forEach(b => b.classList.toggle("on", b.dataset.val === cm));
    $("#smChoiceOrdered").checked = !!step.ordered;
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
  if (activeStepIndex === null || !editState) return;
  const step = editState;
  if (!step.options) step.options = [];

  const isGoodBad = (step.choiceMode || "free") === "good-bad";
  const isOrdered = !!step.ordered;
  const showGoodCheckbox = isGoodBad || isOrdered;

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
        ${showGoodCheckbox ? `
        <div class="sm-toggle-container" style="margin-top:6px;">
          <span class="sm-toggle-label">✅ Good choice</span>
          <label class="sm-switch">
            <input type="checkbox" class="op-good" ${op.good !== false ? 'checked' : ''}>
            <span class="sm-slider"></span>
          </label>
        </div>` : ''}
        ${isOrdered ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
          <span style="font-size:12px;color:var(--ink2);">Tap order:</span>
          <input type="number" class="inp op-order" min="1" max="20" value="${op.order || oIdx + 1}" style="width:60px;">
        </div>` : ''}
      </div>
    `;

    card.querySelector(".del").addEventListener("click", () => {
      step.options.splice(oIdx, 1);
      renderChoicesFormList();
      checkUnsavedChanges();
    });
    card.querySelector(".op-text").addEventListener("input", (e) => { step.options[oIdx].text = e.target.value; checkUnsavedChanges(); });
    card.querySelector(".op-react").addEventListener("input", (e) => { step.options[oIdx].reaction = e.target.value; checkUnsavedChanges(); });
    card.querySelector(".op-trans").addEventListener("input", (e) => { step.options[oIdx].translation = e.target.value; checkUnsavedChanges(); });
    if (showGoodCheckbox) card.querySelector(".op-good").addEventListener("change", (e) => { step.options[oIdx].good = e.target.checked; checkUnsavedChanges(); });
    if (isOrdered) card.querySelector(".op-order").addEventListener("input", (e) => { step.options[oIdx].order = parseInt(e.target.value) || oIdx + 1; checkUnsavedChanges(); });

    container.appendChild(card);
  });
}

function renderCharPicker() {
  const container = $("#smCharPicker");
  if (!container) return;
  container.innerHTML = "";

  const list = Object.keys(CHAR).map(id => {
    const ch = CHAR[id];
    return {
      id,
      name: ch.persona.name.split(" ")[1] || ch.persona.name,
      img: ch.sprites.default
    };
  });

  list.push({ id: "teacher", name: "Corvina", img: "./sprites/teacher.png" });
  list.push({ id: "none", name: "Empty / Narrator", img: "" });

  list.forEach(item => {
    const box = document.createElement("div");
    box.className = `sm-square-item${item.id === selectedStartChar ? " selected" : ""}`;
    box.dataset.id = item.id;

    const preview = document.createElement("div");
    preview.className = "sm-square-preview";
    if (item.img) {
      preview.style.backgroundImage = `url('${resolveAsset(item.img)}')`;
      preview.style.backgroundSize = "contain";
      preview.style.backgroundRepeat = "no-repeat";
      preview.style.backgroundPosition = "center bottom";
    } else {
      preview.style.background = "linear-gradient(135deg, #111, #222)";
    }

    const label = document.createElement("div");
    label.className = "sm-square-label";
    label.textContent = item.name;

    box.appendChild(preview);
    box.appendChild(label);

    box.addEventListener("click", () => {
      selectedStartChar = item.id;
      if (editState) {
        editState.char = item.id;
        checkUnsavedChanges();
      }
      renderCharPicker();
    });

    container.appendChild(box);
  });
}

function renderBgPicker() {
  const container = $("#smBgPicker");
  if (!container) return;
  container.innerHTML = "";

  Object.keys(SCENES).forEach(id => {
    const sc = SCENES[id];
    const item = document.createElement("div");
    item.className = `sm-square-item${id === selectedStartScene ? " selected" : ""}`;
    item.dataset.id = id;

    const preview = document.createElement("div");
    preview.className = "sm-square-preview";
    if (sc.img) {
      preview.style.backgroundImage = `url('${resolveAsset(sc.img)}')`;
    } else {
      preview.style.background = sc.bg;
    }

    const label = document.createElement("div");
    label.className = "sm-square-label";
    label.textContent = id;

    item.appendChild(preview);
    item.appendChild(label);

    item.addEventListener("click", () => {
      selectedStartScene = id;
      if (editState) {
        editState.bg = id;
        checkUnsavedChanges();
      }
      renderBgPicker();
    });

    container.appendChild(item);
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
      startScene: selectedStartScene,
      startChar: selectedStartChar,
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
    selectedStartScene = data.startScene || "academy";
    selectedStartChar = data.startChar || "prince";
    activeStepIndex = currentSteps.length > 0 ? 0 : null;
    editState = currentSteps.length > 0 ? JSON.parse(JSON.stringify(currentSteps[0])) : null;
    
    saveGlobalConfig();
    renderTimeline();
    showEditForm();
    renderCharPicker();
    renderBgPicker();
    
    const blurBtn = $("#smBlurToggle");
    if (blurBtn) {
      blurBtn.checked = editState ? (editState.blur !== false) : true;
    }
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

      // Update background, character, and audio dynamically per step
      applyPreviewScene(step.bg, step.blur);
      previewSpriteSet(step.char);
      applyPreviewAudio(step);

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

async function startSinglePreview() {
  if (activeStepIndex === null || !editState) {
    alert("No active step selected to preview!");
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

  // Setup dialog tap resolver
  const dialogBox = $("#mpDialog");
  dialogBox.onclick = () => {
    if (previewResolveTap) {
      previewResolveTap();
      previewResolveTap = null;
    }
  };

  try {
    const step = editState;
    applyPreviewScene(step.bg, step.blur);
    previewSpriteSet(step.char);
    applyPreviewAudio(step);

    if (step.type === "say") {
      await playPreviewSay(step);
    } else if (step.type === "choices") {
      await playPreviewChoices(step);
    } else if (step.type === "kanji") {
      await playPreviewKanji(step);
    } else if (step.type === "cards") {
      await playPreviewCards(step);
    }
  } catch(e) {
    console.error("Single step preview error:", e);
  } finally {
    closePreview();
  }
}

function closePreview() {
  $("#makerPreview").classList.remove("on");
  playMusic(null, { fadeMs: 400 });
  playAmbience(null, { fadeMs: 400 });
  const canvas = $("#mpWriterBox");
  if (canvas) canvas.innerHTML = '<div class="stamp" id="mpStamp">正解</div>';
  $("#mpCardsOverlay").style.display = "none";
}

/** Apply music and ambience for a step. "continue" = don't change; "none" = stop. */
function applyPreviewAudio(step) {
  const m = step.music;
  if (m && m !== "continue") playMusic(m === "none" ? null : m);
  const a = step.ambience;
  if (a && a !== "continue") playAmbience(a === "none" ? null : a);
}

function applyPreviewScene(id, blurOverride) {
  const sc = SCENES[id] || { bg: "linear-gradient(168deg,#120D1F 0%,#241B36 48%,#57431E 135%)" };
  const el = $("#mpBg");
  if (el) {
    el.style.background = sc.img ? `url('${resolveAsset(sc.img)}') center/cover no-repeat` : sc.bg;
    const isBlurred = blurOverride !== false;
    const blurAmt = isBlurred ? "3px" : "0px";
    el.style.filter = `blur(${blurAmt}) brightness(0.8) ${sc.filter || ""}`;
  }
}

function previewSpriteSet(charId) {
  const el = $("#mpSprite");
  if (!el) return;
  if (charId === "n" || charId === "none" || !charId) {
    el.style.opacity = 0;
    el.innerHTML = "";
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
    previewResolveTap = () => {
      if (navigator.vibrate) navigator.vibrate(18);
      res();
    };
  });
}

/** Typewriter animation: renders text char-by-char with clack sounds.
 *  Tapping skips to full text instantly. */
async function typewriterRender(textEl, rawText, enText) {
  if (previewQuit) return;
  $("#mpNext").style.visibility = "hidden";
  textEl.innerHTML = "";

  let skipped = false;
  let skipResolve = null;
  const skipPromise = new Promise(r => { skipResolve = r; });

  // A tap skips the animation
  const oldResolve = previewResolveTap;
  previewResolveTap = () => { skipped = true; skipResolve(); };

  const chars = [...rawText]; // Unicode-safe split
  const CLACK_EVERY = 2; // clack every N chars to avoid spamming
  for (let i = 0; i < chars.length; i++) {
    if (previewQuit || skipped) break;
    textEl.textContent += chars[i];
    if (i % CLACK_EVERY === 0) typewriterClack();
    // Race: either wait ~35ms per char or skip signal
    await Promise.race([
      new Promise(r => setTimeout(r, 35)),
      skipPromise
    ]);
  }

  // Always show full text when done/skipped
  textEl.innerHTML = escapeHtml(rawText) + enText;
  $("#mpNext").style.visibility = "visible";

  // Restore normal tap resolver
  previewResolveTap = oldResolve;
}

// 1. Dialogue Step
async function playPreviewSay(step) {
  if (previewQuit) return;
  $("#mpChoices").style.display = "none";
  $("#mpWriterArea").style.display = "none";
  $("#mpCardsOverlay").style.display = "none";

  const ch = CHAR[step.char];
  const nameplate = $("#mpName");
  if (step.char === "n" || step.char === "none") {
    nameplate.style.display = "none";
    const spriteEl = $("#mpSprite");
    if (spriteEl) { spriteEl.style.opacity = 0; spriteEl.innerHTML = ""; }
  } else {
    nameplate.style.display = "block";
    nameplate.textContent = charName(step.char);
    $("#mpSprite").style.opacity = 1;
  }

  const textEl = $("#mpText");
  textEl.innerHTML = "";

  // Speak audio
  if (step.char !== "n" && step.char !== "none" && step.say) {
    speak(step.say, ch ? ch.voice : null);
  }

  const rawText = step.say || "";
  const enText = step.en ? `<div class="en" style="margin-top:4px; font-size:13px; color:var(--ink2);">${escapeHtml(step.en)}</div>` : "";

  // Char-by-char typewriter with clack sounds; tap skips to full text
  await typewriterRender(textEl, rawText, enText);
  if (previewQuit) return;

  await previewTap();
}

function charName(who) {
  if (who === "teacher") return "Archmage Corvina";
  if (who === "none" || who === "n") return "Narrator";
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
  const rawPrompt = step.jp || "何と答える？";
  const enText = step.en ? `<div class="en" style="margin-top:4px; font-size:13px; color:var(--ink2);">${escapeHtml(step.en)}</div>` : "";
  await typewriterRender(textEl, rawPrompt, enText);
  if (previewQuit) return;

  $("#mpNext").style.visibility = "hidden";

  const chEl = $("#mpChoices");
  chEl.innerHTML = "";
  chEl.style.display = "flex";

  const options = step.options || [];
  const isGoodBad = (step.choiceMode || "free") === "good-bad";
  const isOrdered = !!step.ordered;

  if (isOrdered) {
    // ---- ORDERED SEQUENCE MODE ----
    const allSorted = [...options].sort((a, b) => (a.order || 0) - (b.order || 0));
    const firstDisabledIdx = allSorted.findIndex(op => op.good === false);
    const sorted = firstDisabledIdx !== -1 ? allSorted.slice(0, firstDisabledIdx) : allSorted;
    let nextExpected = 0;

    await new Promise(res => {
      if (sorted.length === 0) {
        res();
        return;
      }
      const btns = [];
      options.forEach((op) => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.textContent = op.text || "Option";
        const correctIdx = sorted.indexOf(op);
        btn.addEventListener("click", () => {
          if (navigator.vibrate) navigator.vibrate(25);
          if (correctIdx === nextExpected) {
            beep("ok");
            btn.classList.add("matched");
            btn.disabled = true;
            nextExpected++;
            if (nextExpected === sorted.length) setTimeout(res, 400);
          } else {
            beep("no");
            btn.classList.add("wrong");
            setTimeout(() => btn.classList.remove("wrong"), 350);
            if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
          }
        });
        btns.push(btn);
        chEl.appendChild(btn);
      });
      previewResolveTap = () => res();
    });
  } else {
    // ---- FREE / GOOD-BAD MODE ----
    const pickedIdx = await new Promise(res => {
      options.forEach((op, opIdx) => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.textContent = op.text || "Option";
        btn.addEventListener("click", () => {
          if (navigator.vibrate) navigator.vibrate(25);
          if (isGoodBad) {
            if (op.good) {
              beep("ok");
              btn.classList.add("matched");
              particleBurstPreview(btn, 8);
              setTimeout(() => res(opIdx), 350);
            } else {
              beep("no");
              btn.classList.add("wrong");
              if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
              setTimeout(() => { btn.classList.remove("wrong"); res(opIdx); }, 450);
            }
          } else {
            res(opIdx);
          }
        });
        chEl.appendChild(btn);
      });
      previewResolveTap = () => res(-1);
    });

    chEl.style.display = "none";
    if (previewQuit || pickedIdx === -1) return;

    // React
    const chosen = options[pickedIdx];
    if (chosen && (chosen.reaction || chosen.translation)) {
      $("#mpSprite").style.opacity = 1;
      const reactionText = `「${escapeHtml(chosen.reaction || '')}」`;
      const reactionEn = chosen.translation ? `<div class="en" style="margin-top:4px; font-size:13px; color:var(--ink2);">${escapeHtml(chosen.translation)}</div>` : "";
      const ch = CHAR[step.char];
      if (chosen.reaction) speak(chosen.reaction, ch ? ch.voice : null);
      await typewriterRender(textEl, `「${chosen.reaction || ''}」`, reactionEn);
      if (previewQuit) return;
      await previewTap();
      return;
    }
  }

  chEl.style.display = "none";
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

// 4. Cards Step — uses the real Royal Gamble table with full UI/animations
async function playPreviewCards(step) {
  if (previewQuit) return;

  // Hide the maker preview overlay while the real card table takes over
  const makerOverlay = $("#makerPreview");
  makerOverlay.classList.remove("on");

  // Show the real cards screen
  const cardsScreen = $("#s-cards");
  if (cardsScreen) cardsScreen.classList.add("on");

  await new Promise(res => {
    playCardsMiniRound(step.deck || "starter", () => {
      // Round done — hide card table, restore maker preview
      if (cardsScreen) cardsScreen.classList.remove("on");
      makerOverlay.classList.add("on");
      res();
    }, step.char, step.bg);
  });
}

async function getDeck(id) {
  if (deckCache[id]) return deckCache[id];
  const res = await fetch(`./vocab/${id}.json`);
  if (!res.ok) throw new Error("deck fetch failed: " + id);
  const data = await res.json();
  deckCache[id] = data.vocab || data;
  return deckCache[id];
}
