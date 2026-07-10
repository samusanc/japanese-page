import { $ } from '@core/dom.js';
import { showScreen } from '@core/screens.js';
import { ctx } from './context.js';
import { TEACHER, CHAR, CHARACTERS } from '@content/otome/index.js';
import { todayRoster } from './state.js';
import { applyScene, vnSpriteSet, vnSay, updHud } from './stage.js';
import { stopAllLoops } from '@core/audio/engine.js';
import { vnQuiz } from './quiz.js';
import { castKanji } from './spell.js';
import { srsPickKanji, srsPickForms } from './srs.js';
import { closeVN } from './route.js';
import { LIVES } from './constants.js';

/** Training hall: SRS-driven kanji or grammar practice hosted by the teacher. */
export async function startTraining(kind, opts) {
  const host = CHAR[todayRoster()[0]] || CHARACTERS[0];
  ctx.vn = {
    training: true,
    kind,
    ch: host,
    kanji: [],
    fails: 0,
    lives: LIVES,
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
  applyScene("academy");
  const T = TEACHER;
  const vn = ctx.vn;

  try {
    if (kind === "kanji") {
      await vnSay("teacher", T.train.introK);
      const set = srsPickKanji(opts.n, opts.lvl);
      vn.total = set.length;
      for (let i = 0; i < set.length; i++) {
        const k = set[i];
        await vnSay("teacher", `Sign ${i + 1} of ${set.length}: 「${k.m}」（${k.r}）. Cast!`);
        if (await castKanji(k, false)) vn.clean++;
      }
    } else {
      await vnSay("teacher", T.train.introF);
      const qs = srsPickForms(opts.n, opts.forms);
      vn.total = qs.length;
      for (const q of qs) await vnQuiz(q);
      vn.clean = vn.total - vn.fails;
    }
    await vnSay("teacher", T.train.done);
    trainingEnd();
  } catch (err) {
    if (err !== "quit") console.error(err);
  }
}

function trainingEnd() {
  const v = ctx.vn;
  $("#vnEndCard").innerHTML = `
    <div style="font-size:44px;">${TEACHER.img ? `<img src="${TEACHER.img}" style="height:80px;border-radius:16px;">` : TEACHER.icon}</div>
    <div class="big-oc" style="color:var(--gold)">Training complete ✦</div>
    <p class="sub" style="margin-bottom:12px;">${v.kind === "kanji" ? "Signs cast cleanly" : "Declarations delivered"}: <b style="color:var(--gold)">${v.clean}/${v.total}</b><br>The arcana recorded everything — weak ${v.kind === "kanji" ? "signs" : "forms"} will return sooner.</p>
    <div class="res-score" style="padding:0 0 10px;"><div class="n" style="font-size:44px;">${v.score}</div><div class="k">practice score</div></div>
    <button class="btn gold" id="vnEndBtn">Leave the hall ✦</button>`;
  $("#vnEnding").classList.add("on");
  stopAllLoops();
  $("#vnEndBtn").addEventListener("click", () => {
    closeVN();
    showScreen("practice");
  });
}
