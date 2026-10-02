// Book a Flight — the ONLY way to book. Follows Scraggy Airlines' 6-step form, Octee style.
// Trips with Scraggy Airlines (SA) flights add the SIA form (Scraggy's own form) — two forms, one Confirm.
// Everything is saved in this browser (static site, no server).
import { $, el, setMsg, niceDate, today } from "./dom.js";
import { loadSession, saveSession, removeSession } from "./store.js";
import { currentUser, updateUser } from "./auth.js";
import { addMiles } from "./miles.js";
import { allTripsInBrowser } from "./auth.js";
import { openRangeCalendar } from "./calendar.js";
import {
  PLACES, OA_PLACES, placeName, placeShort, itinerariesOn, seatsLeft, itineraryMiles, describeItinerary, mins
} from "./destinations.js";
import { scraggyData } from "./scraggy.js";
import { OA_AIRCRAFT, OA_CLASSES, OA_SNACKS, OA_REASONS, SEATS, passCard } from "./booking-data.js";

const DRAFT = "octee.booking.draft";
const DAILY_LEG_LIMIT = 5;



let SA = null;          // Scraggy data: { data, routes }
let current = 0;        // index into steps()
let visited = new Set();
let triedConfirm = false;

const blank = () => ({
  from: "FIA", to: "SIA", tripType: "return", passengers: 1, departDate: "", returnDate: "", outChoice: 0, backChoice: 0,
  aircraft: "", travelClass: "", names: [], seatPref: "", snack: "", bags: "", reason: "", joelmobile: false,
  acceptCeo: false, acceptEngines: false, acceptLuggage: false,
  sa: { aircraft: "", travelClass: "", seat: "", snack: "", bags: "", reason: "", t1: false, t2: false }
});
let state = blank();

/* ---------------- trip maths ---------------- */
const routes = () => (SA ? SA.routes : []);
const browserTrips = () => allTripsInBrowser();
const fits = (it) => it.every((s) => s.airline === "SA" || seatsLeft(s, browserTrips()) >= state.passengers);
const outIts = () => (state.departDate ? itinerariesOn(state.from, state.to, state.departDate, routes()).filter(fits) : []);
const out = () => outIts()[state.outChoice] || null;
function backIts() {
  const o = out();
  if (state.tripType !== "return" || !o || !state.returnDate) return [];
  const notBefore = state.returnDate === state.departDate ? mins(o[o.length - 1].arr) + 90 : null;
  return itinerariesOn(state.to, state.from, state.returnDate, routes(), { notBefore }).filter(fits);
}
const back = () => backIts()[state.backChoice] || null;
const allLegs = () => [...(out() || []), ...(state.tripType === "return" ? back() || [] : [])];
const needsSA = () => allLegs().some((s) => s.airline === "SA") || !!(PLACES[state.to] && !PLACES[state.to].oa);
const needsOA = () => { const legs = allLegs(); return !legs.length || legs.some((s) => s.airline !== "SA"); };

