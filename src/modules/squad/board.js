import { state } from '@core/state.js';
import { escapeHtml } from '@core/dom.js';

/** One leaderboard row (shared by the squad board and the home mini-board). */
export function lbRow(r, i, mode) {
  const sc = mode === "today" ? r.today : r.total;
  const me = r.pid === (state.uid || state.profile?.pid);
  const brk = mode === "today" ? `⚡${r.dS || 0} ・ ✍️${r.dK || 0}` : "";
  return `<div class="row-lb ${me ? "me" : ""}">
    <div class="rank ${i === 0 ? "r1" : ""}">${i === 0 ? "👑" : i + 1}</div>
    <div class="ava">${r.e}</div>
    <div class="nm"><span class="who">${escapeHtml(r.n)}${me ? " (you)" : ""}</span>${brk ? `<span class="brk">${brk}</span>` : ""}</div>
    <div class="sc">${sc}</div></div>`;
}
