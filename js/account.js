import { $, el, niceDate, fmtMiles, setMsg } from "./dom.js";
import { currentUser, requireLogin, logOut, updateUser, etchedInfo } from "./auth.js";
import { tierFor, spendTokens, tokensOf, scraggyOf, sharedScraggy } from "./miles.js";
import { placeShort } from "./destinations.js";
import { passCard, OA_CLASSES, classTokens } from "./booking-data.js";
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
      el("dt", {}, "Octeetokens"), el("dd", {}, fmtMiles(tokensOf(u)), " (", el("a", { href: "octmiles.html#tokens" }, "get more"), ")"),
      el("dt", {}, "Scraggymiles"), el("dd", {}, fmtMiles(scraggyOf(u) + sharedScraggy(u)), sharedScraggy(u) ? ` (${fmtMiles(sharedScraggy(u))} shared with Scraggy Airlines)` : "", " (", el("a", { href: "octmiles.html#scraggymiles" }, "exchange or share"), ")"),
      el("dt", {}, "Tier"), el("dd", {}, tierFor(u.lifetime).name)),
    el("p", { class: "note", id: "where-note" }, "Your account lives in this browser only. Another device or browser won't know you. We won't either."));
  etchedInfo(u.username).then((info) => {
    const note = $("#where-note");
    if (info && note) note.textContent = `This account is etched in the code${info.etchedAt ? " (saved " + niceDate(info.etchedAt.slice(0, 10)) + ")" : ""}, so you can log in on any device. Anything earned after that date stays on this device until the airline saves it again.`;
  });
  const trips = [...(u.trips || [])].reverse();
  const box = $("#trips");
  if (!trips.length) { box.replaceChildren(el("p", {}, "No trips yet. ", el("a", { href: "book.html" }, "Book a flight"), " (we will try).")); return; }
  box.replaceChildren(...trips.map((b) => el("details", { class: "card", style: "margin-bottom:12px" },
    el("summary", { style: "cursor:pointer" },
      el("strong", {}, `${placeShort(b.from)} → ${placeShort(b.to)}`), ` · ${niceDate(b.legs[0].date)} · ${b.legs.map((l) => l.no).join(", ")} · `,
      el("span", { class: "tag" }, b.ref), b.scraggyRef ? el("span", { class: "tag sa" }, b.scraggyRef) : ""),
    upgradeBox(b, SA),
    b.legs.map((l) => passCard(b, l, SA)))));
}

// Pay Octeetokens to move a booking's Octee / One United flights up a class.
function upgradeBox(b, SA) {
  const mine = b.legs.filter((l) => l.airline === "OA");
  if (!mine.length) return "";
  const now = mine[0].travelClass;
  const better = OA_CLASSES.filter((c) => c.tokens > classTokens(now));
  if (!better.length) return el("p", { class: "note" }, "Class: Octee First. There is nothing higher. We checked.");
  const msg = el("p", { class: "msg", role: "status" });
  return el("div", { class: "upgrade" },
    el("p", { style: "margin:.6em 0 .3em" }, el("strong", {}, "Upgrade class"), ` (now ${OA_CLASSES.find((c) => c.id === now)?.name || "Octee Economy"}):`),
    el("div", { class: "actions" }, better.map((c) => {
      const cost = c.tokens - classTokens(now);
      return el("button", { class: "btn small secondary", type: "button", onclick: () => {
        try {
          updateUser((u) => {
            const trip = u.trips.find((t) => t.ref === b.ref && t.createdAt === b.createdAt);
            if (!trip) throw new Error("We lost this booking. Sorry.");
            spendTokens(u, cost, `Upgrade to ${c.name} (${b.ref})`);
            trip.legs.forEach((l) => { if (l.airline === "OA") l.travelClass = c.id; });
          });
          render(SA);
        } catch (e) { setMsg(msg, e.message, "error"); }
      } }, `${c.name} · ${cost} Octeetokens`);
    })), msg);
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
