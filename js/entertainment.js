// Entertainment: airport and airplane games to play while delayed. Best scores stay in this browser; good scores earn a peanut (once per game per day).
import { $, el, reducedMotion } from "./dom.js";
import { best, setBest, reward } from "./gamekit.js";
import { mountWhack } from "./whack.js";
import { mountHangman } from "./hangman.js";
import { mountLostJoel } from "./lostjoel.js";
import { mountJoelTabs } from "./joeltabs.js";

const root = $("#app");
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

/* ---------- 5. Security Line ---------- */
function security(box) {
  const ITEMS = [["🔑", "keys", ["metal"]], ["🥜", "a peanut", ["snack"]], ["🧴", "shampoo", ["liquid"]], ["⌚", "a watch", ["metal"]], ["💧", "water bottle", ["liquid"]], ["🍪", "a biscuit", ["snack"]], ["✂️", "scissors", ["metal", "sharp"]], ["🥫", "soup", ["liquid", "metal"]], ["🧃", "juice", ["liquid"]], ["🔪", "a very small knife", ["metal", "sharp"]], ["🍫", "chocolate", ["snack"]], ["🪙", "a coin", ["metal"]], ["🥛", "milk", ["liquid"]], ["🍌", "a banana", ["snack"]], ["📎", "a paper clip", ["metal"]]];
  const RULES = [["metal", "Metal items must be STOPPED"], ["liquid", "Liquids must be STOPPED"], ["snack", "Snacks must be STOPPED"], ["sharp", "Sharp items must be STOPPED"]];
  let n = 0, score = 0, rule, item, done = false;
  const rule$ = el("p", { class: "gm-big" }), it$ = el("p", { class: "gm-big", style: "font-size:3rem" }), sub = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best: ${best("security") || 0} / 15. A rule appears; decide each item fast.`);
  const next = () => { if (n >= 15) { done = true; const nb = setBest("security", score); it$.textContent = "🏁"; rule$.textContent = `Done: ${score} / 15`; sub.textContent = `${nb ? "New best! " : ""}${score >= 12 ? reward("security", "Security Line: 12 correct") : "Get 12 right for a peanut."}`; pass.disabled = stopb.disabled = true; again.hidden = false; return; }
    if (n % 5 === 0) { rule = RULES[Math.floor(Math.random() * RULES.length)]; rule$.textContent = "Rule: " + rule[1] + (n ? " (the rule has changed, we are sorry)" : ""); }
    item = ITEMS[Math.floor(Math.random() * ITEMS.length)]; it$.textContent = item[0]; it$.setAttribute("aria-label", item[1]); sub.textContent = `Item ${n + 1} of 15: ${item[1]}. Score ${score}.`; };
  const choose = (stopIt) => { if (done) return; const should = item[2].includes(rule[0]); if (should === stopIt) score++; n++; next(); };
  const pass = el("button", { class: "btn", type: "button", onclick: () => choose(false) }, "Let it PASS"), stopb = el("button", { class: "btn ghost", type: "button", onclick: () => choose(true) }, "STOP it");
  const again = el("button", { class: "btn small", type: "button", hidden: true, onclick: () => show("security") }, "Play again");
  box.append(el("p", { class: "note" }, "Every item beeps. Only the current rule decides."), rule$, it$, el("div", { class: "actions" }, pass, stopb, again), sub); next();
}

/* ---------- 6. Delay Trivia ---------- */
function trivia(box) {
  const Q = [["How late is every Octee flight?", "1 millisecond", ["1 hour", "On time", "Yesterday"]], ["What is your life jacket?", "A peanut shell", ["A coat", "A boat", "A balloon"]], ["How many exits are there?", "Two, and a third later", ["One", "Eleven", "None"]], ["Where does Joel live when he runs out of sorry?", "The cupboard", ["The cockpit", "Duty Free", "Row 7"]], ["What does the seatbelt have?", "No buckle", ["A buckle", "Two buckles", "A zip"]], ["What is flight mode?", "A mood", ["A setting", "A snack", "A plane"]]];
  let k = 0, score = 0; const area = el("div"), sub = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best: ${best("trivia") || 0} / 6.`);
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const q = () => { if (k >= Q.length) { const nb = setBest("trivia", score); area.replaceChildren(el("p", { class: "gm-big" }, `${score} / 6`), el("button", { class: "btn small", type: "button", onclick: () => show("trivia") }, "Play again")); sub.textContent = `${nb ? "New best! " : ""}${score >= 5 ? reward("trivia", "Delay Trivia: 5 of 6") : "Get 5 right for a peanut."}`; return; }
    const [t, a, w] = Q[k]; area.replaceChildren(el("h3", { style: "margin-top:0" }, `${k + 1}. ${t}`), el("div", { class: "actions" }, ...shuffle([a, ...w]).map((o) => el("button", { class: "btn small ghost", type: "button", onclick: () => { if (o === a) { score++; sub.textContent = "Correct. Also delayed."; } else sub.textContent = `Wrong. It was "${a}". We are sorry for the correct answer.`; k++; q(); } }, o)))); };
  box.append(area, sub); q();
}

