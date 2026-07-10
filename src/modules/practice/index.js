import html from './practice.html?raw';
import { $, $$ } from '@core/dom.js';
import { FORMS } from '@content/grammar/forms.js';
import { startTraining } from '@modules/otome/index.js';

/** Practice screen: pick forms/kanji counts and launch teacher-led training. */

function buildChips() {
  const cv = $("#chipsVerb");
  const ca = $("#chipsAdj");
  cv.innerHTML = "";
  ca.innerHTML = "";
  FORMS.forEach(f => {
    const b = document.createElement("button");
    b.className = "chip" + (f.id === "te" ? " on" : "");
    b.dataset.f = f.id;
    b.innerHTML = `${f.jp}<span class="lv">${f.lvl}</span>`;
    b.addEventListener("click", () => b.classList.toggle("on"));
    (f.kind === "v" ? cv : ca).appendChild(b);
  });
  $$("#chipsLen .chip").forEach(c => c.addEventListener("click", () => {
    $$("#chipsLen .chip").forEach(x => x.classList.remove("on"));
    c.classList.add("on");
  }));
}

export function init() {
  $("#s-practice").innerHTML = html;
  buildChips();

  ["ktCount", "ktSrc", "ftCount"].forEach(id => {
    const el = $("#" + id);
    if (el) {
      el.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
        el.querySelectorAll("button").forEach(x => x.classList.remove("on"));
        btn.classList.add("on");
      }));
    }
  });

  const btnTrainK = $("#btnTrainK");
  if (btnTrainK) {
    btnTrainK.addEventListener("click", () => {
      const n = +($("#ktCount .on")?.dataset.n || 5);
      const l = $("#ktSrc .on")?.dataset.l || "";
      startTraining("kanji", { n, lvl: l ? +l : null });
    });
  }

  const btnTrainF = $("#btnTrainF");
  if (btnTrainF) {
    btnTrainF.addEventListener("click", () => {
      const n = +($("#ftCount .on")?.dataset.n || 5);
      const sel = $$("#chipsVerb .chip.on, #chipsAdj .chip.on").map(c => c.dataset.f);
      startTraining("forms", { n, forms: sel });
    });
  }
}
