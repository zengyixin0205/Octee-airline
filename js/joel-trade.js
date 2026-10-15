// JoelTEH pages that move Joelmiles: JoelTEH Airlines (JT), the Joelmiles Bank and the JTIA hotels.
import { el } from "./dom.js";
import { today, addDays, niceDate, fmtMiles } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { jtFree } from "./perks.js";
import { fujitechTenthsOf, fmtFujitech } from "./fujitech.js";
import { tokensOf, scraggyOf, joelTokensOf } from "./miles.js";
import { scraggyData } from "./scraggy.js";
import { JT_FLIGHTS, JT_OWN_PRICE, CLASSES, MAX_PASSENGERS, JT_AIRPORTS, JT_HOME, jtItineraries, priceOf, describe, routeOf, operatorLabel, seatsOn, jtRef, nameOf, shortOf, timesText, PLACES } from "./jt-data.js";
import { JM_IN, JM_OUT, JT_IN, JT_OUT, JM_DAY_CAP, CURRENCIES, joelmilesOf, fmtJoelmiles, roomToday, boughtToday, swapIn, swapOut, swapJoelTokens, jtSwapAvailable, spendJoelmiles } from "./joelmiles.js";
import { push } from "./cloud.js";

const hero = (eyebrow, title, lead) => el("section", { class: "jl-hero" }, el("p", { class: "eyebrow" }, eyebrow), el("h1", {}, title), el("p", { class: "lead" }, lead));
const msgBox = () => el("p", { class: "jl-msg", "aria-live": "polite" });
const say = (box, text, kind = "info") => { box.textContent = text; box.className = "jl-msg " + kind; };
const select = (id, opts, value) => el("select", { id }, opts.map(([v, t]) => el("option", { value: v, selected: v === value }, t)));
const field = (label, input, id) => el("div", {}, el("label", { for: id }, label), input);

