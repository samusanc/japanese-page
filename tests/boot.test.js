// @vitest-environment jsdom
// Boot smoke test: loads the real index.html markup + kanji data into jsdom
// and runs the actual src/main.js boot sequence. Catches wiring regressions
// (missing DOM ids, broken imports, init-order bugs) that unit tests can't.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Don't let the boot sequence hit the real Supabase backend from tests —
// keep the rest of backend.js (local fallbacks) intact.
vi.mock('@core/backend.js', async importOriginal => {
  const mod = await importOriginal();
  return { ...mod, beInit: async () => false };
});

const root = p => fileURLToPath(new URL('../' + p, import.meta.url));

beforeAll(async () => {
  // Real page markup (body only — head scripts don't run in jsdom).
  const html = readFileSync(root('index.html'), 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

  // The classic-script globals normally loaded via <script src="./kanji-data.js">.
  (0, eval)(readFileSync(root('public/kanji-data.js'), 'utf8'));

  window.scrollTo = () => {};
  vi.stubGlobal('Audio', class { constructor() { this.preload = ''; } addEventListener() {} play() { return Promise.resolve(); } pause() {} });

  await import('../src/main.js');
  await new Promise(r => setTimeout(r, 50)); // let the async boot settle
});

describe('app boot', () => {
  it('renders the home screen date and daily cards', () => {
    expect(document.querySelector('#todayDate').textContent).not.toBe('');
    expect(document.querySelector('#attemptBadge').textContent).toContain('tries left');
    expect(document.querySelector('#kAttemptBadge').textContent).toContain('tries left');
  });

  it("previews today's 5 daily forms and 5 kanji", () => {
    expect(document.querySelectorAll('#dailyForms .chip-sm').length).toBe(5);
    expect(document.querySelectorAll('#kanjiPreview .kp').length).toBe(5);
  });

  it("fills the character slices with today's roster", () => {
    const names = [...document.querySelectorAll('.char-slice .slice-name')].map(e => e.textContent);
    expect(names.length).toBeGreaterThanOrEqual(3);
    names.slice(0, 3).forEach(n => expect(n).not.toBe(''));
  });

  it('opens onboarding when no profile exists', () => {
    expect(document.querySelector('#onb').classList.contains('on')).toBe(true);
  });

  it('builds the learn tab cheat sheet', () => {
    expect(document.querySelectorAll('#learnList .learn-card').length).toBeGreaterThan(10);
  });

  it('builds the practice form chips', () => {
    expect(document.querySelectorAll('#chipsVerb .chip').length).toBeGreaterThan(5);
    expect(document.querySelectorAll('#chipsAdj .chip').length).toBeGreaterThan(2);
  });

  it('navigates between screens via showScreen', async () => {
    const { showScreen } = await import('../src/core/screens.js');
    showScreen('kanji');
    expect(document.querySelector('#s-kanji').classList.contains('on')).toBe(true);
    expect(document.querySelector('#s-home').classList.contains('on')).toBe(false);
    // kanji dictionary renderer ran on entry
    expect(document.querySelectorAll('#kanjiGrid .ktile').length).toBeGreaterThan(50);
    showScreen('home');
    expect(document.querySelector('#s-home').classList.contains('on')).toBe(true);
  });

  it('solo-mode leaderboard fallback renders', () => {
    expect(document.querySelector('#miniBoard').textContent).toContain('Solo mode');
  });

  it('the Royal Gamble table opens from the home button', () => {
    document.querySelector('#btnCards').click();
    expect(document.querySelector('#cards').classList.contains('on')).toBe(true);
    expect(document.querySelector('#cdStart').classList.contains('on')).toBe(true);
    expect(document.querySelector('#cdHostName').textContent).not.toBe('');
    expect(document.querySelectorAll('#cdDecks .cd-deck-btn').length).toBe(6);
    document.querySelector('#cdClose').click();
    expect(document.querySelector('#cards').classList.contains('on')).toBe(false);
  });

  it('sprint launches from the home button and quit lands on results', async () => {
    document.querySelector('#btnDaily').click();
    expect(document.querySelector('#game').classList.contains('on')).toBe(true);
    expect(document.querySelector('#count').classList.contains('on')).toBe(true);

    document.querySelector('#sprQuit').click();       // end early
    await new Promise(r => setTimeout(r, 20));        // let the async commit settle
    expect(document.querySelector('#game').classList.contains('on')).toBe(false);
    expect(document.querySelector('#s-result').classList.contains('on')).toBe(true);
    expect(document.querySelector('#resKind').textContent).toContain('sprint');
    expect(document.querySelector('#resPostLine').textContent).toContain('ended early');
  });
});
