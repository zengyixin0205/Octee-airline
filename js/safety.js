// The safety demonstration: six animated cards (a seatbelt with no buckle, a life jacket that is a peanut shell...) then a quiz.
// Passing the quiz (4 of 5) earns 1 peanut, once a day, for logged-in passengers.
import { $, el, reducedMotion, today } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { addPeanuts } from "./peanuts.js";
import { CARDS } from "./safetydata.js";

const root = $("#app");
const QUIZ = [
  { q: "What do you do with your seatbelt?", a: "Hold both ends firmly and believe", w: ["Find the buckle", "Eat it", "Ask Joel to find the buckle"], why: "There is no buckle. Believing is the whole procedure." },
  { q: "What is your life jacket?", a: "A peanut shell", w: ["A coat", "A balloon", "A very small boat"], why: "Under your seat. Do not inflate it. It is a shell." },
  { q: "How many exits are there?", a: "Two, and a third that will appear when needed", w: ["Exactly one", "Eleven", "None, the plane is the exit"], why: "Here, there, and one we will find later." },
  { q: "In an emergency, in the brace position you hold…", a: "Your peanut (or the idea of one)", w: ["The pilot", "Your neighbour's peanut", "A sandwich"], why: "Lean forward and hold your peanut with both hands." },
  { q: "Flight mode is…", a: "A mood", w: ["A setting", "A kind of plane", "A snack"], why: "If the phone is not in the mood, hold until it agrees." }
];
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

let idx = 0, timer = null, auto = !reducedMotion();
const card = el("div", { class: "card safe-card" });
const dots = el("div", { class: "safe-dots", "aria-hidden": "true" });

function paint() {
  const c = CARDS[idx];
  card.replaceChildren(el("h2", { style: "margin-top:0" }, c.title), el("div", { class: "safe-art-box", html: "" }), el("p", { class: "safe-text", "aria-live": "polite" }, c.text));
  card.querySelector(".safe-art-box").innerHTML = c.art;
  dots.replaceChildren(...CARDS.map((_, k) => el("span", { class: k === idx ? "on" : "" })));
  prev.disabled = idx === 0;
  next.textContent = idx === CARDS.length - 1 ? "Start the quiz" : "Next card";
}
const go = (n) => { idx = Math.max(0, Math.min(CARDS.length - 1, n)); paint(); };
const prev = el("button", { class: "btn small ghost", type: "button", onclick: () => { stopAuto(); go(idx - 1); } }, "Back");
const next = el("button", { class: "btn small", type: "button", onclick: () => { stopAuto(); idx === CARDS.length - 1 ? quiz() : go(idx + 1); } }, "Next card");
const playBtn = el("button", { class: "btn small ghost", type: "button", "aria-pressed": "false" });
function paintAuto() { playBtn.textContent = auto ? "Pause" : "Play automatically"; playBtn.setAttribute("aria-pressed", String(auto)); }
function stopAuto() { auto = false; clearInterval(timer); paintAuto(); }
playBtn.addEventListener("click", () => { auto = !auto; clearInterval(timer); if (auto) timer = setInterval(tick, 8000); paintAuto(); });
function tick() { if (idx >= CARDS.length - 1) { stopAuto(); return; } go(idx + 1); }

function demo() {
  clearInterval(timer); idx = 0;
  root.replaceChildren(card, dots, el("div", { class: "actions" }, prev, next, playBtn),
    el("p", { class: "note" }, "This demonstration is for all passengers. It is also for passengers who are not on a plane. Safety does not care."));
  paint(); paintAuto();
  if (auto) timer = setInterval(tick, 8000);
}

function quiz() {
  clearInterval(timer);
  const qs = QUIZ.map((q) => ({ ...q, opts: shuffle([q.a, ...q.w]) }));
  const form = el("form", { class: "card" }, el("h2", { style: "margin-top:0" }, "The safety quiz"), el("p", { class: "note" }, "Get 4 of 5 right to pass. A pass earns 1 peanut (once a day, if you are logged in)."));
  qs.forEach((q, k) => form.append(el("fieldset", { class: "quiz-q" }, el("legend", {}, `${k + 1}. ${q.q}`),
    ...q.opts.map((o, j) => el("label", { class: "quiz-opt" }, el("input", { type: "radio", name: "q" + k, value: o, required: true }), " " + o)))));
  const out = el("div", { id: "quiz-out", role: "status", "aria-live": "polite" });
  form.append(el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Hand in my answers"), el("button", { class: "btn ghost", type: "button", onclick: demo }, "Watch the cards again")), out);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const right = qs.filter((q, k) => fd.get("q" + k) === q.a).length;
    const pass = right >= 4;
    let reward = "";
    if (pass) {
      const u = currentUser();
      if (!u) reward = "Log in next time and we will pay you in peanuts.";
      else if (u.safetyDay === today()) reward = "You have already been paid a peanut for safety today. Safety is its own reward. Mostly.";
      else { updateUser((x) => { x.safetyDay = today(); }); addPeanuts("Passed the safety quiz (safety peanut)", 1); reward = "+1 peanut in your wallet."; }
    }
    out.replaceChildren(el("div", { class: "card " + (pass ? "ok-card" : ""), style: "margin-top:12px" },
      el("h3", { style: "margin-top:0" }, pass ? `PASSED: ${right} of 5. You are a certified safe passenger.` : `${right} of 5. Not quite. The seatbelt has no buckle. Please watch the cards again.`),
      el("p", {}, reward),
      el("ul", {}, qs.map((q, k) => el("li", {}, `${k + 1}. ${fd.get("q" + k) === q.a ? "Right. " : `Wrong (the answer is "${q.a}"). `}${q.why}`))),
      el("div", { class: "actions" }, el("button", { class: "btn small", type: "button", onclick: quiz }, "Try again"), el("a", { class: "btn small ghost", href: "radio.html" }, "Listen to Octee Radio"))));
    out.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  });
  root.replaceChildren(form);
  window.scrollTo({ top: 0 });
}
demo();
