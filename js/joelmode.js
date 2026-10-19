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
  if (on) start(); else { stop(); stopped(); }
  paintToggle();
}

function candidates() {
  const sel = "main :is(.card, h2, h3, p, ul, table, figure, details, .shop-item, section), footer.site-footer p";
  return [...document.querySelectorAll(sel)].filter((n) => {
    if (n.closest(".jai-modal, .modal-back, .joel-mode-pill, .joel-mode-say, .joel-fab-wrap, .joel-closed-note, .crush-404, .jm-toggle, .jpop")) return false;
    if (n.classList.contains("joel-closed") || n.closest(".joel-closed")) return false;
    if (n.closest(".shop, .flare-hero, .df-guide, .df-scan")) return false;   // never close the things you bought
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

// ---- pop-ups about how great Joel is. Close the first one and ten more appear; close those yourself, one by one. Esc does not close them. ----
const PRAISE = ["Joel is great.", "Joel has never once been late. He is always exactly where he is.", "Joel: voted the best Joel by Joel.", "Joel can open a door with his whole heart.",
  "Joel is faster than the runway and slower than the announcement.", "Joel made this website better by being near it.", "Joel's cupboard is the finest cupboard in the building.", "Joel once landed a plane. It was parked. It still counts.",
  "Joel remembers everyone's name. Wrongly, but with feeling.", "Joel is the reason the gate is not announced. That is a compliment.", "Joel has 5 stars. He gave them to himself.", "Joel is a joel. This is the highest honour.",
  "Joel can fix any problem by walking around it twice.", "Joel's sandwiches taste like an apology and a hug.", "Joel is greater than the sum of his baggage.", "Joel has been awarded the Order of the Closed Tab.",
  "Joel is here. This is good news. Probably.", "Everybody loves Joel. Everybody means Joel.", "Joel would like you to know that Joel is great.", "Joel says: close this. Joel also says: there are more."];
let popN = 0, popCount = 0;
function pop({ first = false, plain = false, text = "" } = {}) {
  if (popCount >= 14) return;
  const w = Math.min(320, innerWidth - 24), x = 8 + Math.random() * Math.max(0, innerWidth - w - 24), y = 70 + Math.random() * Math.max(0, innerHeight - 260);
  const node = el("div", { class: "jpop", role: "dialog", "aria-label": "A message about Joel", "data-joel-keep": "1", style: `left:${x}px;top:${y}px;width:${w}px;z-index:${9000 + (popN++)}` },
    el("p", { class: "jpop-text" }, text || PRAISE[Math.floor(Math.random() * PRAISE.length)]),
    el("div", { class: "actions" },
      el("button", { class: "btn small", type: "button", onclick: () => { node.remove(); popCount--; if (first) for (let i = 0; i < 10; i++) setTimeout(() => pop(), 140 * (i + 1)); } }, "Close"),
      plain ? null : el("button", { class: "btn small ghost", type: "button", onclick: () => setJoelMode(false) }, "Joel, stop")));
  popCount++; document.body.append(node);
}
function stopped() { if (popCount > 0) pop({ plain: true, text: "Joel has stopped, the messages haven't, close yourself." }); }

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
  setTimeout(() => { if (joelModeOn() && !document.querySelector(".jpop")) pop({ first: true }); }, 1200);
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
