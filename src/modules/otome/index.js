import './otome.css';
import html from './vn.html?raw';
import { $, toast } from '@core/dom.js';
import { pick } from '@core/util.js';
import { ctx } from './context.js';
import { applyOutcome, closeVN } from './route.js';
import { particleCfg } from './stage.js';

/** Public surface of the otome module. */
export { startRoute } from './route.js';
export { startTraining } from './training.js';
export { charState, setCharState, todayRoster } from './state.js';
export { CHAR } from '@content/otome/index.js';

export function init() {
  document.body.insertAdjacentHTML("beforeend", html);

  $("#vnDialog").addEventListener("click", () => {
    const vn = ctx.vn;
    if (!vn) return;
    if (vn._typing) {
      vn._skipType = true;
      return;
    }
    const t = vn._tap;
    vn._tap = null;
    if (t) t();
  });

  $("#vnQuit").addEventListener("click", () => {
    if (!ctx.vn) return;
    const v = ctx.vn;
    const inStory = !v.training && v.stage !== "class";
    v.quit = true;
    if (v._tap) {
      const t = v._tap;
      v._tap = null;
      t();
    }
    if (v._res) {
      const r = v._res;
      v._res = null;
      r({ totalMistakes: 99, s: { totalMistakes: 99 }, revealed: true });
    }
    if (inStory) {
      applyOutcome(v, "fail");
      toast("You fled the story… " + v.ch.name + " won't forget this. 💔");
    }
    closeVN();
  });

  // Ambient sparkles drifting over the stage while a run is active.
  setInterval(() => {
    if (!ctx.vn) return;
    const st = document.querySelector("#vn .vn-stage");
    if (!st || st.querySelectorAll(".sparkle").length > particleCfg.max) return;
    const s = document.createElement("div");
    s.className = "sparkle";
    s.style.color = particleCfg.color;
    s.textContent = pick(particleCfg.glyphs);
    s.style.left = (2 + Math.random() * 96) + "%";
    s.style.fontSize = (7 + Math.random() * 11) + "px";
    s.style.animationDuration = (6 + Math.random() * 7) + "s";
    st.appendChild(s);
    setTimeout(() => {
      s.remove();
    }, 14000);
  }, particleCfg.intervalMs);
}
