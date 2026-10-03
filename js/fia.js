import { $, el } from "./dom.js";
import { currentUser } from "./auth.js";

// "Name a gate" reward shows on the map (in this browser)
const u = currentUser();
if (u && (u.redemptions || []).some((r) => r.id === "name-gate")) {
  $("#named-gate").textContent = `Gate A17 is now called "The ${u.username} Gate". Nobody can find it either.`;
}

// Gate sign: today's departures from FIA with their gates (same gates the booking gives you)
import { ALL_FLIGHTS, placeShort, fiaGate, fiaTerminalOf } from "./destinations.js";
import { scraggyData } from "./scraggy.js";
import { CONFIG } from "./config.js";

async function gateSign() {
  const body = $("#gate-body");
  if (!body) return;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, weekday: "short" }).format(new Date());
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts) + 1;
  const rows = [];
  for (const f of ALL_FLIGHTS) {
    if (!f.days.includes(day)) continue;
    const i = f.stops.findIndex((s) => s[0] === "FIA");
    if (i < 0 || !f.stops[i][2]) continue;
    const later = f.stops.slice(i + 1).map((s) => placeShort(s[0]));
    const gate = fiaGate(f.airline, f.no);
    rows.push({ no: f.no, where: (f.airline === "OU" ? "[One United] " : "") + later[later.length - 1] + (later.length > 1 ? " via " + later.slice(0, -1).join(", ") : ""), time: f.stops[i][2], gate, term: fiaTerminalOf(gate) });
  }
  try {
    const { routes } = await scraggyData();
    const r = routes.find((x) => x.place === "FIA");
    if (r) rows.push({ no: r.inNo, where: "SIA (Scraggy Airlines)", time: r.inDep, gate: r.gate, term: fiaTerminalOf(r.gate) });
  } catch { /* Scraggy data not reachable: the sign just leaves them out */ }
  rows.sort((a, b) => a.time.localeCompare(b.time));
  body.replaceChildren(...rows.map((r) => el("tr", {},
    el("td", {}, r.no), el("td", {}, r.where), el("td", {}, r.time),
    el("td", {}, r.term ? "T" + r.term : "—"), el("td", { class: "gate-cell" }, el("span", { class: "gate-tag" }, r.gate || "?")))));
  $("#gate-day").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, weekday: "long" }).format(new Date());
}
gateSign();

// Click (or press Enter on) a map to see it big.
document.querySelectorAll(".map-row .map-scroll").forEach((box) => {
  const open = () => {
    const svg = box.querySelector("svg").cloneNode(true);
    svg.removeAttribute("aria-labelledby"); svg.setAttribute("aria-hidden", "true");
    const close = el("button", { class: "btn zoom-close", type: "button" }, "Close");
    const back = el("div", { class: "map-zoom", role: "dialog", "aria-modal": "true", "aria-label": box.getAttribute("aria-label") || "Map" },
      el("div", { class: "zoom-box" }, svg));
    const done = () => { back.remove(); close.remove(); document.removeEventListener("keydown", onKey); box.focus(); };
    const onKey = (e) => { if (e.key === "Escape") done(); };
    close.addEventListener("click", done);
    back.addEventListener("click", (e) => { if (e.target === back) done(); });
    document.addEventListener("keydown", onKey);
    document.body.append(back, close);
    close.focus();
  };
  box.addEventListener("click", open);
  box.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
});
