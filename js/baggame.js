// The Baggage Game. Bags ride a T-shaped belt: along the top bar from the left. Press PUSH when a bag is at the middle and the
// pusher shoves it down the stem to the plane. Too early, too late, or a miss, and it goes to the Lost section (right end of the bar).
import { $, el, reducedMotion } from "./dom.js";
import { load, save } from "./store.js";
import { addPeanuts } from "./peanuts.js";
import { currentUser } from "./auth.js";

const root = $("#app");
const W = 640, H = 440;
const BAR_Y = 110, BAR_X0 = 30, BAR_X1 = 560, JX = 300, STEM_Y1 = 330;
const HIT = 26;                                   // a bag within this many pixels of the middle is a good push
const NEAR = 78;                                  // a bag this near (but not in the zone) gets knocked into Lost
const MAX_LOST = 5;
const BEST = "octee.baggame.best";
const ITEMS = ["tuba", "left shoe", "very large sock", "confident peanut", "briefcase of paperwork", "half a sandwich", "birthday cake", "plush plane", "umbrella (indoors)", "suitcase (with a smaller suitcase in it)", "laptop at 2%", "4 metres of scarf"];
const COLOURS = ["#b3261e", "#2f6fb0", "#3a8d3a", "#8a4fb0", "#e08a00", "#2b7a78"];

let S = null, raf = null, last = 0;
const slow = reducedMotion();

function newGame() {
  return { bags: [], lost: [], loaded: 0, spawnIn: 0.6, spawned: 0, pusher: 0, cooldown: 0, flash: "", flashT: 0, over: false, started: performance.now(), best: Number(load(BEST, 0)) || 0, paid: false };
}
const speed = (n) => (slow ? 0.55 : 1) * Math.min(250, 105 + n * 4);
const gap = (n) => Math.max(0.75, 1.7 - n * 0.03);

function spawn() {
  const n = S.spawned++;
  S.bags.push({ x: BAR_X0, y: BAR_Y, mode: "bar", name: ITEMS[n % ITEMS.length], colour: COLOURS[n % COLOURS.length], v: speed(n), spin: 0 });
}
function lose(b, why) {
  b.mode = "gone"; S.lost.push(b.name);
  S.flash = why; S.flashT = 1.1;
  if (S.lost.length >= MAX_LOST) finish();
}
function finish() {
  S.over = true;
  if (S.loaded > S.best) { S.best = S.loaded; save(BEST, S.best); }
  const peanuts = Math.min(3, Math.floor(S.loaded / 5));
  if (peanuts && currentUser() && !S.paid) { S.paid = true; addPeanuts(`Baggage Game: ${S.loaded} bags loaded (a baggage handler's peanut)`, peanuts); S.peanuts = peanuts; }
}

function push() {
  if (!S || S.over || S.cooldown > 0) return;
  S.pusher = 0.28; S.cooldown = 0.35;
  const onBar = S.bags.filter((b) => b.mode === "bar").sort((a, b) => Math.abs(a.x - JX) - Math.abs(b.x - JX));
  const b = onBar[0];
  if (!b) { S.flash = "Nothing to push. The pusher pushed the air."; S.flashT = 0.9; return; }
  const d = Math.abs(b.x - JX);
  if (d <= HIT) { b.mode = "stem"; b.x = JX; b.v = 230; S.flash = d < 9 ? "PERFECT!" : "Good push!"; S.flashT = 0.8; }
  else if (d <= NEAR) { b.mode = "knocked"; b.v = 260; S.flash = b.x < JX ? "Too early! The bag flew off to Lost." : "Too late! The bag flew off to Lost."; S.flashT = 1.1; }
  else { S.flash = "Miss! Nothing was near. The pusher pushed the air."; S.flashT = 0.9; }
}

