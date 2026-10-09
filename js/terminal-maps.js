// Terminal maps for Tabletop Domestic (TDA) and Mt Fuji International (MFIA). Gates and flights come from the timetable.
import { $, el } from "./dom.js";
import { ALL_FLIGHTS, placeShort, placeName, daysText } from "./destinations.js";
import { scraggyData } from "./scraggy.js";

const NS = "http://www.w3.org/2000/svg";
const S = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); kids.forEach((c) => n.append(c)); return n; };
const INK = "#111", F = "Inter, Arial, sans-serif";
const T = (x, y, s, o = {}) => S("text", { x, y, "text-anchor": o.a || "middle", "font-family": F, "font-size": o.s || 13, "font-weight": o.w || 700, fill: o.f || INK }, s);
const R = (x, y, w, h, o = {}) => S("rect", { x, y, width: w, height: h, rx: o.r || 0, fill: o.f || "#fff", stroke: o.k || INK, "stroke-width": o.sw || 2 });

// gates for an airport: one per airline + other end of the route
async function gatesFor(code) {
  const map = new Map();
  const add = (airline, no, other, days, time) => {
    const key = airline + ":" + other;
    if (!map.has(key)) map.set(key, { airline, other, flights: [] });
    map.get(key).flights.push({ no, days, time });
  };
  for (const f of ALL_FLIGHTS) for (let i = 0; i < f.stops.length; i++) {
    if (f.stops[i][0] !== code) continue;
    const nxt = f.stops[i + 1], prv = f.stops[i - 1];
    if (nxt && f.stops[i][2]) add(f.airline, f.no, nxt[0], f.days, "dep " + f.stops[i][2]);
    if (prv && f.stops[i][1]) add(f.airline, f.no, prv[0], f.days, "arr " + f.stops[i][1]);
  }
  if (code === "MFIA") {
    try {
      const { routes } = await scraggyData(); const r = routes.find((x) => x.place === "MFIA");
      if (r) { add("SA", r.outNo, "SIA", [1, 2, 3, 4, 5, 6, 7], "dep " + r.outDep); add("SA", r.inNo, "SIA", [1, 2, 3, 4, 5, 6, 7], "arr " + r.inArr); }
    } catch { /* snapshot normally covers this */ }
  }
  const order = { OA: 0, OU: 1, SA: 2 }, count = {};
  return [...map.values()].sort((a, b) => order[a.airline] - order[b.airline] || a.other.localeCompare(b.other)).map((g) => {
    count[g.airline] = (count[g.airline] || 0) + 1;
    return { ...g, gate: { OA: "A", OU: "U", SA: "S" }[g.airline] + count[g.airline] };
  });
}

function tdaMap(gates) {
  const svg = S("svg", { viewBox: "0 0 1000 640", role: "img", "aria-label": "Map of Tabletop Domestic Airport: one terminal shaped like a table, with four legs, and gates along the top edge" });
  svg.append(R(0, 0, 1000, 640, { sw: 2 }),
    T(500, 34, "TABLETOP DOMESTIC AIRPORT (TDA)", { s: 20, w: 800 }), T(500, 54, "One terminal. It is a table.", { s: 12, w: 600 }));
  // tabletop
  svg.append(R(90, 150, 820, 250, { sw: 3, r: 6, f: "#f4f4f4" }), T(500, 352, "THE TABLETOP", { s: 30, w: 800, f: "#bbb" }),
    T(500, 376, "Departures · Arrivals · A very flat concourse", { s: 12, w: 600, f: "#888" }));
  // legs
  [[110, "LEG 1", "Check-in and security"], [320, "LEG 2", "Baggage claim"], [610, "LEG 3", "Peanut Stand"], [820, "LEG 4", "Lost property"]].forEach(([x, t, d]) => {
    svg.append(R(x, 400, 70, 150, { f: "#fff", sw: 2.5 }), T(x + 35, 440, t, { s: 13 }), T(x + 35, 458, d.split(" ")[0], { s: 10, w: 600 }), T(x + 35, 471, d.split(" ").slice(1).join(" "), { s: 10, w: 600 }));
  });
  svg.append(R(430, 235, 140, 60, { f: "#fff" }), T(500, 262, "CENTRE", { s: 13 }), T(500, 280, "(the cup)", { s: 10, w: 600 }));
  // gates along the top edge
  const n = gates.length, w = Math.min(120, 780 / Math.max(1, n));
  gates.forEach((g, i) => { const x = 110 + i * (780 / n) + (780 / n - w) / 2;
    svg.append(R(x, 88, w, 62, { f: g.airline === "OU" ? "#e6eeff" : "#fff1de", sw: 2.5 }), T(x + w / 2, 112, "GATE " + g.gate, { s: 14, w: 800 }), T(x + w / 2, 130, g.airline + " · " + placeShort(g.other), { s: 11, w: 600 }));
    svg.append(S("path", { d: `M${x + w / 2},150 V190`, stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "4 4" })); });
  // apron
  svg.append(R(90, 580, 820, 40, { f: "#ddd", sw: 1.5 }), T(500, 605, "APRON · aircraft park on the table, nose first", { s: 12, w: 600 }));
  svg.append(T(500, 560, "Roads to everywhere: none", { s: 11, w: 600, f: "#666" }));
  return svg;
}