/* ---------------- steps ---------------- */
const req = (v, msg) => (v === "" || v == null || v === false ? [msg] : []);
const STEPS = {
  o1: { form: "oa", title: "1. Trip", validate: () => {
    const p = [];
    if (state.from === state.to) p.push("Your destination is where you already are. You are already there. Probably.");
    if (!state.departDate) p.push("Pick your departure date on the calendar.");
    else if (!out()) p.push("Pick one of the flights for your departure date.");
    if (state.tripType === "return") {
      if (!state.returnDate) p.push("Pick your arrival date (the day you fly back) on the calendar, or tick One-way.");
      else if (!back()) p.push("Pick one of the flights for your arrival date.");
    }
    if (needsSA() && state.passengers !== 1) p.push("Scraggy Airlines books one passenger at a time, so trips with SA flights are for 1 passenger.");
    return p;
  } },
  o2: { form: "oa", title: "2. Aircraft", validate: () => req(state.aircraft, "Choose an aircraft (or let us pick the wrong one).") },
  o3: { form: "oa", title: "3. Class", validate: () => req(state.travelClass, "Choose a class.") },
  o4: { form: "oa", title: "4. Passenger", validate: () => {
    const p = [];
    for (let i = 0; i < state.passengers; i++) {
      const n = (state.names[i] || "").trim();
      if (n.length < 2 || n.length > 40) p.push(`Passenger ${i + 1} needs a name (2–40 characters; a nickname is fine).`);
    }
    return [...p, ...req(state.seatPref, "Choose a seat preference."), ...req(state.snack, "Choose a snack. It is a peanut."), ...req(state.bags, "Choose how many bags we will lose.")];
  } },
  o5: { form: "oa", title: "5. Fun extras", validate: () => [
    ...req(state.reason, "Choose a reason for travelling."),
    ...(state.acceptCeo && state.acceptEngines && state.acceptLuggage ? [] : ["Please tick all three boxes. We need it in writing."])
  ] },
  s1: { form: "sa", title: "1. Trip", validate: () => [] },
  s2: { form: "sa", title: "2. Aircraft", validate: () => req(state.sa.aircraft, "SIA form: choose a Scraggy aircraft.") },
  s3: { form: "sa", title: "3. Class", validate: () => req(state.sa.travelClass, "SIA form: choose a Scraggy class.") },
  s4: { form: "sa", title: "4. Passenger", validate: () => [
    ...req(state.sa.seat, "SIA form: choose a seat."), ...req(state.sa.snack, "SIA form: choose a snack."), ...req(state.sa.bags, "SIA form: choose how many bags.")] },
  s5: { form: "sa", title: "5. Fun extras", validate: () => [
    ...req(state.sa.reason, "SIA form: choose a reason for travelling."),
    ...(state.sa.t1 && state.sa.t2 ? [] : ["SIA form: you must accept both statements. Scraggy insists."])] },
  review: { form: "both", title: "Review & confirm", validate: () => [] }
};
function steps() {
  const ids = ["o1"];
  if (needsOA()) ids.push("o2", "o3", "o4", "o5");
  if (needsSA()) ids.push("s1", "s2", "s3", "s4", "s5");
  ids.push("review");
  return ids;
}
const problems = (id) => STEPS[id].validate();
const allProblems = () => steps().filter((id) => id !== "review").flatMap((id) => problems(id).map((p) => ({ id, p })));
const firstInvalid = () => steps().findIndex((id) => id !== "review" && problems(id).length);

/* ---------------- helpers ---------------- */
function persist() { saveSession(DRAFT, state); }
function update(patch, { rerender = true } = {}) {
  Object.assign(state, patch);
  persist();
  if (rerender) render();
  else renderNav();
}
function updateSA(patch, opts) { update({ sa: { ...state.sa, ...patch } }, opts); }
const radios = (name, options, value, onPick) => el("div", { class: "options", role: "radiogroup", "aria-label": name },
  options.map((o) => el("label", { class: "opt" },
    el("input", { type: "radio", name, id: `${name}-${o.id}`, value: o.id, checked: value === o.id, onchange: () => onPick(o.id) }),
    el("span", {}, o.name, o.extra ? el("small", {}, o.extra) : "", o.blurb ? el("small", {}, o.blurb) : ""))));
const select = (id, label, options, value, onPick, hint) => el("div", { class: "field" },
  el("label", { for: id }, label),
  el("select", { id, onchange: (e) => onPick(e.target.value) },
    el("option", { value: "", selected: value === "" }, "— choose —"),
    options.map(([v, t]) => el("option", { value: v, selected: String(value) === String(v) }, t))),
  hint ? el("p", { class: "hint" }, hint) : "");
const check = (id, text, value, onPick) => el("label", { class: "check" },
  el("input", { type: "checkbox", id, checked: value, onchange: (e) => onPick(e.target.checked) }), text);