// ---------------- JoelTEH Airlines ----------------
export function airlinesPage(redraw) {
  const u = currentUser();
  const free = jtFree(u);
  const places = [...JT_AIRPORTS, ...Object.keys(PLACES).filter((c) => !JT_AIRPORTS.includes(c) && c !== "LUJ")];
  const from = select("jt-from", places.map((c) => [c, `${shortOf(c)} · ${nameOf(c)}`]), JT_HOME);
  const to = select("jt-to", places.map((c) => [c, `${shortOf(c)} · ${nameOf(c)}`]), "FIA");
  const date = el("input", { type: "date", id: "jt-date", value: today(), min: today(), max: addDays(today(), 60) });
  const cls = select("jt-cls", Object.entries(CLASSES).map(([k, c]) => [k, `${c.label}${c.factor > 1 ? ` (×${c.factor})` : ""}`]), "economy");
  const pax = el("input", { type: "number", id: "jt-pax", min: 1, max: MAX_PASSENGERS, value: 1, style: "width:80px" });
  const results = el("div", { id: "jt-results" });
  const msg = msgBox();

  const book = async (it, button) => {
    const passengers = Math.min(MAX_PASSENGERS, Math.max(1, Math.floor(+pax.value) || 1));
    const price = priceOf(it, cls.value, passengers);
    button.disabled = true;
    try {
      const ref = jtRef();
      updateUser((acct) => {
        const paid = spendJoelmiles(acct, price, `JT booking ${ref}`, jtFree(acct));
        acct.jtTrips = [{ ref, createdAt: new Date().toISOString(), date: date.value, route: routeOf(it), cls: cls.value, passengers, paid, free: jtFree(acct),
          legs: it.map((s) => ({ no: s.no, operator: s.operator, partnerNo: s.partnerNo || "", from: s.from, to: s.to, dep: s.dep, arr: s.arr })) }, ...(acct.jtTrips || [])].slice(0, 40);
      });
      push().catch(() => {});
      say(msg, `Booked ${ref}: ${routeOf(it)} on ${niceDate(date.value)}. ${free ? "Free for you." : "Paid " + fmtJoelmiles(price) + "."} It is under My JT trips below.`, "ok");
      redraw();
    } catch (e) { say(msg, e.message, "err"); button.disabled = false; }
  };

  const search = async (e) => {
    e && e.preventDefault();
    if (from.value === to.value) { say(msg, "You are already there. Pick two different airports.", "err"); return; }
    say(msg, "Looking…", "info");
    let sa = [];
    try { sa = (await scraggyData()).routes; } catch { /* Octee and JT only */ }
    const list = jtItineraries(from.value, to.value, date.value, sa);
    say(msg, list.length ? "" : "No JT-numbered trip that day, even with changes. Try another date. JTIA and FIA fly every day.", list.length ? "info" : "err");
    const passengers = Math.min(MAX_PASSENGERS, Math.max(1, Math.floor(+pax.value) || 1));
    results.replaceChildren(...list.map((it) => {
      const price = priceOf(it, cls.value, passengers);
      const b = el("button", { class: "jl-btn", type: "button" }, free ? "Book (free for you)" : `Book for ${fmtJoelmiles(price)}`);
      b.addEventListener("click", () => book(it, b));
      return el("div", { class: "jl-trip" },
        el("div", {}, el("b", {}, routeOf(it)), " · ", describe(it), " · ", it[0].dep, " → ", it[it.length - 1].arr),
        el("div", { class: "legs" }, it.map((s) => el("div", {}, el("span", { class: "jl-tag JT" }, s.no), el("span", { class: "jl-tag " + s.operator }, operatorLabel(s)), `${shortOf(s.from)} ${s.dep} → ${shortOf(s.to)} ${s.arr}${s.partnerNo ? ` (flown as ${s.partnerNo})` : ""}`, (() => { const n = seatsOn(s); return n == null ? "" : n < 15 ? ` · ${n} seats left` : ""; })()))),
        el("div", { class: "jl-row" }, el("span", { class: "jl-price" }, free ? "Free" : fmtJoelmiles(price)), b));
    }));
  };
  const form = el("form", { class: "jl-card", onsubmit: search },
    el("h2", {}, "Find a JT flight"),
    el("div", { class: "jl-row" }, field("From", from, "jt-from"), field("To", to, "jt-to"), field("Date", date, "jt-date"), field("Class", cls, "jt-cls"), field("Passengers (max 4)", pax, "jt-pax"), el("button", { class: "jl-btn", type: "submit" }, "Search")),
    el("p", { class: "jl-note" }, free ? "Your account flies JT free. The Control Tower switched that on. Your Joelmiles are never touched." : `You have ${fmtJoelmiles(joelmilesOf(u))}. Short? The Joelmiles Bank swaps your other currencies.`),
    msg);

  const mine = (u.jtTrips || []);
  const myTrips = el("div", { class: "jl-card" }, el("h2", {}, "My JT trips"),
    mine.length ? mine.map((t) => el("div", { class: "jl-trip" },
      el("div", {}, el("b", {}, t.ref), " · ", t.route, " · ", niceDate(t.date), " · ", (CLASSES[t.cls] || CLASSES.economy).label, " · ", t.passengers, " passenger", t.passengers === 1 ? "" : "s"),
      el("div", { class: "legs" }, (t.legs || []).map((l) => el("div", {}, el("span", { class: "jl-tag JT" }, l.no), `${shortOf(l.from)} ${l.dep} → ${shortOf(l.to)} ${l.arr}`, l.partnerNo ? ` (${operatorLabel({ operator: l.operator })} ${l.partnerNo})` : ""))),
      el("div", { class: "jl-note" }, t.free ? "Free (perk)" : `Paid ${fmtJoelmiles(t.paid)}`, " · JT tickets are not refundable. Joel was very clear about this.")))
      : el("p", { class: "jl-note" }, "Nothing booked yet."));

  const own = el("div", { class: "jl-card" }, el("h2", {}, "JT's own planes"),
    el("p", { class: "jl-note" }, "JoelTEH Airlines (call sign JT) is based at JTIA. It flies to Fuji (FIA) and Mt Fuji (MFIA). Octee is the only airline between FIA and MFIA, so that stretch is an Octee plane with a JT number on it. Every other Octee, One United and Scraggy flight can carry a JT number too, so JTIA → FIA → SIA is one booking."),
    el("div", { class: "jl-tablewrap" }, el("table", { class: "jl-table" },
      el("thead", {}, el("tr", {}, ["Flight", "Route", "Departs", "Arrives", "Days", "Economy"].map((h) => el("th", {}, h)))),
      el("tbody", {}, JT_FLIGHTS.map((f) => el("tr", {}, el("td", {}, f.no), el("td", {}, `${f.from} → ${f.to}`), el("td", {}, f.dep), el("td", {}, f.arr + (f.arr < f.dep ? " (+1)" : "")), el("td", {}, timesText(f.days)), el("td", {}, fmtJoelmiles(JT_OWN_PRICE[`${f.from}-${f.to}`]))))))),
    el("p", { class: "jl-note" }, "Business costs 1.5 times, First 2 times. Partner stretches carrying a JT number cost 2,000 to 5,000 Joelmiles."));

  return el("div", {}, hero("JoelTEH Airlines · call sign JT · home base JTIA", "Fly JT", "Flights paid in Joelmiles, from JTIA to Fuji and Mt Fuji, with Octee, One United and Scraggy Airlines carrying our numbers onward."), form, results, myTrips, own);
}

