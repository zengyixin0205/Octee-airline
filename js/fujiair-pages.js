// The pages of FujiAIR. fujiair-shell.js builds the frame and calls PAGES_BY_KEY[page](redraw), which returns the page body.
import { el } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { OA_PLACES, placeName } from "./destinations.js";
import { fujitechTenthsOf, fmtFujitech, spendFujitech, claimFujiairDaily, fujiairClaimedToday, fujiairDailyAmount, fujiairGoldOrHigher } from "./fujitech.js";
import { push } from "./cloud.js";
import { hash, stream } from "./tripkit.js";

const hero = (eyebrow, title, lead) => el("section", { class: "fj-hero" }, el("p", { class: "eyebrow" }, eyebrow), el("h1", {}, title), el("p", { class: "lead" }, lead));
const card = (title, ...kids) => el("div", { class: "fj-card" }, title ? el("h2", {}, title) : "", ...kids);
const msgBox = () => el("p", { class: "fj-msg", "aria-live": "polite" });
const say = (box, text, kind = "info") => { box.textContent = text; box.className = "fj-msg " + kind; };
const needLogin = (box) => { say(box, "Log in to do that — FujiAIR uses your normal Octee account.", "err"); return null; };

// FujiAIR's own (tiny, flat) fare table. A different product from the reworked OA/OU/SA fares in fujitech.js.
export const FJ_FARE = { economy: 200, first: 670 };
export const FJ_CLASSES = [
  ["economy", "Economy", "200 Fujitech round trip", "The seat. A tray. Hope. This is the whole business model."],
  ["first", "First Class", "670 Fujitech round trip", "Same tiny seat, but more snacks. That is the entire upgrade."]
];
const FJ_CONNECT = [
  "a Scraggy Airlines puddle-hopper that definitely has wings",
  "One United's slowest aircraft, flown at a gentle, respectful pace",
  "a layover at JTIA (you will be asked to sign Joel's guestbook)",
  "a paper aeroplane that One United insists is airworthy",
  "Mdm Wrong-Wrong's courtesy shuttle, which is also just a plane",
  "a connection so tight you will not have time to read this joke"
];

function destGrid() {
  return el("div", { class: "fj-grid" }, OA_PLACES.filter((c) => c !== "MFIA").map((c) =>
    el("a", { class: "fj-tile", href: "fujiair-book.html?to=" + c }, el("b", {}, placeName(c)), el("span", {}, "Round trip from Fuji (MFIA)"), el("span", { class: "fj-price" }, "200 Fujitech"))));
}

function dailyCard() {
  const u = currentUser();
  const msg = msgBox();
  if (!u) return card("Free daily Fujitech", el("p", { class: "fj-note" }, "Log in to claim 1000 Fujitech a day — 1300 if you're Gold Wing or higher."), msg);
  const claimed = fujiairClaimedToday(u);
  const amount = fujiairDailyAmount(u);
  const balance = el("span", { class: "fj-price" }, fmtFujitech(fujitechTenthsOf(u)));
  const btn = el("button", { class: "btn", type: "button", disabled: claimed ? true : null }, claimed ? "Claimed for today" : `Claim ${amount} Fujitech`);
  btn.addEventListener("click", () => {
    try {
      const gained = claimFujiairDaily();
      push().catch(() => {});
      say(msg, `+${fmtFujitech(gained)}. Come back tomorrow for more.`, "ok");
      balance.textContent = fmtFujitech(fujitechTenthsOf(currentUser()));
      btn.disabled = true;
      btn.textContent = "Claimed for today";
    } catch (e) { say(msg, e.message, "err"); }
  });
  return card("Your free daily Fujitech", el("p", {}, balance, " in your account right now."),
    el("p", { class: "fj-note" }, fujiairGoldOrHigher(u) ? "You're Gold Wing or higher: 1300 Fujitech a day." : "1000 Fujitech a day. Reach Gold Wing for 1300.", " Same claim as on the Octee Airlines homepage — one per day, not one per airline."),
    el("p", {}, btn), msg);
}