function legItem(s, k, it) {
  const bits = [];
  if (k > 0) {
    const wait = mins(s.dep) - mins(it[k - 1].arr);
    bits.push(el("li", { class: "change" }, `Change planes at ${placeName(s.from)} · ${wait} min`));
  }
  const seats = seatsLeft(s, browserTrips());
  bits.push(el("li", { class: s.airline === "SA" ? "sa" : s.airline === "OU" ? "ou" : "" },
    el("strong", {}, s.no), ` ${placeShort(s.from)} ${s.dep} → ${placeShort(s.to)} ${s.arr}`,
    s.via.length ? ` · stops at ${s.via.map(placeShort).join(", ")} (stay on board)` : "",
    s.airline === "OU" ? el("span", { class: "tag ou" }, "One United") : "",
    s.airline === "SA" ? el("span", { class: "tag sa" }, "Scraggy Airlines · SIA form") : el("span", { class: "tag" }, `${seats} seats left (mostly bags)`)));
  return bits;
}
const itinView = (it) => el("ul", { class: "legs" }, it.flatMap((s, k) => legItem(s, k, it)));

function itineraryPicker(name, list, chosen, onPick) {
  if (!list.length) return el("p", { class: "msg error" }, "No flights that day. Not even eventually.");
  return el("div", { class: "itin", role: "radiogroup", "aria-label": name }, list.map((it, i) =>
    el("label", { class: "opt" },
      el("input", { type: "radio", name, id: `${name}-${i}`, checked: i === chosen, onchange: () => onPick(i) }),
      el("span", {}, el("strong", {}, `${it[0].dep} → ${it[it.length - 1].arr}`), ` · ${describeItinerary(it)}`,
        el("small", {}, `${itineraryMiles(it, state.travelClass).toLocaleString("en-GB")} Octmiles`), itinView(it)))));
}

function dayInfoFor(fromP, toP, extra = {}) {
  return (iso) => {
    if (extra.min && iso < extra.min) return { ok: false };
    const notBefore = extra.sameDayAfter && iso === extra.sameDayDate ? extra.sameDayAfter : null;
    const its = itinerariesOn(fromP, toP, iso, routes(), { notBefore }).filter(fits);
    if (!its.length) return { ok: false };
    const f = its[0];
    return { ok: true, short: f.length === 1 ? f[0].no : `${f.length} flights`, label: f.length === 1 ? `${f[0].no} · ${f[0].dep}` : `${f.length} flights`, full: `${its.length} option${its.length > 1 ? "s" : ""}, first ${f[0].no} at ${f[0].dep}` };
  };
}

