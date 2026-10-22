// The Octee Lounge: one shared lounge for Octee Airlines, Scraggy Airlines, One United and FujiAIR passengers alike.
// Open to anyone (like Duty Free) — no login needed just to sit down. Same sandwich/crush mechanic as Joel's Cupboard.
import { $, el, setMsg } from "./dom.js";
import { load, save } from "./store.js";

const root = $("#app");
const KEY = "octee.lounge.state";
const st = () => ({ sand: 0, ate: 0, ...load(KEY, {}) });
const sv = (s) => save(KEY, s);

const SANDWICH = [
  ["A sandwich sits on the counter. It is free, and shared by every airline that uses this lounge. Nobody has asked whose turn it is.", "Take a bite"],
  ["You take a bite. It tastes like Octee, Scraggy, One United and FujiAIR all agreeing on one thing, for once.", "Take another bite"],
  ["You finish it. Somewhere, four separate accounting departments are now disputing whose sandwich that was.", "Put a new one out"]
];
const PODS = [
  ["Shared seating", "Octee, Scraggy, One United and FujiAIR passengers all sit here. Nobody has fought about it yet."],
  ["Nap pod", "A chair that reclines exactly four degrees. Every airline agrees it counts as a bed."],
  ["Water point", "Free hot water. Also free cold water, if you wait for the hot water to cool."],
  ["Charging socket", "There is one. It is contested by four airlines' worth of passengers."],
  ["Lost sock shelf", "Nobody flies anything out of this airport with both socks. Take one if yours matches."],
  ["The one chair", "The Octee Lounge's famous one chair. Scraggy, One United and FujiAIR have each separately claimed it is theirs."]
];

function sandwichCard() {
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const sandEmoji = el("span", { class: "cup-sand", "aria-hidden": "true" }, "🥪");
  const sandText = el("p", {});
  const sandBtn = el("button", { class: "btn", type: "button" });
  const paint = () => {
    const s = st();
    sandText.textContent = s.sand === 0 ? "A sandwich sits on the counter. Shared by everyone who uses this lounge." : SANDWICH[Math.min(s.sand, 3) - 1][0];
    sandBtn.textContent = s.sand === 0 ? "Look at it" : SANDWICH[Math.min(s.sand, 3) - 1][1];
    sandEmoji.textContent = s.sand >= 3 ? "🍽️" : "🥪";
  };
  sandBtn.addEventListener("click", () => {
    const s = st(); const finishing = s.sand === 2;
    s.sand = s.sand >= 3 ? 0 : s.sand + 1;
    if (finishing) s.ate = (s.ate || 0) + 1;
    sv(s); paint();
    if (!finishing) return;
    if (s.ate === 1) { setMsg(msg, "You finish the shared sandwich. A new one appears for the next airline's passengers.", "info"); return; }
    sandBtn.disabled = true;
    setMsg(msg, s.ate === 2 ? "You finish another. The counter creaks under the weight of four airlines' worth of lunch." : "You finish a third. The counter was apparently load-bearing for all of them." , "error");
    crush();
  });
  paint();
  return el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "The lounge sandwich"), sandEmoji, sandText, el("p", {}, sandBtn), msg);
}

// Eat the sandwich too many times: the page falls down and lands on the 404. Same mechanic as Joel's Cupboard.
function crush() {
  const over = el("div", { class: "crush-404", role: "alert" },
    el("p", { class: "crush-big" }, "404"),
    el("h1", { class: "crush-h" }, "U Crushed the page"),
    el("p", { class: "crush-err" }, "ERROR 404"),
    el("p", {}, "The lounge floor was shared by four airlines. None of them were responsible for maintaining it."),
    el("button", { class: "btn", type: "button", onclick: () => location.reload() }, "Put the page back"));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => {
    document.body.classList.add("cup-crush");
    setTimeout(() => { document.body.append(over); over.querySelector("button").focus(); }, reduce ? 0 : 1500);
  }, reduce ? 300 : 1400);
}

function podsCard() {
  return el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "Everything else in the lounge"),
    el("div", { class: "grid" }, PODS.map(([t, d]) => el("div", { class: "card" }, el("h3", {}, t), el("p", {}, d)))));
}

function backLinks() {
  return el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "Back to check-in"),
    el("div", { class: "actions" },
      el("a", { class: "btn", href: "checkin.html" }, "Octee / Scraggy / One United check-in"),
      el("a", { class: "btn secondary", href: "fujiair-checkin.html" }, "FujiAIR check-in")));
}

root.replaceChildren(sandwichCard(), podsCard(), backLinks());
