// A printable, fold-in-half safety card using the same six cards as the demo.
import { $, el } from "./dom.js";
import { CARDS } from "./safetydata.js";

const root = $("#app");
const panel = (c) => { const d = el("div", { class: "sc-panel" }, el("h3", {}, c.title)); const a = el("div", { class: "sc-art" }); a.innerHTML = c.art; d.append(a, el("p", {}, c.text)); return d; };
root.replaceChildren(
  el("div", { class: "actions no-print" }, el("button", { class: "btn", type: "button", onclick: () => window.print() }, "Print my safety card"),
    el("a", { class: "btn ghost", href: "safety.html" }, "Watch the demo instead")),
  el("p", { class: "note no-print" }, "Print on A4, landscape, backgrounds on. Fold along the dotted line. The seat pocket is optional."),
  el("div", { class: "sc-sheet" },
    el("div", { class: "sc-head" }, el("strong", {}, "OCTEE AIRLINES"), " · SAFETY ON BOARD · Please read this card. Then read it again. Then believe."),
    el("div", { class: "sc-grid" }, ...CARDS.map(panel)),
    el("div", { class: "sc-foot" }, "In an emergency: lean forward, hold your peanut, and wait for Joel. This card has no buckle either.")));
