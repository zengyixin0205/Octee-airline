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
    if (n.closest(".jai-modal, .modal-back, .joel-mode-pill, .joel-mode-say, .joel-fab-wrap, .joel-closed-note, .crush-404, .jm-toggle, .jpop, .jerr, .jdist, .jcur, .jbig")) return false;
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
  if (popCount >= 40) return;
  const w = Math.min(240, innerWidth - 24), x = 8 + Math.random() * Math.max(0, innerWidth - w - 24), y = 70 + Math.random() * Math.max(0, innerHeight - 260);
  const node = el("div", { class: "jpop", role: "dialog", "aria-label": "A message about Joel", "data-joel-keep": "1", style: `left:${x}px;top:${y}px;width:${w}px;z-index:${9000 + (popN++)}` },
    el("p", { class: "jpop-text" }, text || PRAISE[Math.floor(Math.random() * PRAISE.length)]),
    el("div", { class: "actions" },
      el("button", { class: "btn small", type: "button", onclick: () => { node.remove(); popCount--; checkFinale(); } }, "Close"),
      plain ? null : el("button", { class: "btn small ghost", type: "button", onclick: () => setJoelMode(false) }, "Joel, stop")));
  popCount++; document.body.append(node);
}
function stopped() { if (popCount > 0) pop({ plain: true, text: "Joel has stopped, the messages haven't, close yourself." }); }

// ---- Joel mode v2: 20 praise pop-ups (one a second). When the last one is closed, 50 errors appear and vanish one by one over 5 seconds.
// Then 10 random disturbances. Easter eggs (only while Joel mode is on): type "joel", or the Konami code. ----
let praiseLeft = 0, praiseTimer = null, finaleDone = false, disturbTimers = [];
function startPraise(n = 20) { praiseLeft += n; finaleDone = false; if (!praiseTimer) praiseNext(); }
function praiseNext() {
  praiseTimer = null;
  if (!joelModeOn() || praiseLeft <= 0) return;
  praiseLeft--; pop();
  if (praiseLeft > 0) praiseTimer = setTimeout(praiseNext, 1000);
}
function checkFinale() {
  if (praiseLeft === 0 && !praiseTimer && popCount === 0 && !finaleDone && joelModeOn()) { finaleDone = true; finale(); }
}
function finale() {
  Array.from({ length: 50 }, (_, i) => errorBox(i));   // stays up until you close each one yourself
}
// Error boxes no longer vanish on their own — close them yourself, same as every other Joel-mode message.
function errorBox(i) {
  const w = 210, x = Math.random() * Math.max(0, innerWidth - w - 8), y = Math.random() * Math.max(0, innerHeight - 70);
  const n = el("div", { class: "jerr", role: "alert", style: `left:${x}px;top:${y}px;z-index:${9800 + i}` },
    el("strong", {}, "Error"), " Joel ate the error.",
    el("button", { class: "jerr-x", type: "button", "aria-label": "Close this error", onclick: () => n.remove() }, "×"));
  document.body.append(n); return n;
}
const DIST = [
  () => { const n = el("div", { class: "jdist", style: "bottom:14px;left:-60px" }, "🥪"); document.body.append(n); const a = n.animate([{ transform: "translateX(0)" }, { transform: `translateX(${innerWidth + 120}px)` }], { duration: 4000 }); a.onfinish = () => n.remove(); say("Joel walks past carrying a sandwich. He is not sharing it."); },
  () => { const n = el("div", { class: "jdist", style: "top:40%;right:12px;font-size:3rem" }, "🚪"); document.body.append(n); const a = n.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(.1)", offset: 0.3 }, { transform: "scaleX(1)" }], { duration: 700 }); a.onfinish = () => n.remove(); say("SLAM. The cupboard door. Joel is in there. Joel is fine."); },
  () => { const n = el("div", { class: "jcur" }, "Joel"); document.body.append(n); const mv = (e) => { n.style.left = e.clientX + 14 + "px"; n.style.top = e.clientY + 14 + "px"; }; addEventListener("mousemove", mv); setTimeout(() => { removeEventListener("mousemove", mv); n.remove(); }, 3000); say("Your cursor is now Joel. It is a little slower."); },
  () => { const n = el("div", { class: "jbig" }, "JOEL"); document.body.append(n); const a = n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, fill: "forwards" }); a.onfinish = () => n.remove(); },
  () => { const n = el("div", { class: "jdist", style: "bottom:4px;right:-60px" }, "🐦"); document.body.append(n); const a = n.animate([{ transform: "translateX(0)" }, { transform: `translateX(-${innerWidth + 120}px)` }], { duration: 3000 }); a.onfinish = () => n.remove(); say("A pigeon runs across the bottom of the page. It has a crumb."); }
];
function startDisturbances() {
  if (reduce()) return;
  let t = 2500;
  for (let i = 0; i < 10; i++) {
    disturbTimers.push(setTimeout(() => { if (joelModeOn() && !document.hidden) DIST[Math.floor(Math.random() * DIST.length)](); }, t));
    t += 2500 + Math.random() * 5000;
  }
}

// ---- Joel sings. A real recording (a voice memo of Joel singing), not the made-up Web Audio music elsewhere on
// the site. One shared <audio>, looped: it starts (a) whenever Joel mode is turned on, stopping when Joel mode is
// turned off, and (b) completely independently, at random, on ANY page whether Joel mode is on or off — a small
// note appears ("Joel is singing something. Please listen."), an orange flare shoots the word JOEL up the screen,
// and the song loops from a pill parked just above the Joel mode pill/toggle, until someone presses Stop there. ----
const SING_SRC = "assets/audio/joel-sings.mp3";
let singAudio = null, singPill = null, singScheduleTimer = null;