/* ---------- 7. Find the Bag ---------- */
function findbag(box) {
  let round = 0, score = 0, left = 60, iv; const info = el("p", { class: "gm-big" }), grid = el("div", { class: "fb-grid" }), sub = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best: ${best("findbag") || 0}. Find the bag with YOUR tag before 60 seconds run out.`);
  const tag = () => "OA " + (1000 + Math.floor(Math.random() * 9000));
  const r = () => { const size = Math.min(5 + Math.floor(round / 2), 8), want = tag(), tags = new Set([want]); while (tags.size < size) tags.add(tag());
    const list = [...tags].sort(() => Math.random() - 0.5); info.textContent = `Find: ${want} · time ${left}s · found ${score}`; grid.style.gridTemplateColumns = `repeat(${Math.min(size, 4)}, minmax(0,1fr))`;
    grid.replaceChildren(...list.map((t) => el("button", { class: "fb-bag", type: "button", onclick: () => { if (t === want) { score++; round++; r(); } else { left = Math.max(0, left - 3); sub.textContent = "Wrong bag. -3 seconds. It was not yours. It was somebody's."; info.textContent = `Find: ${want} · time ${left}s · found ${score}`; } } }, "🧳 " + t))); };
  iv = setInterval(() => { left--; info.textContent = info.textContent.replace(/time \d+s/, `time ${Math.max(0, left)}s`); if (left <= 0) { clearInterval(iv); const nb = setBest("findbag", score); grid.replaceChildren(el("button", { class: "btn small", type: "button", onclick: () => show("findbag") }, "Play again")); info.textContent = `Time up: ${score} bags found`; sub.textContent = `${nb && score ? "New best! " : ""}${score >= 6 ? reward("findbag", "Find the Bag: 6 found") : "Find 6 bags for a peanut."}`; } }, 1000);
  box.append(info, grid, sub); r(); stop = () => clearInterval(iv);
}

/* ---------- 8. Boarding Call ---------- */
function boarding(box) {
  let tries = [], state = "idle", t0 = 0, to; const big = el("button", { class: "btn gm-add bc-btn", type: "button" }, "Start"), sub = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best average: ${best("boarding") ? best("boarding") + " ms" : "none yet"}. 5 tries. Tap when it says BOARD NOW.`);
  const avg = () => Math.round(tries.reduce((a, b) => a + b, 0) / tries.length);
  const arm = () => { state = "wait"; big.textContent = "Wait for the call..."; big.className = "btn gm-add bc-btn wait"; to = setTimeout(() => { state = "go"; t0 = performance.now(); big.textContent = "BOARD NOW"; big.className = "btn gm-add bc-btn go"; }, 1500 + Math.random() * 3500); };
  big.addEventListener("click", () => {
    if (state === "idle") { tries = []; arm(); return; }
    if (state === "wait") { clearTimeout(to); tries.push(999); sub.textContent = "Too early. Boarding has not started. It never has. Try " + (tries.length + 1) + " of 5."; } else if (state === "go") { const ms = Math.round(performance.now() - t0); tries.push(ms); sub.textContent = `${ms} ms.`; }
    if (tries.length >= 5) { state = "idle"; big.className = "btn gm-add bc-btn"; big.textContent = "Play again"; const a = avg(); const nb = setBest("boarding", a, false); sub.textContent = `Average ${a} ms. ${nb && a < 999 ? "New best! " : ""}${a <= 450 ? reward("boarding", "Boarding Call: under 450 ms") : "Average under 450 ms for a peanut."}`; } else arm();
  });
  box.append(big, sub); stop = () => clearTimeout(to);
}

