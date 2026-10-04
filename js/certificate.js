// The Certificate of Delay: made from how late the tracker says your flight is. Print it, or screenshot it.
import { $, el, niceDate, today } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { placeShort, placeName } from "./destinations.js";
import { findLeg, legUrl, hash } from "./tripkit.js";
import { trackState, fmtLate, isLate } from "./delays.js";
import { PEANUT, SEAL } from "./peanutart.js";

const root = $("#certificate");

function show() {
  const found = findLeg(currentUser());
  if (!found) {
    root.replaceChildren(el("div", { class: "card" }, el("p", {}, "We could not find that flight, so we cannot say how late it is. (Late. It is late.)"),
      el("div", { class: "actions" }, el("a", { class: "btn", href: "track.html" }, "Track a flight"))));
    return;
  }
  const { b, l, i } = found;
  const ts = trackState(b, i);
  if (!ts || !isLate(ts.stage)) {
    root.replaceChildren(el("section", { class: "hero" }, el("p", { class: "eyebrow" }, "Certificate of Delay · Not yet"), el("h1", { class: "headline" }, "NOT DELAYED YET", el("span", { class: "punch long" }, "give it a minute"))),
      el("div", { class: "card" }, el("p", {}, `Flight ${l.no} has not been delayed yet, so there is nothing to certify. Delays take a little time. Open the tracker and wait. It will not take long, and then it will take much longer.`),
        el("div", { class: "actions" }, el("a", { class: "btn", href: legUrl("track.html", b, i) }, "Track my flight"))));
    return;
  }
  const serial = "CD-" + String(hash(`${b.ref}|${i}`) % 9000 + 1000);
  const who = b.names.length > 1 ? b.names.slice(0, -1).join(", ") + " and " + b.names[b.names.length - 1] : b.names[0];
  const paper = el("article", { class: "cert", "aria-label": "Certificate of Delay" });
  paper.innerHTML = "";
  paper.append(
    el("p", { class: "cert-org" }, "OCTEE AIRLINES · OFFICIAL DELAY DIVISION"),
    el("h1", { class: "cert-title" }, "Certificate of Delay"),
    el("p", { class: "cert-line" }, "This is to certify that"),
    el("p", { class: "cert-name" }, who),
    el("p", { class: "cert-line" }, `was delayed on flight ${l.no} from ${placeName(l.from)} (${placeShort(l.from)}) to ${placeName(l.to)} (${placeShort(l.to)}), on ${niceDate(l.date)}, by`),
    el("p", { class: "cert-delay" }, fmtLate(ts.stage), ts.over ? "" : el("small", {}, " and counting")),
    el("p", { class: "cert-line" }, "Reason given: ", el("em", {}, ts.status.toLowerCase()), "."),
    el("div", { class: "cert-foot" },
      el("div", { class: "cert-sign" }, el("div", { class: "cert-sig-art" }), el("p", { class: "cert-sig" }, "P. Nut"), el("p", { class: "cert-small" }, "Sir Peanuel Nut, Chief Delay Officer")),
      el("div", { class: "cert-seal-box" }),
      el("div", { class: "cert-meta" }, el("p", {}, el("strong", {}, "Certificate no. "), serial), el("p", {}, el("strong", {}, "Issued "), niceDate(today())), el("p", { class: "cert-small" }, "Valid for nothing. Not valid anywhere. Please do not frame."))));
  paper.querySelector(".cert-sig-art").innerHTML = PEANUT;
  paper.querySelector(".cert-seal-box").innerHTML = SEAL;
  const sheet = document.createElement("style");
  sheet.textContent = "@page { size: landscape; margin: 10mm; }";
  document.head.append(sheet);
  root.replaceChildren(paper,
    el("div", { class: "actions no-print" },
      el("button", { class: "btn", type: "button", onclick: () => window.print() }, "Print"),
      el("a", { class: "btn secondary", href: legUrl("track.html", b, i) }, "Back to the tracker"),
      el("a", { class: "btn ghost", href: legUrl("share.html", b, i) }, "Share my trip"),
      el("a", { class: "btn ghost", href: "complaint.html" }, "Complain about it")),
    el("p", { class: "note no-print" }, ts.over ? "" : "The delay is still growing. Come back later for a bigger number."));
}

if (requireLogin()) show();