// ---------------- Joelmiles Bank ----------------
export function bankPage(redraw) {
  const u = currentUser();
  const msg = msgBox();
  const rows = Object.entries(CURRENCIES).map(([k, c]) => {
    const have = k === "octmiles" ? u.octmiles || 0 : k === "scraggy" ? scraggyOf(u) : k === "tokens" ? tokensOf(u) : fujitechTenthsOf(u);
    return { k, c, have };
  });
  const per = (k) => k === "fujitech" ? "0.1 Fujitech" : CURRENCIES[k].unit;
  const rateTable = el("div", { class: "jl-card" }, el("h2", {}, "Rates"),
    el("div", { class: "jl-tablewrap" }, el("table", { class: "jl-table" },
      el("thead", {}, el("tr", {}, ["Currency", "You have", "Swap in (you give 1 → you get)", "Swap out (1 costs)"].map((h) => el("th", {}, h)))),
      el("tbody", {}, rows.map(({ k, c, have }) => el("tr", {}, el("td", {}, c.label), el("td", {}, k === "fujitech" ? fmtFujitech(have) : fmtMiles(have)), el("td", {}, `${per(k)} → ${JM_IN[k]} Joelmiles`), el("td", {}, `${JM_OUT[k]} Joelmiles`))).concat(
        el("tr", {}, el("td", {}, "JoelTokens"), el("td", {}, u.joelPro || u.joelPaidTokens ? fmtMiles(joelTokensOf(u)) : "—"), el("td", {}, `${JT_IN} JoelTokens → 1 Joelmile (cloud account)`), el("td", {}, `back: ${JT_OUT} JoelTokens per Joelmile`)))))),
    el("p", { class: "jl-note" }, "Octeetokens and Fujitech are worth the most: one Octeetoken is 50 Joelmiles, one whole Fujitech 60. Swapping in then straight back out loses about a sixth, on purpose. The bank takes at most ", fmtMiles(JM_DAY_CAP), " Joelmiles in a day (", fmtMiles(roomToday(u)), " left today)."));

  const inCur = select("sw-in-cur", rows.map(({ k, c }) => [k, c.label]), "octmiles");
  const inAmt = el("input", { type: "number", id: "sw-in-amt", min: 0, step: "any", value: 10, style: "width:120px" });
  const outCur = select("sw-out-cur", rows.map(({ k, c }) => [k, c.label]), "octmiles");
  const outAmt = el("input", { type: "number", id: "sw-out-amt", min: 0, step: "any", value: 10, style: "width:120px" });
  const toUnits = (k, v) => (k === "fujitech" ? Math.round(+v * 10) : Math.floor(+v));       // Fujitech is typed in whole/tenth Fujitech, kept in tenths
  const preview = (k, v, table) => { const n = toUnits(k, v); return n >= 1 ? n * table[k] : 0; };
  const inInfo = el("p", { class: "jl-note", id: "sw-in-info" }), outInfo = el("p", { class: "jl-note", id: "sw-out-info" });
  const upd = () => {
    inInfo.textContent = `You get ${fmtJoelmiles(preview(inCur.value, inAmt.value, JM_IN))}.`;
    outInfo.textContent = `That costs ${fmtJoelmiles(preview(outCur.value, outAmt.value, JM_OUT))}.`;
  };
  [inCur, inAmt, outCur, outAmt].forEach((n) => n.addEventListener("input", upd));
  const go = (fn) => () => { try { const r = fn(); say(msg, r, "ok"); push().catch(() => {}); redraw(); } catch (e) { say(msg, e.message, "err"); } };
  const swapInCard = el("div", { class: "jl-card" }, el("h2", {}, "Swap into Joelmiles"),
    el("div", { class: "jl-row" }, field("Give", inCur, "sw-in-cur"), field(inCur.value === "fujitech" ? "How much (Fujitech)" : "How many", inAmt, "sw-in-amt"),
      el("button", { class: "jl-btn", type: "button", onclick: go(() => { const k = inCur.value; const got = swapIn(k, toUnits(k, inAmt.value)); return `Swapped. You got ${fmtJoelmiles(got)}.`; }) }, "Swap in")), inInfo,
    el("p", { class: "jl-note" }, "For Fujitech type it as Fujitech, for example 1.5."));
  const swapOutCard = el("div", { class: "jl-card" }, el("h2", {}, "Swap Joelmiles back out"),
    el("div", { class: "jl-row" }, field("Get", outCur, "sw-out-cur"), field(outCur.value === "fujitech" ? "How much (Fujitech)" : "How many", outAmt, "sw-out-amt"),
      el("button", { class: "jl-btn ghost", type: "button", onclick: go(() => { const k = outCur.value; const cost = swapOut(k, toUnits(k, outAmt.value)); return `Swapped. It cost ${fmtJoelmiles(cost)}.`; }) }, "Swap out")), outInfo);

  const jtAmt = el("input", { type: "number", id: "sw-jt-amt", min: 1, step: 1, value: 10, style: "width:120px" });
  const jtInfo = el("p", { class: "jl-note" }, jtSwapAvailable() ? "Done by Octee Cloud, which keeps the JoelToken ledger. Only bought JoelTokens count (not the monthly free ones) and JoelAI Pro is needed." : "JoelTokens live in Octee Cloud. Log in with a cloud account (Account page) to swap them.");
  const jtAsync = (dir) => async () => {
    try { const n = Math.floor(+jtAmt.value); const r = await swapJoelTokens(dir, n); say(msg, dir === "in" ? `Swapped: ${fmtMiles(n * JT_IN)} JoelTokens became ${fmtJoelmiles(n)}.` : `Swapped: ${fmtJoelmiles(n)} became ${fmtMiles(n * JT_OUT)} JoelTokens.`, "ok"); redraw(); return r; }
    catch (e) { say(msg, e.message, "err"); }
  };
  const jtCard = el("div", { class: "jl-card" }, el("h2", {}, "JoelTokens"),
    el("div", { class: "jl-row" }, field("Joelmiles", jtAmt, "sw-jt-amt"),
      el("button", { class: "jl-btn", type: "button", onclick: jtAsync("in") }, `Buy with JoelTokens (${JT_IN} each)`),
      el("button", { class: "jl-btn ghost", type: "button", onclick: jtAsync("out") }, `Sell for JoelTokens (${JT_OUT} each)`)), jtInfo);
  upd();

  const hist = (u.history || []).filter((h) => h.joelmiles || /Joelmiles|JT booking|JT stay/.test(h.text || "")).slice(0, 12);
  return el("div", {}, hero("Joelmiles Bank · open when Joel is", "Joelmiles", `You have ${fmtJoelmiles(joelmilesOf(u))}. Bought today: ${fmtMiles(boughtToday(u))} of ${fmtMiles(JM_DAY_CAP)}.`),
    msg, rateTable, swapInCard, swapOutCard, jtCard,
    el("div", { class: "jl-card" }, el("h2", {}, "Recent Joelmiles activity"),
      hist.length ? el("ul", {}, hist.map((h) => el("li", {}, `${new Date(h.at).toLocaleString("en-GB")}: ${h.text}${h.joelmiles ? ` (${h.joelmiles > 0 ? "+" : ""}${fmtMiles(h.joelmiles)})` : ""}`))) : el("p", { class: "jl-note" }, "Nothing yet.")));
}

