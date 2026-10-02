import { $, el } from "./dom.js";
import { mountSearchBox, renderResults } from "./search.js";
import { ALL_FLIGHTS, daysText } from "./destinations.js";
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
  const partners = routes.filter((r) => r.place === "MWW" || r.place === "LUJ");
  box.replaceChildren(...partners.map((r) => el("article", { class: "card" },
    el("h3", {}, r.name, " ", el("span", { class: "tag sa" }, "Scraggy Airlines")),
    el("p", {}, r.blurb || ""),
    el("p", {}, el("span", { class: "tag sa" }, `${r.outNo} SIA ${r.outDep} → ${r.outArr}`), el("span", { class: "tag sa" }, `${r.inNo} back ${r.inDep}`), el("span", { class: "tag" }, "Gate " + r.gate)),
    el("a", { class: "btn small", href: `book.html?from=FIA&to=${r.place}` }, "Book transfer (2 forms)"))));
  $("#scraggy-source").textContent = source === "live" ? "Scraggy flight data: live from the Scraggy Airlines site." : "Scraggy flight data: saved copy (the live Scraggy site couldn't be reached or is older).";
});
