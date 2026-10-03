// Online check-in: pick your flight, pick a seat on the map for each passenger, get the boarding pass.
import { $, el, niceDate, setMsg } from "./dom.js";
import { currentUser, requireLogin, updateUser } from "./auth.js";
import { placeShort } from "./destinations.js";
import { findLeg, legUrl, isCheckedIn, seatsOf, tripId } from "./tripkit.js";
import { seatMap } from "./seatmap.js";
import { className } from "./boardingpass.js";
import { scraggyData } from "./scraggy.js";

const root = $("#checkin");

if (requireLogin()) scraggyData().then((SA) => (findLeg(currentUser()) ? checkin(SA) : chooser()), () => (findLeg(currentUser()) ? checkin(null) : chooser()));

/* ---------- which flight? ---------- */
function chooser() {
  const u = currentUser();
  const rows = [];
  (u.trips || []).forEach((b) => b.legs.forEach((l, i) => rows.push({ b, l, i })));
  rows.sort((a, b) => a.l.date.localeCompare(b.l.date) || a.l.dep.localeCompare(b.l.dep));
  if (!rows.length) {
    root.replaceChildren(el("div", { class: "card" }, el("p", {}, "You have no flights to check in for. Book one first. We will try."), el("p", {}, el("a", { class: "btn", href: "book.html" }, "Book a flight"))));
    return;
  }
  root.replaceChildren(el("h2", {}, "Choose a flight"),
    ...rows.map(({ b, l, i }) => el("div", { class: "card flight-row" },
      el("div", {},
        el("strong", {}, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`),
        el("p", { class: "note", style: "margin:2px 0 0" }, `${niceDate(l.date)} · departs ${l.dep} · ${b.names.join(", ")}`)),
      el("div", { class: "actions" },
        isCheckedIn(l) ? el("span", { class: "tag" }, "Checked in · " + seatsOf(l).join(", ")) : el("span", { class: "tag red" }, "Not checked in"),
        el("a", { class: "btn small", href: legUrl("checkin.html", b, i) }, isCheckedIn(l) ? "Change seats" : "Check in"),
        isCheckedIn(l) ? el("a", { class: "btn small secondary", href: legUrl("pass.html", b, i) }, "Boarding pass") : ""))));
}

/* ---------- one flight ---------- */
function checkin(SA) {
  const u = currentUser();
  const { b, l, i } = findLeg(u);
  const n = b.names.length;
  const choices = Array.from({ length: n }, (_, p) => seatsOf(l)[p] || "");
  let active = Math.max(0, choices.findIndex((s) => !s));
  const msg = el("p", { class: "msg", role: "status" });
  const mapBox = el("div", { class: "map-wrap" });
  const who = el("div", { class: "pax", role: "radiogroup", "aria-label": "Passenger" });
  const confirm = el("button", { class: "btn", type: "button" }, isCheckedIn(l) ? "Save my seats" : "Check in");
  const done = el("div", { hidden: true });

  const prefer = ["window", "aisle"].includes(l.seat) ? l.seat : null;

  function draw() {
    who.replaceChildren(...b.names.map((nm, p) => el("button", { type: "button", role: "radio", "aria-checked": String(p === active), class: "pax-btn" + (p === active ? " on" : ""), onclick: () => { active = p; setMsg(msg, ""); draw(); } },
      `P${p + 1} · ${nm}`, el("small", {}, choices[p] ? ` seat ${choices[p]}` : " pick a seat"))));
    mapBox.replaceChildren(seatMap(l, {
      choices, active, prefer, takenElsewhere: new Set(),
      onPick: (id, why) => {
        if (why) { setMsg(msg, `${id}: ${why}`, "error"); return; }
        const other = choices.findIndex((s, p) => s === id && p !== active);
        if (other >= 0) { setMsg(msg, `${id} is already P${other + 1}'s seat.`, "error"); return; }
        choices[active] = choices[active] === id ? "" : id;
        setMsg(msg, choices[active] ? `${b.names[active]}: seat ${id}.` : "");
        if (choices[active]) { const next = choices.findIndex((s) => !s); if (next >= 0) active = next; }
        draw();
      }
    }));
    const left = choices.filter((s) => !s).length;
    confirm.disabled = left > 0;
    confirm.textContent = left ? `Pick ${left} more seat${left > 1 ? "s" : ""}` : isCheckedIn(l) ? "Save my seats" : "Check in";
  }

  confirm.addEventListener("click", () => {
    if (choices.some((s) => !s)) return;
    try {
      updateUser((user) => {
        const trip = user.trips.find((t) => tripId(t) === tripId(b));
        if (!trip) throw new Error("We lost this booking. Sorry.");
        trip.legs[i].seats = [...choices];
        trip.legs[i].checkedIn = trip.legs[i].checkedIn || new Date().toISOString();
      });
      const fresh = findLeg(currentUser());
      const nextLeg = fresh.b.legs.findIndex((x, k) => k !== i && !isCheckedIn(x));
      done.hidden = false;
      done.replaceChildren(el("div", { class: "card ok-card" },
        el("h2", {}, "You are checked in (probably)"),
        el("p", {}, b.names.map((nm, p) => `${nm}: seat ${choices[p]}`).join(" · ")),
        el("div", { class: "actions" },
          el("a", { class: "btn", href: legUrl("pass.html", b, i) }, "Show my boarding pass"),
          el("a", { class: "btn secondary", href: legUrl("track.html", b, i) }, "Track my flight"),
          nextLeg >= 0 ? el("a", { class: "btn ghost", href: legUrl("checkin.html", b, nextLeg) }, `Check in for ${fresh.b.legs[nextLeg].no} too`) : "")));
      setMsg(msg, "");
      done.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (e) { setMsg(msg, e.message || "Check-in failed. Very on brand.", "error"); }
  });

  root.replaceChildren(
    el("div", { class: "card" },
      el("p", { class: "route", style: "font-family:var(--serif);font-size:1.3rem;margin:0 0 6px" }, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`),
      el("dl", { class: "kv" },
        el("dt", {}, "Date"), el("dd", {}, niceDate(l.date)),
        el("dt", {}, "Departs"), el("dd", {}, l.dep),
        el("dt", {}, "Gate"), el("dd", {}, l.gate),
        el("dt", {}, "Class"), el("dd", {}, className(l, SA)),
        el("dt", {}, "Booking pick"), el("dd", {}, prefer ? `${prefer} (marked in orange on the map)` : "Somewhere")),
      el("p", { class: "note" }, "Check-in opens when we remember to open it. It is open now. It closes three minutes before it opened."),
      el("p", { class: "note" }, el("a", { href: "checkin.html" }, "Another flight"))),
    done,
    el("h2", {}, "Pick your seat" + (n > 1 ? "s" : "")),
    n > 1 ? who : "",
    el("div", { class: "sm-legend", "aria-hidden": "true" },
      el("span", {}, el("i", { class: "seat free" }, "A"), " free"),
      el("span", {}, el("i", { class: "seat mine" }, "P1"), " yours"),
      el("span", {}, el("i", { class: "seat taken" }, "A"), " taken"),
      el("span", {}, el("i", { class: "seat spiritual" }, "~"), " unavailable (spiritually)")),
    msg, mapBox,
    el("div", { class: "actions sticky-actions" }, confirm));
  draw();
}
