import './cards.css';
import html from './cards.html?raw';
import { initGame, openCards } from './game.js';

/** Royal Gamble — the Gambler Prince's card-matching table. */
export { openCards as startCards };

export function init() {
  document.body.insertAdjacentHTML("beforeend", html);
  initGame();
}
