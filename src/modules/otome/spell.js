import { $, escapeHtml } from '@core/dom.js';
import { pick } from '@core/util.js';
import { speak } from '@core/audio/voice.js';
import { beep } from '@core/audio/sfx.js';
import { makeWriter, keepInk, bloomInk, strokeGuide } from '@modules/kanji/writer.js';
import { ctx, vnCheck } from './context.js';
import { TEACHER } from '@content/otome/index.js';
import { vnSay, updHud, vnYell, particleBurst } from './stage.js';
import { srsBump } from './srs.js';
import { SPELL_POINTS, CLASSROOM_POINTS, WRITING, OTOME_WRITER_STYLE, HANZI_DEMO_STROKE } from './constants.js';

/** In-VN HanziWriter with the gold spellcasting palette. */
function otomeWriter(box, char, opts) {
  return makeWriter(box, char, Object.assign({}, OTOME_WRITER_STYLE, opts));
}

/** Battle/training spell: write the kanji from memory. Returns true if clean. */
export async function castKanji(k, battle) {
  vnCheck();
  const vn = ctx.vn;
  vn.curK = k.c;
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
    skipBtn.style.display = "block";
    skipBtn.onclick = () => {
      skipBtn.style.display = "none";
      const r = ctx.vn && ctx.vn._res;
      if (ctx.vn) ctx.vn._res = null;
      if (r) r({ revealed: true, s: { totalMistakes: 99 } });
    };
  }

  let w;
  const guide = strokeGuide(() => w);
  const sum = await new Promise(res => {
    vn._res = res;
    w = otomeWriter(box, k.c, { showOutline: false });
    w.quiz({
      leniency: WRITING.battleLeniency,
      showHintAfterMisses: WRITING.hintAfterMisses,
      onMistake: d => {
        if (!ctx.vn || ctx.vn.quit) return;
        guide.trackMistake(d);
        mistakes++;
        beep("no");
        vnYell();
        if (mistakes >= WRITING.missesBeforeReveal && !revealed) {
          revealed = true;
          if (battle) {
            vn.lives = Math.max(0, vn.lives - 1);
            updHud();
          }
          guide.reveal(); // one glowing stroke at a time, never the whole sign
          $("#vnWFeedback").textContent = "Follow the glowing stroke!";
          $("#vnWFeedback").className = "k-feedback bad";
          if (skipBtn) skipBtn.style.display = "block";
        } else if (!revealed) {
          const left = WRITING.missesBeforeReveal - mistakes;
          $("#vnWFeedback").textContent = `✕ ${left} ${left === 1 ? "miss" : "misses"} before the sign fades in`;
          $("#vnWFeedback").className = "k-feedback bad";
        }
      },
      onCorrectStroke: d => {
        keepInk(box);
        guide.trackCorrect(d);
        if (!revealed) {
          $("#vnWFeedback").textContent = "✓";
          $("#vnWFeedback").className = "k-feedback";
          particleBurst(box, 4, false);
        }
      },
      onComplete: s => {
        if (skipBtn) skipBtn.style.display = "none";
        const r = ctx.vn && ctx.vn._res;
        if (ctx.vn) ctx.vn._res = null;
        if (r) r({ s, revealed });
      }
    });
  });

  vnCheck();
  srsBump("ksrs", k.c, !sum.revealed && sum.s.totalMistakes <= 2);
  const pts = sum.revealed
    ? SPELL_POINTS.revealed
    : Math.max(SPELL_POINTS.min, SPELL_POINTS.base - SPELL_POINTS.perMistake * sum.s.totalMistakes);
  if (battle && sum.revealed) vn.fails++;
  vn.wPts += pts;
  vn.score += pts;
  updHud();

  if (!sum.revealed) {
    const stp = $("#vnStamp");
    stp.classList.remove("hit");
    void stp.offsetWidth;
    stp.classList.add("hit");
    beep("ok");
    bloomInk(box, { color: "#FFF6DE", glow: "rgba(233,200,104,1)" });
    box.classList.remove("cast");
    void box.offsetWidth;
    box.classList.add("cast");
    particleBurst(box, 18, true);
  }

  await new Promise(r => setTimeout(r, sum.revealed ? 950 : 1500));
  $("#vnStamp").classList.remove("hit");
  box.classList.remove("cast");
  area.style.display = "none";
  $("#vnSprite").style.opacity = 1;
  vn.curK = null;
  vnCheck();
  return !sum.revealed && sum.s.totalMistakes <= 2;
}

export async function vnSpell(idx) {
  return castKanji(ctx.vn.kanji[idx], true);
}

