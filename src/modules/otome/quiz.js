import { $, escapeHtml } from '@core/dom.js';
import { shuffle } from '@core/util.js';
import { speak } from '@core/audio/voice.js';
import { beep } from '@core/audio/sfx.js';
import { VERBS, ADJS } from '@content/grammar/words.js';
import { FORM } from '@content/grammar/forms.js';
import { answer, buildQuestion } from '@modules/conjugation/engine.js';
import { ctx, vnCheck, vnTap } from './context.js';
import { CHAR } from '@content/otome/index.js';
import { vnSpriteSet, updHud, vnYell, particleBurst } from './stage.js';
import { srsBump } from './srs.js';
import { QUIZ_POINTS } from './constants.js';

export function findWord(r) {
  return VERBS.find(v => v.r === r) || ADJS.find(a => a.r === r);
}

/** "dict"/"aplain" mean the plain form itself; anything else conjugates. */
export function quizAnswerFor(item, form) {
  if (form === "dict" || form === "aplain") return item.r;
  return answer(item, form);
}

function safeAnswer(item, form) {
  try {
    return answer(item, form);
  } catch (e) {
    return item.r;
  }
}

export function quizOptionsFor(item, form) {
  if (form === "dict") {
    return shuffle([
      item.r,
      safeAnswer(item, "te"),
      safeAnswer(item, "masu"),
      safeAnswer(item, "nai")
    ]);
  }
  if (form === "aplain") {
    return shuffle([
      item.r,
      safeAnswer(item, "aneg"),
      safeAnswer(item, "apast"),
      safeAnswer(item, "ate")
    ]);
  }
  // Distractors are wrong conjugations of the same word (conjugation engine).
  return buildQuestion(item, form, null).options;
}

export function formJp(f) {
  return FORM[f] ? FORM[f].jp : (f === "dict" ? "辞書形" : "形容詞・現在");
}

/** In-story conjugation question; fills the blank in q.jp. */
export async function vnQuiz(q) {
  vnCheck();
  const vn = ctx.vn;
  const item = findWord(q.word);
  if (!item) {
    console.warn("quiz word missing:", q.word);
    return;
  }
  if (q.who && CHAR[q.who]) vnSpriteSet(q.who);
  const correct = quizAnswerFor(item, q.form);
  const options = quizOptionsFor(item, q.form);
  vn.curA = correct;

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
    vn._res = res;
    chEl.innerHTML = "";
    options.forEach(op => {
      const b = document.createElement("button");
      b.className = "choice";
      b.style.fontSize = "16px";
      b.style.padding = "13px 6px";
      b.textContent = op;
      b.addEventListener("click", () => {
        if (ctx.vn && ctx.vn._res) {
          const r = ctx.vn._res;
          ctx.vn._res = null;
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
  speak(q.jp.replace("＿＿", correct), (q.who && CHAR[q.who]?.voice) || vn.ch.voice);
  srsBump("fsrs", q.form, right);

  if (right) {
    vn.gPts += QUIZ_POINTS;
    vn.score += QUIZ_POINTS;
    beep("ok");
    $("#vnText").innerHTML = "Correct! ✦";
    const rb = [...chEl.children].find(b => b.textContent === correct);
    if (rb) particleBurst(rb, 10, false);
  } else {
    vn.fails++;
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
  vn.curA = null;
}
