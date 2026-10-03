// The Certificate of Delay: made from how late the tracker says your flight is. Print it, or screenshot it.
import { $, el, niceDate, today } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { placeShort, placeName } from "./destinations.js";
import { findLeg, legUrl, hash } from "./tripkit.js";
import { trackState, fmtLate, isLate } from "./delays.js";

const root = $("#certificate");

const PEANUT = `<svg class="cert-peanut" viewBox="0 0 150 190" role="img" aria-label="A peanut with a monocle, a moustache and a red bow tie, looking very official">
  <path d="M75 8c-26 0-42 17-42 38 0 12 5 20 11 26-9 7-17 18-17 34 0 27 20 48 48 48s48-21 48-48c0-16-8-27-17-34 6-6 11-14 11-26C117 25 101 8 75 8z" fill="#e5bd7f" stroke="#2b1a0e" stroke-width="4" stroke-linejoin="round"/>
  <path d="M42 73c10 6 22 8 33 8s23-2 33-8" fill="none" stroke="#2b1a0e" stroke-width="3" opacity=".35"/>
  <g fill="#b98a4c" opacity=".75"><circle cx="46" cy="120" r="2.4"/><circle cx="60" cy="140" r="2.4"/><circle cx="92" cy="128" r="2.4"/><circle cx="104" cy="108" r="2.4"/><circle cx="76" cy="150" r="2.4"/><circle cx="56" cy="104" r="2.4"/><circle cx="96" cy="152" r="2.4"/></g>
  <circle cx="60" cy="44" r="4" fill="#2b1a0e"/><circle cx="92" cy="44" r="4" fill="#2b1a0e"/>
  <circle cx="92" cy="44" r="12" fill="#fff" fill-opacity=".35" stroke="#b8860b" stroke-width="3"/>
  <path d="M104 48c10 6 12 18 8 30" fill="none" stroke="#b8860b" stroke-width="2"/>
  <path d="M58 62c6-6 12-5 18 0 6-5 12-6 18 0-6 8-12 8-18 3-6 5-12 5-18-3z" fill="#2b1a0e"/>
  <path d="M66 74c6 5 14 5 20 0" fill="none" stroke="#2b1a0e" stroke-width="3" stroke-linecap="round"/>
  <path d="M75 92l-22-12v26z M75 92l22-12v26z" fill="#b3261e" stroke="#2b1a0e" stroke-width="3" stroke-linejoin="round"/>
  <rect x="68" y="86" width="14" height="14" rx="3" fill="#8f1d17" stroke="#2b1a0e" stroke-width="3"/>
</svg>`;

const SEAL = `<svg class="cert-seal" viewBox="0 0 140 140" role="img" aria-label="Official seal: very official">
  <defs><path id="sealpath" d="M70 70 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs>
  <circle cx="70" cy="70" r="66" fill="#fff6d6" stroke="#b3261e" stroke-width="5"/>
  <circle cx="70" cy="70" r="58" fill="none" stroke="#b3261e" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text font-family="Inter, sans-serif" font-size="9.5" font-weight="800" letter-spacing="1.6" fill="#b3261e"><textPath href="#sealpath" startOffset="0">OFFICIAL SEAL · OCTEE DELAY DIVISION ·</textPath></text>
  <polygon transform="translate(70 62) scale(.72) translate(-70 -66)" points="70,40 77,59 98,60 82,72 88,92 70,81 52,92 58,72 42,60 63,59" fill="#b3261e"/>
  <text x="70" y="96" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="800" fill="#b3261e">VERY OFFICIAL</text>
</svg>`;

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
      el("a", { class: "btn ghost", href: "complaint.html" }, "Complain about it")),
    el("p", { class: "note no-print" }, ts.over ? "" : "The delay is still growing. Come back later for a bigger number."));
}

if (requireLogin()) show();
