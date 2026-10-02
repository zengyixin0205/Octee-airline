// Octee's places, weekly timetable and the trip finder.
// One source of truth for search, Destinations, the booking form, the status board and the route map.

export const PLACES = {
  FIA: { name: "Fuji International Airport", short: "FIA", oa: true, aliases: ["fia", "fuji", "fuji international", "fuji airport", "home"] },
  SIA: { name: "Scraggy International Airport", short: "SIA", oa: true, aliases: ["sia", "scraggy international", "scraggy airport"] },
  LIA: { name: "Lu Pin International Airport", short: "LIA", oa: true, aliases: ["lia", "lu pin", "lupin", "lu pin international"] },
  SCH: { name: "Scraggy House", short: "Scraggy House", oa: true, aliases: ["scraggy house", "scraggys house", "sch"] },
  MIA: { name: "Mdm Wrong-Wrong International Airport", short: "MIA", oa: true, aliases: ["mia", "mdm wrong wrong", "madam wrong wrong", "wrong wrong", "mdm wrong wrong house", "mdm wrongwrongs", "mdm wrong wrong international"] },
  LUJ: { name: "Lujin's", short: "Lujin's", oa: false, aliases: ["lujin", "lujins"] }
};
// Places you can start a trip from on the Octee form (served by Octee or One United)
export const OA_PLACES = ["FIA", "SIA", "LIA", "SCH", "MIA"];
export const placeName = (c) => PLACES[c]?.name || c;
export const placeShort = (c) => PLACES[c]?.short || c;

// Octmiles per stretch between two neighbouring stops
const RATES = { "FIA-SIA": 150, "FIA-LIA": 200, "FIA-SCH": 250, "LIA-SIA": 120, "SCH-SIA": 80, "FIA-MIA": 300 };
export const rate = (a, b) => RATES[[a, b].sort().join("-")] || 0;

// Weekly timetable. days: 1 = Mon … 7 = Sun. stops: [airport, arrive, depart]. All Singapore time.
const ALL = [1, 2, 3, 4, 5, 6, 7];
export const OA_FLIGHTS = [
  { no: "OA 58",  days: ALL,    stops: [["FIA", null, "07:30"], ["SIA", "09:20", null]] },
  { no: "OA 100", days: [1, 4], stops: [["FIA", null, "07:40"], ["SIA", "09:30", "10:10"], ["LIA", "11:25", null]] },
  { no: "OA 101", days: [2, 5], stops: [["LIA", null, "07:45"], ["SIA", "09:34", "10:15"], ["FIA", "12:05", null]] },
  { no: "OA 102", days: [3, 6], stops: [["FIA", null, "14:30"], ["SIA", "16:20", "17:00"], ["LIA", "18:15", null]] },
  { no: "OA 103", days: [4, 7], stops: [["LIA", null, "13:20"], ["SIA", "14:35", "15:10"], ["FIA", "17:00", null]] },
  { no: "OA 104", days: [1],    stops: [["SIA", null, "13:30"], ["FIA", "15:20", null]] },
  { no: "OA 105", days: [3],    stops: [["SIA", null, "16:45"], ["FIA", "18:35", null]] },
  { no: "OA 106", days: [6],    stops: [["SIA", null, "13:30"], ["FIA", "15:20", null]] },
  { no: "OA 107", days: [2],    stops: [["FIA", null, "09:00"], ["LIA", "11:30", null]] },
  { no: "OA 108", days: [5],    stops: [["FIA", null, "15:40"], ["LIA", "18:10", null]] },
  { no: "OA 109", days: [3],    stops: [["LIA", null, "07:10"], ["FIA", "09:40", null]] },
  { no: "OA 110", days: [7],    stops: [["LIA", null, "18:00"], ["FIA", "20:30", null]] },
  { no: "OA 111", days: [2],    stops: [["FIA", null, "11:15"], ["SCH", "13:05", null]] },
  { no: "OA 112", days: [6],    stops: [["FIA", null, "08:00"], ["SCH", "09:50", null]] },
  { no: "OA 113", days: [3],    stops: [["SCH", null, "14:00"], ["FIA", "15:50", null]] },
  { no: "OA 114", days: [7],    stops: [["SCH", null, "17:00"], ["FIA", "18:50", null]] },
  { no: "OA 115", days: [6],    stops: [["LIA", null, "06:30"], ["FIA", "09:00", "09:45"], ["SCH", "11:35", null]] },
  { no: "OA 116", days: [7],    stops: [["SCH", null, "08:20"], ["FIA", "10:10", "10:50"], ["LIA", "13:20", null]] },
  { no: "OA 117", days: [4],    stops: [["FIA", null, "10:00"], ["SCH", "11:50", "12:30"], ["SIA", "13:10", null]] },
  { no: "OA 118", days: [4],    stops: [["SIA", null, "15:00"], ["SCH", "15:40", "16:20"], ["FIA", "18:10", null]] }
];
// ONE UNITED (OU) — "unitation is a dream, it's chaos." Another airline at FIA, serving mainly
// Scraggy House and SIA. Its flights are timed to connect with Octee (OA) and Scraggy Airlines (SA).
// Booked on the Octee form; earns half Octmiles.
export const OU_FLIGHTS = [
  { no: "OU 1", days: ALL,       stops: [["FIA", null, "06:45"], ["SIA", "08:35", null]] },
  { no: "OU 2", days: ALL,       stops: [["SIA", null, "13:20"], ["FIA", "15:10", null]] },
  { no: "OU 3", days: [1, 3, 5], stops: [["FIA", null, "06:30"], ["SCH", "08:20", "08:45"], ["SIA", "09:20", null]] },
  { no: "OU 4", days: [1, 3, 5], stops: [["SIA", null, "13:45"], ["SCH", "14:20", "14:50"], ["FIA", "16:40", null]] },
  { no: "OU 5", days: [4, 7],    stops: [["FIA", null, "17:50"], ["SCH", "19:40", null]] },
  { no: "OU 6", days: [4, 7],    stops: [["SCH", null, "20:20"], ["FIA", "22:10", null]] },
  { no: "OU 7", days: ALL,       stops: [["FIA", null, "16:30"], ["SIA", "18:20", null]] },
  { no: "OU 8", days: ALL,       stops: [["SIA", null, "19:10"], ["FIA", "21:00", null]] },
  { no: "OU 9",  days: [2, 4, 6], stops: [["FIA", null, "09:30"], ["MIA", "11:40", null]] },
  { no: "OU 10", days: [2, 4, 6], stops: [["MIA", null, "12:40"], ["FIA", "14:50", null]] }
];
export const AIRLINES = {
  OA: { name: "Octee Airlines", milesFactor: 1 },
  OU: { name: "One United", milesFactor: 0.5 },
  SA: { name: "Scraggy Airlines", milesFactor: 0 }
};
// Every flight sold on the Octee form (Octee + One United)
export const ALL_FLIGHTS = [...OA_FLIGHTS.map((f) => ({ ...f, airline: "OA" })), ...OU_FLIGHTS.map((f) => ({ ...f, airline: "OU" }))];
export const isOcteeForm = (s) => s.airline !== "SA";

