// Festival extras, switched on with the theme (js/theme.js calls mountPieces and settleCandy):
// big tappable pieces for each theme (pumpkins that light up, lanterns, diyas, crescents, lotus, eggs, firecrackers),
// corner trees and Santa, who flies over every minute and drops one gift that says "click me" (the surprise is in
// SURPRISES below). Bowls of sweets: each sweet taken is charged 10 Octmiles on the next visit to any page, and only
// while the account has the Octmiles. The cloud always accepts a spend, so these charges are never refused.
import { el, pick } from "./dom.js";
import { updateUser, currentUser, sessionKey } from "./auth.js";
import { load, save } from "./store.js";
import { push } from "./cloud.js";

export const CANDY_COST = 10; // Octmiles per sweet
const CANDY = { halloween: "Halloween candy", deepavali: "Deepavali mithai", aidilfitri: "Hari Raya kuih raya", midautumn: "Mid-Autumn moon cake" };
const WISHES = ["May your journey be safe, even if the flight is not.", "Ameen. The flight is delayed, but the prayers are on time."];
const SURPRISES = [
  "Surprise! Octee has upgraded you to the middle seat. Enjoy.",
  "Surprise! Your gift is a voucher for one free delay. Valid whenever we say so.",
  "Surprise! This gift contains nothing. Santa is very sorry.",
  "Surprise! You are our one millionth visitor this season. Please wait at gate B3.",
  "Surprise! Your present has been sent to Scraggy House. It arrives in the new year.",
];

const sweetKey = (key, user) => `octee.candy.${key}.${user}`;

function flash(text) {
  const m = el("div", { class: "theme-flash", role: "status" }, text);
  document.body.append(m);
  setTimeout(() => m.remove(), 4000);
}

function surprise(text) {
  const box = el("div", { class: "theme-surprise", role: "dialog", "aria-label": "Surprise" }, el("p", {}, text), el("small", {}, "Tap to close"));
  box.addEventListener("click", () => box.remove());
  document.body.append(box);
}

// A big piece in a corner or down the side. `pos` is a CSS position, e.g. { left: "10px", top: "30vh" }.
function bigPiece(emoji, label, pos, onTap) {
  const b = el("button", { class: "theme-big", type: "button", "aria-label": label, title: label }, emoji);
  Object.assign(b.style, pos);
  b.addEventListener("click", (e) => onTap(b, e));
  document.body.append(b);
  return b;
}
const toggleLit = (b) => { b.classList.toggle("lit"); b.classList.toggle("off", !b.classList.contains("lit")); b.setAttribute("aria-pressed", String(b.classList.contains("lit"))); };

function burstAt(x, y) {
  const layer = el("div", { class: "theme-fx", "aria-hidden": "true" });
  document.body.append(layer);
  const COLORS = ["#ffd54a", "#ff6b4a", "#ff4a7a", "#ffffff", "#ffb347", "#5ad1ff"];
  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18, dist = 50 + Math.random() * 90;
    const dot = el("span", { class: "theme-firework" });
    dot.style.left = (x / window.innerWidth * 100) + "vw";
    dot.style.top = (y / window.innerHeight * 100) + "vh";
    dot.style.background = pick(COLORS);
    dot.style.setProperty("--fx", (Math.cos(angle) * dist).toFixed(1) + "px");
    dot.style.setProperty("--fy", (Math.sin(angle) * dist).toFixed(1) + "px");
    layer.append(dot);
  }
  setTimeout(() => layer.remove(), 1100);
}

// A bowl of sweets: taking one costs 10 Octmiles, charged on a later visit (settleCandy).
function candyBowl(key) {
  const label = CANDY[key];
  const bowl = el("button", { class: "theme-bowl", type: "button", "aria-label": `Bowl of ${label}: take a sweet. It costs 10 Octmiles, charged later.` },
    el("span", { class: "theme-bowl-emoji", "aria-hidden": "true" }, "🥣"), el("span", {}, "Take a sweet"));
  bowl.addEventListener("click", () => {
    const user = sessionKey();
    if (!currentUser() || !user) return flash("Log in to take a sweet.");
    save(sweetKey(key, user), Math.max(0, Math.floor(Number(load(sweetKey(key, user), 0)) || 0)) + 1);
    flash(`Sweet taken. ${CANDY_COST} Octmiles will be charged later.`);
  });
  document.body.append(bowl);
}