// ---------------- Hotels at JTIA ----------------
const HOTELS = [
  ["Hotel Cupboard", 300, "A room that is a cupboard. A real one. Joel says it is a premium cupboard."],
  ["JTIA Transit Inn", 450, "Nap between flights. The announcements are mostly in your dreams."],
  ["The Joel Grand", 700, "Marble in the lobby, one marble in the room."],
  ["Sorry Suites", 900, "Every guest gets a personal apology on a card. Joel signs them himself."]
];
export function hotelsPage(redraw) {
  const u = currentUser();
  const msg = msgBox();
  const stays = u.jtStays || [];
  const cards = HOTELS.map(([name, price, blurb], i) => {
    const nights = el("input", { type: "number", min: 1, max: 7, value: 1, style: "width:70px", id: "h-n" + i });
    const date = el("input", { type: "date", min: today(), max: addDays(today(), 90), value: today(), id: "h-d" + i });
    const b = el("button", { class: "jl-btn", type: "button" }, "Book");
    b.addEventListener("click", () => {
      const n = Math.min(7, Math.max(1, Math.floor(+nights.value) || 1));
      try {
        const cost = price * n, ref = "JTH-" + Math.floor(10000 + Math.random() * 90000);
        updateUser((acct) => { spendJoelmiles(acct, cost, `JT stay ${ref}: ${name}, ${n} night${n === 1 ? "" : "s"}`); acct.jtStays = [{ ref, hotel: name, date: date.value, nights: n, paid: cost, createdAt: new Date().toISOString() }, ...(acct.jtStays || [])].slice(0, 30); });
        push().catch(() => {});
        say(msg, `Booked ${ref}: ${name}, ${n} night${n === 1 ? "" : "s"} from ${niceDate(date.value)} for ${fmtJoelmiles(cost)}.`, "ok");
        redraw();
      } catch (e) { say(msg, e.message, "err"); }
    });
    return el("div", { class: "jl-card" }, el("h3", {}, name), el("p", {}, blurb), el("p", { class: "jl-price" }, fmtJoelmiles(price) + " a night"),
      el("div", { class: "jl-row" }, field("From", date, "h-d" + i), field("Nights", nights, "h-n" + i), b));
  });
  return el("div", {}, hero("JTIA hotels", "Hotels at JTIA", "Sleep within walking distance of the gate. Paid in Joelmiles. Free JT flights do not make the beds free."),
    msg, el("div", { class: "jl-grid" }, cards),
    el("div", { class: "jl-card" }, el("h2", {}, "My stays"), stays.length ? stays.map((s) => el("p", {}, `${s.ref} · ${s.hotel} · ${niceDate(s.date)} · ${s.nights} night${s.nights === 1 ? "" : "s"} · ${fmtJoelmiles(s.paid)}`)) : el("p", { class: "jl-note" }, "No stays yet.")));
}
