// The cockpit: dials that read nothing useful, buttons that each make an announcement, and one button marked Do not.
import { $, el, reducedMotion } from "./dom.js";

const root = $("#app");
const DIALS = [["ALTITUDE", "(in feelings)", "up"], ["FUEL", "(mostly)", "some"], ["SPEED", "(relative to Joel)", "slow"], ["ATTITUDE", "(positive)", "yes"],
  ["PEANUT PRESSURE", "(PSI)", "high"], ["DELAY", "(1 ms)", "late"]];
const BUTTONS = [
  ["Landing gear", "Landing gear: down. Landing gear: up. Landing gear: it is thinking about it."], ["Autopilot", "Autopilot engaged. Autopilot disengaged. Autopilot has gone for lunch."],
  ["Cabin lights", "The cabin lights are now off. The cabin lights were not on. We are sorry about the dark."], ["Coffee", "A coffee has been ordered. A coffee has been spilled. A coffee has been ordered again."],
  ["Seatbelt sign", "The seatbelt sign is on. Please fasten your seatbelt. It has no buckle."], ["Radio", "Control tower, this is Octee. Control tower: who is this? Octee. Who? Octee."],
  ["Flaps", "Flaps up. Flaps down. Flaps are waving at a cloud."], ["Wipers", "Wipers on. It is not raining. They are for the clouds' feelings."],
  ["Altitude", "We are now cruising at an altitude of 'high'. Please do not ask which units."], ["Weather", "Weather: weather. Visibility: good. Visibility of what: not stated."],
  ["Joel", "Joel has been told. Joel has not been told what. Joel is crying a little."], ["Turn left", "Turning left. Turning right. Turning around to check what we turned from."]
];
const NO = ["You pressed it. We are very sorry. Please press nothing else.", "Something has been done. We cannot say what. It is not good.", "The plane has been told you pressed it. It is thinking about you.",
  "Okay. It was a button. It said Do not. We said Do not. You did.", "All alarms are now off. This is the alarm.", "Do not press it again. This message is also a Do not.", "You have pressed Do not " ];
let nos = 0, count = 0;
const log = el("ol", { class: "ck-log", "aria-live": "polite", reversed: true });
const add = (title, t) => { count++; log.prepend(el("li", {}, el("strong", {}, title + ": "), t)); while (log.children.length > 8) log.lastChild.remove(); };

const dial = ([name, unit, word], i) => {
  const d = el("div", { class: "ck-dial" });
  const dur = 2.2 + ((i * 7) % 5) * 0.9, from = -60 + i * 17, to = 40 + ((i * 29) % 70);
  d.innerHTML = `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M15 75 A45 45 0 0 1 105 75" fill="none" stroke="#7a6a5a" stroke-width="5"/><g class="ck-needle" style="--f:${from}deg;--t:${to}deg;animation-duration:${dur}s"><line x1="60" y1="75" x2="60" y2="35" stroke="#ff7a00" stroke-width="3" stroke-linecap="round"/></g><circle cx="60" cy="75" r="5" fill="#2b1a0e"/></svg>`;
  d.append(el("div", { class: "ck-name" }, name), el("div", { class: "note" }, unit), el("div", { class: "ck-read" }, `reads: ${word}`));
  return d;
};
const btn = ([t, msg]) => el("button", { class: "btn small ghost ck-btn", type: "button", onclick: () => add(t, msg) }, t);
const noBtn = el("button", { class: "btn small ck-no", type: "button", onclick: () => { nos++; add("DO NOT", nos < NO.length ? NO[nos - 1] : NO[NO.length - 1] + nos + " times. We have stopped counting at " + nos + "."); } }, "Do not");

root.replaceChildren(
  el("div", { class: "card ck-panel" }, el("div", { class: "ck-dials" }, ...DIALS.map(dial))),
  el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "Buttons"), el("div", { class: "ck-buttons" }, ...BUTTONS.map(btn), noBtn)),
  el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "Announcements"), el("p", { class: "note" }, "Newest first."), log),
  el("p", { class: "note" }, "None of these controls are connected to a plane. We checked. Twice."));
add("Captain", "Welcome to the cockpit. Please touch everything except the one that says Do not.");
