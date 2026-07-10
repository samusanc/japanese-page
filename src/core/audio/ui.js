import { state } from '../state.js';
import { LS } from '../storage.js';
import { escapeHtml, $ } from '../dom.js';
import { speak } from './voice.js';

/** Inline speaker-button HTML; clicks are handled by the [data-say] delegate. */
export function spkBtn(text, big) {
  return `<button class="spk${big ? " big" : ""}" data-say="${escapeHtml(text)}" aria-label="play audio">🔊</button>`;
}

export function renderSoundToggle() {
  const b = $("#soundToggle");
  if (!b) return;
  b.textContent = state.sndOn ? "🔊" : "🔇";
  b.classList.toggle("off", !state.sndOn);
}

export function initAudioUI() {
  // Delegated handler: any element with data-say speaks its text on click.
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-say]");
    if (b) {
      e.stopPropagation();
      speak(b.dataset.say);
    }
  });

  const toggleBtn = $("#soundToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      state.sndOn = !state.sndOn;
      LS.set("sound", state.sndOn);
      renderSoundToggle();
      if (state.sndOn) {
        speak("こんにちは");
      } else {
        try {
          speechSynthesis.cancel();
        } catch (e) {}
      }
    });
  }
  renderSoundToggle();
}