/* ---------------- step renderers ---------------- */
function stepTrip() {
  const fromSel = el("select", { id: "from", onchange: (e) => update({ from: e.target.value, to: state.to === e.target.value ? (e.target.value === "FIA" ? "SIA" : "FIA") : state.to, outChoice: 0, backChoice: 0, departDate: "", returnDate: "" }) },
    OA_PLACES.map((c) => el("option", { value: c, selected: c === state.from }, placeName(c))));
  const toSel = el("select", { id: "to", onchange: (e) => update({ to: e.target.value, outChoice: 0, backChoice: 0, departDate: "", returnDate: "", passengers: PLACES[e.target.value].oa ? state.passengers : 1 }) },
    Object.keys(PLACES).filter((c) => c !== state.from).map((c) => el("option", { value: c, selected: c === state.to }, placeName(c) + (PLACES[c].oa ? "" : " — transfer via SIA (2 forms)"))));
  const paxSel = el("select", { id: "passengers", disabled: needsSA(), onchange: (e) => update({ passengers: +e.target.value, names: state.names.slice(0, +e.target.value) }) },
    Array.from({ length: 9 }, (_, i) => el("option", { value: i + 1, selected: state.passengers === i + 1 }, String(i + 1))));
  // One calendar for both dates (like an airline app): tap the departure day, then the arrival day, then Done.
  const oneWay = state.tripType === "oneway";
  const departInfo = dayInfoFor(state.from, state.to);
  const arriveInfo = (iso, departIso) => {
    const first = itinerariesOn(state.from, state.to, departIso, routes()).filter(fits)[departIso === state.departDate ? state.outChoice : 0]
      || itinerariesOn(state.from, state.to, departIso, routes()).filter(fits)[0];
    if (!first) return { ok: false };
    return dayInfoFor(state.to, state.from, { min: departIso, sameDayDate: departIso, sameDayAfter: mins(first[first.length - 1].arr) + 90 })(iso);
  };
  const openCal = (mode, btn) => openRangeCalendar({
    depart: state.departDate, arrive: state.returnDate, oneway: oneWay, mode, departInfo, arriveInfo, returnFocus: btn,
    onDone: ({ depart, arrive }) => update({
      departDate: depart, returnDate: oneWay ? "" : arrive,
      outChoice: depart === state.departDate ? state.outChoice : 0,
      backChoice: arrive === state.returnDate && depart === state.departDate ? state.backChoice : 0
    })
  });
  const departBtn = el("button", { type: "button", class: "date-btn", id: "depart-btn" }, state.departDate ? niceDate(state.departDate) : "Pick a date 📅");
  departBtn.setAttribute("aria-labelledby", "depart-label depart-btn");
  departBtn.addEventListener("click", () => openCal("depart", departBtn));
  const o = out();
  const returnBtn = el("button", { type: "button", class: "date-btn", id: "return-btn" }, state.returnDate ? niceDate(state.returnDate) : "Pick a date 📅");
  returnBtn.setAttribute("aria-labelledby", "return-label return-btn");
  returnBtn.addEventListener("click", () => openCal(state.departDate ? "arrive" : "depart", returnBtn));
  const summary = [];
  if (o) summary.push(el("p", {}, el("strong", {}, "Departure: "), `${niceDate(state.departDate)} · ${o.map((s) => s.no).join(" + ")} · ${placeShort(o[0].from)} ${o[0].dep} → ${placeShort(o[o.length - 1].to)} ${o[o.length - 1].arr}`));
  const b = back();
  if (b) summary.push(el("p", {}, el("strong", {}, "Arrival (flight back): "), `${niceDate(state.returnDate)} · ${b.map((s) => s.no).join(" + ")} · ${placeShort(b[0].from)} ${b[0].dep} → ${placeShort(b[b.length - 1].to)} ${b[b.length - 1].arr}`));
  const oneway = state.tripType === "oneway";
  return el("fieldset", {}, el("legend", {}, "1. Trip"),
    el("p", { class: "sub", style: "margin-top:0" }, "Tell us three things: where you're going, the day you leave, and the day you fly back."),
    el("div", { class: "row ask" },
      el("div", { class: "field" }, el("label", { for: "to" }, "① Destination"), toSel,
        el("p", { class: "hint" }, "Where are you going? (We may take you there.)")),
      el("div", { class: "field" }, el("span", { class: "label", id: "depart-label" }, "② Departure date"), departBtn,
        el("p", { class: "hint" }, "The day you leave. One calendar for both dates.")),
      el("div", { class: "field" }, el("span", { class: "label", id: "return-label" }, "③ Arrival date"), oneway ? el("p", { class: "note", style: "margin:.5em 0" }, "One-way: no arrival date needed.") : returnBtn,
        el("p", { class: "hint" }, oneway ? "" : "The day you fly back."))),
    el("div", { class: "row" },
      el("div", { class: "field" }, el("label", { for: "from" }, "Departing from"), fromSel),
      el("div", { class: "field" }, el("label", { for: "passengers" }, "Passengers"), paxSel,
        needsSA() ? el("p", { class: "hint" }, "Scraggy Airlines books one passenger at a time.") : ""),
      el("div", { class: "field", style: "justify-content:center" },
        check("oneway", "One-way only (I'm not flying back)", oneway, (v) => update({ tripType: v ? "oneway" : "return", returnDate: "", backChoice: 0 })))),
    state.departDate ? el("div", {}, el("h3", {}, "Departure flights · ", niceDate(state.departDate)),
      itineraryPicker("out", outIts(), state.outChoice, (i) => {
        // keep the arrival date if the flight back still works with this departure flight
        state.outChoice = i; state.backChoice = 0;
        update({ returnDate: state.tripType === "return" && state.returnDate && backIts().length ? state.returnDate : "" });
      })) : "",
    state.tripType === "return" && state.returnDate ? el("div", {}, el("h3", {}, "Flights back · ", niceDate(state.returnDate)),
      itineraryPicker("back", backIts(), state.backChoice, (i) => update({ backChoice: i }))) : "",
    summary.length ? el("div", { class: "card" }, summary) : "",
    needsSA() ? el("p", { class: "msg info" }, "This trip includes Scraggy Airlines flights, so you'll also fill in the SIA form (Scraggy's own form) before confirming.") : "");
}

