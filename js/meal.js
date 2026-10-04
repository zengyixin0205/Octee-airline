// In-flight meal pre-order. You may choose any dish. The meal is a peanut.
import { $, el, niceDate, setMsg } from "./dom.js";
import { currentUser, requireLogin, updateUser } from "./auth.js";
import { placeShort } from "./destinations.js";
import { tripId, findLeg, hash } from "./tripkit.js";

const root = $("#app");
const DISHES = [
  ["plain", "Peanut", "One peanut, plain. A classic. Some say the first."],
  ["warm", "Peanut, but warm", "It spent four seconds near a toaster."],
  ["fuji", "Peanut à la Fuji", "Served with a view of a photo of a mountain."],
  ["surprise", "Peanut Surprise", "The surprise is that it is a peanut."],
  ["veg", "Vegetarian Peanut", "No animals were harmed. The peanut was a plant."],
  ["vegan", "Vegan Peanut", "The same peanut. It would like you to know it is vegan."],
  ["gf", "Gluten-free Peanut", "It was never near gluten. It has met a sandwich once."],
  ["kids", "Little Peanut (for children)", "Smaller. Also a peanut. Also not for children, spiritually."],
  ["chef", "The Chef's Special", "The chef is Joel. Joel says it is a peanut. Joel is a joel."]
];
const dish = (id) => DISHES.find((d) => d[0] === id) || DISHES[0];

function chooser() {
  const u = currentUser();
  const rows = [];
  (u.trips || []).forEach((b) => b.legs.forEach((l, i) => rows.push({ b, l, i })));
  rows.sort((a, b) => a.l.date.localeCompare(b.l.date) || a.l.dep.localeCompare(b.l.dep));
  if (!rows.length) { root.replaceChildren(el("div", { class: "card" }, el("p", {}, "You have no flights, so nothing to eat on. Book one. We will bring a peanut."), el("a", { class: "btn", href: "book.html" }, "Book a flight"))); return; }
  root.replaceChildren(el("h2", {}, "Which flight is the meal for?"),
    ...rows.map(({ b, l, i }) => el("div", { class: "card flight-row" },
      el("div", {}, el("strong", {}, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`), el("p", { class: "note", style: "margin:2px 0 0" }, `${niceDate(l.date)} · departs ${l.dep}${l.meals ? " · meal ordered" : ""}`)),
      el("a", { class: "btn small", href: `meal.html?t=${tripId(b)}&leg=${i}` }, l.meals ? "See / change order" : "Choose a meal"))));
}

function order({ b, l, i }) {
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const receipt = el("div", { id: "receipt" });
  const picks = b.names.map((name, p) => {
    const sel = el("select", { id: "dish-" + p, "aria-label": `Dish for ${name}` }, DISHES.map(([id, label]) => el("option", { value: id }, label)));
    if (l.meals?.orders?.[p]) sel.value = l.meals.orders[p].dish;
    const blurb = el("p", { class: "note", style: "margin:2px 0 0" }, dish(sel.value)[2]);
    sel.addEventListener("change", () => (blurb.textContent = dish(sel.value)[2]));
    return { name, sel, field: el("div", { class: "field" }, el("label", { for: "dish-" + p }, name), sel, blurb) };
  });
  const note = el("textarea", { id: "meal-note", rows: "2", maxlength: "120", placeholder: "Allergies, requests, feelings (we will write: peanut)" });
  if (l.meals?.note) note.value = l.meals.note;

  function paintReceipt(m) {
    receipt.replaceChildren(el("article", { class: "card mail" },
      el("h3", { style: "margin-top:0" }, `Order ${m.ticket} confirmed`),
      el("table", { class: "plain" }, el("thead", {}, el("tr", {}, el("th", {}, "Passenger"), el("th", {}, "You ordered"), el("th", {}, "You will get"))),
        el("tbody", {}, m.orders.map((o) => el("tr", {}, el("td", {}, o.name), el("td", {}, dish(o.dish)[1]), el("td", {}, el("strong", {}, "A peanut")))))),
      m.note ? el("p", { class: "note quote" }, `Your request: “${m.note}”. Noted. Peanut.`) : "",
      el("p", {}, `Your meal for ${l.no} will be served in flight. If the flight does not fly, it will be served on the ground, to the plane.`),
      el("div", { class: "actions" }, el("a", { class: "btn small ghost", href: `track.html?t=${tripId(b)}&leg=${i}` }, "Track my flight"), el("a", { class: "btn small ghost", href: "meal.html" }, "Another flight"))));
  }
  if (l.meals) paintReceipt(l.meals);

  const form = el("form", { class: "card" },
    el("h2", { style: "margin-top:0" }, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)} · ${niceDate(l.date)}`),
    ...picks.map((p) => p.field),
    el("div", { class: "field" }, el("label", { for: "meal-note" }, "Special requests"), note),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, l.meals ? "Change my order" : "Place my order")),
    msg);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const m = { ticket: "MEAL-" + String(hash(`${b.ref}|${i}|${Date.now()}`) % 9000 + 1000), at: new Date().toISOString(), note: note.value.trim(), orders: picks.map((p) => ({ name: p.name, dish: p.sel.value })) };
    updateUser((x) => { const tr = (x.trips || []).find((t) => tripId(t) === tripId(b)); if (tr && tr.legs[i]) tr.legs[i].meals = m; });
    l.meals = m;
    paintReceipt(m);
    setMsg(msg, "Order placed. The answer was always going to be peanut.", "ok");
    receipt.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  root.replaceChildren(form, receipt, el("p", { class: "note" }, "Every dish on this menu is a peanut. They only have different names. We are sorry about that. We are very sorry."));
}

if (requireLogin()) { const f = findLeg(currentUser()); f ? order(f) : chooser(); }