export const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MIN_CONNECTION = 45;     // minutes, at any airport
export const MAX_FLIGHTS = 3;         // = at most 2 changes
export const SEATS = 180;             // per flight, counted per stretch

export const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
export const isoDay = (dateStr) => { const [y, m, d] = dateStr.split("-").map(Number); return ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1; };
export const routeText = (f) => f.stops.map((s) => placeShort(s[0])).join(" → ");
export const daysText = (days) => (days.length === 7 ? "Every day" : days.map((d) => DAY_NAMES[d]).join(", "));

// Every bookable piece of every flight on a date: any boarding stop -> any later stop.
// saRoutes (from scraggy.js) add the Scraggy Airlines flights, which fly every day.
export function segmentsOn(date, saRoutes = []) {
  const day = isoDay(date);
  const segs = [];
  for (const f of ALL_FLIGHTS) {
    if (!f.days.includes(day)) continue;
    for (let i = 0; i < f.stops.length - 1; i++) {
      for (let j = i + 1; j < f.stops.length; j++) {
        let miles = 0;
        for (let k = i; k < j; k++) miles += rate(f.stops[k][0], f.stops[k + 1][0]);
        miles = Math.round(miles * AIRLINES[f.airline].milesFactor);
        segs.push({
          airline: f.airline, no: f.no, date, from: f.stops[i][0], to: f.stops[j][0],
          dep: f.stops[i][2], arr: f.stops[j][1], fromStop: i, toStop: j,
          via: f.stops.slice(i + 1, j).map((s) => s[0]), miles
        });
      }
    }
  }
  for (const r of saRoutes) {
    segs.push({ airline: "SA", no: r.outNo, date, from: "SIA", to: r.place, dep: r.outDep, arr: r.outArr, gate: r.gate, scraggyId: r.id, direction: "outbound", via: [], miles: 0 });
    segs.push({ airline: "SA", no: r.inNo, date, from: r.place, to: "SIA", dep: r.inDep, arr: r.inArr, gate: r.gate, scraggyId: r.id, direction: "inbound", via: [], miles: 0 });
  }
  return segs;
}

