// Apologies. The moment a flight is late (even by 1 millisecond) Octee sends a long, sincere letter,
// and a banner on every page tells you it has arrived. Kept in this browser only (octee.apologies).
import { el } from "./dom.js";
import { load, save, loadSession, saveSession } from "./store.js";
import { currentUser } from "./auth.js";
import { tripId, legUrl, hash, depEpoch } from "./tripkit.js";
import { STAGES, LAST, fmtLate, trackKey } from "./delays.js";
import { placeName } from "./destinations.js";
import { addPeanuts } from "./peanuts.js";

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
  if (fresh) setTimeout(() => addPeanuts(`Apology ${a.n > 1 ? "number " + a.n + " " : ""}for flight ${a.no} (1 peanut, with feeling)`, 1), 0);
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

// ---------- flights get late by themselves while you are on the site ----------
// A flight you already had turns late 20 seconds after you are on the site.
// A flight you have just booked turns late exactly 8.88 seconds after booking.
// Very rarely (about 1 in 25) a flight does not turn late by itself. It is worked out from the flight, so it never changes.
// On top of that, an "everything is 1 millisecond late" apology appears every 10 seconds for everybody (see watchAmbient).
const SCHED = "octee.apology.sched";
const RARE = 25;
const FRESH_MS = 8880;                 // a new booking: 8.88 seconds
const EXISTING_MS = 20000;             // a flight you already had: 20 seconds
const AMBIENT_MS = 10000;              // the general apology: every 10 seconds
function turnLate(b, i, l) {
  const key = trackKey(b, i);
  const st = load(key, null) || { stage: 0, log: [], seen: Date.now() };
  if (st.stage < 1) {
    st.stage = 1;
    st.log = [{ at: new Date().toLocaleTimeString("en-GB", { hour12: false }), text: STAGES[1][0] }, ...(st.log || [])];
    st.seen = Date.now();
    save(key, st);
  }
  sendApology(b, i, l, st.stage);
}
export function scanFlights() {
  const u = currentUser();
  if (!u) return;
  const sched = load(SCHED, {});
  const now = Date.now();
  let changed = false;
  for (const b of u.trips || []) {
    (b.legs || []).forEach((l, i) => {
      const id = `${u.username}|${tripId(b)}.${i}`;
      let r = sched[id];
      if (!r) {
        if (depEpoch(l) < now - 864e5) return;                                  // left more than a day ago: leave it alone
        const h = hash(id);
        const fresh = now - tripId(b) < 180000;                                 // booked in the last 3 minutes
        r = sched[id] = { due: fresh ? tripId(b) + FRESH_MS : now + EXISTING_MS, skip: h % RARE === 0, done: false };
        changed = true;
      }
      if (!r.done && now >= r.due) {
        r.done = true; changed = true;
        if (!r.skip) turnLate(b, i, l);
      }
    });
  }
  if (changed) save(SCHED, sched);
  // wake up exactly when the next flight is due (so 8.88 seconds really is 8.88 seconds)
  clearTimeout(nextScan);
  const pending = Object.values(sched).filter((r) => !r.done).map((r) => r.due - Date.now());
  if (pending.length) nextScan = setTimeout(scanFlights, Math.max(20, Math.min(...pending) + 5));
}
let nextScan = null;
let watching = false;
export function watchFlights() {
  if (watching) return;
  watching = true;
  scanFlights();
  setInterval(scanFlights, 5000);
  window.addEventListener("octee:account", scanFlights);      // a new booking
}

// ---------- every 10 seconds: everything is 1 millisecond late ----------
// Joel says sorry 3 times a visit, then he runs out of sorry and apologises for something else instead.
// There is a Mute button on the banner (and a switch in the footer). The count starts again in a new browser session.
const AMBIENT = "octee.apology.ambient";
const MUTE = "octee.apology.mute";
const COUNT = "octee.apology.n";
export const CUPBOARD = "octee.cupboard";
export const cupboardOpen = () => load(CUPBOARD, false) === true;
export const sorryLeft = () => Math.max(0, SORRY_LIMIT + 1 - count());
export const SORRY_LIMIT = 3;
export const UNRELATED = [
  "We are sorry about the pigeon on Runway 2. We did not invite it. It stayed.",
  "We are sorry we ate a sandwich in Terminal 1. It was not ours. We are sorry about that too.",
  "We are sorry about the weather in Scraggy House. It is not our weather. It is a very small weather.",
  "We are sorry we named Gate B3 after a fish. The fish has not replied.",
  "We are sorry about the music. We are also sorry about the silence between the music.",
  "We are sorry about Tuesday. We do not know what happened on Tuesday. We are sorry for that.",
  "We are sorry that the chair in the Octee Lounge is the only chair. The chair is sorry too."
];
export const unrelatedFor = (n) => UNRELATED[Math.abs(n - SORRY_LIMIT - 1) % UNRELATED.length];
const ambient = () => load(AMBIENT, { last: 0 });
const count = () => Number(loadSession(COUNT, 0)) || 0;
let ambientOn = false, ambientTimer = null;
export const isMuted = () => load(MUTE, false) === true;
export function setMuted(on) {
  save(MUTE, !!on);
  if (on) { ambientOn = false; clearTimeout(ambientTimer); }
  showBanner();
  window.dispatchEvent(new CustomEvent("octee:apology-mute"));
}
export function watchAmbient() {
  if (!ambient().last) save(AMBIENT, { last: Date.now() });
  setInterval(() => {
    if (ambientOn || isMuted() || Date.now() - ambient().last < AMBIENT_MS) return;
    save(AMBIENT, { last: Date.now() });
    saveSession(COUNT, count() + 1);
    if (count() > SORRY_LIMIT) save(CUPBOARD, true);      // Joel has run out of sorry: the cupboard door is open
    ambientOn = true;
    showBanner();
    clearTimeout(ambientTimer);
    ambientTimer = setTimeout(() => { ambientOn = false; showBanner(); }, 6000);     // stays 6 seconds, unless you dismiss it
  }, 1000);
}

