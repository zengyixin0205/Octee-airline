// Entertainment: airport and airplane games to play while delayed. Best scores stay in this browser; good scores earn a peanut (once per game per day).
import { $, el, reducedMotion, today } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { addPeanuts } from "./peanuts.js";
import { load, save } from "./store.js";

const root = $("#app");
const BEST = "octee.games.best";
const best = (id) => load(BEST, {})[id];
const setBest = (id, v, higher = true) => { const b = load(BEST, {}); if (b[id] === undefined || (higher ? v > b[id] : v < b[id])) { b[id] = v; save(BEST, b); return true; } return false; };
function reward(id, text) {
  const u = currentUser(); if (!u) return "Log in to earn peanuts for this.";
  if ((u.gameDay || {})[id] === today()) return "You already earned today's peanut for this game.";
  updateUser((x) => { x.gameDay = { ...(x.gameDay || {}), [id]: today() }; }); addPeanuts(text, 1); return "+1 peanut in your wallet.";
}
let stop = null;                                     // stops the running game when you switch
const cleanup = () => { if (stop) { stop(); stop = null; } };

/* ---------- 1. Paper Plane ---------- */
function plane(box) {
  const W = 340, H = 460, c = el("canvas", { width: W, height: H, class: "gm-canvas", tabindex: "0", "aria-label": "Paper plane game. Press space, click or tap to flap." }), ctx = c.getContext("2d");
  const info = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best: ${best("plane") || 0}. Tap, click or press Space to flap. Avoid the control towers.`);
  let y, vy, pipes, score, alive, raf, t, started;
  const reset = () => { y = H / 2; vy = 0; pipes = [{ x: W + 40, gap: 140 + Math.random() * 160 }]; score = 0; alive = true; t = 0; started = false; };
  const flap = (e) => { if (e) e.preventDefault(); if (!alive) { reset(); return; } started = true; vy = -6.2; };
  const draw = () => {
    ctx.fillStyle = "#cfe6f7"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; [[40, 60], [200, 120], [120, 300]].forEach(([x, yy]) => { ctx.beginPath(); ctx.ellipse(((x - t * 0.4) % (W + 80) + W + 80) % (W + 80) - 40, yy, 30, 12, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = "#4a4038"; pipes.forEach((p) => { ctx.fillRect(p.x, 0, 46, p.gap - 70); ctx.fillRect(p.x, p.gap + 70, 46, H); ctx.fillStyle = "#ff7a00"; ctx.fillRect(p.x - 3, p.gap - 78, 52, 8); ctx.fillRect(p.x - 3, p.gap + 70, 52, 8); ctx.fillStyle = "#4a4038"; });
    ctx.save(); ctx.translate(80, y); ctx.rotate(Math.max(-0.5, Math.min(0.9, vy / 10))); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2b1a0e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, -10); ctx.lineTo(-8, 0); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "#2b1a0e"; ctx.font = "700 28px sans-serif"; ctx.fillText(String(score), 14, 36);
    if (!alive) { ctx.fillStyle = "rgba(43,26,14,.75)"; ctx.fillRect(40, 170, W - 80, 110); ctx.fillStyle = "#ffd9b0"; ctx.font = "700 20px sans-serif"; ctx.fillText("Crashed. Score " + score, 74, 215); ctx.font = "14px sans-serif"; ctx.fillText("Tap to try again", 112, 245); }
    else if (!started) { ctx.fillStyle = "#2b1a0e"; ctx.font = "700 16px sans-serif"; ctx.fillText("Tap to start", 118, 240); }
  };
  const loop = () => {
    if (alive && started) {
      t++; vy += 0.32; y += vy;
      pipes.forEach((p) => { p.x -= 2.2 + score * 0.04; if (!p.pass && p.x + 46 < 80) { p.pass = true; score++; } });
      if (pipes[pipes.length - 1].x < W - 190) pipes.push({ x: W + 20, gap: 110 + Math.random() * 240 });
      if (pipes[0].x < -60) pipes.shift();
      if (y < 0 || y > H || pipes.some((p) => 80 + 14 > p.x && 80 - 14 < p.x + 46 && (y - 10 < p.gap - 70 || y + 10 > p.gap + 70))) {
        alive = false; const nb = setBest("plane", score);
        info.textContent = `Crashed with ${score}. ${nb && score ? "New best! " : ""}Best: ${best("plane") || 0}. ${score >= 5 ? reward("plane", "Paper Plane: 5 towers passed") : "Pass 5 towers to earn a peanut."}`;
      }
    } draw(); raf = requestAnimationFrame(loop);
  };
  c.addEventListener("pointerdown", flap); c.addEventListener("keydown", (e) => { if (e.code === "Space" || e.key === " ") flap(e); });
  const key = (e) => { if ((e.code === "Space") && document.activeElement === document.body && box.isConnected) flap(e); };
  document.addEventListener("keydown", key);
  reset(); raf = requestAnimationFrame(loop); box.append(c, info);
  stop = () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", key); };
}

/* ---------- 2. Delay Clicker ---------- */
function clicker(box) {
  let ms = 0, per = 1, auto = 0; const owned = { gate: 0, sorry: 0, fog: 0, joel: 0 };
  const UP = [["gate", "Gate change (+1 per click)", 20, () => per++], ["sorry", "A very long apology (+1 ms/s)", 50, () => auto += 1], ["joel", "Joel, lost (+5 ms/s)", 200, () => auto += 5], ["fog", "Fog over FIA (+25 ms/s)", 800, () => auto += 25]];
  const out = el("p", { class: "gm-big", "aria-live": "off" }), sub = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best total: ${fmt(best("clicker") || 0)}.`), shop = el("div", { class: "actions" });
  function fmt(n) { const s = Math.floor(n / 1000), m = n % 1000; return s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor(s % 3600 / 60)} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s ${m} ms`; }
  const paint = () => { out.textContent = "Total delay: " + fmt(ms); shop.replaceChildren(...UP.map(([id, n, cost, fn]) => { const price = Math.floor(cost * Math.pow(1.35, owned[id]));
    return el("button", { class: "btn small ghost", type: "button", disabled: ms >= price ? null : true, onclick: () => { ms -= price; owned[id]++; fn(); paint(); } }, `${n} · ${price} ms`); })); };
  const add = el("button", { class: "btn gm-add", type: "button", onclick: () => { ms += per; check(); paint(); } }, "Add a delay");
  const check = () => { setBest("clicker", ms); if (ms >= 5000 && !check.done) { check.done = true; sub.textContent = "5 seconds of delay! " + reward("clicker", "Delay Clicker: 5 seconds"); } };
  const iv = setInterval(() => { if (auto) { ms += auto; check(); paint(); } }, 1000);
  paint(); box.append(el("p", { class: "note" }, "Click to add delay. Spend delay on more delay. Reach 5 seconds for a peanut. A millisecond is a great deal of delay for us."), out, add, shop, sub);
  stop = () => clearInterval(iv);
}

/* ---------- 3. Suitcase Match ---------- */
function match(box) {
  const SYM = ["✈️", "🧳", "🥜", "🎫", "🛂", "☕"]; const deck = [...SYM, ...SYM].map((s) => [Math.random(), s]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  let first = null, lock = false, moves = 0, found = 0;
  const sub = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best: ${best("match") ? best("match") + " moves" : "none yet"}. Find the six pairs.`);
  const grid = el("div", { class: "mm-grid" });
  deck.forEach((s) => { const b = el("button", { class: "mm-card", type: "button", "aria-label": "Hidden card" }, "?"); b.dataset.s = s;
    b.addEventListener("click", () => { if (lock || b.classList.contains("up")) return; b.classList.add("up"); b.textContent = s; b.setAttribute("aria-label", s);
      if (!first) { first = b; return; } moves++; const a = first; first = null;
      if (a.dataset.s === s) { found++; if (found === 6) { const nb = setBest("match", moves, false); sub.textContent = `All pairs in ${moves} moves. ${nb ? "New best! " : ""}${moves <= 14 ? reward("match", "Suitcase Match: 14 moves or fewer") : "Do it in 14 moves for a peanut."}`; } }
      else { lock = true; setTimeout(() => { [a, b].forEach((x) => { x.classList.remove("up"); x.textContent = "?"; x.setAttribute("aria-label", "Hidden card"); }); lock = false; }, 700); } }); grid.append(b); });
  box.append(grid, sub);
}