/* ---------- 9. Runway Landing ---------- */
function landing(box) {
  const W = 340, H = 400, c = el("canvas", { width: W, height: H, class: "gm-canvas", tabindex: "0", "aria-label": "Landing game. Hold space, click or tap to fire the engine and slow your descent." }), ctx = c.getContext("2d");
  const info = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best streak: ${best("landing") || 0}. Hold to slow down. Touch down gently on the runway.`);
  let x, y, vy, vx, hold, over, streak = 0, raf, fuel;
  const rw = [90, 290];
  const reset = () => { x = 20; y = 40; vy = 0.5; vx = 1.1 + streak * 0.08; hold = false; over = false; fuel = 100; };
  const down = (e) => { if (e.preventDefault) e.preventDefault(); if (over) reset(); else hold = true; }, up = () => { hold = false; };
  c.addEventListener("pointerdown", down); addEventListener("pointerup", up);
  const kd = (e) => { if (e.code === "Space" && box.isConnected && document.activeElement !== document.body) down(e); }, ku = (e) => { if (e.code === "Space") up(); };
  c.addEventListener("keydown", kd); c.addEventListener("keyup", ku);
  const loop = () => {
    if (!over) { vy += 0.05; if (hold && fuel > 0) { vy -= 0.12; fuel -= 0.4; } x += vx; y += vy;
      if (y >= H - 40) { over = true; const ok = x > rw[0] && x < rw[1] && vy < 2.4;
        if (ok) { streak++; const nb = setBest("landing", streak); info.textContent = `Smooth landing! Streak ${streak}. ${nb ? "New best! " : ""}${streak >= 3 ? reward("landing", "Runway Landing: streak of 3") : "Land 3 in a row for a peanut. Tap to go again."}`; }
        else { info.textContent = `${x <= rw[0] || x >= rw[1] ? "You missed the runway. It was right there." : "Too hard. The plane is now a different shape."} Streak ended at ${streak}. Tap to retry.`; streak = 0; } }
      else if (x > W + 20) { over = true; info.textContent = "You flew past the airport. It was the one with the delays. Tap to retry."; streak = 0; } }
    ctx.fillStyle = "#cfe6f7"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#6d9f58"; ctx.fillRect(0, H - 40, W, 40); ctx.fillStyle = "#333"; ctx.fillRect(rw[0], H - 40, rw[1] - rw[0], 12);
    ctx.fillStyle = "#fff"; for (let i = rw[0] + 8; i < rw[1]; i += 26) ctx.fillRect(i, H - 35, 14, 3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(vy, vx)); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2b1a0e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-12, -8); ctx.lineTo(-8, 0); ctx.lineTo(-12, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "#2b1a0e"; ctx.font = "700 14px sans-serif"; ctx.fillText(`Sink ${vy.toFixed(1)} ${vy < 2.4 ? "OK" : "TOO FAST"} · fuel ${Math.max(0, Math.round(fuel))}% · streak ${streak}`, 8, 20);
    raf = requestAnimationFrame(loop); };
  reset(); raf = requestAnimationFrame(loop); box.append(c, info);
  stop = () => { cancelAnimationFrame(raf); removeEventListener("pointerup", up); };
}


const GAMES = [["plane", "Paper Plane", "Flap through the control towers.", plane], ["clicker", "Delay Clicker", "Add delay. Buy more delay.", clicker], ["match", "Suitcase Match", "Find the six pairs.", match], ["waiting", "The Waiting Game", "Do nothing. Win.", waiting], ["security", "Security Line", "Stop or pass 15 items. The rule keeps changing.", security], ["trivia", "Delay Trivia", "Six questions about us. Every answer is delayed.", trivia], ["findbag", "Find the Bag", "Spot your tag before time runs out.", findbag], ["boarding", "Boarding Call", "Tap the instant boarding starts.", boarding], ["landing", "Runway Landing", "Hold to slow down. Land gently.", landing], ["whack", "Whack-a-Joel", "Aim the hammer. Press Space to whack Joel.", (box) => { stop = mountWhack(box); }], ["hangman", "Hangman: Destination Edition", "Guess the airport. The answer is always FIA.", (box) => { stop = mountHangman(box); }], ["lostjoel", "Lost Joel", "Find Joel in the departures hall before time runs out.", (box) => { stop = mountLostJoel(box); }], ["joeltabs", "Joel's Tabs", "Joel is closing your tabs. Save them.", (box) => { stop = mountJoelTabs(box); }]];
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
