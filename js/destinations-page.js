import { $, el } from "./dom.js";
import { mountSearchBox, renderResults } from "./destsearch.js";
import { ALL_FLIGHTS, OA_FLIGHTS, OU_FLIGHTS, daysText, placeName as pn } from "./destinations.js";
import { scraggyData } from "./scraggy.js";

const params = new URLSearchParams(location.search);
const results = $("#results");
const run = (q, from) => {
  history.replaceState(null, "", `?q=${encodeURIComponent(q)}&from=${from}`);
  renderResults(results, q, from);
};
mountSearchBox($("#search"), { onSearch: run, from: params.get("from") || "FIA", query: params.get("q") || "" });
if (params.get("q")) renderResults(results, params.get("q"), params.get("from") || "FIA");

// Flight numbers on each destination card, straight from the timetable
const towards = (place) => ALL_FLIGHTS.filter((f) => f.stops.findIndex((s) => s[0] === place) > 0);
for (const card of document.querySelectorAll("[data-place]")) {
  const place = card.dataset.place;
  card.querySelector(".flights").append(...towards(place).map((f) => el("span", { class: f.airline === "OU" ? "tag ou" : "tag oa" }, `${f.no} · ${daysText(f.days)}`)));
}

// Partner (Scraggy Airlines) destinations from the real Scraggy data
scraggyData().then(({ routes, source }) => {
  const box = $("#partners");
  const partners = routes;
  box.replaceChildren(...partners.map((r) => el("article", { class: "card" },
    el("h3", {}, pn(r.place), " ", el("span", { class: "tag sa" }, "Scraggy Airlines")),
    el("p", {}, r.blurb || ""),
    el("p", {}, el("span", { class: "tag sa" }, `${r.outNo} SIA ${r.outDep} → ${r.outArr}`), el("span", { class: "tag sa" }, `${r.inNo} back ${r.inDep}`), el("span", { class: "tag" }, "Gate " + r.gate)),
    r.place === "FIA"
      ? el("a", { class: "btn small", href: "book.html?from=SIA&to=FIA" }, "Book SIA → FIA")
      : el("a", { class: "btn small", href: `book.html?from=FIA&to=${r.place}` }, "Book from FIA"))));
  $("#scraggy-source").textContent = source === "live" ? "Scraggy flight data: live from the Scraggy Airlines site." : "Scraggy flight data: saved copy (the live Scraggy site couldn't be reached or is older).";
});

/* ---------------- Route map (drawn from the real timetables, so it never goes out of date) ---------------- */

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const k of kids) n.append(k instanceof Node ? k : document.createTextNode(k));
  return n;
};
// Where things are (made-up geography: islands in the Sea of Delays)
const SPOT = {
  FIA: { x: 560, y: 300, label: "FIA", sub: "Fuji International", dx: 16, dy: 5 },
  SIA: { x: 285, y: 235, label: "SIA", sub: "Scraggy International", dx: -16, dy: -12, anchor: "end" },
  SCH: { x: 345, y: 395, label: "Scraggy House", sub: "", dx: 0, dy: 30, anchor: "middle" },
  LIA: { x: 765, y: 410, label: "LIA", sub: "Lu Pin International", dx: 0, dy: 32, anchor: "middle" },
  MIA: { x: 385, y: 95, label: "MIA", sub: "Mdm Wrong-Wrong International", dx: 16, dy: -8 },
  TDA: { x: 505, y: 432, label: "TDA", sub: "Tabletop Domestic", dx: 0, dy: 32, anchor: "middle" },
  MFIA: { x: 690, y: 148, label: "MFIA", sub: "Mt Fuji International", dx: 16, dy: -6 },
  LUJ: { x: 105, y: 355, label: "Lujin's", sub: "", dx: 0, dy: 30, anchor: "middle" }
};
const LAND = [   // [cx, cy, rx, ry, seed]
  [585, 300, 150, 100, 7], [770, 400, 78, 52, 3], [305, 315, 120, 135, 11], [380, 95, 95, 52, 5], [105, 350, 52, 40, 2], [690, 140, 40, 22, 9], [180, 180, 26, 16, 4], [505, 428, 46, 26, 13]
];
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
function blob(cx, cy, rx, ry, seed) {
  const r = rng(seed), n = 16, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 0.8 + r() * 0.4;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  // smooth closed curve through the points (Catmull-Rom -> cubic Bézier)
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}
function pairs(flights) {
  const set = new Set();
  for (const f of flights) for (let i = 0; i < f.stops.length - 1; i++) set.add([f.stops[i][0], f.stops[i + 1][0]].sort().join("-"));
  return [...set];
}
function arc(a, b, bend) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  return `M${a.x},${a.y} Q${(mx - dy * bend).toFixed(1)},${(my + dx * bend).toFixed(1)} ${b.x},${b.y}`;
}

