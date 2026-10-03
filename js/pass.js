// Boarding pass page: one pass per passenger for one flight. Print it (or don't).
import { $, el } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { findLeg, legUrl, isCheckedIn } from "./tripkit.js";
import { boardingPass } from "./boardingpass.js";
import { scraggyData } from "./scraggy.js";

const root = $("#pass");

if (requireLogin()) scraggyData().then(show, () => show(null));

function show(SA) {
  const found = findLeg(currentUser());
  if (!found) {
    root.replaceChildren(el("div", { class: "card" }, el("p", {}, "We could not find that flight. It may have been in the lost and found since Tuesday."),
      el("div", { class: "actions" }, el("a", { class: "btn", href: "checkin.html" }, "Check in"), el("a", { class: "btn secondary", href: "account.html" }, "My trips"))));
    return;
  }
  const { b, l, i } = found;
  if (!isCheckedIn(l)) {
    root.replaceChildren(el("div", { class: "card" }, el("h2", {}, "Check in first"),
      el("p", {}, `Flight ${l.no} has no seats yet, so there is nothing to print. Pick your seat and the pass appears.`),
      el("div", { class: "actions" }, el("a", { class: "btn", href: legUrl("checkin.html", b, i) }, "Check in"))));
    return;
  }
  root.replaceChildren(
    ...b.names.map((_, p) => boardingPass(b, l, i, p, SA)),
    el("div", { class: "actions no-print" },
      el("button", { class: "btn", type: "button", onclick: () => window.print() }, "Print"),
      el("a", { class: "btn secondary", href: legUrl("track.html", b, i) }, "Track my flight"),
      el("a", { class: "btn ghost", href: legUrl("checkin.html", b, i) }, "Change seats"),
      el("a", { class: "btn ghost", href: "account.html" }, "My trips")),
    el("p", { class: "note no-print" }, "The barcode is made up. It does not scan. The gate agent will let you through anyway, or not."));
}
