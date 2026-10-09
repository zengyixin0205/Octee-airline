// The boarding pass itself (one per passenger per flight). Used by pass.html and the account page.
import { el, niceDate } from "./dom.js";
import { placeName, placeShort, fiaTerminalOf } from "./destinations.js";
import { OA_CLASSES, OU_LEVELS } from "./booking-data.js";
import { barcodeSvg, boardsAt, seatsOf, hash, stream } from "./tripkit.js";

const SMALL_PRINT = [
  "Gate closed since Tuesday (maybe).",
  "This pass is valid for one flight, one peanut and one mistake.",
  "Boarding is a state of mind.",
  "Please do not read this pass aloud to the pilot.",
  "If found, please do not return to the airline.",
  "Seat belts are suggestions."
];

export function className(l, SA) {
  if (l.airline === "SA") return SA?.data?.CLASSES?.find((c) => c.id === l.travelClass)?.name || "Scraggy class";
  if (l.airline === "OU") return OU_LEVELS.find((c) => c.id === l.travelClass)?.name || "Chaos";
  return OA_CLASSES.find((c) => c.id === l.travelClass)?.name || "Octee Economy";
}
const group = (l) => l.airline === "SA" ? "P (peanut)" : l.airline === "OU" ? "Chaos" : l.travelClass === "first" ? "F (first, eventually)" : l.travelClass === "business" ? "B (before Z)" : "Z (last)";

export function boardingPass(b, l, i, p, SA, { compact = false } = {}) {
  const air = l.airline === "SA" ? "Scraggy Airlines" : l.airline === "OU" ? "One United" : "Octee Airlines";
  const seat = seatsOf(l)[p] || "—";
  const name = b.names[p] || b.names[0] || "Passenger";
  const seq = String(hash(`${b.ref}|${i}|${p}`) % 9000 + 1000);
  const term = l.from === "FIA" && l.airline !== "SA" ? fiaTerminalOf(l.gate) : null;
  const small = SMALL_PRINT[Math.floor(stream(`sp:${b.ref}${i}${p}`)() * SMALL_PRINT.length)];
  const code = `${l.no.replace(/\s/g, "")}${l.date.replace(/-/g, "")}${seat}${name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8)}${seq}`;
  const field = (label, value, big) => el("div", { class: "bp-field" + (big ? " big" : "") }, el("small", {}, label), el("strong", {}, value));
  return el("article", { class: `bp ${l.airline.toLowerCase()}${compact ? " compact" : ""}`, "aria-label": `Boarding pass for ${name}, flight ${l.no}` },
    el("div", { class: "bp-main" },
      el("div", { class: "bp-head" }, el("span", {}, air), el("span", {}, "BOARDING PASS"), el("span", {}, l.no)),
      el("div", { class: "bp-route", "aria-label": `${placeName(l.from)} to ${placeName(l.to)}` },
        el("div", {}, el("strong", { class: "bp-code" }, placeShort(l.from)), el("small", {}, placeName(l.from))),
        el("span", { class: "bp-arrow", "aria-hidden": "true" }, "→"),
        el("div", {}, el("strong", { class: "bp-code" }, placeShort(l.to)), el("small", {}, placeName(l.to)))),
      el("div", { class: "bp-fields" },
        field("Passenger", name),
        field("Date", niceDate(l.date)),
        field("Departs", l.dep),
        field("Boards", boardsAt(l)),
        field("Gate", l.gate + (term ? ` (T${term})` : ""), true),
        field("Seat", seat, true),
        field("Class", className(l, SA)),
        field("Group", group(l)),
        field("Booking", l.airline === "SA" ? b.scraggyRef : b.ref)),
      el("p", { class: "bp-close" }, "BOARDING CLOSES IN -3 MINUTES"),
      el("p", { class: "bp-cs" }, "Questions? Zhang Gullet, Customer Service. Hold line open 24 hours. Answered Tuesdays 03:00.")),
    el("div", { class: "bp-stub" },
      el("p", { class: "bp-stub-top" }, el("strong", {}, l.no), " · ", placeShort(l.from), " → ", placeShort(l.to)),
      barcodeSvg(code),
      el("p", { class: "bp-seq" }, `SEQ ${seq} · ${seat}`),
      el("p", { class: "bp-small" }, small)));
}