// ---------- the banner (on every page) ----------
let bar = null;
export function showBanner() {
  const hidden = loadSession(HIDE, []) || [];
  const unread = apologies().filter((a) => !a.read && !hidden.includes(a.id));
  if (!unread.length) {
    if (!ambientOn) { bar?.remove(); bar = null; return; }
    const n = count();
    const out = n > SORRY_LIMIT;
    const hide = () => { ambientOn = false; clearTimeout(ambientTimer); save(AMBIENT, { last: Date.now() }); showBanner(); };
    const amb = el("div", { class: "apology-bar", role: "status", "aria-live": "polite" },
      el("span", { class: "apology-icon", "aria-hidden": "true" }, "✉"),
      out ? el("p", {}, el("strong", {}, "Joel has run out of sorry. "), "He is sorry about something else: " + unrelatedFor(n))
          : el("p", {}, el("strong", {}, n > 1 ? `Apology number ${n} of ${SORRY_LIMIT} from Octee Airlines: ` : "New message from Octee Airlines: "), "we are so, so sorry. Everything is 1 millisecond late."),
      el("a", { class: "btn small", href: `apology.html?general=${n}` }, "Read the apology"),
      el("button", { class: "btn small ghost", type: "button", onclick: hide }, "Dismiss (we will keep apologising)"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => setMuted(true) }, "Mute apologies"));
    if (bar) bar.replaceWith(amb); else { const header = document.querySelector(".site-header"); header ? header.after(amb) : document.body.prepend(amb); }
    bar = amb;
    return;
  }
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

// The general letter (no flight needed): for everybody, every 10 seconds.
export function generalLetter(n = 1, who = "Valued Passenger") {
  if (n > SORRY_LIMIT) return {
    who, unrelated: true, paragraphs: [
      "Joel has run out of sorry. He has said it three times, and a person can only say it so many times before it stops being a word. Joel has gone quiet, and then loud, and then to a cupboard.",
      "While Joel is in the cupboard, we want to apologise for something else entirely. " + unrelatedFor(n),
      "That is the apology. It has nothing to do with your flight, or the 1 millisecond, or you. We are sorry about that as well. It was the only apology we had left, and it was not even ours.",
      "If you would like the sorries to stop, there is a Mute button on the banner, and a switch in the footer. If you would like them to start again, there is the same switch. We will not take it personally. Joel will, but he is in the cupboard.",
      "Yours, running low on sorry,"
    ]
  };
  const p = [];
  if (n > 1) p.push(`This is our apology number ${n}. The earlier ones were not enough. We can tell, because everything is still 1 millisecond late.`);
  p.push(`We are writing to you with a heavy heart, a shaking hand and a slightly damp peanut. Everything at Octee Airlines is 1 millisecond late. The website. The planes. The peanuts. The letter you are reading now, which arrived 1 millisecond after we sent it. We are so sorry.`);
  p.push("We want to be very clear about the size of the problem. It is one millisecond. A millisecond is one thousandth of a second. You could not blink in it. A bee could not flap in it. Even so, we should have been on time, we were not, and that is entirely our fault. We are sorry. We are so very sorry.");
  p.push("You do not have to have a flight for us to be sorry. You do not have to have a booking. You do not even have to have been here for long. We would have been sorry before you came, if we had known. We are sorry that we did not know.");
  p.push("Let us say it again, in case it did not land. We are sorry. We are sorry that we are late. We are sorry that we are late saying sorry. We are sorry that this letter is long. We are sorry that it is not longer. We will be sorry again in 10 seconds. We are already sorry about that.");
  p.push("Joel has been told. Joel said, \"I'm a joel!\" and then cried a little. We are sorry for Joel. We are sorry for you. We are sorry for the clock, which did nothing wrong, but is blamed every day.");
  p.push("If you have booked a flight, we are sorrier. We will say so in 8.88 seconds. If you have not booked a flight, please book one, so that we have something proper to be sorry about.");
  p.push("Once again, with all our hearts: we are sorry, sorry, sorry, sorry. If we have not said it enough, please tell us, and we will say it more.");
  return { who, paragraphs: p };
}
