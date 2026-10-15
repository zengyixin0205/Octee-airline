// JoelTEH Airlines (call sign JT). Home base: JTIA (Joel Teh International Airport).
// JT flies its own planes between JTIA, FIA (Fuji International) and MFIA (Mt Fuji International), and puts a JT number on flights
// of Octee (OA), Scraggy Airlines (SA) and One United (OU) (a codeshare), so a trip such as JTIA → FIA → SIA is ONE booking in Joelmiles.
// Octee is the only airline between FIA and MFIA (see MFIA_NOTE in destinations.js), so JT's own planes never fly FIA ↔ MFIA: that stretch is JT-numbered OA.
import { PLACES, segmentsOn, rate, mins, isoDay, placeName, placeShort, MIN_CONNECTION, MAX_FLIGHTS, seatsLeft, DAY_NAMES } from "./destinations.js";

export const JT_PLACES = { JTIA: { name: "Joel Teh International Airport", short: "JTIA" } };
export const nameOf = (c) => (JT_PLACES[c] ? JT_PLACES[c].name : placeName(c));
export const shortOf = (c) => (JT_PLACES[c] ? JT_PLACES[c].short : placeShort(c));
export const JT_HOME = "JTIA";
export const JT_AIRPORTS = ["JTIA", "FIA", "MFIA"];

const ALL = [1, 2, 3, 4, 5, 6, 7];
// JT's own planes. Four a day to FIA, four a day to MFIA, plus a weekend late flight.
export const JT_FLIGHTS = [
  { no: "JT 001", days: ALL, from: "JTIA", to: "FIA", dep: "06:30", arr: "08:05" },
  { no: "JT 002", days: ALL, from: "FIA", to: "JTIA", dep: "09:10", arr: "10:45" },
  { no: "JT 003", days: ALL, from: "JTIA", to: "FIA", dep: "15:00", arr: "16:35" },
  { no: "JT 004", days: ALL, from: "FIA", to: "JTIA", dep: "17:40", arr: "19:15" },
  { no: "JT 011", days: ALL, from: "JTIA", to: "MFIA", dep: "07:15", arr: "08:40" },
  { no: "JT 012", days: ALL, from: "MFIA", to: "JTIA", dep: "09:30", arr: "10:55" },
  { no: "JT 013", days: ALL, from: "JTIA", to: "MFIA", dep: "16:00", arr: "17:25" },
  { no: "JT 014", days: ALL, from: "MFIA", to: "JTIA", dep: "18:15", arr: "19:40" },
  { no: "JT 021", days: [5, 6, 7], from: "JTIA", to: "FIA", dep: "21:00", arr: "22:35" },
  { no: "JT 022", days: [5, 6, 7], from: "FIA", to: "JTIA", dep: "23:00", arr: "00:35" }
];
// Own-flight prices in Joelmiles (economy). JTIA flights are the cheap ones.
export const JT_OWN_PRICE = { "JTIA-FIA": 800, "FIA-JTIA": 800, "JTIA-MFIA": 1200, "MFIA-JTIA": 1200 };
// Partner flights carrying a JT number: 2,000 to 5,000 Joelmiles a stretch (10 per Octmile, never below 2,000 or above 5,000).
export const codeshareNo = (seg) => {
  const digits = String(seg.no).replace(/\D/g, "");
  return "JT " + ({ OA: "5", OU: "6", SA: "7" }[seg.airline] || "9") + digits.padStart(2, "0");
};
export const CLASSES = {
  economy: { label: "Economy", factor: 1 },
  business: { label: "Business", factor: 1.5 },
  first: { label: "First", factor: 2 }
};
export const MAX_PASSENGERS = 4;
const SA_PRICE = 2000;

function ownSegments(date) {
  const day = isoDay(date);
  return JT_FLIGHTS.filter((f) => f.days.includes(day)).map((f) => ({
    airline: "JT", operator: "JT", no: f.no, date, from: f.from, to: f.to, dep: f.dep, arr: f.arr, via: [],
    price: JT_OWN_PRICE[`${f.from}-${f.to}`], overnight: mins(f.arr) < mins(f.dep)
  }));
}
// Partner flights carrying a JT number: every bookable stretch of OA, OU and SA flights, priced in Joelmiles.
function partnerSegments(date, saRoutes) {
  return segmentsOn(date, saRoutes).map((s) => {
    let miles = 0;
    if (s.airline === "SA") miles = 0;
    else {
      const f = s;                                                    // rebuild the full-rate miles (OU shows half miles)
      miles = f.airline === "OU" ? f.miles * 2 : f.miles;
    }
    const price = s.airline === "SA" ? SA_PRICE : Math.min(5000, Math.max(2000, miles * 10));
    return { ...s, operator: s.airline, no: codeshareNo(s), partnerNo: s.no, airline: "JT", price };
  });
}
export const segmentsForJT = (date, saRoutes = []) => [...ownSegments(date), ...partnerSegments(date, saRoutes)];

// Every way from `from` to `to` on a date that includes at least one JT-numbered flight (all of them are, here), by the same rules as
// itinerariesOn: 45 minutes between planes, at most 3 flights, never through a place twice.
export function jtItineraries(from, to, date, saRoutes = []) {
  if (from === to) return [];
  const segs = segmentsForJT(date, saRoutes);
  const out = [];
  const walk = (place, path, visited) => {
    if (path.length >= MAX_FLIGHTS) return;
    for (const s of segs) {
      if (s.from !== place || visited.has(s.to)) continue;
      if (s.via.some((v) => v === to || visited.has(v))) continue;
      const last = path[path.length - 1];
      if (last && (s.partnerNo === last.partnerNo && s.no === last.no)) continue;
      if (last && (last.overnight || mins(s.dep) < mins(last.arr) + MIN_CONNECTION)) continue;
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
    .slice(0, 8);
}

export const priceOf = (it, cls = "economy", passengers = 1) =>
  Math.ceil(it.reduce((n, s) => n + s.price, 0) * (CLASSES[cls] || CLASSES.economy).factor * Math.max(1, passengers));
export const operatorLabel = (s) => ({ JT: "JoelTEH Airlines", OA: "Octee Airlines", OU: "One United", SA: "Scraggy Airlines" })[s.operator] || s.operator;
export const describe = (it) => (it.length === 1 ? "Direct" : `${it.length - 1} change${it.length > 2 ? "s" : ""} (at ${it.slice(1).map((s) => shortOf(s.from)).join(", ")})`);
export const routeOf = (it) => [it[0].from, ...it.map((s) => s.to)].map(shortOf).join(" → ");
export const seatsOn = (s, trips = []) => (s.operator === "JT" ? Math.max(0, 120 - (30 + (hash(s.no + s.date) % 70))) : s.operator === "SA" ? null : seatsLeft({ ...s, airline: s.operator, no: s.partnerNo }, trips));
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
export const jtRef = () => "JT-" + String(Math.floor(10000 + Math.random() * 90000));
export const timesText = (days) => (days.length === 7 ? "Every day" : days.map((d) => DAY_NAMES[d]).join(", "));
export { PLACES, rate };