/* ---------- 4. The Waiting Game ---------- */
function waiting(box) {
  const LINES = [[10, "10 seconds. A flight has been delayed by this long, probably."], [30, "30 seconds. You are very good at this."], [60, "A whole minute. Joel is proud, in the cupboard."], [120, "Two minutes. The gate has been changed. You did not need to know."], [300, "Five minutes. You could have flown a short flight."]];
  let s0 = 0, iv = null, shown = 0;
  const out = el("p", { class: "gm-big" }, "0.0 s"), sub = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best wait: ${best("waiting") ? best("waiting").toFixed(1) + " s" : "none yet"}.`);
  const btn = el("button", { class: "btn", type: "button" }, "Start waiting");
  btn.addEventListener("click", () => {
    if (!iv) { s0 = Date.now(); shown = 0; btn.textContent = "I cannot wait any longer"; sub.textContent = "Wait. Do nothing. Only this button can end it."; iv = setInterval(() => { const s = (Date.now() - s0) / 1000; out.textContent = s.toFixed(1) + " s"; const l = LINES.find(([t], k) => k === shown && s >= t); if (l) { shown++; sub.textContent = l[1]; } }, 100); }
    else { clearInterval(iv); iv = null; const s = (Date.now() - s0) / 1000; const nb = setBest("waiting", s); btn.textContent = "Wait again"; sub.textContent = `You waited ${s.toFixed(1)} s. ${nb && s > 1 ? "New best! " : ""}${s >= 30 ? reward("waiting", "The Waiting Game: 30 seconds") : "Wait 30 seconds for a peanut."}`; }
  });
  box.append(el("p", { class: "note" }, "The skill every passenger needs. Press Start, then do nothing for as long as you can. Press the button only when you give up."), out, btn, sub);
  stop = () => clearInterval(iv);
}

const GAMES = [["plane", "Paper Plane", "Flap through the control towers.", plane], ["clicker", "Delay Clicker", "Add delay. Buy more delay.", clicker], ["match", "Suitcase Match", "Find the six pairs.", match], ["waiting", "The Waiting Game", "Do nothing. Win.", waiting]];
const OTHERS = [["baggame.html", "The Baggage Game", "Push bags to the plane."], ["bingo.html", "Delay Bingo", "Five in a row."], ["safety.html", "Safety Quiz", "Pass for a peanut."], ["news.html", "The Octee Times crossword", "A crossword with an answer."], ["magazine.html", "Magazine Sudoku", "A sudoku without one."], ["cockpit.html", "The Cockpit", "Press the buttons."], ["radio.html", "Octee Radio", "Listen while you wait."], ["departures.html", "Departures Board", "Watch everything be delayed."]];
const tabs = el("div", { class: "radio-tabs", role: "tablist", "aria-label": "Games" }), stage = el("div", { class: "card" });
function show(id) {
  cleanup(); const g = GAMES.find((x) => x[0] === id);
  tabs.replaceChildren(...GAMES.map((x) => el("button", { class: "btn small " + (x[0] === id ? "" : "ghost"), type: "button", role: "tab", "aria-selected": String(x[0] === id), onclick: () => show(x[0]) }, x[1])));
  stage.replaceChildren(el("h2", { style: "margin-top:0" }, g[1]), el("p", { class: "note" }, g[2])); g[3](stage);
}
root.replaceChildren(el("div", { class: "card ok-card" }, el("strong", {}, "You are delayed."), " It is not clear for how long. These games are free, and the good scores pay in peanuts (one per game per day, when logged in)."), tabs, stage,
  el("h2", {}, "More to do while you wait"), el("div", { class: "shop" }, OTHERS.map(([h, t, d]) => el("a", { class: "card shop-item", href: h, style: "text-decoration:none;color:inherit" }, el("h3", { style: "margin:0" }, t), el("p", { class: "note", style: "margin:4px 0 0" }, d)))));
show("plane");
addEventListener("pagehide", cleanup);
