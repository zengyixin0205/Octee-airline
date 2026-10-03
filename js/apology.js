// Apologies. The moment a flight is late (even by 1 millisecond) Octee sends a long, sincere letter,
// and a banner on every page tells you it has arrived. Kept in this browser only (octee.apologies).
import { el } from "./dom.js";
import { load, save, loadSession, saveSession } from "./store.js";
import { currentUser } from "./auth.js";
import { tripId, legUrl } from "./tripkit.js";
import { LAST, fmtLate } from "./delays.js";
import { placeName } from "./destinations.js";

const KEY = "octee.apologies";
const HIDE = "octee.apology.hidden";
const AGAIN_AFTER = 4;                 // a further apology when it gets this many steps worse

const owner = () => currentUser()?.username || "";
const all = () => load(KEY, []).filter((a) => a && a.id);
const mineList = () => all().filter((a) => a.owner === owner());

// Called by the tracker whenever the flight is late.
export function sendApology(b, i, l, stage) {
  const o = owner();
  if (!o) return;
  const id = `${tripId(b)}.${i}`;
  const list = all();
  const late = fmtLate(stage);
  let a = list.find((x) => x.owner === o && x.id === id);
  let fresh = false;
  if (!a) { a = { id, owner: o, no: l.no, url: legUrl("apology.html", b, i), n: 1, read: false, readStage: 0, stage, late, at: Date.now() }; list.unshift(a); fresh = true; }
  else if (a.read && (stage >= a.readStage + AGAIN_AFTER || (stage >= LAST && a.readStage < LAST))) { a.read = false; a.n += 1; a.at = Date.now(); a.stage = stage; a.late = late; fresh = true; }
  else if (a.stage !== stage) { a.stage = stage; a.late = late; }
  else return;
  save(KEY, list.slice(0, 40));
  if (fresh) { saveSession(HIDE, (loadSession(HIDE, []) || []).filter((x) => x !== id)); }
  window.dispatchEvent(new CustomEvent("octee:apology"));
}

export const apologies = () => mineList().sort((a, b) => b.at - a.at);
export function markRead(id, stage) {
  const list = all();
  const a = list.find((x) => x.owner === owner() && x.id === id);
  if (!a) return;
  a.read = true; a.readStage = stage ?? a.stage;
  save(KEY, list);
  window.dispatchEvent(new CustomEvent("octee:apology"));
}

// ---------- the banner (on every page) ----------
let bar = null;
export function showBanner() {
  const hidden = loadSession(HIDE, []) || [];
  const unread = apologies().filter((a) => !a.read && !hidden.includes(a.id));
  if (!unread.length) { bar?.remove(); bar = null; return; }
  const a = unread[0];
  const more = unread.length > 1 ? ` (and ${unread.length - 1} more apolog${unread.length - 1 === 1 ? "y" : "ies"})` : "";
  const next = el("div", { class: "apology-bar", role: "status", "aria-live": "polite" },
    el("span", { class: "apology-icon", "aria-hidden": "true" }, "✉"),
    el("p", {}, el("strong", {}, a.n > 1 ? "Another apology from Octee Airlines: " : "New message from Octee Airlines: "),
      `we are so, so sorry. Flight ${a.no} is ${a.late} late.${more}`),
    el("a", { class: "btn small", href: a.url }, "Read the apology"),
    el("button", { class: "btn small ghost", type: "button", onclick: () => { saveSession(HIDE, [...hidden, ...unread.map((x) => x.id)]); showBanner(); } }, "Dismiss (we will keep apologising)"));
  if (bar) bar.replaceWith(next);
  else {
    const header = document.querySelector(".site-header");
    header ? header.after(next) : document.body.prepend(next);
  }
  bar = next;
}

// ---------- the letter ----------
export function letter({ names, l, stage, n = 1 }) {
  const who = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
  const late = fmtLate(stage);
  const ms = late === "1 millisecond";
  const from = placeName(l.from), to = placeName(l.to);
  const p = [];
  if (n > 1) p.push(`This is our apology number ${n}. The earlier ones were not enough. We can tell, because the plane is later.`);
  p.push(`We are writing to you with a heavy heart, a shaking hand and a slightly damp peanut. Your flight, ${l.no} from ${from} to ${to}, is late. It is late by ${late}. We are so sorry.`);
  p.push(ms
    ? "We want to be very clear about the size of the problem. It is one millisecond. A millisecond is one thousandth of a second. You could not blink in it. A bee could not flap in it. Even so, the flight was meant to be on time, it is not, and that is entirely our fault. We are sorry. We are so very sorry."
    : `We want to be very clear about the size of the problem. It began as one millisecond. It is now ${late}. We started apologising for the millisecond, and we have not stopped, and we are sorry for that as well.`);
  p.push("Let us say it again, in case it did not land. We are sorry. We are sorry that the plane is late. We are sorry that we are late saying sorry. We are sorry that this letter is long. We are sorry that it is not longer.");
  p.push("We held an emergency meeting about the delay. The meeting started 1 millisecond late, and we are sorry about that too. Everyone in the meeting apologised to everyone else, and then to the table, and then to the chairs, which had done nothing wrong.");
  if (stage >= 10 && stage < LAST) p.push("We are also sorry that we have lost the plane. We are looking for it. We are sorry that we are looking slowly. We are sorry that the plane did not leave a note.");
  if (stage >= LAST) p.push("The plane has now left. We are sorry that it left. We are sorry that we are not sure whether you were on it. We are sorry about that grammar, and about all the other grammar.");
  p.push("Joel has been told. Joel said, \"I'm a joel!\" and then cried a little. We are sorry for Joel. We are sorry for you. We are sorry for the clock, which did nothing wrong, but is blamed every day.");
  p.push("To make it up to you we considered many things: a free peanut, a second peanut, a slightly larger peanut, and a hug from the airport. The hug was not approved. The peanuts were. Please claim them at our Complaint Desk, where your complaint will be at the front of the queue, and where we will apologise to you again in person.");
  p.push("If you are still waiting, we want you to know that we are waiting too, in the same sad way. If you have already left, we are sorry that you left. If you have not left, we are sorry that you are still here. If you are reading this on the plane, we are sorry about the plane.");
  p.push("Once again, with all our hearts: we are sorry, sorry, sorry, sorry. If we have not said it enough, please tell us, and we will say it more.");
  return { who, late, paragraphs: p };
}
