// ONE UNITED page: timetable + live examples of connections with OA and SA.
import { $, el, niceDate, today, addDays } from "./dom.js";
import { OU_FLIGHTS, daysText, routeText, placeShort, placeName, itinerariesOn, describeItinerary } from "./destinations.js";
import { scraggyData } from "./scraggy.js";

$("#ou-timetable").replaceChildren(...OU_FLIGHTS.map((f) => el("tr", {},
  el("td", {}, el("strong", {}, f.no)), el("td", {}, routeText(f)), el("td", {}, daysText(f.days)),
  el("td", {}, f.stops.map((s, i) => `${placeShort(s[0])} ${[s[1], s[2]].filter(Boolean).join(" / ")}`).join(" → ")))));

// Find the next trip (in the coming 2 weeks) on each route that uses a One United flight AND another airline.
const ROUTES = [["SIA", "MIA"], ["FIA", "LUJ"], ["LIA", "SCH"], ["MIA", "LIA"], ["SCH", "LIA"], ["LUJ", "SCH"]];
scraggyData().then(({ routes }) => {
  const cards = [];
  for (const [from, to] of ROUTES) {
    let found = null;
    for (let i = 0; i < 14 && !found; i++) {
      const date = addDays(today(), i + 1);   // from tomorrow, so the flights have not left yet
      const it = itinerariesOn(from, to, date, routes).find((x) => x.some((s) => s.airline === "OU") && x.some((s) => s.airline !== "OU"));
      if (it) found = { date, it };
    }
    if (!found) continue;
    const bookable = from !== "LUJ";
    cards.push(el("article", { class: "card" },
      el("h3", {}, `${placeName(from)} → ${placeName(to)}`),
      el("p", { class: "note" }, `${niceDate(found.date)} · ${describeItinerary(found.it)}`),
      el("ul", { class: "legs" }, found.it.map((s) => el("li", { class: s.airline === "SA" ? "sa" : s.airline === "OU" ? "ou" : "" },
        el("strong", {}, s.no), ` ${placeShort(s.from)} ${s.dep} → ${placeShort(s.to)} ${s.arr} `,
        el("span", { class: "tag " + (s.airline === "SA" ? "sa" : s.airline === "OU" ? "ou" : "oa") }, s.airline === "SA" ? "Scraggy Airlines" : s.airline === "OU" ? "One United" : "Octee Airlines")))),
      bookable ? el("a", { class: "btn small", href: `book.html?from=${from}&to=${to}&date=${found.date}` }, "Book this trip") : ""));
  }
  $("#ou-connections").replaceChildren(...(cards.length ? cards : [el("p", { class: "note" }, "No connections found this fortnight. United, as ever.")]));
});