function update(dt) {
  S.cooldown = Math.max(0, S.cooldown - dt); S.pusher = Math.max(0, S.pusher - dt); S.flashT = Math.max(0, S.flashT - dt);
  S.spawnIn -= dt;
  if (S.spawnIn <= 0 && !S.over) { spawn(); S.spawnIn = gap(S.spawned); }
  for (const b of S.bags) {
    if (b.mode === "bar") { b.x += b.v * dt; if (b.x >= BAR_X1) lose(b, "Missed! A bag went down the chute to Lost."); }
    else if (b.mode === "stem") { b.y += b.v * dt; if (b.y >= STEM_Y1) { b.mode = "loaded"; S.loaded++; S.flash = `${b.name} is on the plane!`; S.flashT = 0.8; } }
    else if (b.mode === "knocked") { b.x += (b.x < JX ? -1 : 1) * 0 + b.v * dt; b.y -= 30 * dt; if (b.x >= BAR_X1 - 6) lose(b, "Lost!"); }
    b.spin += dt * 8;
  }
  S.bags = S.bags.filter((b) => b.mode !== "gone" && b.mode !== "loaded");
}

const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
function draw(c) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#fff8ee"; c.fillRect(0, 0, W, H);
  // belts
  c.fillStyle = "#4a4038"; c.fillRect(BAR_X0, BAR_Y - 22, BAR_X1 - BAR_X0, 44); c.fillRect(JX - 22, BAR_Y, 44, STEM_Y1 - BAR_Y + 4);
  c.strokeStyle = "#7a6a5a"; c.lineWidth = 2; c.setLineDash([8, 10]);
  c.lineDashOffset = -(performance.now() / 30) % 18;
  c.beginPath(); c.moveTo(BAR_X0, BAR_Y); c.lineTo(BAR_X1, BAR_Y); c.moveTo(JX, BAR_Y); c.lineTo(JX, STEM_Y1); c.stroke(); c.setLineDash([]);
  // good zone
  c.fillStyle = "rgba(255,122,0,.28)"; c.fillRect(JX - HIT, BAR_Y - 22, HIT * 2, 44);
  c.strokeStyle = "#ff7a00"; c.lineWidth = 2; c.strokeRect(JX - HIT, BAR_Y - 22, HIT * 2, 44);
  // pusher arm (above the bar, shoves down)
  const ext = S.pusher > 0 ? Math.sin((1 - S.pusher / 0.28) * Math.PI) : 0;
  c.fillStyle = "#2b1a0e"; rr(c, JX - 30, 22, 60, 18, 6); c.fill();
  c.fillStyle = "#b3261e"; rr(c, JX - 14, 40, 28, 14 + ext * 44, 5); c.fill();
  // lost chute
  c.fillStyle = "#b3261e"; rr(c, BAR_X1 + 4, BAR_Y - 34, W - BAR_X1 - 10, 68, 8); c.fill();
  c.fillStyle = "#fff"; c.font = "700 14px Inter, Arial, sans-serif"; c.textAlign = "center"; c.fillText("LOST", (BAR_X1 + W) / 2 + 0, BAR_Y - 6); c.font = "700 20px Inter, Arial, sans-serif"; c.fillText(String(S.lost.length), (BAR_X1 + W) / 2, BAR_Y + 20);
  // plane
  c.font = "56px sans-serif"; c.fillStyle = "#2b1a0e"; c.fillText("✈️", JX, STEM_Y1 + 58);
  c.font = "700 13px Inter, Arial, sans-serif"; c.fillStyle = "#2b1a0e"; c.fillText("TO THE PLANE", JX, STEM_Y1 + 78);
  c.textAlign = "left"; c.font = "600 12px Inter, Arial, sans-serif"; c.fillStyle = "#7a6a5a"; c.fillText("bags arrive →", BAR_X0, BAR_Y + 40);
  // bags
  for (const b of S.bags) {
    const w = 38, h = 28;
    c.save(); c.translate(b.x, b.y);
    if (b.mode === "knocked") c.rotate(Math.sin(b.spin) * 0.5);
    c.fillStyle = b.colour; rr(c, -w / 2, -h / 2, w, h, 6); c.fill();
    c.strokeStyle = "#2b1a0e"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "#2b1a0e"; c.fillRect(-7, -h / 2 - 5, 14, 5);
    c.fillStyle = "#fff"; c.fillRect(-w / 2 + 4, -2, w - 8, 4);
    c.restore();
  }
  // flash
  if (S.flashT > 0) { c.globalAlpha = Math.min(1, S.flashT * 2); c.fillStyle = "#2b1a0e"; c.font = "800 22px Inter, Arial, sans-serif"; c.textAlign = "center"; c.fillText(S.flash, JX, 80); c.globalAlpha = 1; }
}