// Charges the sweets taken so far, as far as the account's Octmiles allow. Runs on every page while the site loads.
export function settleCandy() {
  const user = sessionKey();
  if (!user || !currentUser()) return;
  for (const [key, label] of Object.entries(CANDY)) {
    const owed = Math.max(0, Math.floor(Number(load(sweetKey(key, user), 0)) || 0));
    if (!owed) continue;
    let n = 0;
    try {
      updateUser((u) => {
        n = Math.min(owed, Math.floor((u.octmiles || 0) / CANDY_COST));
        if (!n) return;
        u.octmiles -= n * CANDY_COST;
        u.history.unshift({ at: new Date().toISOString(), text: `${label} (${n} sweet${n === 1 ? "" : "s"})`, amount: -n * CANDY_COST });
      });
    } catch { return; }
    if (n) {
      save(sweetKey(key, user), owed - n);
      push().catch(() => {});
      flash(`${label}: ${n * CANDY_COST} Octmiles charged for ${n} sweet${n === 1 ? "" : "s"}.`);
    }
  }
}

// Santa (or the Easter bunny) flies across the top of the page every minute and drops one gift that says "click me".
function flyer(emoji, dropEmoji, every = 60000) {
  const launch = () => {
    const f = el("span", { class: "theme-flyer", "aria-hidden": "true" }, emoji);
    document.body.append(f);
    setTimeout(() => f.remove(), 14500);
    setTimeout(() => dropGift(dropEmoji), 7000);
  };
  setTimeout(launch, 6000);
  setInterval(launch, every);
}
function dropGift(emoji) {
  const g = el("button", { class: "theme-gift", type: "button", "aria-label": "Gift that says click me" },
    el("span", { class: "theme-gift-box", "aria-hidden": "true" }, emoji), el("span", { class: "theme-gift-tag" }, "click me"));
  g.style.left = (40 + Math.random() * 20) + "vw";
  g.addEventListener("click", () => { g.remove(); surprise(pick(SURPRISES)); });
  document.body.append(g);
  setTimeout(() => g.remove(), 60000); // a gift nobody opens drifts off after a minute
}

function cornerTrees() {
  for (const c of ["tl", "tr", "bl", "br"]) document.body.append(el("span", { class: "theme-tree theme-tree-" + c, "aria-hidden": "true" }, "🎄"));
}

function pumpkins() {
  bigPiece("🎃", "Pumpkin: press to light it up, press again to switch it off", { left: "10px", bottom: "110px" }, toggleLit).classList.add("off");
  bigPiece("🎃", "Pumpkin: press to light it up, press again to switch it off", { right: "10px", bottom: "110px" }, toggleLit).classList.add("off");
}

export function mountPieces(key) {
  if (key === "christmas") { cornerTrees(); flyer("🎅", "🎁"); }
  else if (key === "cny") bigPiece("🧨", "Firecracker: press for a burst of fireworks", { left: "10px", top: "30vh" }, (b, e) => burstAt(e.clientX, e.clientY));
  else if (key === "deepavali") { bigPiece("🪔", "Big diya: press to light it, press again to put it out", { left: "10px", top: "30vh" }, toggleLit).classList.add("off"); candyBowl("deepavali"); }
  else if (key === "halloween") { pumpkins(); candyBowl("halloween"); }
  else if (key === "aidilfitri") { bigPiece("🌙", "Big crescent: press to light it, press again to switch it off", { left: "10px", top: "30vh" }, toggleLit).classList.add("off"); candyBowl("aidilfitri"); }
  else if (key === "haji") bigPiece("⭐", "Big star: press for a wish", { right: "10px", top: "30vh" }, () => surprise(pick(WISHES)));
  else if (key === "vesak") bigPiece("🪷", "Big lotus: press to open it, press again to close it", { left: "10px", top: "30vh" }, (b) => b.classList.toggle("bloom"));
  else if (key === "midautumn") { bigPiece("🏮", "Big lantern: press to light it, press again to switch it off", { right: "10px", top: "30vh" }, toggleLit).classList.add("off"); candyBowl("midautumn"); }
  else if (key === "thaipusam") bigPiece("🌼", "Big marigold: press to spin it", { right: "10px", top: "30vh" }, (b) => { b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin"); });
  else if (key === "easter") { bigPiece("🥚", "Giant egg: press to crack it open", { left: "10px", top: "30vh" }, () => surprise("Empty. Like our schedule.")); flyer("🐰", "🥚"); }
}
