// FIA departures & arrivals for today (FIA time). Never "ON TIME".
import { $, el, pick } from "./dom.js";
import { OA_FLIGHTS, placeShort } from "./destinations.js";
import { scraggyData } from "./scraggy.js";
import { CONFIG } from "./config.js";

const STATUSES = ["DELAYED", "BOARDING (since Tuesday)", "ENGINES BEING CHECKED", "PILOT LOOKING FOR KEYS", "GATE CHANGED (again)",
  "WAITING FOR A PEANUT", "DELAYED (emotionally)", "BOARDING SOON-ISH", "LOOKING FOR THE PLANE", "DEPARTED (we think)"];

function fiaNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, weekday: "short" }).format(new Date());
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts) + 1;
}

async function build() {
  const day = fiaNow();
  const rows = [];
  for (const f of OA_FLIGHTS) {
    if (!f.days.includes(day)) continue;
    const i = f.stops.findIndex((s) => s[0] === "FIA");
    if (i < 0) continue;
    const later = f.stops.slice(i + 1).map((s) => placeShort(s[0]));
    const earlier = f.stops.slice(0, i).map((s) => placeShort(s[0]));
    if (f.stops[i][2]) rows.push({ no: f.no, where: later[later.length - 1] + (later.length > 1 ? " via " + later.slice(0, -1).join(", ") : ""), time: f.stops[i][2], kind: "Departure" });
    if (f.stops[i][1]) rows.push({ no: f.no, where: "Arriving from " + earlier[0] + (earlier.length > 1 ? " via " + earlier.slice(1).join(", ") : ""), time: f.stops[i][1], kind: "Arrival" });
  }
  const { routes } = await scraggyData();
  const fia = routes.find((r) => r.place === "FIA");
  if (fia) rows.push({ no: fia.inNo, where: "SIA (Scraggy Airlines)", time: fia.inDep, kind: "Departure" },
                     { no: fia.outNo, where: "Arriving from SIA (Scraggy Airlines)", time: fia.outArr, kind: "Arrival" });
  rows.sort((a, b) => a.time.localeCompare(b.time));
  rows.push({ no: "OA 404", where: "Not Found", time: "—", kind: "Departure", fixed: "LOST" });
  const body = $("#board-body");
  body.replaceChildren(...rows.map((r) => el("tr", {},
    el("td", {}, r.no), el("td", {}, r.where), el("td", {}, r.kind), el("td", {}, r.time),
    el("td", { class: "status" }, el("span", { class: "flip" }, r.fixed || pick(STATUSES))))));
  $("#board-day").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

function shuffle() {
  const cells = [...document.querySelectorAll("#board-body td.status")].slice(0, -1);
  if (!cells.length) return;
  const c = pick(cells);
  c.replaceChildren(el("span", { class: "flip" }, pick(STATUSES)));
}

build().then(() => setInterval(shuffle, 4000));
