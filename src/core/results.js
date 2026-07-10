import './results.css';
import html from './results.html?raw';
import { $ } from './dom.js';
import { showScreen } from './screens.js';

export function init() {
  $("#s-result").innerHTML = html;
}

/**
 * Shared end-of-game result screen (#s-result). Every daily game funnels
 * through here instead of hand-populating the #res* elements.
 *
 * @param {object} r
 * @param {number} r.score
 * @param {string} r.kind        e.g. "✍️ Kanji writing"
 * @param {Array<{v:(number|string), label:string}>} r.stats  exactly 3 tiles
 * @param {string} r.postLine    HTML line under the score (save/post status)
 * @param {string} r.listTitle
 * @param {string} r.listHtml    HTML for the detail list
 * @param {{label:string, disabled:boolean, onClick:Function}} r.again
 */
export function showResults({ score, kind, stats, postLine, listTitle, listHtml, again }) {
  $("#resScore").textContent = score;
  $("#resKind").textContent = kind;
  const ids = [["#resRight", "#resRightK"], ["#resWrong", "#resWrongK"], ["#resCombo", "#resComboK"]];
  ids.forEach(([v, k], i) => {
    $(v).textContent = stats[i]?.v ?? "";
    $(k).textContent = stats[i]?.label ?? "";
  });
  $("#resPostLine").innerHTML = postLine || "";
  $("#resListTitle").textContent = listTitle || "";
  $("#resList").innerHTML = listHtml || "";
  const btn = $("#btnResAgain");
  btn.disabled = !!again.disabled;
  btn.textContent = again.label;
  btn.onclick = again.onClick;
  showScreen("result");
}
