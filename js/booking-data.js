// Octee booking options + the boarding pass card (shared by book.html and account.html).
import { el, niceDate } from "./dom.js";
import { placeName, placeShort } from "./destinations.js";

export const OA_AIRCRAFT = [
  { id: "airbus-777", name: "Airbus 777", blurb: "Has wings. Both of them, mostly." },
  { id: "boeing-330", name: "Boeing 330", blurb: "Fits 330 passengers. Or 180. Depends who's counting." },
  { id: "airbus-747", name: "Airbus 747", blurb: "Has a hump. The hump is where we keep the peanut." },
  { id: "boeing-380", name: "Boeing 380", blurb: "Very big. The engines MAY be working." },
  { id: "surprise", name: "Surprise me", blurb: "We will pick the wrong one." }
];
export const OA_CLASSES = [
  { id: "economy", name: "Octee Economy", joke: "Same seat as everyone. Sit anyway.", bonus: 0, tokens: 0 },
  { id: "business", name: "Octee Business", joke: "Slightly further from the toilets.", bonus: 0, tokens: 30 },
  { id: "first", name: "Octee First", joke: "Economy with a curtain.", bonus: 50, tokens: 60 }
];
// tokens = Octeetokens to pay for that class, per booking (Economy is free).
export const classTokens = (id) => (OA_CLASSES.find((c) => c.id === id) || {}).tokens || 0;
export const OA_SNACKS = ["One Peanut", "One Peanut (vegetarian)", "One Peanut (served warm)"];
export const OA_REASONS = ["Business (unclear)", "Visiting Scraggy (long story)", "Escaping FIA", "Looking for my bag",
  "The JOELMOBILE dropped me here", "I was told this was a train"];
export const SEATS = [["window", "Window"], ["aisle", "Aisle"], ["somewhere", "Somewhere"]];

export function passCard(b, l, SA) {
  const sa = l.airline === "SA";
  const cls = sa ? SA?.data?.CLASSES?.find((c) => c.id === l.travelClass)?.name : OA_CLASSES.find((c) => c.id === l.travelClass)?.name;
  const air = ((sa ? SA?.data?.AIRCRAFT : OA_AIRCRAFT) || []).find((a) => a.id === l.aircraft)?.name || l.aircraft;
  const ou = l.airline === "OU";
  return el("article", { class: "pass" + (sa ? " sa" : ou ? " ou" : ""), "aria-label": "Boarding pass " + l.no },
    el("div", { class: "pass-top" }, el("span", {}, (sa ? "Scraggy Airlines · " : ou ? "One United · " : "Octee Airlines · ") + l.no), el("span", {}, "Ref " + (sa ? b.scraggyRef : b.ref))),
    el("div", { class: "pass-body" },
      el("p", { class: "route" }, `${placeName(l.from)} → ${placeName(l.to)}`),
      el("dl", { class: "kv" },
        el("dt", {}, "Passenger"), el("dd", {}, b.names.join(", ")),
        el("dt", {}, "Date"), el("dd", {}, niceDate(l.date)),
        el("dt", {}, "Departs"), el("dd", {}, l.dep),
        el("dt", {}, "Arrives"), el("dd", {}, l.arr + (l.via?.length ? ` (via ${l.via.map(placeShort).join(", ")}, stay on board)` : "")),
        el("dt", {}, "Aircraft"), el("dd", {}, air || "—"),
        el("dt", {}, "Class"), el("dd", {}, cls || "—"),
        el("dt", {}, "Seat"), el("dd", {}, l.seat || "Somewhere"),
        el("dt", {}, "Gate"), el("dd", {}, l.gate),
        el("dt", {}, sa ? "Points" : "Octmiles"), el("dd", {}, sa ? "Scraggy Points are collected with Scraggy Airlines." : "+" + l.miles + (ou ? " (One United shares the miles. Unevenly.)" : ""))),
      !sa && l.from === "FIA" ? el("p", {}, el("a", { href: "joelmobile.html" }, `Call the JOELMOBILE to gate ${l.gate}`)) : ""));
}