const stepOA = {
  o2: () => el("fieldset", {}, el("legend", {}, "2. Aircraft"), radios("aircraft", OA_AIRCRAFT, state.aircraft, (v) => update({ aircraft: v }))),
  o3: () => el("fieldset", {}, el("legend", {}, "3. Class"),
    radios("travelClass", OA_CLASSES.map((c) => ({ id: c.id, name: c.name + (c.bonus ? ` (+${c.bonus} Octmiles per flight)` : ""), blurb: c.joke })), state.travelClass, (v) => update({ travelClass: v }))),
  o4: () => {
    const u = currentUser();
    const names = Array.from({ length: state.passengers }, (_, i) => {
      const id = "name-" + i;
      const value = state.names[i] ?? (i === 0 && u ? u.username : "");
      if (state.names[i] == null) state.names[i] = value;
      return el("div", { class: "field" }, el("label", { for: id }, `Passenger ${i + 1} name`),
        el("input", { type: "text", id, value, maxlength: "40", autocomplete: "off",
          oninput: (e) => { state.names[i] = e.target.value; update({ names: [...state.names] }, { rerender: false }); } }));
    });
    return el("fieldset", {}, el("legend", {}, "4. Passenger"),
      el("p", { class: "hint" }, "No real personal details needed. A nickname is fine."),
      el("div", { class: "row" }, names),
      el("div", { class: "row" },
        select("seatPref", "Seat preference", SEATS, state.seatPref, (v) => update({ seatPref: v })),
        select("snack", "Snack", OA_SNACKS.map((s) => [s, s]), state.snack, (v) => update({ snack: v })),
        select("bags", "Bags", [0, 1, 2, 3].map((n) => [n, String(n)]), state.bags, (v) => update({ bags: v }), "We will lose them in a random order.")));
  },
  o5: () => el("fieldset", {}, el("legend", {}, "5. Fun extras"),
    select("reason", "Reason for travelling", OA_REASONS.map((r) => [r, r]), state.reason, (v) => update({ reason: v })),
    check("joelmobile", "JOELMOBILE pickup to my gate (optional; arrival not guaranteed)", state.joelmobile, (v) => update({ joelmobile: v })),
    el("p", { class: "label" }, "All three must be ticked:"),
    check("acceptCeo", "I accept Octee to be CEO", state.acceptCeo, (v) => update({ acceptCeo: v })),
    check("acceptEngines", "I accept that the engines MAY be working", state.acceptEngines, (v) => update({ acceptEngines: v })),
    check("acceptLuggage", "FIA and SIA are not responsible for loss of luggage", state.acceptLuggage, (v) => update({ acceptLuggage: v })))
};

