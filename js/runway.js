// FIA weather and runway board. Ties in with the tracker: your late flights say what the weather did to them.
import { $, el, niceDate } from "./dom.js";
import { currentUser } from "./auth.js";
import { placeShort } from "./destinations.js";
import { legUrl } from "./tripkit.js";
import { fiaWeather, SLOT_MS } from "./weather.js";
import { trackState, fmtLate, isLate } from "./delays.js";

const root = $("#wx");
const clock = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

function lateFlights() {
  const u = currentUser();
  const out = [];
  (u?.trips || []).forEach((b) => b.legs.forEach((l, i) => { const ts = trackState(b, i); if (ts && isLate(ts.stage) && !ts.over) out.push({ b, l, i, ts }); }));
  return out;
}

function draw() {
  const w = fiaWeather();
  const next = SLOT_MS - (Date.now() % SLOT_MS);
  const late = lateFlights();
  root.replaceChildren(
    el("div", { class: "wx-grid" },
      el("div", { class: "card wx-card" },
        el("p", { class: "note", style: "margin:0" }, "Weather at FIA"),
        el("p", { class: "wx-big" }, w.sky),
        el("dl", { class: "kv" },
          el("dt", {}, "Temperature"), el("dd", {}, `${w.temp}°C (indoors, probably)`),
          el("dt", {}, "Wind"), el("dd", {}, w.wind),
          el("dt", {}, "Visibility"), el("dd", {}, w.vis),
          el("dt", {}, "Airport mood"), el("dd", {}, w.mood))),
      el("div", { class: "card wx-card" },
        el("p", { class: "note", style: "margin:0" }, "Runways"),
        ...w.runways.map((r) => el("div", { class: "wx-runway" }, el("strong", {}, r.id), el("span", { class: "tag" + (/^CLOSED/.test(r.status) ? " wx-closed" : "") }, r.status))),
        el("p", { class: "note" }, `Next update in about ${Math.ceil(next / 60000)} minute${Math.ceil(next / 60000) === 1 ? "" : "s"}. Last checked ${clock()}.`))),
    el("h2", {}, "Runway activity"),
    el("ul", { class: "wx-moves" }, w.moves.map((m) => el("li", {}, m))),
    el("h2", {}, "Your flights"),
    ...(late.length
      ? late.map(({ b, l, i, ts }) => el("div", { class: "card flight-row" },
          el("div", {}, el("strong", {}, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`), el("p", { class: "note", style: "margin:2px 0" }, `${niceDate(l.date)} · ${fmtLate(ts.stage)} late`),
            el("p", { style: "margin:2px 0" }, w.reason + ".")),
          el("a", { class: "btn small", href: legUrl("track.html", b, i) }, "Track")))
      : [el("p", { class: "note" }, currentUser() ? "None of your flights is late yet, so the weather has nothing to blame. Give it a minute." : "Log in to see which of your flights the weather has ruined.")]));
}
draw();
setInterval(draw, 10000);
