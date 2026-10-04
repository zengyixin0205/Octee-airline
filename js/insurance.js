// Octee Insurance: insures anything against everything except what actually happens. Claims are always rejected.
import { $, el, setMsg } from "./dom.js";
import { currentUser } from "./auth.js";
import { load, save } from "./store.js";

const root = $("#app");
const KEY = "octee.insurance";
const owner = () => { const u = currentUser(); return u ? u.username : "guest"; };
const all = () => load(KEY, {});
const PERILS = ["Falling peanuts", "Spontaneous sandwiches", "Being Tuesday", "Cloud envy", "Joel finding out", "Sudden mild inconvenience", "Overly confident pigeons", "The idea of turbulence"];
const REJECT = ["Claim rejected: what you describe actually happened. That is excluded.", "Claim rejected: it was not one of the things we insured. Please see the list. The list was short.",
  "Claim rejected: this is a real loss. We only insure imaginary ones.", "Claim rejected: the thing you feared did not occur. The thing that occurred is excluded.", "Claim rejected: reason withheld, and also excluded."];
let n = 0;
const num = () => "OI-" + String(Math.floor(Math.random() * 9000) + 1000);

function form() {
  const what = el("input", { type: "text", required: true, maxlength: "40", id: "in-what", placeholder: "Your suitcase, your seat, Joel..." });
  const val = el("input", { type: "number", min: "1", step: "1", value: "10", id: "in-val", style: "width:7em" });
  const boxes = PERILS.map((p, i) => el("label", { class: "quiz-opt" }, el("input", { type: "checkbox", value: p, checked: i < 3 ? true : null }), " " + p));
  const out = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const f = el("form", { class: "card" }, el("h2", { style: "margin-top:0" }, "Insure something"), el("p", { class: "note" }, "Never enter real policy, card or ID details. Everything here is fake and all values are in peanuts."),
    el("label", {}, "What would you like to insure?", what), el("label", {}, "Insured value (peanuts)", val), el("fieldset", { class: "quiz-q" }, el("legend", {}, "Insure against:"), ...boxes),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Insure it")), out);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const items = $("#in-what").value.trim(); if (!items) return setMsg(out, "We cannot insure nothing. Well. We could. Name it first.", "error");
    const perils = boxes.map((b) => b.querySelector("input")).filter((i) => i.checked).map((i) => i.value);
    if (!perils.length) return setMsg(out, "Please choose at least one thing to be insured against. We recommend all of them.", "error");
    const a = all(); const mine = a[owner()] || []; mine.unshift({ no: num(), item: items, value: Number(val.value) || 1, perils, at: Date.now(), claims: 0 }); a[owner()] = mine.slice(0, 20); save(KEY, a); show();
  });
  return f;
}
function policy(p, k) {
  const out = el("p", { class: "msg error", role: "status", "aria-live": "polite" });
  return el("div", { class: "card ok-card" }, el("h3", { style: "margin-top:0" }, `Policy ${p.no}: ${p.item} (${p.value} 🥜)`),
    el("p", { style: "margin:4px 0" }, el("strong", {}, "Covered against: "), p.perils.join(", "), "."),
    el("p", { style: "margin:4px 0" }, el("strong", {}, "Excluded: "), "anything that actually happens, delays, loss, damage, theft, weather, and the thing you are worried about."),
    el("p", { class: "note", style: "margin:4px 0" }, "Premium: 0 peanuts, paid in apology. Claims so far: " + (p.claims || 0) + ", accepted: 0."),
    el("div", { class: "actions" }, el("button", { class: "btn small", type: "button", onclick: () => { const a = all(); const me = a[owner()]; me[k].claims = (me[k].claims || 0) + 1; save(KEY, a);
      out.textContent = REJECT[n++ % REJECT.length] + ` (Claims on this policy: ${me[k].claims}.)`; } }, "Make a claim"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => { const a = all(); a[owner()].splice(k, 1); save(KEY, a); show(); } }, "Cancel policy")), out);
}
function show() {
  const mine = all()[owner()] || [];
  root.replaceChildren(form(), el("h2", {}, "Your policies"), ...(mine.length ? mine.map(policy) : [el("p", { class: "note" }, "You are insured against nothing. This is your most exposed state.")]),
    el("p", { class: "note" }, "Octee Insurance is not insurance, a financial product or advice. It is a joke. See also the ", el("a", { href: "magazine.html" }, "in-flight magazine"), "."));
}
show();