function homePage() {
  return el("div", {},
    hero("FujiAIR · cheap, and we mean it", "FujiAIR", "A tiny airline inside Octee, flying out of Mt Fuji (MFIA). 200 Fujitech, round trip, to anywhere we go. Everyone gets free Fujitech, every day, whether they fly or not."),
    dailyCard(),
    card("Where we fly (round trip, 200 Fujitech)", el("p", { class: "fj-note" }, "First Class is 670 Fujitech and comes with more snacks. That's the only difference."), destGrid()),
    card("The rest of FujiAIR", el("div", { class: "fj-grid" },
      el("a", { class: "fj-tile", href: "fujiair-book.html" }, el("b", {}, "Book a flight"), el("span", {}, "Pick a seat right now, in the form.")),
      el("a", { class: "fj-tile", href: "fujiair-checkin.html" }, el("b", {}, "Check-in"), el("span", {}, "No seat here — just a tag for your bag.")),
      el("a", { class: "fj-tile", href: "lounge.html" }, el("b", {}, "Lounge"), el("span", {}, "Sandwiches. Possibly a crushed page.")))));
}

// ---------------- Book ----------------
function seatLayout(classId) {
  return classId === "first" ? { rows: 3, cols: ["A", "B", "C", "D"], aisleAfter: "B" } : { rows: 8, cols: ["A", "B", "C", "D", "E"], aisleAfter: "C" };
}
function seatGrid(key, classId, chosen, onPick) {
  const { rows, cols, aisleAfter } = seatLayout(classId);
  const grid = el("div", { class: "fj-seats" });
  const rand = stream(hash("fj-seats|" + key));
  const taken = new Set();
  for (let r = 1; r <= rows; r++) for (const c of cols) if (rand() < 0.22) taken.add(r + c);
  const rowsEls = [];
  for (let r = 1; r <= rows; r++) {
    const row = el("div", { class: "fj-seat-row" }, el("span", { class: "fj-seat-no" }, String(r)));
    for (const c of cols) {
      const id = r + c;
      const isTaken = taken.has(id);
      const btn = el("button", { class: "fj-seat" + (isTaken ? " taken" : "") + (chosen === id ? " chosen" : ""), type: "button", disabled: isTaken ? true : null, "aria-label": "Seat " + id }, c);
      if (!isTaken) btn.addEventListener("click", () => onPick(id));
      row.append(btn);
      if (c === aisleAfter) row.append(el("span", { class: "fj-aisle" }));
    }
    rowsEls.push(row);
  }
  grid.replaceChildren(...rowsEls);
  return grid;
}

function bookPage(redraw) {
  const u = currentUser();
  const msg = msgBox();
  const preTo = new URLSearchParams(location.search).get("to");
  const dest = el("select", { id: "fj-dest" }, OA_PLACES.filter((c) => c !== "MFIA").map((c) => el("option", { value: c, selected: c === preTo ? true : null }, placeName(c))));
  let classId = "economy", seat = null;
  const classBox = el("div", { class: "fj-grid" });
  const seatSlot = el("div", {});
  const connectChk = el("input", { type: "checkbox", id: "fj-connect" });
  const connectNote = el("p", { class: "fj-note" });
  const repaintSeats = () => { seatSlot.replaceChildren(el("p", { class: "fj-note" }, "Pick a seat — this is the only airline where you do it here, not at check-in."), seatGrid(dest.value + "|" + classId, classId, seat, (id) => { seat = id; repaintSeats(); })); };
  const paintSeats = () => { seat = null; repaintSeats(); };
  const paintClasses = () => {
    classBox.replaceChildren(...FJ_CLASSES.map(([id, label, price, note]) => {
      const card2 = el("label", { class: "fj-class" + (classId === id ? " chosen" : "") },
        el("input", { type: "radio", name: "fj-class", value: id, checked: classId === id ? true : null }),
        el("b", {}, label), el("span", { class: "fj-price", style: "display:block;margin:4px 0" }, price), el("span", { class: "fj-note" }, note));
      card2.querySelector("input").addEventListener("change", () => { classId = id; paintClasses(); paintSeats(); });
      return card2;
    }));
  };
  dest.addEventListener("change", paintSeats);
  connectChk.addEventListener("change", () => {
    connectNote.textContent = connectChk.checked ? "Connecting via " + FJ_CONNECT[hash(dest.value + classId) % FJ_CONNECT.length] + ". Allow extra time. Allow extra patience." : "";
  });
  paintClasses(); paintSeats();

  const submit = el("button", { class: "btn", type: "button" }, "Book it");
  submit.addEventListener("click", () => {
    if (!u) { needLogin(msg); return; }
    if (!seat) { say(msg, "Pick a seat first. That's the FujiAIR way.", "err"); return; }
    const ref = "FJ" + String(hash(dest.value + classId + seat + Date.now()) % 900000 + 100000);
    const fare = FJ_FARE[classId] * 10;
    try {
      updateUser((a) => {
        spendFujitech(a, fare, `FujiAIR flight to ${placeName(dest.value)} (${classId === "first" ? "First Class" : "Economy"}), seat ${seat}`);
        a.fujiairBookings = [{ ref, to: dest.value, classId, seat, connect: connectChk.checked, at: new Date().toISOString(), checkedIn: false }, ...(a.fujiairBookings || [])].slice(0, 25);
      });
      push().catch(() => {});
      say(msg, `Booked! Reference ${ref}, seat ${seat}, to ${placeName(dest.value)}. Check in whenever — your seat's already yours.`, "ok");
      paintSeats();
    } catch (e) { say(msg, e.message, "err"); }
  });

  return el("div", {},
    hero("Book · FujiAIR", "Book a FujiAIR flight", "One silly little form. Pick where, pick a class, pick your seat right now — FujiAIR is the only Octee airline that lets you choose your seat while booking instead of at check-in."),
    card("Where to", el("div", { class: "fj-row" }, el("div", {}, el("label", { for: "fj-dest" }, "Destination (round trip from MFIA)"), dest))),
    card("Class", classBox),
    card("Your seat", seatSlot),
    card("Connections", el("label", {}, connectChk, " Connect this with another flight (for the adventurous, or the lost)"), connectNote),
    card(null, el("p", {}, submit), msg));
}