scraggyData().then(({ routes }) => {
  const lines = [
    ...routes.map((r) => ["SIA", r.place].sort().join("-")).map((p) => ({ p, air: "SA", color: "#f2d43d", bend: 0.2, dash: "10 7" })),
    ...pairs(OU_FLIGHTS).map((p) => ({ p, air: "OU", color: "#6ec3f0", bend: -0.14 })),
    ...pairs(OA_FLIGHTS).map((p) => ({ p, air: "OA", color: "#ff7a00", bend: 0.06 }))
  ];
  const names = { OA: "Octee Airlines", OU: "One United", SA: "Scraggy Airlines" };
  const desc = lines.map((l) => `${names[l.air]}: ${l.p.split("-").map(pn).join(" to ")}`).join(". ");
  const root = svg("svg", { viewBox: "0 0 900 520", role: "img", "aria-labelledby": "map-t map-d" },
    svg("title", { id: "map-t" }, "Route map: Octee Airlines, One United and Scraggy Airlines"),
    svg("desc", { id: "map-d" }, desc + "."),
    svg("rect", { width: 900, height: 520, fill: "#d3e9f3" }));
  // sea texture: faint latitude / longitude lines
  const grid = svg("g", { stroke: "#ffffff", "stroke-opacity": ".55", "stroke-width": "1", fill: "none" });
  for (let x = 75; x < 900; x += 150) grid.append(svg("path", { d: `M${x},0 Q${x + 18},260 ${x},520` }));
  for (let y = 65; y < 520; y += 130) grid.append(svg("path", { d: `M0,${y} Q450,${y + 22} 900,${y}` }));
  root.append(grid);
  // land: shallow-water halo, then the islands
  const land = svg("g");
  for (const [cx, cy, rx, ry, seed] of LAND) land.append(svg("path", { d: blob(cx, cy, rx + 14, ry + 14, seed), fill: "#e6f4fa" }));
  for (const [cx, cy, rx, ry, seed] of LAND) land.append(svg("path", { d: blob(cx, cy, rx, ry, seed), fill: "#f3e3c3", stroke: "#cfa96d", "stroke-width": "1.5" }));
  for (const [cx, cy, rx, ry, seed] of LAND.slice(0, 4)) land.append(svg("path", { d: blob(cx, cy, rx * 0.55, ry * 0.5, seed + 20), fill: "#d5e3b0", opacity: ".8" }));
  root.append(land);
  // Mount Fuji beside FIA
  root.append(svg("g", {},
    svg("path", { d: "M588,268 L622,214 L656,268 Z", fill: "#7d8fa3", stroke: "#52606d", "stroke-width": "1" }),
    svg("path", { d: "M610,233 L622,214 L634,233 L628,229 L622,236 L616,229 Z", fill: "#ffffff" }),
    svg("text", { x: 622, y: 205, "text-anchor": "middle", "font-size": "11", "font-style": "italic", fill: "#52606d", "font-family": "Inter, sans-serif" }, "Mt Fuji")));
  // sea names
  const sea = { "font-size": "13", "font-style": "italic", fill: "#6f93a8", "font-family": "Georgia, serif", "letter-spacing": "2" };
  root.append(svg("text", { x: 480, y: 470, ...sea }, "SEA OF DELAYS"), svg("text", { x: 430, y: 200, ...sea, "font-size": "11" }, "Lost Luggage Strait"));
  // routes: dark casing first so they read on both land and sea
  const g = svg("g", { fill: "none", "stroke-linecap": "round" });
  for (const l of lines) {
    const [a, b] = l.p.split("-").map((c) => SPOT[c]);
    if (!a || !b) continue;
    const d = arc(a, b, l.bend);
    g.append(svg("path", { d, stroke: "#2b1a0e", "stroke-opacity": ".55", "stroke-width": "5.5", ...(l.dash ? { "stroke-dasharray": l.dash } : {}) }));
    g.append(svg("path", { d, stroke: l.color, "stroke-width": "3.5", ...(l.dash ? { "stroke-dasharray": l.dash } : {}) }));
  }
  root.append(g);
  // airports
  for (const [code, s] of Object.entries(SPOT)) {
    const hub = code === "FIA";
    root.append(svg("circle", { cx: s.x, cy: s.y, r: hub ? 11 : 8, fill: "#ffffff", stroke: "#2b1a0e", "stroke-width": "3" }));
    if (hub) root.append(svg("circle", { cx: s.x, cy: s.y, r: 4, fill: "#ff7a00" }));
    const t = svg("text", { x: s.x + s.dx, y: s.y + s.dy, "text-anchor": s.anchor || "start", "font-family": "Inter, sans-serif", "font-size": "15", "font-weight": "700", fill: "#2b1a0e",
      stroke: "#ffffff", "stroke-width": "4", "paint-order": "stroke" }, s.label);
    root.append(t);
    if (s.sub) root.append(svg("text", { x: s.x + s.dx, y: s.y + s.dy + 15, "text-anchor": s.anchor || "start", "font-family": "Inter, sans-serif", "font-size": "11", fill: "#4c4640",
      stroke: "#ffffff", "stroke-width": "3.5", "paint-order": "stroke" }, s.sub));
  }
  // compass + scale
  root.append(svg("g", { transform: "translate(842,70)" },
    svg("circle", { r: 24, fill: "#ffffff", "fill-opacity": ".75", stroke: "#6f93a8" }),
    svg("path", { d: "M0,-19 L6,0 L0,19 L-6,0 Z", fill: "#2b1a0e" }), svg("path", { d: "M0,-19 L6,0 L-6,0 Z", fill: "#c03a3a" }),
    svg("text", { y: -30, "text-anchor": "middle", "font-size": "12", "font-weight": "700", fill: "#2b1a0e", "font-family": "Inter, sans-serif" }, "N")));
  root.append(svg("g", { transform: "translate(30,488)" },
    svg("path", { d: "M0,0 H120 M0,-5 V5 M120,-5 V5", stroke: "#2b1a0e", "stroke-width": "2", fill: "none" }),
    svg("text", { x: 0, y: -10, "font-size": "11", fill: "#2b1a0e", "font-family": "Inter, sans-serif" }, "about 2 hours (give or take a day)")));
  $("#route-map").replaceChildren(root);
});
