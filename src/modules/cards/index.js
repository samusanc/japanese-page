import './cards.css';
import html from './cards.html?raw';
import { initGame, openCards } from './game.js';
import { registerScreen } from '@core/screens.js';

/** Royal Gamble — the Gambler Prince's card-matching table. */

export function init() {
  const container = document.getElementById("s-cards");
  if (container) {
    container.innerHTML = html;
  }
  initGame();
  registerScreen("cards", openCards);
}
