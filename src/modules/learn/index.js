import html from './learn.html?raw';
import { $, escapeHtml } from '@core/dom.js';
import { spkBtn } from '@core/audio/ui.js';
import { VERBS, ADJS } from '@content/grammar/words.js';
import { FORMS, SENTENCES } from '@content/grammar/forms.js';
import { answer } from '@modules/conjugation/engine.js';

/** Learn tab: the expandable grammar cheat sheet with spoken examples. */

function buildLearn() {
  const wrap = $("#learnList");
  wrap.innerHTML = "";
  const sampleV = ["のむ", "たべる", "いく", "する", "くる"].map(r => VERBS.find(v => v.r === r));
  const sampleA = ["たかい", "いい", "しずか"].map(r => ADJS.find(a => a.r === r));
  FORMS.forEach(f => {
    const samples = f.kind === "v" ? sampleV : (f.iaOnly ? sampleA.filter(a => a.t === "ia") : sampleA);
    const exs = samples.map(w => `<div class="ex"><span>${w.k}（${w.r}）</span><span style="display:flex;align-items:center;gap:8px;"><span class="to">${answer(w, f.id)}</span>${spkBtn(answer(w, f.id))}</span></div>`).join("");
    const s = SENTENCES[f.id];
    const sent = s ? `<div class="sentence">
        <div class="jp"><span>${escapeHtml(s.jp).replace(escapeHtml(s.hi), "<b>" + escapeHtml(s.hi) + "</b>")}</span>${spkBtn(s.jp)}</div>
        <div class="en">${escapeHtml(s.en)}</div></div>` : "";
    const card = document.createElement("div");
    card.className = "card learn-card";
    card.innerHTML = `<button class="learn-head"><span class="fj">${f.jp}</span><span class="fe">${f.en} · ${f.lvl}</span><span class="caret">▸</span></button>
      <div class="learn-body"><div class="rule">${escapeHtml(f.rule)}</div>${sent}${exs}</div>`;
    card.querySelector(".learn-head").addEventListener("click", () => card.classList.toggle("open"));
    wrap.appendChild(card);
  });
}

export function init() {
  $("#s-learn").innerHTML = html;
  buildLearn();
}
