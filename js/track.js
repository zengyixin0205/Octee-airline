// Flight tracker for one of your booked flights. The status gets worse every few seconds, and a little more
// while you are away. What happened so far is kept in this browser, so it never gets better.
import { $, el, niceDate, reducedMotion } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { placeShort } from "./destinations.js";
import { findLeg, legUrl, depEpoch, hhmm, isCheckedIn, tripId } from "./tripkit.js";
import { STAGES, LAST, NOTES, isLate } from "./delays.js";
import { sendApology } from "./apology.js";
import { load, save } from "./store.js";
import { mins } from "./destinations.js";

const root = $("#track");
const TICK_MS = 7000;

function start() {
  const found = findLeg(currentUser());
  if (!found) return chooser();
  tracker(found);
}

function chooser() {
  const u = currentUser();
  const rows = [];
  (u.trips || []).forEach((b) => b.legs.forEach((l, i) => rows.push({ b, l, i })));
  rows.sort((a, b) => a.l.date.localeCompare(b.l.date) || a.l.dep.localeCompare(b.l.dep));
  if (!rows.length) {
    root.replaceChildren(el("div", { class: "card" }, el("p", {}, "You have no flights to track. Book one first. We will try."), el("p", {}, el("a", { class: "btn", href: "book.html" }, "Book a flight"))));
    return;
  }
  root.replaceChildren(el("h2", {}, "Choose a flight"),
    ...rows.map(({ b, l, i }) => el("div", { class: "card flight-row" },
      el("div", {}, el("strong", {}, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`),
        el("p", { class: "note", style: "margin:2px 0 0" }, `${niceDate(l.date)} · departs ${l.dep}`)),
      el("a", { class: "btn small", href: legUrl("track.html", b, i) }, "Track"))));
}

const fmtDelay = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
function fmtCount(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return (d ? `${d}d ` : "") + `${p(h)}:${p(m)}:${p(x)}`;
}
const stamp = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

function tracker({ b, l, i }) {
  const key = `octee.track.${tripId(b)}.${i}`;
  const sched = depEpoch(l);
  // Where the story starts depends on how close take-off is. After that it only goes down.
  const hoursAway = (sched - Date.now()) / 3.6e6;
  const floor = hoursAway > 72 ? 0 : hoursAway > 24 ? 1 : hoursAway > 6 ? 2 : hoursAway > 1 ? 3 : hoursAway > 0 ? 4 : 5;
  let st = load(key, null) || { stage: floor, log: [], seen: Date.now() };
  const away = Math.floor((Date.now() - (st.seen || Date.now())) / 120000);     // one more bad thing per 2 minutes away
  if (away > 0) {
    for (let k = 0; k < away && st.stage < LAST; k++) { st.stage++; st.log.unshift({ at: stamp(), text: STAGES[st.stage][0] + " (while you were away)" }); }
  }
  st.stage = Math.max(st.stage, floor);
  if (!st.log.length) st.log.unshift({ at: stamp(), text: STAGES[st.stage][0] });
  const persist = () => { st.seen = Date.now(); save(key, st); };
  persist();
  const delay = () => STAGES.slice(0, st.stage + 1).reduce((n, s) => n + s[1], 0);

  const statusEl = el("p", { class: "tk-status", role: "status", "aria-live": "polite" });
  const noteEl = el("p", { class: "note" });
  const countEl = el("p", { class: "tk-count", "aria-hidden": "true" });
  const countLabel = el("p", { class: "tk-count-label" });
  const estEl = el("dd", {});
  const plane = el("div", { class: "tk-plane", "aria-hidden": "true" });
  plane.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
  const bar = el("div", { class: "tk-bar", role: "img", "aria-label": "How far along the plane is. It moves backwards sometimes." }, el("div", { class: "tk-line" }), plane);
  const certBtn = el("a", { class: "btn small", href: legUrl("certificate.html", b, i), hidden: true }, "Get my delay certificate");
  const apologyBtn = el("a", { class: "btn small ghost", href: legUrl("apology.html", b, i), hidden: true }, "Read our apology");
  const logEl = el("ol", { class: "tk-log", "aria-label": "Updates, newest first" });

  function paint() {
    const [text, , pos] = STAGES[st.stage];
    statusEl.textContent = text;
    statusEl.className = "tk-status s" + (st.stage >= 10 ? " bad" : st.stage >= 2 ? " warn" : "");
    noteEl.textContent = NOTES[st.stage] || "";
    plane.style.left = `calc(${pos}% - ${pos / 100 * 28}px)`;
    const est = sched + delay() * 60000;
    const m0 = mins(l.dep) + delay();
    estEl.textContent = delay() ? `${hhmm(m0)}${m0 >= 1440 ? " (tomorrow, maybe)" : ""} (+${fmtDelay(delay())})` : `${l.dep} (no change yet)`;
    certBtn.hidden = !isLate(st.stage);
    apologyBtn.hidden = !isLate(st.stage);
    if (isLate(st.stage)) sendApology(b, i, l, st.stage);
    logEl.replaceChildren(...st.log.slice(0, 14).map((e) => el("li", {}, el("time", {}, e.at), " ", e.text)));
    tick(est);
  }
  function tick(est = sched + delay() * 60000) {
    const left = est - Date.now();
    if (st.stage === LAST) { countLabel.textContent = "The plane has left."; countEl.textContent = "00:00:00"; return; }
    countLabel.textContent = left > 0 ? "Estimated departure in" : "Estimated departure was";
    countEl.textContent = left > 0 ? fmtCount(left) : "-" + fmtCount(-left);
  }
  const worse = () => {
    if (st.stage >= LAST) return;
    st.stage++;
    st.log.unshift({ at: stamp(), text: STAGES[st.stage][0] });
    persist();
    paint();
  };
  if (!reducedMotion()) setInterval(worse, TICK_MS);
  else document.addEventListener("click", worse);                    // reduced motion: gets worse only when you click
  setInterval(() => tick(), 1000);

  root.replaceChildren(
    el("div", { class: "card tk-card" },
      el("p", { class: "route", style: "font-family:var(--serif);font-size:1.4rem;margin:0" }, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`),
      el("p", { class: "note", style: "margin:2px 0 10px" }, `${niceDate(l.date)} · ${b.names.join(", ")}`),
      statusEl, noteEl, bar,
      countLabel, countEl,
      el("dl", { class: "kv" },
        el("dt", {}, "Scheduled"), el("dd", {}, l.dep),
        el("dt", {}, "New estimate"), estEl,
        el("dt", {}, "Gate"), el("dd", {}, l.gate + " (until it changes)"),
        el("dt", {}, "Check-in"), el("dd", {}, isCheckedIn(l) ? "Done · seat " + l.seats.join(", ") : "Not yet")),
      el("div", { class: "actions" },
        isCheckedIn(l) ? el("a", { class: "btn small", href: legUrl("pass.html", b, i) }, "Boarding pass") : el("a", { class: "btn small", href: legUrl("checkin.html", b, i) }, "Check in"),
        certBtn, apologyBtn,
        el("a", { class: "btn small ghost", href: "track.html" }, "Another flight"),
        el("a", { class: "btn small ghost", href: "status.html" }, "Flight status board"))),
    el("h2", {}, "Updates"), logEl,
    el("p", { class: "note" }, reducedMotion() ? "Your device asked for less motion, so the status only gets worse when you click or tap." : "New updates arrive about every seven seconds. They do not get better."));
  paint();
}

if (requireLogin()) start();
