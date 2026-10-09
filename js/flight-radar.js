// Flight-Radar 25 (better than 24): every plane in the timetable, placed on a made-up map by the time of day (FIA time).
import { $, el } from "./dom.js";
import { ALL_FLIGHTS, placeShort, placeName, mins } from "./destinations.js";
import { scraggyData } from "./scraggy.js";
import { CONFIG } from "./config.js";

const NS = "http://www.w3.org/2000/svg";
const S = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); kids.forEach((c) => n.append(c)); return n; };

// Made-up map positions (SVG 1000 x 600)
const POS = { FIA: [500, 330], SIA: [790, 215], LIA: [190, 175], SCH: [865, 430], MIA: [170, 470], TDA: [395, 150], MFIA: [625, 485] };
const COLOUR = { OA: "#ff7a00", OU: "#2f6bff", SA: "#1faa59" };
const AIRLINE_NAME = { OA: "Octee Airlines", OU: "One United", SA: "Scraggy Airlines" };
const NOTES = ["On time, disputed.", "Delayed by 1 millisecond.", "Cruising. The pilot is cruising too.", "Looking for the runway, with confidence.",
  "Peanuts being served.", "Slight turbulence, mostly emotional.", "The captain has stopped explaining.", "Following the line on the map."];
const hash = (s) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

function fiaMinutes(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(now).map((x) => [x.type, x.value]));
  return { day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) + 1, m: (+p.hour % 24) * 60 + +p.minute + +p.second / 60 };
}
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;

// every leg that flies today: { no, airline, from, to, dep, arr } (minutes)
async function legsFor(day) {
  const legs = [];
  for (const f of ALL_FLIGHTS) {
    if (!f.days.includes(day)) continue;
    for (let i = 0; i < f.stops.length - 1; i++) {
      const a = f.stops[i], b = f.stops[i + 1];
      if (!a[2] || !b[1] || !POS[a[0]] || !POS[b[0]]) continue;
      legs.push({ no: f.no, airline: f.airline, from: a[0], to: b[0], dep: mins(a[2]), arr: mins(b[1]) });
    }
  }
  try {
    const { routes } = await scraggyData();
    for (const r of routes) {
      const p = POS[r.place] ? r.place : null; if (!p || p === "SIA") continue;
      if (r.inNo && r.inDep && r.inArr) legs.push({ no: r.inNo, airline: "SA", from: p, to: "SIA", dep: mins(r.inDep), arr: mins(r.inArr) });
      if (r.outNo && r.outDep && r.outArr) legs.push({ no: r.outNo, airline: "SA", from: "SIA", to: p, dep: mins(r.outDep), arr: mins(r.outArr) });
    }
  } catch { /* the snapshot normally saves us; if not, no Scraggy planes */ }
  return legs.filter((l) => l.arr > l.dep);
}

function drawMap(svg) {
  svg.replaceChildren(
    S("defs", {}, S("radialGradient", { id: "frg", cx: "50%", cy: "50%", r: "60%" }, S("stop", { offset: "0", "stop-color": "#143a2b" }), S("stop", { offset: "1", "stop-color": "#0a1a14" }))),
    S("rect", { width: 1000, height: 600, fill: "url(#frg)" }),
    ...[100, 200, 300, 400, 500, 600].map((r) => S("circle", { cx: 500, cy: 330, r, fill: "none", stroke: "#2fff8a", "stroke-opacity": ".12" })),
    ...[0, 1, 2, 3, 4, 5].map((i) => S("line", { x1: 500, y1: 330, x2: 500 + 700 * Math.cos(i * Math.PI / 3), y2: 330 + 700 * Math.sin(i * Math.PI / 3), stroke: "#2fff8a", "stroke-opacity": ".08" })));
  const sweep = S("g", { class: "fr-sweep" }, S("path", { d: "M500 330 L1200 330 A700 700 0 0 0 1105 -20 Z", fill: "#2fff8a", "fill-opacity": ".10" }));
  svg.append(sweep);
  // routes (one line per pair)
  const pairs = new Set();
  for (const f of ALL_FLIGHTS) for (let i = 0; i < f.stops.length - 1; i++) { const k = [f.stops[i][0], f.stops[i + 1][0]].sort().join("-"); pairs.add(k); }
  pairs.add("SIA-TDA"); pairs.add("SIA-FIA");
  for (const k of pairs) { const [a, b] = k.split("-"); if (POS[a] && POS[b]) svg.append(S("line", { x1: POS[a][0], y1: POS[a][1], x2: POS[b][0], y2: POS[b][1], stroke: "#2fff8a", "stroke-opacity": ".22", "stroke-dasharray": "4 6" })); }
  for (const [c, [x, y]] of Object.entries(POS)) svg.append(S("g", {}, S("circle", { cx: x, cy: y, r: 7, fill: "#0a1a14", stroke: "#2fff8a", "stroke-width": 2 }),
    S("text", { x: x + 12, y: y + 4, fill: "#b6ffd6", "font-size": 15, "font-family": "JetBrains Mono, monospace", "font-weight": 700 }, placeShort(c).replace("Scraggy House", "SCH"))));
  const planes = S("g", { id: "fr-planes" }); svg.append(planes);
  return planes;
}