/** Classroom: watch the stroke animation. */
export async function vnWatch(k) {
  vnCheck();
  $("#vnName").style.display = "";
  $("#vnName").textContent = TEACHER.name;
  $("#vnName").style.background = "";
  $("#vnName").style.color = "";
  $("#vnText").innerHTML = escapeHtml(TEACHER.watch) + ` 「<b>${k.c}</b>・${escapeHtml(k.r)}」`;
  $("#vnNext").style.visibility = "hidden";

  const area = $("#vnWriterArea");
  area.style.display = "";
  $("#vnSprite").style.opacity = 0.25;
  $("#vnWFeedback").textContent = "watch the strokes…";
  $("#vnWFeedback").className = "k-feedback";

  await new Promise(res => {
    ctx.vn._res = res;
    const w = otomeWriter($("#vnWriterBox"), k.c, {
      showCharacter: true, showOutline: false,
      strokeColor: HANZI_DEMO_STROKE,
      strokeAnimationSpeed: 1.05, delayBetweenStrokes: 240
    });
    const finish = () => {
      area.removeEventListener("click", skip);
      const r = ctx.vn && ctx.vn._res;
      if (ctx.vn) ctx.vn._res = null;
      if (r) r();
    };
    // tap the kanji to skip the demonstration
    const skip = () => {
      try {
        w.pauseAnimation();
        w.showCharacter({ duration: 150 });
      } catch (e) {}
      setTimeout(finish, 350);
    };
    area.addEventListener("click", skip);
    setTimeout(() => w.animateCharacter({
      onComplete: () => setTimeout(finish, 450)
    }), 250);
  });

  vnCheck();
  area.style.display = "none";
  $("#vnSprite").style.opacity = 1;
}

/** Classroom trace/recall step, up to N attempts. */
export async function vnStep(k, mode) {
  const vn = ctx.vn;
  const T = TEACHER;
  const area = $("#vnWriterArea");
  await vnSay("teacher", (mode === "trace" ? T.trace : T.recall) + ` — 「${k.m}」`);

  const MAX = WRITING.attemptsPerStep;
  for (let a = 1; a <= MAX; a++) {
    vnCheck();
    vn.curK = k.c;
    area.style.display = "";
    $("#vnSprite").style.opacity = 0.25;
    $("#vnName").style.display = "none";
    $("#vnText").innerHTML = (mode === "trace" ? "Trace the guide" : "From memory") + `: <b>${escapeHtml(k.m)}</b> 「${escapeHtml(k.r)}」 <span style="color:var(--ink2)">— attempt ${a}/${MAX}</span>`;
    $("#vnNext").style.visibility = "hidden";
    $("#vnWFeedback").textContent = "";

    let mistakes = 0, revealed = false, skipped = false;
    const skipBtn = $("#vnSkip");
    if (skipBtn) {
      skipBtn.style.display = "block";
      skipBtn.onclick = () => {
        skipped = true;
        skipBtn.style.display = "none";
        const r = ctx.vn && ctx.vn._res;
        if (ctx.vn) ctx.vn._res = null;
        if (r) r({ totalMistakes: 99 });
      };
    }

    let w;
    const guide = strokeGuide(() => w);
    const s = await new Promise(res => {
      vn._res = res;
      w = otomeWriter($("#vnWriterBox"), k.c, { showOutline: mode === "trace" });
      w.quiz({
        leniency: WRITING.traceLeniency,
        showHintAfterMisses: WRITING.hintAfterMisses,
        onMistake: d => {
          if (!ctx.vn || ctx.vn.quit) return;
          guide.trackMistake(d);
          beep("no");
          if (mode === "trace") {
            $("#vnWFeedback").textContent = "✕ order & direction, apprentice!";
            $("#vnWFeedback").className = "k-feedback bad";
          } else {
            mistakes++;
            if (mistakes >= WRITING.missesBeforeReveal && !revealed) {
              revealed = true;
              guide.reveal(); // one glowing stroke at a time
              $("#vnWFeedback").textContent = "Follow the glowing stroke!";
              $("#vnWFeedback").className = "k-feedback bad";
              if (skipBtn) skipBtn.style.display = "block";
            } else if (!revealed) {
              const left = WRITING.missesBeforeReveal - mistakes;
              $("#vnWFeedback").textContent = `✕ ${left} ${left === 1 ? "miss" : "misses"} before the shadow`;
              $("#vnWFeedback").className = "k-feedback bad";
            }
          }
        },
        onCorrectStroke: d => {
          keepInk($("#vnWriterBox"));
          guide.trackCorrect(d);
          if (mode === "trace" || !revealed) {
            $("#vnWFeedback").textContent = "✓";
            $("#vnWFeedback").className = "k-feedback";
          }
        },
        onComplete: x => {
          if (skipBtn) skipBtn.style.display = "none";
          const r = ctx.vn && ctx.vn._res;
          if (ctx.vn) ctx.vn._res = null;
          if (r) r(x);
        }
      });
    });

    vnCheck();
    area.style.display = "none";
    $("#vnSprite").style.opacity = 1;

    if (skipped) {
      if (mode === "recall") srsBump("ksrs", k.c, false);
      break;
    }

    if (s.totalMistakes <= 2) {
      const pts = s.totalMistakes === 0 ? CLASSROOM_POINTS.clean : CLASSROOM_POINTS.sloppy;
      vn.wPts += pts;
      vn.score += pts;
      updHud();
      beep("ok");
      area.style.display = "";
      bloomInk($("#vnWriterBox"), { color: "#FFF6DE", glow: "rgba(233,200,104,1)" });
      particleBurst($("#vnWriterBox"), 10, true);
      await new Promise(r => setTimeout(r, 1100));
      area.style.display = "none";
      if (mode === "recall") srsBump("ksrs", k.c, a === 1);
      break;
    }

    if (mode === "recall" && a === MAX) srsBump("ksrs", k.c, false);
    if (a < MAX) await vnSay("teacher", pick(TEACHER.retry));
    else await vnSay("teacher", "…We move on. But drill that sign in the Kanji studio later, apprentice.");
  }
  vn.curK = null;
}