const saLegs = () => allLegs().filter((s) => s.airline === "SA");
const stepSA = {
  s1: () => el("fieldset", { class: "sia-form" }, el("legend", {}, "SIA form · 1. Trip"),
    el("p", {}, "These Scraggy Airlines flights are fixed by your trip. Same passenger as your Octee form."),
    saLegs().length ? itinView(saLegs()) : el("p", { class: "msg error" }, "Pick your flights in step 1 first."),
    el("p", {}, el("strong", {}, "Passenger: "), (state.names[0] || "(from your Octee form)"), " ", el("span", { class: "tag sa" }, "locked"))),
  s2: () => el("fieldset", { class: "sia-form" }, el("legend", {}, "SIA form · 2. Aircraft"),
    radios("sa-aircraft", [...SA.data.AIRCRAFT, SA.data.SURPRISE], state.sa.aircraft, (v) => updateSA({ aircraft: v }))),
  s3: () => el("fieldset", { class: "sia-form" }, el("legend", {}, "SIA form · 3. Class"),
    radios("sa-class", SA.data.CLASSES.map((c) => ({ id: c.id, name: c.name + (c.bonus ? ` (+${c.bonus} Scraggy Points)` : ""), blurb: c.joke })),
      state.sa.travelClass, (v) => updateSA({ travelClass: v, snack: "" }))),
  s4: () => {
    const snacks = state.sa.travelClass === "scraggy" ? SA.data.SNACKS.scraggy : SA.data.SNACKS.standard;
    return el("fieldset", { class: "sia-form" }, el("legend", {}, "SIA form · 4. Passenger"),
      el("div", { class: "field" }, el("label", { for: "sa-name" }, "Passenger"), el("input", { type: "text", id: "sa-name", value: state.names[0] || "", disabled: true })),
      el("div", { class: "row" },
        select("sa-seat", "Seat", SEATS, state.sa.seat, (v) => updateSA({ seat: v })),
        select("sa-snack", "Snack", snacks.map((s) => [s, s]), state.sa.snack, (v) => updateSA({ snack: v }),
          state.sa.travelClass === "scraggy" ? "Scraggy Class food comes from Scraggyton." : "Upgrade to Scraggy Class for food from Scraggyton."),
        select("sa-bags", "Bags", [0, 1, 2, 3, 4, 5].map((n) => [n, String(n)]), state.sa.bags, (v) => updateSA({ bags: v }), "Bags will be lost in 1 to 5 places.")));
  },
  s5: () => el("fieldset", { class: "sia-form" }, el("legend", {}, "SIA form · 5. Fun extras"),
    select("sa-reason", "Reason for travelling", SA.data.REASONS.map((r) => [r, r]), state.sa.reason, (v) => updateSA({ reason: v })),
    check("sa-t1", "I accept that Scraggy is the CEO.", state.sa.t1, (v) => updateSA({ t1: v })),
    check("sa-t2", "I accept that we may go somewhere else eventually.", state.sa.t2, (v) => updateSA({ t2: v })))
};

function stepReview() {
  const all = allProblems();
  const u = currentUser();
  const o = out(), b = back();
  const miles = (o ? itineraryMiles(o, state.travelClass) : 0) + (b ? itineraryMiles(b, state.travelClass) : 0);
  const confirm = el("button", { class: "btn", type: "button", id: "confirm", disabled: all.length > 0 || !u }, needsSA() ? "Confirm both forms (no money will be taken)" : "Confirm (no money will be taken)");
  confirm.addEventListener("click", doConfirm);
  const why = all.length ? `Finish ${[...new Set(all.map((x) => stepLabel(x.id)))].join(", ")} first.` : !u ? "Log in to confirm and earn Octmiles." : "";
  return el("fieldset", {}, el("legend", {}, "Review & confirm"),
    o ? el("div", { class: "card" }, el("h3", {}, "Departure · ", niceDate(state.departDate)), itinView(o)) : "",
    b ? el("div", { class: "card", style: "margin-top:10px" }, el("h3", {}, "Arrival (flight back) · ", niceDate(state.returnDate)), itinView(b)) : "",
    el("dl", { class: "kv", style: "margin-top:12px" },
      el("dt", {}, "Passengers"), el("dd", {}, state.names.slice(0, state.passengers).filter(Boolean).join(", ") || "—"),
      needsOA() ? [el("dt", {}, "Octee class"), el("dd", {}, OA_CLASSES.find((c) => c.id === state.travelClass)?.name || "—")] : "",
      needsSA() ? [el("dt", {}, "Scraggy class"), el("dd", {}, SA.data.CLASSES.find((c) => c.id === state.sa.travelClass)?.name || "—")] : "",
      el("dt", {}, "Octmiles"), el("dd", {}, `+${miles.toLocaleString("en-GB")} (Octee flights; One United earns half; Scraggy none)`),
      el("dt", {}, "Payment"), el("dd", {}, "Paid in peanuts.")),
    all.length ? el("div", { class: "msg error missing" }, el("p", { style: "margin:0 0 4px" }, "Still missing:"),
      el("ul", {}, all.map((x) => el("li", {}, el("a", { href: "#", onclick: (e) => { e.preventDefault(); go(steps().indexOf(x.id)); } }, stepLabel(x.id)), ": ", x.p)))) : "",
    el("div", { class: "actions" }, confirm,
      !u ? el("a", { class: "btn secondary", href: "login.html?next=book.html", onclick: persist }, "Log in or sign up to confirm") : ""),
    why ? el("p", { class: "hint", id: "confirm-why" }, why) : "",
    el("p", { class: "msg", id: "confirm-msg", role: "status", "aria-live": "polite" }));
}

