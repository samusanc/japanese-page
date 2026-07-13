import { state } from '@core/state.js';
import { $, escapeHtml } from '@core/dom.js';
import { pick, resolveAsset } from '@core/util.js';
import { speak } from '@core/audio/voice.js';
import { applySceneAudio } from '@core/audio/engine.js';
import { ctx, vnCheck, vnTap } from './context.js';
import { TEACHER, SCENES, CHAR } from '@content/otome/index.js';
import { LIVES, TYPEWRITER_MS, SPARKLE, PLATE_INK } from './constants.js';

/** Everything that touches the #vn* stage DOM: scene backdrop, sprite,
 *  HUD, yells, particles and the typewriter dialogue. */

/** Active particle config — scene definitions can override, applyScene resets. */
export const particleCfg = { ...SPARKLE };

function setParticles(p) {
  Object.assign(particleCfg, SPARKLE, p || {});
}

/**
 * Apply a full scene: backdrop (img or gradient), CSS filter, vignette,
 * particle config and the scene's declarative audio.
 */
export function applyScene(id) {
  const sc = SCENES[id];
  if (!sc) return;
  const bgEl = $("#vnBg");
  bgEl.style.background = sc.img ? `url('${resolveAsset(sc.img)}') center/cover no-repeat` : sc.bg;
  bgEl.style.setProperty("--vn-filter", sc.filter || "brightness(1)");
  bgEl.style.setProperty("--vn-vignette", sc.vignette || "none");
  setParticles(sc.particles);
  applySceneAudio(sc.audio || {});
}

export function vnSpriteSet(who) {
  const el = $("#vnSprite");
  if (who === "n") {
    el.style.opacity = 0;
    return;
  }
  el.style.opacity = 1;
  el.classList.toggle("left", who === "teacher");
  let icon, img = null;
  if (who === "teacher") {
    icon = TEACHER.icon;
    img = resolveAsset(TEACHER.img);
  } else if (who === "you") {
    icon = state.profile?.e || "🌸";
  } else {
    const c = CHAR[who] || ctx.vn.ch;
    icon = c.icon;
    img = resolveAsset(c.sprites.default);
  }
  el.innerHTML = img ? `<img src="${img}" alt="">` : icon;
}

export function vnWho(who) {
  if (who === "teacher") return TEACHER.name;
  if (who === "you") return state.profile?.n || "You";
  return (CHAR[who] || ctx.vn.ch).persona.name;
}

export function updHud() {
  const vn = ctx.vn;
  $("#vnScore").textContent = vn.score;
  const el = $("#vnHearts");
  if (el) {
    el.style.display = vn.training ? "none" : "flex";
    if (!vn.training) {
      const pct = (vn.lives / LIVES) * 100;
      const label = vn.lives === LIVES ? "⚜️ Wards: Stable" : (vn.lives === 1 ? "⚡ Wards: Fractured" : "💔 Wards: Broken");
      el.innerHTML = `
        <div class="royal-bar-container">
          <div class="royal-bar-label">${label}</div>
          <div class="royal-bar-frame">
            <div class="royal-bar-fill" style="width: ${Math.max(0, pct)}%;"></div>
          </div>
        </div>
      `;
    }
  }
}

export function vnYell() {
  const vn = ctx.vn;
  const src = vn.training ? TEACHER : vn.ch;
  const y = src.yells[vn.yellIdx++ % src.yells.length];
  const el = $("#vnYell");
  el.classList.toggle("left", !!vn.training);
  el.innerHTML = escapeHtml(y.jp) + `<span class="en">${escapeHtml(y.en)}</span>`;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
  speak(y.jp, src.voice);
  if (navigator.vibrate) navigator.vibrate(50);
}

export function particleBurst(el, n, big) {
  try {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < (n || 12); i++) {
      const s = document.createElement("div");
      s.textContent = pick(SPARKLE.burstGlyphs);
      s.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;z-index:99;pointer-events:none;color:${particleCfg.color};font-size:${big ? 14 + Math.random() * 14 : 8 + Math.random() * 8}px;text-shadow:0 0 8px rgba(233,200,104,.9);`;
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2;
      const d = (big ? 70 : 34) + Math.random() * (big ? 90 : 44);
      s.animate([
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - (big ? 26 : 10)}px) scale(${big ? 1.5 : 1.1})`, opacity: 0 }
      ], {
        duration: 650 + Math.random() * 550,
        easing: "cubic-bezier(.2,.8,.3,1)"
      }).onfinish = () => s.remove();
    }
  } catch (err) {}
}

export function burstHearts() {
  const st = $("#vnEnding");
  for (let i = 0; i < 12; i++) {
    const h = document.createElement("div");
    h.className = "heartburst";
    h.textContent = pick(["⚜️", "👑", "✨", "✦", "💖"]);
    h.style.left = (10 + Math.random() * 80) + "%";
    h.style.top = (35 + Math.random() * 40) + "%";
    h.style.animationDelay = (Math.random() * 0.9) + "s";
    st.appendChild(h);
    setTimeout(() => h.remove(), 2300);
  }
}

/** Dialogue line with typewriter effect; resolves on tap. */
export async function vnSay(who, text, en) {
  vnCheck();
  vnSpriteSet(who);
  const nm = $("#vnName");
  nm.style.display = who === "n" ? "none" : "";
  nm.textContent = vnWho(who);

  if (who !== "n" && who !== "you" && who !== "teacher") {
    const c = CHAR[who] || ctx.vn.ch;
    nm.style.background = `linear-gradient(135deg,${c.colors.accent},${c.colors.accent2})`;
    nm.style.color = c.colors.plateInk || PLATE_INK;
  } else {
    nm.style.background = "";
    nm.style.color = "";
  }

  const txt = $("#vnText");
  $("#vnNext").style.visibility = "hidden";
  ctx.vn._typing = true;
  ctx.vn._skipType = false;
  for (let i = 0; i <= text.length; i++) {
    if (ctx.vn._skipType) break;
    txt.innerHTML = escapeHtml(text.slice(0, i));
    await new Promise(r => setTimeout(r, TYPEWRITER_MS));
    vnCheck();
  }
  txt.innerHTML = escapeHtml(text) + (en ? `<span class="en">${escapeHtml(en)}</span>` : "");
  ctx.vn._typing = false;
  $("#vnNext").style.visibility = "visible";
  await vnTap();
  vnCheck();
}