function mfiaMap(gates) {
  const svg = S("svg", { viewBox: "0 0 1000 680", role: "img", "aria-label": "Map of Mt Fuji International Airport: a terminal shaped like a mountain with a transit hall at the top, Octee gates on the left and One United and Scraggy gates on the right" });
  svg.append(R(0, 0, 1000, 680, { sw: 2 }), T(500, 34, "MT FUJI INTERNATIONAL AIRPORT (MFIA)", { s: 20, w: 800 }), T(500, 54, "A hub for changing planes, and your mind.", { s: 12, w: 600 }));
  svg.append(S("path", { d: "M500,90 L860,500 L140,500 Z", fill: "#f4f4f4", stroke: INK, "stroke-width": 3 }),
    S("path", { d: "M500,90 L585,187 L545,172 L500,196 L455,172 L415,187 Z", fill: "#fff", stroke: INK, "stroke-width": 2 }), T(500, 170, "SNOW", { s: 11, w: 700, f: "#999" }),
    S("path", { d: "M500,196 V500", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "8 5" }),
    R(400, 250, 200, 90, { f: "#fff" }), T(500, 282, "TRANSIT HALL", { s: 16, w: 800 }), T(500, 302, "change planes here", { s: 11, w: 600 }), T(500, 320, "(not to FIA, unless Octee)", { s: 10, w: 600, f: "#a33" }),
    T(365, 430, "OCTEE SIDE", { s: 12, w: 800 }), T(635, 430, "OU + SCRAGGY SIDE", { s: 12, w: 800 }),
    T(500, 520, "THE WALL: you cannot cross it, except by plane", { s: 11, w: 600, f: "#a33" }));
  // OA-only corridor to FIA
  svg.append(R(40, 360, 150, 70, { f: "#fff1de", sw: 2.5 }), T(115, 388, "OCTEE ONLY", { s: 13, w: 800 }), T(115, 406, "corridor to FIA", { s: 11, w: 600 }), T(115, 420, "OA 124-127", { s: 10, w: 600 }),
    S("path", { d: "M190,395 H300", stroke: INK, "stroke-width": 2.5, "marker-end": "url(#tmarr)" }));
  svg.insertBefore(S("defs", {}, S("marker", { id: "tmarr", markerWidth: 10, markerHeight: 10, refX: 8, refY: 3, orient: "auto" }, S("path", { d: "M0,0 L8,3 L0,6 Z", fill: INK }))), svg.firstChild);
  // gates along the base: OA left, OU/SA right
  const left = gates.filter((g) => g.airline === "OA"), right = gates.filter((g) => g.airline !== "OA");
  const row = (list, x0, x1) => list.forEach((g, i) => { const w = (x1 - x0) / list.length, x = x0 + i * w + 4;
    svg.append(R(x, 548, w - 8, 66, { f: g.airline === "OA" ? "#fff1de" : g.airline === "OU" ? "#e6eeff" : "#e2f5e9", sw: 2.5 }),
      T(x + (w - 8) / 2, 574, "GATE " + g.gate, { s: 13, w: 800 }), T(x + (w - 8) / 2, 592, g.airline + " · " + placeShort(g.other), { s: 10.5, w: 600 })); });
  row(left, 30, 490); row(right, 510, 970);
  svg.append(T(260, 640, "OCTEE AIRLINES GATES", { s: 11, w: 800 }), T(740, 640, "ONE UNITED + SCRAGGY GATES", { s: 11, w: 800 }));
  return svg;
}

const INFO = {
  TDA: { name: "Tabletop Domestic Airport", blurb: "TDA is served by Octee Airlines (OA) and One United (OU) only. It is a domestic airport, so everything is domestic, including the weather. Gates are along one edge of the table.", draw: tdaMap },
  MFIA: { name: "Mt Fuji International Airport", blurb: "MFIA is a transit hub for Octee Airlines, Scraggy Airlines (via SIA) and One United. The only way to fly between MFIA and FIA is Octee Airlines. The wall in the middle of the terminal is real.", draw: mfiaMap }
};
let current = "TDA";

async function show(code) {
  current = code;
  for (const c of ["TDA", "MFIA"]) { const t = $("#tm-tab-" + c); t.setAttribute("aria-selected", String(c === code)); t.classList.toggle("ghost", c !== code); }
  const gates = await gatesFor(code), info = INFO[code];
  $("#tm-panel").setAttribute("aria-labelledby", "tm-tab-" + code);
  $("#tm-panel").replaceChildren(
    el("h2", { style: "margin-top:0" }, info.name), el("p", {}, info.blurb),
    el("figure", { class: "card tm-map" }, el("div", { class: "map-scroll tm-scroll", tabindex: "0", role: "group", "aria-label": `${info.name} map (scroll sideways on small screens)` }, info.draw(gates))),
    el("h3", {}, "Gates and flights"),
    el("div", { class: "board", style: "margin-top:0" }, el("table", {}, el("caption", { class: "visually-hidden" }, `Gates at ${code}`),
      el("thead", {}, el("tr", {}, ...["Gate", "Airline", "To / from", "Flights"].map((h) => el("th", { scope: "col" }, h)))),
      el("tbody", {}, ...gates.map((g) => el("tr", {}, el("td", {}, el("strong", {}, g.gate)), el("td", {}, g.airline), el("td", {}, placeName(g.other)),
        el("td", {}, g.flights.map((f) => `${f.no} (${f.time}, ${daysText(f.days).toLowerCase()})`).join(" · "))))))));
}
$("#tm-tab-TDA").addEventListener("click", () => show("TDA"));
$("#tm-tab-MFIA").addEventListener("click", () => show("MFIA"));
show(location.hash.toLowerCase() === "#mfia" ? "MFIA" : "TDA");
