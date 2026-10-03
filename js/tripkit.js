// Small helpers shared by the boarding pass, check-in and flight tracker pages.
import { CONFIG } from "./config.js";
import { mins } from "./destinations.js";

// A trip is found again from its creation time (the number in ?t=), and a flight from its place in the trip (?leg=).
export const tripId = (b) => Date.parse(b.createdAt);
export const legUrl = (page, b, i) => `${page}?t=${tripId(b)}&leg=${i}`;
export function findLeg(user, params = new URLSearchParams(location.search)) {
  const t = Number(params.get("t")), i = Number(params.get("leg"));
  const b = (user?.trips || []).find((x) => tripId(x) === t);
  const l = b && Number.isInteger(i) ? b.legs[i] : null;
  return l ? { b, l, i } : null;
}

// Same text in, same number out: seats, barcodes and delays look random but never change on reload.
export function hash(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
export function stream(seed) {
  let s = typeof seed === "number" ? seed : hash(seed);
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// "2026-10-05" + "07:30" in a time zone -> a real moment in time.
export function zonedEpoch(date, time, tz = CONFIG.FIA_TIMEZONE) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
    const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    return guess - (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - guess);
  } catch { return guess; }
}
export const depEpoch = (l) => zonedEpoch(l.date, l.dep);
export const hhmm = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;
export const boardsAt = (l) => hhmm(mins(l.dep) - 30);

export const seatsOf = (l) => (Array.isArray(l.seats) ? l.seats : []);
export const isCheckedIn = (l) => !!l.checkedIn && seatsOf(l).length > 0;

// A made-up barcode (it scans as nothing, which is on brand). Returns an <svg>.
export function barcodeSvg(text, width = 240, height = 54) {
  const next = stream("bar:" + text);
  const NS = "http://www.w3.org/2000/svg";
  let x = 0, d = "";
  while (x < width - 6) {
    const w = 1 + Math.floor(next() * 3.4), gap = 1 + Math.floor(next() * 2.2);
    d += `M${x} 0h${w}v${height}h-${w}z`;
    x += w + gap;
  }
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${x} ${height}`);
  svg.setAttribute("class", "bp-barcode");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Made-up barcode. It does not scan.");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "#111");
  svg.append(path);
  return svg;
}
