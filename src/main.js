/**
 * Composition root — the only file that knows about every module.
 * Boot order: settings → core UI services → feature module init() →
 * restore profile/day state → first render → backend connect.
 */
// Global styles first (design tokens → chrome → shared overlay plumbing);
// each feature module imports its own stylesheet.
import './styles/tokens.css';
import './styles/base.css';
import './styles/overlays.css';
import './styles/game-overlay.css';

import { state } from '@core/state.js';
import { LS } from '@core/storage.js';
import { initSettings } from '@core/settings.js';
import { initTabs } from '@core/screens.js';
import { loadDayRec } from '@core/daily.js';
import { beInit, beSaveProfile } from '@core/backend.js';
import { initAudioUI } from '@core/audio/ui.js';
import { configureAudio } from '@core/audio/engine.js';
import { initPwa } from '@core/pwa.js';
import * as results from '@core/results.js';
import { BALANCE } from '@content/balance.js';
import { MUSIC, AMBIENCE, SFX } from '@content/otome/index.js';

import * as otome from '@modules/otome/index.js';
import * as sprint from '@modules/sprint/index.js';
import * as cards from '@modules/cards/index.js';
import * as kanjiDaily from '@modules/kanji/daily/index.js';
import * as kanjiDictionary from '@modules/kanji/dictionary/index.js';
import * as home from '@modules/home/index.js';
import * as squad from '@modules/squad/index.js';
import * as learn from '@modules/learn/index.js';
import * as practice from '@modules/practice/index.js';
import * as maker from '@modules/maker/index.js';

(async function boot() {
  // Dev-only: validate all game content and fail loudly on broken refs.
  if (import.meta.env.DEV) {
    const [{ validateContent }, { OTOME_CONTENT }, words, forms, engine] = await Promise.all([
      import('@content/validate.js'),
      import('@content/otome/index.js'),
      import('@content/grammar/words.js'),
      import('@content/grammar/forms.js'),
      import('@modules/conjugation/engine.js')
    ]);
    const { errors, warnings } = validateContent(OTOME_CONTENT, {
      VERBS: words.VERBS, ADJS: words.ADJS, FORM: forms.FORM, answerFor: engine.answer
    });
    warnings.forEach(w => console.warn('[content]', w));
    if (errors.length) {
      errors.forEach(e => console.error('[content]', e));
      throw new Error(`Content validation failed: ${errors.length} error(s) — see console`);
    }
  }

  initSettings();
  initAudioUI();
  configureAudio({ music: MUSIC, ambience: AMBIENCE, sfx: SFX, musicFadeMs: BALANCE.audio.musicFadeMs });
  initTabs();

  results.init();
  otome.init();
  sprint.init();
  cards.init();
  kanjiDaily.init();
  kanjiDictionary.init();
  home.init();
  squad.init();
  learn.init();
  practice.init();
  maker.init();
  initPwa();

  state.profile = LS.get("profile");
  loadDayRec();

  home.renderHome();
  if (!state.profile) squad.openOnb(false);

  const ok = await beInit();
  if (ok && state.profile) await beSaveProfile();
  home.renderHome();
})();
