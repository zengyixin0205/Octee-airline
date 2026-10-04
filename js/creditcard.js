// Octee Credit Card: always approved, every purchase declined. No real card details are asked for or stored.
import { $, el, setMsg } from "./dom.js";
import { currentUser } from "./auth.js";
import { load, save } from "./store.js";

const root = $("#app");
const KEY = "octee.card";
const owner = () => { const u = currentUser(); return u ? u.username : "guest"; };
const all = () => load(KEY, {});
const REASONS = ["Declined: this purchase is too small.", "Declined: this purchase is too large. (It was the same size a second ago.)", "Declined: the card is feeling shy.",
  "Declined: Joel is holding the card for ransom.", "Declined: we do not recognise you. You applied one minute ago.", "Declined: the peanut on the card is on holiday.",
  "Declined: your purchase was approved, then thought better of it.", "Declined: reason withheld. We are sorry about the withholding."];
const peanuts = (n) => "🥜".repeat(n);
const num = (seed) => { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const r = []; for (let i = 0; i < 4; i++) { h = Math.imul(h, 1664525) + 1013904223 >>> 0; r.push(peanuts(4) + (h % 2 ? "" : "\u200b")); } return r; };

function card(c) {
  const d = el("div", { class: "cc-card", "aria-label": "Octee Credit Card, number made of peanuts" },
    el("div", { class: "cc-top" }, el("strong", {}, "OCTEE"), el("span", {}, "PEANUT CLASS")),
    el("div", { class: "cc-num" }, ...num(c.name + c.at).map((g) => el("span", {}, g))),
    el("div", { class: "cc-bot" }, el("span", {}, c.name.toUpperCase()), el("span", {}, "VALID THRU 13/99 · CVV 🥜🥜🥜")));
  return d;
}
function shop(c) {
  const out = el("div", { id: "cc-out", role: "status", "aria-live": "polite" });
  const what = el("input", { type: "text", maxlength: "40", placeholder: "What are you buying? (a coffee, a peanut...)", "aria-label": "What are you buying" });
  const amt = el("input", { type: "number", min: "0", step: "1", value: "1", "aria-label": "Amount in peanuts", style: "width:6em" });
  const f = el("form", { class: "card" }, el("h3", { style: "margin-top:0" }, "Try a purchase"),
    el("p", { class: "note" }, `Declined purchases so far: ${c.declined || 0}. Approved purchases so far: 0. Amounts are in peanuts and are not real money.`),
    el("div", { class: "actions" }, what, amt, el("button", { class: "btn", type: "submit" }, "Pay with Octee Card")), out);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const a = all(); const me = a[owner()]; me.declined = (me.declined || 0) + 1; save(KEY, a);
    out.replaceChildren(el("p", { class: "msg error" }, `${what.value.trim() || "Your purchase"} (${amt.value || 0} 🥜): ${REASONS[Math.floor(Math.random() * REASONS.length)]} Total declined: ${me.declined}.`));
    f.querySelector(".note").textContent = `Declined purchases so far: ${me.declined}. Approved purchases so far: 0. Amounts are in peanuts and are not real money.`;
  });
  return f;
}
function apply() {
  const u = currentUser();
  const name = el("input", { type: "text", maxlength: "30", required: true, value: u ? u.username : "", id: "cc-name" });
  const inc = el("select", { id: "cc-inc" }, ...["Some peanuts", "Many peanuts", "A bag of peanuts", "Joel's peanuts", "Prefer not to say (we will say it for you)"].map((o) => el("option", {}, o)));
  const why = el("input", { type: "text", maxlength: "60", placeholder: "Optional", id: "cc-why" });
  const out = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const f = el("form", { class: "card" }, el("h2", { style: "margin-top:0" }, "Apply for the Octee Credit Card"),
    el("p", { class: "note" }, "Never enter real card, bank or ID details on this site. We do not ask for them. This is a joke."),
    el("label", {}, "Name on card", name), el("label", {}, "Annual income (in peanuts)", inc), el("label", {}, "Why do you want this card?", why),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Apply now")), out);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const nm = name.value.trim(); if (!nm) return setMsg(out, "A card needs a name. Ours has several.", "error");
    out.textContent = "Checking your credit... Checking Joel's credit... Checking the peanut...";
    setTimeout(() => { const a = all(); a[owner()] = { name: nm, at: Date.now(), declined: 0 }; save(KEY, a); show(); }, 1800);
  });
  return f;
}
function show() {
  const c = all()[owner()];
  if (!c) return root.replaceChildren(apply());
  root.replaceChildren(el("div", { class: "card ok-card" }, el("h2", { style: "margin-top:0" }, `APPROVED, ${c.name}! Your limit is 0 🥜 (unlimited)`), el("p", {}, "Congratulations. You are pre-approved for everything and everything will be declined."), card(c)),
    shop(c), el("div", { class: "actions" }, el("button", { class: "btn small ghost", type: "button", onclick: () => { const a = all(); delete a[owner()]; save(KEY, a); show(); } }, "Cancel my card (we will miss it)")),
    el("p", { class: "note" }, "Spend real peanuts at ", el("a", { href: "dutyfree.html" }, "Duty Free"), ". The card will not help."));
}
show();