const planeShape = (col) => S("path", { d: "M0 -13 L3 -3 L13 3 L13 6 L3 3 L2 10 L6 13 L6 15 L0 13.5 L-6 15 L-6 13 L-2 10 L-3 3 L-13 6 L-13 3 L-3 -3 Z", fill: col, stroke: "#fff", "stroke-width": 1 });

(async function main() {
  const svg = $("#fr-svg"), planesG = drawMap(svg);
  const slider = $("#fr-slider"), clock = $("#fr-clock"), info = $("#fr-info"), list = $("#fr-list"), count = $("#fr-count");
  let live = true, selected = null, legs = [], legDay = 0, busiest = 0;
  const nodes = new Map();

  const state = () => {
    const n = fiaMinutes();
    return { day: n.day, m: live ? n.m : +slider.value };
  };

  const sidebar = (p) => {
    if (!p) { info.replaceChildren(el("h3", { style: "margin-top:0" }, "Pick a plane"), el("p", { class: "note" }, "Click any plane on the map, or one in the list. Nothing will happen to it.")); return; }
    const l = p.leg, prog = Math.round(p.t * 100), alt = Math.round(Math.sin(Math.PI * p.t) * 31000 / 100) * 100;
    info.replaceChildren(
      el("p", { class: "eyebrow", style: "margin:0" }, AIRLINE_NAME[l.airline]),
      el("h3", { style: "margin:2px 0 8px" }, l.no),
      el("p", { style: "margin:0 0 8px" }, `${placeName(l.from)} → ${placeName(l.to)}`),
      el("dl", { class: "kv" },
        el("dt", {}, "Departed"), el("dd", {}, hhmm(l.dep)), el("dt", {}, "Arrives"), el("dd", {}, hhmm(l.arr) + " (we think)"),
        el("dt", {}, "Progress"), el("dd", {}, prog + "%"), el("dt", {}, "Altitude"), el("dd", {}, `${alt.toLocaleString("en-GB")} ft`),
        el("dt", {}, "Speed"), el("dd", {}, `${420 + (hash(l.no) % 90)} kt, ish`)),
      el("p", { class: "note" }, NOTES[hash(l.no) % NOTES.length]));
  };

  const frame = async () => {
    const { day, m } = state();
    if (day !== legDay) { legDay = day; legs = await legsFor(day); busiest = 0; let best = -1; for (let t = 0; t < 1440; t += 5) { const c = legs.filter((l) => t >= l.dep && t <= l.arr).length; if (c > best) { best = c; busiest = t; } } }
    clock.textContent = hhmm(m) + (live ? " · live" : "");
    if (live) slider.value = Math.floor(m);
    const air = legs.filter((l) => m >= l.dep && m <= l.arr).map((l) => ({ leg: l, t: (m - l.dep) / (l.arr - l.dep) }));
    // Thursday only: OA 014 is always circling FIA, in a warm welcome of cloud
    const thursday = day === 4;
    const seen = new Set();
    for (const p of air) {
      const id = p.leg.no + p.leg.from; seen.add(id);
      const [x1, y1] = POS[p.leg.from], [x2, y2] = POS[p.leg.to];
      const x = x1 + (x2 - x1) * p.t, y = y1 + (y2 - y1) * p.t, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 90;
      let n = nodes.get(id);
      if (!n) {
        n = S("g", { class: "fr-plane", tabindex: 0, role: "button", "aria-label": `${p.leg.no}, ${placeShort(p.leg.from)} to ${placeShort(p.leg.to)}` },
          S("circle", { r: 20, fill: "transparent" }), planeShape(COLOUR[p.leg.airline]), S("text", { y: 30, "text-anchor": "middle", fill: "#fff", "font-size": 12, "font-family": "JetBrains Mono, monospace" }, p.leg.no));
        const pick = () => { selected = id; sidebar(nodes.get(id)?.__p); frame(); };
        n.addEventListener("click", pick); n.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
        planesG.append(n); nodes.set(id, n);
      }
      n.__p = p;
      n.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      n.firstChild.nextSibling.setAttribute("transform", `rotate(${ang.toFixed(0)}) scale(1.5)`);
      n.classList.toggle("sel", selected === id);
    }
    let fire = nodes.get("OA 014");
    if (thursday) {
      const a = (Date.now() / 3000) % (2 * Math.PI), x = POS.FIA[0] + 60 * Math.cos(a), y = POS.FIA[1] + 40 * Math.sin(a);
      if (!fire) {
        fire = S("g", { class: "fr-plane", tabindex: 0, role: "button", "aria-label": "OA 014, in a warm welcome of cloud" },
          S("circle", { r: 26, fill: "#ff7a00", "fill-opacity": ".35", class: "fr-glow" }), S("circle", { r: 20, fill: "transparent" }), S("g", { transform: "scale(1.5)" }, planeShape(COLOUR.OA)), S("text", { y: 38, "text-anchor": "middle", fill: "#ffd9b0", "font-size": 12, "font-family": "JetBrains Mono, monospace" }, "OA 014"));
        const leg = { no: "OA 014", airline: "OA", from: "FIA", to: "FIA", dep: 0, arr: 1440 };
        fire.__p = { leg, t: 0.5 };
        const pick = () => { selected = "OA 014"; info.replaceChildren(el("p", { class: "eyebrow", style: "margin:0" }, "Octee Airlines"), el("h3", { style: "margin:2px 0 8px" }, "OA 014"),
          el("p", {}, "Climbing out of FIA on a normal Thursday. The glow is ambience. The cloud is weather. Everything is fine, and the captain would like to hear no more about it."),
          el("p", {}, el("a", { href: "normal-thursday.html" }, "Normal Thursday log, entry 1"), " · ", el("a", { href: "fia.html#safety" }, "Safety at FIA"))); frame(); };
        fire.addEventListener("click", pick); fire.addEventListener("keydown", (e) => { if (e.key === "Enter") pick(); });
        planesG.append(fire); nodes.set("OA 014", fire);
      }
      fire.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`); seen.add("OA 014");
      fire.classList.toggle("sel", selected === "OA 014");
    }
    for (const [id, n] of [...nodes]) if (!seen.has(id)) { n.remove(); nodes.delete(id); if (selected === id) { selected = null; sidebar(null); } }
    const rows = air.map((p) => p).sort((a, b) => a.leg.no.localeCompare(b.leg.no, "en", { numeric: true }));
    count.textContent = String(rows.length + (thursday ? 1 : 0));
    list.replaceChildren(...(thursday ? [{ leg: { no: "OA 014", airline: "OA", from: "FIA", to: "FIA" }, t: 0, special: true }] : []).concat(rows).map((p) => {
      const li = el("li", {}, el("button", { type: "button", class: "fr-row" + (selected === (p.special ? "OA 014" : p.leg.no + p.leg.from) ? " sel" : "") },
        el("span", { class: "fr-dot", style: `background:${COLOUR[p.leg.airline]}` }), el("strong", {}, p.leg.no), ` ${placeShort(p.leg.from)} → ${p.special ? "a warm welcome" : placeShort(p.leg.to)}`));
      li.firstChild.addEventListener("click", () => { const id = p.special ? "OA 014" : p.leg.no + p.leg.from; selected = id; const nd = nodes.get(id); if (!p.special) sidebar(nd?.__p || p); else nd?.dispatchEvent(new Event("click")); frame(); });
      return li;
    }));
    if (!rows.length && !thursday) list.replaceChildren(el("li", { class: "note" }, "No planes in the air. Everyone is on the ground, or lost. Try Busiest sky."));
    if (selected && nodes.get(selected)?.__p && selected !== "OA 014") sidebar(nodes.get(selected).__p);
  };

  slider.addEventListener("input", () => { live = false; frame(); });
  $("#fr-busy").addEventListener("click", () => { live = false; slider.value = busiest; frame(); });
  $("#fr-live").addEventListener("click", () => { live = true; frame(); });
  sidebar(null);
  await frame();
  setInterval(frame, 1000);
})();