function shootJoelFlare(text = "JOEL") {
  const n = el("div", { class: "joel-flare", "aria-hidden": "true" }, text);
  document.body.append(n);
  setTimeout(() => n.remove(), 1700);
}

function audioEl() {
  if (!singAudio) {
    singAudio = new Audio(SING_SRC);
    singAudio.loop = true;
    singAudio.addEventListener("play", () => {
      if (!singPill) {
        singPill = el("div", { class: "joel-sing-pill", "data-joel-keep": "1" },
          el("span", {}, "🎵 Joel is singing"),
          el("button", { class: "btn small", type: "button", onclick: () => singAudio.pause() }, "Stop"));
        document.body.append(singPill);
      }
      // The site's own music and Tower Music both listen for this and pause themselves for as long as
      // Joel is singing, so his voice isn't fighting whatever else is playing.
      dispatchEvent(new CustomEvent("octee:joelsinging", { detail: { playing: true } }));
    });
    singAudio.addEventListener("pause", () => {
      singPill?.remove(); singPill = null;
      dispatchEvent(new CustomEvent("octee:joelsinging", { detail: { playing: false } }));
    });
  }
  return singAudio;
}
function playSinging() { audioEl().play().catch(() => {}); }
function stopSinging() { if (singAudio && !singAudio.paused) singAudio.pause(); }

function randomSing() {
  if (!document.hidden) {
    if (!singAudio || singAudio.paused) { say("🎤 Joel is singing something. Please listen."); shootJoelFlare(); }
    playSinging();
  }
  scheduleRandomSing();
}
function scheduleRandomSing() { clearTimeout(singScheduleTimer); singScheduleTimer = setTimeout(randomSing, 120000 + Math.random() * 180000); }

// ---- Turning Joel mode on also, in addition to the usual chain above: 10 "Joel is great" messages appear all at
// once (not staggered), close them all yourself, then an orange flare shoots JOEL up the screen, then more keeps
// happening — extra chaos on top of the usual disturbances — for as long as Joel mode stays on. ----
function burstPop(text, state) {
  const w = Math.min(240, innerWidth - 24), x = 8 + Math.random() * Math.max(0, innerWidth - w - 24), y = 70 + Math.random() * Math.max(0, innerHeight - 260);
  const node = el("div", { class: "jpop", role: "dialog", "aria-label": "A message about Joel", "data-joel-keep": "1", style: `left:${x}px;top:${y}px;width:${w}px;z-index:${9000 + (popN++)}` },
    el("p", { class: "jpop-text" }, text),
    el("div", { class: "actions" }, el("button", { class: "btn small", type: "button", onclick: () => { node.remove(); state.left--; if (state.left <= 0) afterBurst(); } }, "Close")));
  document.body.append(node);
}
function startJoelBurst() {
  const state = { left: 10 };
  for (let i = 0; i < 10; i++) burstPop(PRAISE[Math.floor(Math.random() * PRAISE.length)], state);
}
function afterBurst() {
  shootJoelFlare();
  setTimeout(startOngoingChaos, 1700);
}
const MORE_HAPPENS = [
  () => { const n = el("div", { class: "jdist", style: "top:20%;left:50%;transform:translateX(-50%)" }, "🎵"); document.body.append(n); const a = n.animate([{ transform: "translate(-50%,0)", opacity: 1 }, { transform: "translate(-50%,-120px)", opacity: 0 }], { duration: 2200 }); a.onfinish = () => n.remove(); say("Joel hums a few bars. It is, legally, humming."); },
  () => shootJoelFlare(),
  () => { playSinging(); say("Joel breaks into song again."); }
];
let chaosTimer = null;
function ongoingChaosTick() {
  chaosTimer = null;
  if (!joelModeOn()) return;
  const pool = Math.random() < 0.5 ? DIST : MORE_HAPPENS;
  pool[Math.floor(Math.random() * pool.length)]();
  if (joelModeOn()) chaosTimer = setTimeout(ongoingChaosTick, 8000 + Math.random() * 12000);
}
function startOngoingChaos() {
  clearTimeout(chaosTimer);
  chaosTimer = setTimeout(ongoingChaosTick, 8000 + Math.random() * 12000);
}
// Easter eggs (only while Joel mode is on). Typing in a form does not count.
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let eggBuf = "", konami = [];
function egg(e) {
  if (!joelModeOn() || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  eggBuf = (eggBuf + k).slice(-8); konami = [...konami, k].slice(-10);
  if (eggBuf.endsWith("joel")) { eggBuf = ""; pop({ plain: true, text: "Joel says hi. Joel has been waiting for you since 1987. Joel is very patient." }); }
  if (konami.join(",") === KONAMI.join(",")) { konami = []; pop({ plain: true, text: "KONAMI CODE! Joel has summoned 20 more. You are welcome." }); startPraise(20); }
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
  startPraise(20); startDisturbances(); document.removeEventListener("keydown", egg); document.addEventListener("keydown", egg);
  timer = setTimeout(() => { closeOne(); if (timer) schedule(); }, 6000 + Math.random() * 6000);
  playSinging();        // loops for as long as Joel mode stays on
  startJoelBurst();      // additional: 10 at once, then a flare, then ongoing extra chaos
}
function stop() {
  clearTimeout(timer); timer = null;
  clearTimeout(praiseTimer); praiseTimer = null; praiseLeft = 0;
  disturbTimers.forEach(clearTimeout); disturbTimers = [];
  clearTimeout(chaosTimer); chaosTimer = null;
  document.removeEventListener("keydown", egg);
  restoreAll(); pill?.remove(); pill = null;
  stopSinging();
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
scheduleRandomSing();   // Joel may start singing on any page, at random, whether Joel mode is on or off
