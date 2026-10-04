// A retro split-flap departures board: each letter flips like the old boards, and every flight says DELAYED.
import { $, el, reducedMotion } from "./dom.js";
import { ALL_FLIGHTS, placeShort } from "./destinations.js";
import { scraggyData } from "./scraggy.js";
import { CONFIG } from "./config.js";

const root = $("#app");
const CH = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-/'.";
const W = { no: 6, to: 12, time: 5, st: 7 };
let sound = false, actx = null;

function tick() {
  if (!sound) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain();
    o.type = "square"; o.frequency.value = 900 + Math.random() * 500; g.gain.setValueAtTime(0.04, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.03);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.04); } catch {}
}
function cell(ch) { const c = el("span", { class: "sf" }, " "); c.dataset.t = ch; return c; }
function word(text, n) {
  const s = text.toUpperCase().slice(0, n).padEnd(n, " ");
  return el("span", { class: "sf-word", "aria-label": text.trim() }, ...[...s].map(cell));
}
function flipAll(scope) {
  const cells = [...scope.querySelectorAll(".sf")];
  cells.forEach((c, k) => {
    const target = c.dataset.t;
    if (reducedMotion()) { c.textContent = target; return; }
    const steps = 3 + (k % 7), start = Math.floor(Math.random() * CH.length);
    let i = 0;
    const t0 = 120 + k * 12;
    setTimeout(function step() {
      i++;
      c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip");
      if (i < steps) { c.textContent = CH[(start + i * 5) % CH.length]; if (Math.random() < 0.15) tick(); setTimeout(step, 70); }
      else { c.textContent = target; if (target !== " ") tick(); }
    }, t0);
  });
}
const dayNo = () => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, weekday: "short" }).format(new Date())) + 1;

async function rows() {
  const day = dayNo(), r = [];
  for (const f of ALL_FLIGHTS) {
    if (!f.days.includes(day)) continue;
    const i = f.stops.findIndex((s) => s[0] === "FIA"); if (i < 0 || !f.stops[i][2]) continue;
    const later = f.stops.slice(i + 1).map((s) => placeShort(s[0]));
    r.push({ no: f.no, to: later[later.length - 1], time: f.stops[i][2] });
  }
  try { const { routes } = await scraggyData(); const fia = routes.find((x) => x.place === "FIA"); if (fia) r.push({ no: fia.inNo, to: "SIA", time: fia.inDep }); } catch {}
  r.sort((a, b) => String(a.time).localeCompare(String(b.time)));
  r.push({ no: "OA 404", to: "NOT FOUND", time: "--:--" });
  return r.slice(0, 14);
}
async function build() {
  const list = await rows();
  const board = el("div", { class: "sf-board", id: "sf-board", role: "table", "aria-label": "Departures, all delayed" },
    el("div", { class: "sf-head", role: "row" }, ...["FLIGHT", "TO", "TIME", "STATUS"].map((h) => el("span", { role: "columnheader" }, h))),
    ...list.map((f) => el("div", { class: "sf-row", role: "row" }, word(f.no, W.no), word(f.to, W.to), word(String(f.time), W.time), word("DELAYED", W.st))));
  const fs = el("button", { class: "btn", type: "button", onclick: () => { const b = $("#sf-wrap"); if (document.fullscreenElement) document.exitFullscreen(); else if (b.requestFullscreen) b.requestFullscreen(); } }, "Full screen");
  const snd = el("button", { class: "btn small ghost", type: "button", "aria-pressed": "false", onclick: (e) => { sound = !sound; e.target.setAttribute("aria-pressed", String(sound)); e.target.textContent = sound ? "Sound on" : "Sound off"; if (sound) tick(); } }, "Sound off");
  const again = el("button", { class: "btn small ghost", type: "button", onclick: () => { board.querySelectorAll(".sf").forEach((c) => { c.textContent = " "; }); flipAll(board); } }, "Flip again");
  const clock = el("span", { class: "sf-clock" });
  const wrap = el("div", { id: "sf-wrap", class: "sf-wrap" }, el("div", { class: "sf-title" }, el("strong", {}, "OCTEE AIRLINES · DEPARTURES"), clock), board,
    el("div", { class: "sf-foot" }, "ALL FLIGHTS DELAYED · WE ARE SORRY · THIS IS NOT A MISTAKE"));
  root.replaceChildren(el("div", { class: "actions" }, fs, snd, again), wrap);
  const upd = () => { clock.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()) + " FIA"; };
  upd(); setInterval(upd, 1000);
  flipAll(board);
  setInterval(() => { if (!document.hidden && Math.random() < 0.5) { const row = board.querySelectorAll(".sf-row"); const r = row[Math.floor(Math.random() * row.length)]; if (r) { const st = r.querySelectorAll(".sf-word")[3]; st.querySelectorAll(".sf").forEach((c) => { c.textContent = " "; }); flipAll(st); } } }, 9000);
}
build();