// All ways from `from` to `to` on one date: direct, staying on board through stops, and changes
// of plane (45+ minutes) at ANY airport, OA <-> SA included. Sorted: fewest changes, then earliest arrival.
export function itinerariesOn(from, to, date, saRoutes = [], { notBefore = null } = {}) {
  if (from === to) return [];
  const segs = segmentsOn(date, saRoutes);
  const out = [];
  const walk = (place, path, visited) => {
    if (path.length >= MAX_FLIGHTS) return;
    for (const s of segs) {
      if (s.from !== place || visited.has(s.to)) continue;
      if (s.via.some((v) => v === to || visited.has(v))) continue;   // don't pass through a place twice (or fly past the destination)
      const last = path[path.length - 1];
      if (!last && notBefore != null && mins(s.dep) < notBefore) continue;
      if (last && (s.no === last.no || mins(s.dep) < mins(last.arr) + MIN_CONNECTION)) continue;
      const next = [...path, s];
      if (s.to === to) out.push(next);
      else walk(s.to, next, new Set([...visited, s.to, ...s.via]));
    }
  };
  walk(from, [], new Set([from]));
  const key = (it) => it.map((s) => s.no + s.from + s.to).join("|");
  const seen = new Set();
  return out
    .filter((it) => (seen.has(key(it)) ? false : seen.add(key(it))))
    .sort((a, b) => a.length - b.length || mins(a[a.length - 1].arr) - mins(b[b.length - 1].arr) || mins(a[0].dep) - mins(b[0].dep))
    .slice(0, 6);
}

// ---- Seats (simulated) ----
// A static site can't see other people's bookings, so "other passengers" are a steady made-up number
// per flight and date, plus the real bookings saved in this browser.
function pseudo(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
export function seatsLeft(seg, browserTrips = []) {
  if (seg.airline === "SA") return null;
  let worst = SEATS;
  for (let k = seg.fromStop; k < seg.toStop; k++) {
    const others = 40 + (pseudo(seg.no + seg.date + k) % 120);
    const mine = browserTrips
      .flatMap((t) => t.legs || [])
      .filter((l) => l.airline === seg.airline && l.no === seg.no && l.date === seg.date && l.fromStop <= k && l.toStop > k)
      .reduce((n, l) => n + (l.passengers || 1), 0);
    worst = Math.min(worst, SEATS - others - mine);
  }
  return Math.max(0, worst);
}

export const itineraryMiles = (it, travelClass) =>
  it.filter(isOcteeForm).reduce((n, s) => n + s.miles + (travelClass === "first" ? 50 : 0), 0);

export function describeItinerary(it) {
  if (it.length === 1) return it[0].via.length ? `Direct (stops at ${it[0].via.map(placeShort).join(", ")}, stay on board)` : "Direct";
  const changes = it.slice(1).map((s) => placeShort(s.from));
  return `${it.length - 1} change${it.length > 2 ? "s" : ""} (at ${changes.join(", ")})`;
}

// ---- Search ----
export const normalize = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function matchPlace(query) {
  const q = normalize(query);
  if (!q) return [];
  const hits = [];
  for (const [code, p] of Object.entries(PLACES)) {
    const names = [p.name, p.short, code, ...p.aliases].map(normalize);
    const exact = names.some((n) => n === q);
    const part = names.some((n) => n.includes(q) || (q.length >= 4 && q.includes(n)));
    if (exact || part) hits.push({ code, score: exact ? 0 : 1 });
  }
  return hits.sort((a, b) => a.score - b.score).map((h) => h.code);
}

// Next dates (from today) when an itinerary exists
export function nextDates(from, to, saRoutes, startIso, count = 3, lookahead = 21) {
  const res = [];
  const [y, m, d] = startIso.split("-").map(Number);
  for (let i = 0; i < lookahead && res.length < count; i++) {
    const dt = new Date(y, m - 1, d + i);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const its = itinerariesOn(from, to, iso, saRoutes);
    if (its.length) res.push({ date: iso, it: its[0] });
  }
  return res;
}

/* ---------------- FIA terminals and gates (from FIA directory 248 / 322) ---------------- */
const span = (p, a, b, sides) => { const out = []; for (let n = a; n <= b; n++) for (const x of sides) out.push(p + n + x); return out; };
export const FIA_TERMINALS = [
  { no: 1, airlines: ["Octee Airlines", "Scraggy Airlines", "Lupin Airlines"],
    gates: ["A8", ...span("A", 11, 16, "AB"), "A17A", "A19A", "A19C", ...span("B", 1, 4, "AB"), "B5A", "C1B"] },
  { no: 2, airlines: ["Riley Airlines", "One United"], gates: [...span("D", 140, 146, "AB"), ...span("E", 50, 52, "AB")] },
  { no: 3, airlines: ["Scraggy (for reservation)"], gates: span("J", 121, 128, "AB") },
  { no: 4, airlines: ["Scraggy Airlines", "Lupin Airlines", "Wrong Airlines"],
    gates: ["G12B", "G20B", "G31A", "G31B", "G32B", "G33A", ...span("G", 34, 35, "AB"), "G36B", ...span("G", 37, 44, "AB")] },
  { no: 5, airlines: ["Scraggy Building", "Scraggy's own illegal terminal", "Scraggy illegal island"], gates: [...span("SC", 1, 14, "AB"), "SC15B"] }
];
// Octee (and Scraggy) leave FIA from Terminal 1, One United from Terminal 2.
export function fiaGate(airline) {
  const t = FIA_TERMINALS[airline === "OU" ? 1 : 0];
  return t.gates[Math.floor(Math.random() * t.gates.length)];
}
export const fiaTerminalOf = (gate) => (FIA_TERMINALS.find((t) => t.gates.includes(gate)) || {}).no;