function frame(now) {
  const c = $("#bg-canvas").getContext("2d");
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!S.over) update(dt);
  draw(c);
  const near = S.bags.filter((b) => b.mode === "bar").map((b) => b.x - JX).sort((a, b) => Math.abs(a) - Math.abs(b))[0];
  const cv = $("#bg-canvas"); cv.dataset.near = near === undefined ? "" : String(Math.round(near)); cv.dataset.loaded = S.loaded; cv.dataset.lost = S.lost.length;
  $("#bg-loaded").textContent = S.loaded; $("#bg-lost").textContent = `${S.lost.length} of ${MAX_LOST}`; $("#bg-best").textContent = S.best;
  $("#bg-lostlist").textContent = S.lost.length ? "In the Lost section: " + S.lost.join(", ") : "The Lost section is empty. Joel is suspicious.";
  if (S.over) { endScreen(); return; }
  raf = requestAnimationFrame(frame);
}

function endScreen() {
  const box = $("#bg-end");
  box.hidden = false;
  box.replaceChildren(el("h2", { style: "margin-top:0" }, "Game over"),
    el("p", {}, `You put ${S.loaded} bag${S.loaded === 1 ? "" : "s"} on the plane and lost ${MAX_LOST}. ${S.loaded >= S.best && S.loaded > 0 ? "That is your best." : `Your best is ${S.best}.`}`),
    el("p", {}, S.peanuts ? `Joel is proud. +${S.peanuts} peanut${S.peanuts === 1 ? "" : "s"} for your wallet.` : S.loaded >= 5 ? "Log in next time and we would pay you in peanuts." : "Load 5 bags next time for a peanut. (Log in to keep it.)"),
    el("p", { class: "note" }, "The lost bags are now in Lost and Found. Joel says they are his."),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "button", onclick: start }, "Play again"), el("a", { class: "btn secondary", href: "bagtrack.html" }, "Track my bag"), el("a", { class: "btn ghost", href: "lostfound.html" }, "Lost and Found")));
}

function start() {
  cancelAnimationFrame(raf);
  S = newGame();
  $("#bg-end").hidden = true; $("#bg-start").hidden = true; $("#bg-push").disabled = false;
  last = performance.now();
  raf = requestAnimationFrame(frame);
  $("#bg-push").focus();
}

const canvas = el("canvas", { id: "bg-canvas", width: W, height: H, class: "bg-canvas", role: "img", "aria-label": "The T-shaped baggage belt. Bags come from the left. Press PUSH when a bag is in the orange zone in the middle to send it down to the plane." });
root.replaceChildren(
  el("div", { class: "bg-stats card" },
    el("span", {}, "On the plane: ", el("strong", { id: "bg-loaded" }, "0")),
    el("span", {}, "Lost: ", el("strong", { id: "bg-lost" }, `0 of ${MAX_LOST}`)),
    el("span", {}, "Best: ", el("strong", { id: "bg-best" }, String(Number(load(BEST, 0)) || 0)))),
  el("div", { class: "bg-wrap" }, canvas,
    el("div", { id: "bg-start", class: "bg-overlay" }, el("div", { class: "card" },
      el("h2", { style: "margin-top:0" }, "How to play"),
      el("p", {}, "Bags ride the belt from the left. When a bag is in the orange zone in the middle, press PUSH (or Space) and it goes down to the plane. Too early, too late, or a miss, and it goes to Lost. Lose 5 bags and it is over."),
      slow ? el("p", { class: "note" }, "Your device asked for less motion, so the belt is slower.") : "",
      el("button", { class: "btn", type: "button", onclick: start }, "Start"))),
    el("div", { id: "bg-end", class: "bg-overlay", hidden: true })),
  el("div", { class: "actions" }, el("button", { id: "bg-push", class: "btn bg-pushbtn", type: "button", disabled: true, onclick: push }, "PUSH (Space)")),
  el("p", { id: "bg-lostlist", class: "note", "aria-live": "polite" }),
  el("p", { class: "note" }, "Every 5 bags you load earns a peanut when the game ends (up to 3), if you are logged in."));
document.addEventListener("keydown", (e) => { if (e.code === "Space" && S && !S.over && document.activeElement?.tagName !== "BUTTON" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); push(); } });
$("#bg-push").addEventListener("keydown", (e) => { if (e.code === "Space") e.stopPropagation(); });
