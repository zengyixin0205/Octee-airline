import { $, el, niceDate, fmtMiles } from "./dom.js";
import { currentUser, requireLogin, logOut } from "./auth.js";
import { tierFor } from "./miles.js";
import { placeShort } from "./destinations.js";
import { passCard } from "./booking-data.js";
import { scraggyData } from "./scraggy.js";
import { load, save } from "./store.js";

if (requireLogin()) { render(null); scraggyData().then(render); }

function render(SA) {
  const u = currentUser();
  $("#profile").replaceChildren(
    el("dl", { class: "kv" },
      el("dt", {}, "Username"), el("dd", {}, u.username),
      el("dt", {}, "Member since"), el("dd", {}, niceDate(u.createdAt.slice(0, 10))),
      el("dt", {}, "Octmiles"), el("dd", {}, fmtMiles(u.octmiles), " (", el("a", { href: "octmiles.html" }, "details"), ")"),
      el("dt", {}, "Tier"), el("dd", {}, tierFor(u.lifetime).name)),
    el("p", { class: "note" }, "Your account lives in this browser only. Another device or browser won't know you. We won't either."));
  const trips = [...(u.trips || [])].reverse();
  const box = $("#trips");
  if (!trips.length) { box.replaceChildren(el("p", {}, "No trips yet. ", el("a", { href: "book.html" }, "Book a flight"), " (we will try).")); return; }
  box.replaceChildren(...trips.map((b) => el("details", { class: "card", style: "margin-bottom:12px" },
    el("summary", { style: "cursor:pointer" },
      el("strong", {}, `${placeShort(b.from)} → ${placeShort(b.to)}`), ` · ${niceDate(b.legs[0].date)} · ${b.legs.map((l) => l.no).join(", ")} · `,
      el("span", { class: "tag" }, b.ref), b.scraggyRef ? el("span", { class: "tag sa" }, b.scraggyRef) : ""),
    b.legs.map((l) => passCard(b, l, SA)))));
}

let armed = false;
$("#delete-account")?.addEventListener("click", (e) => {
  const u = currentUser();
  if (!u) return;
  if (!armed) {
    armed = true;
    e.target.textContent = "Click again to really delete (your Octmiles and trips will be lost, like your bags)";
    setTimeout(() => { armed = false; e.target.textContent = "Delete my account from this browser"; }, 6000);
    return;
  }
  const users = load("octee.users", {});
  delete users[u.username.toLowerCase()];
  save("octee.users", users);
  logOut();
  location.href = "index.html";
});