const stepLabel = (id) => (STEPS[id].form === "sa" ? "SIA form " : STEPS[id].form === "oa" && needsSA() ? "Octee form " : "") + "step " + STEPS[id].title.split(".")[0];

/* ---------------- render ---------------- */
function renderNav() {
  const ids = steps();
  const limit = firstInvalid();
  const nav = $("#steps");
  nav.replaceChildren(...ids.map((id, i) => {
    const bad = problems(id).length > 0;
    const shown = id !== "review" && (visited.has(id) || triedConfirm);
    const mark = id === "review" ? "" : shown ? (bad ? " ✗" : " ✓") : "";
    const reachable = limit === -1 || i <= limit;
    return el("li", { class: (STEPS[id].form === "sa" ? "sia " : "") + (shown ? (bad ? "bad" : "done") : ""), "aria-current": i === current ? "step" : null },
      reachable ? el("a", { href: "#", style: "color:inherit;text-decoration:none", onclick: (e) => { e.preventDefault(); go(i); } }, (STEPS[id].form === "sa" ? "SIA " : "") + STEPS[id].title + mark)
        : (STEPS[id].form === "sa" ? "SIA " : "") + STEPS[id].title + mark);
  }));
  const banner = $("#form-banner");
  if (needsSA()) {
    const onSA = STEPS[ids[current]].form === "sa", onReview = ids[current] === "review";
    banner.replaceChildren(el("span", { class: !onSA && !onReview ? "on" : "" }, "① Octee form"), "→",
      el("span", { class: onSA ? "on" : "" }, "② SIA form (Scraggy)"), "→", el("span", { class: onReview ? "on" : "" }, "③ Confirm both"));
    banner.hidden = false;
  } else banner.hidden = true;
  $("#btn-back").hidden = current === 0;
  $("#btn-next").hidden = ids[current] === "review";
}

function render() {
  const ids = steps();
  if (current >= ids.length) current = ids.length - 1;
  const id = ids[current];
  const focusId = document.activeElement?.id;
  const body = $("#step-body");
  body.replaceChildren(id === "o1" ? stepTrip() : id === "review" ? stepReview() : (stepOA[id] || stepSA[id])());
  renderNav();
  if (focusId) document.getElementById(focusId)?.focus();
}

function go(i) {
  const ids = steps();
  visited.add(ids[current]);
  const limit = firstInvalid();
  if (limit !== -1 && i > limit) i = limit;
  current = Math.max(0, Math.min(i, ids.length - 1));
  setMsg($("#step-msg"), "");
  render();
  $("#steps").scrollIntoView({ block: "nearest" });
}

$("#btn-next").addEventListener("click", () => {
  const id = steps()[current];
  visited.add(id);
  const p = problems(id);
  if (p.length) { setMsg($("#step-msg"), p[0], "error"); renderNav(); return; }
  go(current + 1);
});
$("#btn-back").addEventListener("click", () => go(current - 1));

/* ---------------- confirm ---------------- */
const ref = (prefix) => prefix + "-" + String(Math.floor(Math.random() * 10000)).padStart(4, "0");
const gateFor = (s) => s.airline === "SA" ? s.gate : s.from + String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");