// ---------------- Check-in ----------------
const bagTag = (ref) => "FJ" + String(100000 + (hash("bagtag|" + ref) % 900000));

function bookingRow(b, msg) {
  const tag = bagTag(b.ref);
  const checkIn = el("button", { class: "btn small", type: "button" }, b.checkedIn ? "Checked in" : "Check in — get a bag tag");
  const tagLine = el("p", { class: "fj-note" }, b.checkedIn ? bagTagLine(tag) : "");
  checkIn.disabled = !!b.checkedIn;
  checkIn.addEventListener("click", () => {
    updateUser((a) => { const row = (a.fujiairBookings || []).find((x) => x.ref === b.ref); if (row) row.checkedIn = true; });
    push().catch(() => {});
    say(msg, `Checked in. Bag tag ${tag} — track it any time on the bag tracker.`, "ok");
    checkIn.disabled = true; checkIn.textContent = "Checked in";
    tagLine.replaceChildren(...bagTagLine(tag));
  });
  return el("div", { class: "fj-card" },
    el("p", {}, el("span", { class: "fj-ref" }, b.ref), " · ", el("span", { class: "fj-tag" }, placeName(b.to)), el("span", { class: "fj-tag" }, b.classId === "first" ? "First Class" : "Economy"), el("span", { class: "fj-tag" }, "Seat " + b.seat), b.connect ? el("span", { class: "fj-tag" }, "Connecting") : ""),
    el("p", {}, checkIn),
    tagLine);
}
function bagTagLine(tag) {
  return ["Your bag tag: ", el("span", { class: "fj-ref" }, tag), " — ", el("a", { href: "bagtrack.html?tag=" + encodeURIComponent(tag) }, "track this bag")];
}

function checkinPage() {
  const u = currentUser();
  const msg = msgBox();
  const askJoel = el("button", { class: "fj-btn ghost", type: "button" }, "Ask JoelAI");
  askJoel.addEventListener("click", async () => (await import("./joelai-ui.js")).openJoelAI());
  const body = !u ? card(null, el("p", { class: "fj-note" }, "Log in to see your FujiAIR bookings and check in."), msg)
    : el("div", {},
        ...((u.fujiairBookings || []).length ? (u.fujiairBookings || []).map((b) => bookingRow(b, msg)) : [card(null, el("p", { class: "fj-note" }, "No FujiAIR bookings yet."), el("p", {}, el("a", { class: "fj-btn", style: "text-decoration:none;display:inline-block", href: "fujiair-book.html" }, "Book one")))]),
        msg);
  return el("div", {},
    hero("Check-in · FujiAIR", "Check in", "Your seat was already picked when you booked, so check-in here is just for your bag: ask for a tag and track it on the bag tracker. Need help? Ask JoelAI, or try GulletAI."),
    body,
    card("Need a hand?", el("div", { class: "fj-row" }, el("div", {}, askJoel), el("div", {}, el("a", { class: "fj-btn ghost", href: "zhang-gullet.html" }, "Ask GulletAI")), el("div", {}, el("a", { class: "fj-btn ghost", href: "lounge.html" }, "Go to the Lounge")))));
}

export const PAGES_BY_KEY = { home: homePage, book: bookPage, checkin: checkinPage };
