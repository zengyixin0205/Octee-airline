// Joel mode: Joel "closes tabs" on the whole site. A browser page cannot close your real tabs (browsers do not allow it),
// so Joel closes parts of THIS page instead, says sorry, and puts them back when you ask. Off by default. It resets on reload
// only in the sense that nothing stays closed: the on/off switch is remembered in this browser.
import { el } from "./dom.js";
import { load, save } from "./store.js";

const KEY = "octee.joelmode";
const SORRY = ["Sorry! I thought that was my tab!", "Sorry! That one looked unused.", "Sorry! It was open. I closed it. It is a habit.", "Sorry! I closed it by mistake. On purpose.", "Sorry! Was that important? It looked delayed.", "Sorry. I am a joel. That is the whole reason."];
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const joelModeOn = () => load(KEY, "off") === "on";
let timer = null, closed = [], pill = null, sayEl = null;

export function setJoelMode(on) {
  save(KEY, on ? "on" : "off");
  if (on) start(); else stop();
  paintToggle();
}

function candidates() {
  const sel = "main :is(.card, h2, h3, p, ul, table, figure, details, .shop-item, section), footer.site-footer p";
  return [...document.querySelectorAll(sel)].filter((n) => {
    if (n.closest(".jai-modal, .modal-back, .joel-mode-pill, .joel-mode-say, .joel-fab-wrap, .joel-closed-note, .crush-404, .jm-toggle")) return false;
    if (n.classList.contains("joel-closed") || n.closest(".joel-closed")) return false;
    if (n.querySelector(".jm-toggle, .joel-closed-note, #jai-q, .joel-fab, [data-joel-keep]")) return false;
    if (n.contains(document.activeElement) && document.activeElement !== document.body) return false;
    const r = n.getBoundingClientRect();
    return r.height > 24 && r.height < 900 && r.width > 40;
  });
}

function say(t) {
  if (!sayEl) { sayEl = el("div", { class: "joel-mode-say", role: "status", "aria-live": "polite" }); document.body.append(sayEl); }
  sayEl.textContent = t; sayEl.classList.add("show");
  clearTimeout(say.t); say.t = setTimeout(() => sayEl && sayEl.classList.remove("show"), 3200);
}

function closeOne() {
  if (document.hidden || document.querySelector(".jai-modal, .modal-back, .crush-404")) return;
  if (closed.length >= 6) { restoreAll("Joel found them all in his other trousers."); return; }
  const list = candidates(); if (!list.length) return;
  const n = list[Math.floor(Math.random() * list.length)];
  const note = el("div", { class: "joel-closed-note", role: "note" },
    el("span", {}, "✕ Joel closed this tab. "),
    el("button", { class: "linklike", type: "button", onclick: () => reopen(item) }, "Undo"));
  const item = { n, note };
  n.before(note);
  if (reduce()) n.classList.add("joel-closed"); else { n.classList.add("joel-closing"); setTimeout(() => { n.classList.add("joel-closed"); n.classList.remove("joel-closing"); }, 360); }
  closed.push(item); say(SORRY[Math.floor(Math.random() * SORRY.length)]);
}
function reopen(item) { item.n.classList.remove("joel-closed", "joel-closing"); item.note.remove(); closed = closed.filter((x) => x !== item); }
function restoreAll(msg) { [...closed].forEach(reopen); if (msg) say(msg); }

function schedule() { timer = setTimeout(() => { closeOne(); if (timer) schedule(); }, 18000 + Math.random() * 30000); }
function start() {
  stop(); closed = [];
  pill = el("div", { class: "joel-mode-pill" }, el("span", {}, "Joel mode is on"), el("button", { class: "btn small", type: "button", onclick: () => setJoelMode(false) }, "Joel, stop"));
  document.body.append(pill);
  timer = setTimeout(() => { closeOne(); if (timer) schedule(); }, 6000 + Math.random() * 6000);
}
function stop() {
  clearTimeout(timer); timer = null;
  restoreAll(); pill?.remove(); pill = null;
}

function paintToggle() {
  const b = document.querySelector(".jm-toggle");
  if (b) {
    b.textContent = joelModeOn() ? "Joel mode: on (press to stop)" : "Joel mode: off";
    b.setAttribute("aria-pressed", String(joelModeOn()));
  }
  const v = document.querySelector(".joel-mode-btn");
  if (v) {
    v.textContent = joelModeOn() ? "Joel mode: ON" : "Joel mode: off";
    v.setAttribute("aria-pressed", String(joelModeOn()));
  }
}
// A button you can see: next to the floating "Ask JoelAI" button (or on its own where that button is not shown).
function addVisibleButton() {
  if (document.querySelector(".joel-mode-btn")) return;
  const btn = el("button", { class: "joel-mode-btn", type: "button", "data-joel-keep": "1", title: "Joel closes parts of this page at random, says sorry, and gives them back", onclick: () => setJoelMode(!joelModeOn()) }, "Joel mode: off");
  const wrap = document.querySelector(".joel-fab-wrap");
  if (wrap) wrap.append(btn);
  else document.body.append(el("div", { class: "joel-fab-wrap joel-mode-solo", "data-joel-keep": "1" }, btn));
  paintToggle();
}
function addToggle() {
  const f = document.querySelector("footer.site-footer"); if (!f || f.querySelector(".jm-toggle")) return;
  f.append(el("p", { "data-joel-keep": "1" }, el("button", { class: "linklike jm-toggle", type: "button", title: "Joel closes parts of the page at random, says sorry, and gives them back", onclick: () => setJoelMode(!joelModeOn()) }, "Joel mode: off")));
  paintToggle();
}
addToggle();
if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => setTimeout(addVisibleButton, 350)); else setTimeout(addVisibleButton, 350);
if (joelModeOn()) start();