function doConfirm() {
  triedConfirm = true;
  const msg = $("#confirm-msg");
  const all = allProblems();
  if (all.length) { setMsg(msg, "Some steps are not finished yet.", "error"); render(); return; }
  if (!currentUser()) { setMsg(msg, "Log in to confirm.", "error"); return; }
  const legs = [...out().map((s) => ({ ...s, direction: "out" })), ...(state.tripType === "return" ? back().map((s) => ({ ...s, direction: "back" })) : [])];
  if (legs.some((s) => s.airline !== "SA" && seatsLeft(s, browserTrips()) < state.passengers)) { setMsg(msg, "Sorry, a flight just filled up (mostly with bags). Pick another option.", "error"); return; }
  try {
    const booking = updateUser((u) => {
      const todayLegs = (u.trips || []).filter((t) => t.createdAt.slice(0, 10) === today()).reduce((n, t) => n + t.legs.length, 0);
      if (todayLegs + legs.length > DAILY_LEG_LIMIT) throw new Error("Sorry, you have flown too much today. (Max 5 flights booked per day.)");
      const oaRef = ref("OCT"), saRef = legs.some((s) => s.airline === "SA") ? ref("SCRAG") : null;
      const pickAircraft = (list, v) => v === "surprise" ? list[Math.floor(Math.random() * list.length)].id : v;
      const oaAircraft = pickAircraft(OA_AIRCRAFT.slice(0, 4), state.aircraft);
      const saAircraft = SA && state.sa.aircraft ? pickAircraft(SA.data.AIRCRAFT, state.sa.aircraft) : null;
      const b = {
        ref: oaRef, scraggyRef: saRef, createdAt: new Date().toISOString(), from: state.from, to: state.to, tripType: state.tripType,
        names: state.names.slice(0, state.passengers), passengers: state.passengers,
        legs: legs.map((s) => ({
          airline: s.airline, no: s.no, date: s.date, from: s.from, to: s.to, dep: s.dep, arr: s.arr, via: s.via,
          fromStop: s.fromStop, toStop: s.toStop, direction: s.direction, passengers: state.passengers, gate: gateFor(s),
          miles: s.airline !== "SA" ? s.miles + (state.travelClass === "first" ? 50 : 0) : 0,
          aircraft: s.airline !== "SA" ? oaAircraft : saAircraft,
          travelClass: s.airline !== "SA" ? state.travelClass : state.sa.travelClass,
          seat: s.airline !== "SA" ? state.seatPref : state.sa.seat
        })),
        details: { snack: state.snack, bags: state.bags, reason: state.reason, joelmobile: state.joelmobile, sa: needsSA() ? { ...state.sa } : null }
      };
      b.miles = b.legs.reduce((n, l) => n + l.miles, 0);
      u.trips.push(b);
      if (b.miles) addMiles(u, b.miles, `Booking ${oaRef}: ${placeShort(b.from)} → ${placeShort(b.to)}`);
      return b;
    });
    removeSession(DRAFT);
    showPasses(booking);
  } catch (e) {
    setMsg(msg, e.message || "Booking failed. Very on brand.", "error");
  }
}

function showPasses(b) {
  $("#booking").hidden = true;
  const res = $("#result");
  res.hidden = false;
  res.replaceChildren(
    el("h2", {}, "You are booked (probably)"),
    el("p", { class: "msg ok", role: "status" }, `Booking ${b.ref}${b.scraggyRef ? " + " + b.scraggyRef : ""} · +${b.miles.toLocaleString("en-GB")} Octmiles. Paid in peanuts.`),
    ...b.legs.map((l, i) => [i > 0 && b.legs[i - 1].direction === l.direction && b.legs[i - 1].no !== l.no ? el("p", { class: "note" }, `⏱ Change planes at ${placeName(l.from)}`) : "", passCard(b, l, SA)]).flat(),
    el("div", { class: "actions" }, el("a", { class: "btn", href: "account.html" }, "My Trips"), el("a", { class: "btn secondary", href: "book.html" }, "Book another")));
  res.scrollIntoView({ block: "start" });
}

/* ---------------- start ---------------- */
async function start() {
  SA = await scraggyData();
  const draft = loadSession(DRAFT, null);
  if (draft) state = { ...blank(), ...draft, sa: { ...blank().sa, ...(draft.sa || {}) } };
  const q = new URLSearchParams(location.search);
  if (q.get("from") && OA_PLACES.includes(q.get("from"))) state.from = q.get("from");
  if (q.get("to") && PLACES[q.get("to")]) state.to = q.get("to");
  if (q.get("passengers")) state.passengers = Math.min(9, Math.max(1, +q.get("passengers") || 1));
  if (q.get("date")) state.departDate = q.get("date");
  if (q.get("from") || q.get("to")) { state.outChoice = 0; state.backChoice = 0; if (!q.get("date")) state.departDate = ""; state.returnDate = ""; }
  if (needsSA()) state.passengers = 1;
  if (state.departDate && state.departDate < today()) state.departDate = "";
  if (draft && currentUser()) { current = steps().length - 1; triedConfirm = true; }   // back from login: go to Confirm
  persist();
  render();
}
start();
