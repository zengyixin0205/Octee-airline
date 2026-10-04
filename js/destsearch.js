// Destination search box (Home + Destinations). Lives in destsearch.js; search.js re-exports it.
import { $, el, niceDate, today } from "./dom.js";
import { PLACES, OA_PLACES, matchPlace, placeName, placeShort, itinerariesOn, nextDates, describeItinerary, ALL_FLIGHTS, daysText, routeText } from "./destinations.js";
import { scraggyData } from "./scraggy.js";

export function mountSearchBox(holder, { onSearch, from = "FIA", query = "" } = {}) {
  const listId = "dest-suggestions";
  const input = el("input", { type: "search", id: "dest-q", name: "q", value: query, autocomplete: "off",
    placeholder: "Where do you want to go? (We may take you there.)", role: "combobox",
    "aria-expanded": "false", "aria-controls": listId, "aria-autocomplete": "list" });
  const fromSel = el("select", { id: "dest-from", name: "from" }, OA_PLACES.map((c) => el("option", { value: c, selected: c === from }, placeName(c))));
  const list = el("ul", { class: "suggestions", id: listId, role: "listbox", hidden: true });
  let active = -1, items = [];
  const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; };
  const choose = (code) => { input.value = placeName(code); close(); onSearch(input.value, fromSel.value); };
  const render = () => {
    items = matchPlace(input.value);
    list.replaceChildren(...items.map((c, k) => el("li", { id: "sug-" + c, role: "option", "aria-selected": String(k === active),
      onmousedown: (e) => { e.preventDefault(); choose(c); } }, placeName(c), PLACES[c].oa ? "" : " (via Scraggy Airlines)")));
    const open = items.length > 0 && input.value.trim().length > 0;
    list.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
    if (active >= 0 && items[active]) input.setAttribute("aria-activedescendant", "sug-" + items[active]);
  };
  input.addEventListener("input", () => { active = -1; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
    else if (e.key === "Escape") close();
    else if (e.key === "Enter" && active >= 0 && items[active]) { e.preventDefault(); choose(items[active]); }
  });
  input.addEventListener("blur", () => setTimeout(close, 120));
  const form = el("form", { class: "search-box", role: "search" },
    el("div", { class: "field grow" }, el("label", { for: "dest-q" }, "Where to?"), input, list),
    el("div", { class: "field" }, el("label", { for: "dest-from" }, "Flying from"), fromSel),
    el("button", { class: "btn", type: "submit" }, "Search"));
  form.addEventListener("submit", (e) => { e.preventDefault(); close(); onSearch(input.value, fromSel.value); });
  holder.append(form);
  return { input, fromSel };
}

const legLine = (s) => el("li", { class: s.airline === "SA" ? "sa" : s.airline === "OU" ? "ou" : "" },
  el("strong", {}, s.no), ` ${placeShort(s.from)} ${s.dep} → ${placeShort(s.to)} ${s.arr}`,
  s.via.length ? ` (stops at ${s.via.map(placeShort).join(", ")}; stay on board)` : "",
  s.airline === "OA" ? el("span", { class: "tag oa" }, "Octee") : "",
  s.airline === "OU" ? el("span", { class: "tag ou" }, "One United") : "",
  s.airline === "SA" ? el("span", { class: "tag sa" }, `Scraggy Airlines · gate ${s.gate}`) : "");

function itineraryList(it) {
  const items = [];
  it.forEach((s, k) => {
    if (k > 0) {
      const wait = (+s.dep.slice(0, 2) * 60 + +s.dep.slice(3)) - (+it[k - 1].arr.slice(0, 2) * 60 + +it[k - 1].arr.slice(3));
      items.push(el("li", { class: "change" }, `Change planes at ${placeName(s.from)} · ${wait} minutes `, el("em", {}, "(or 3 days)")));
    }
    items.push(legLine(s));
  });
  return el("ul", { class: "legs" }, items);
}

export async function renderResults(box, query, from) {
  const { routes } = await scraggyData();
  const codes = matchPlace(query);
  box.replaceChildren();
  if (!query.trim()) return;
  if (!codes.length) {
    box.append(el("article", { class: "card result none" },
      el("h3", {}, `No flights to "${query}". Not even eventually.`),
      el("p", {}, "Places we (sort of) fly to:"),
      el("div", { class: "actions" }, Object.keys(PLACES).map((c) => el("a", { class: "btn small ghost", href: `destinations.html?q=${encodeURIComponent(placeName(c))}&from=${from}` }, placeName(c))))));
    return;
  }
  const to = codes[0];
  if (to === from) {
    box.append(el("article", { class: "card result" },
      el("h3", {}, `You are already at ${placeName(to)}. Probably.`),
      el("p", {}, "Try asking the ", el("a", { href: "joelmobile.html" }, "JOELMOBILE"), ".")));
    return;
  }
  const upcoming = nextDates(from, to, routes, today(), 4);
  if (!upcoming.length) {
    box.append(el("article", { class: "card result none" }, el("h3", {}, `No way to get from ${placeName(from)} to ${placeName(to)} in the next 3 weeks.`), el("p", {}, "Not even eventually.")));
    return;
  }
  const hasSA = upcoming.some((u) => u.it.some((s) => s.airline === "SA"));
  const direct = upcoming[0].it.length === 1;
  const title = !PLACES[to].oa ? `🔁 Transfer flight — only Scraggy Airlines flies to ${placeName(to)}.`
    : direct ? `✈ ${placeName(from)} → ${placeName(to)}` : `🔁 ${placeName(from)} → ${placeName(to)} with a change`;
  const card = el("article", { class: "card result" + (hasSA ? " transfer" : "") }, el("h3", {}, title));
  for (const u of upcoming) {
    card.append(el("p", { style: "margin:.6em 0 0" }, el("strong", {}, niceDate(u.date)), " · ", describeItinerary(u.it)), itineraryList(u.it));
  }
  if (hasSA) card.append(el("p", { class: "note" }, "Flights marked Scraggy Airlines are booked with a second form (the SIA form). Octmiles are only earned on OA flights."));
  card.append(el("div", { class: "actions" },
    el("a", { class: "btn", href: `book.html?from=${from}&to=${to}&date=${upcoming[0].date}` }, hasSA ? "Book (2 forms)" : "Book this flight")));
  // OA-only places: show which days Octee flies there
  if (PLACES[to].oa && from === "FIA") {
    const flights = ALL_FLIGHTS.filter((f) => f.stops.some((s, i) => s[0] === "FIA" && f.stops.slice(i + 1).some((x) => x[0] === to)));
    card.append(el("p", { class: "note" }, "Flights from FIA (OA = Octee, OU = One United): ", flights.map((f) => `${f.no} (${daysText(f.days)}, ${routeText(f)})`).join(" · ")));
  }
  box.append(card);
  if (to === "SCH") box.append(el("p", { class: "note" }, "Also possible any day: OA 58 to SIA, then SA101 to Scraggy House (if you enjoy airports)."));
}

export function goSearch(query, from) {
  location.href = `destinations.html?q=${encodeURIComponent(query)}&from=${from}`;
}
