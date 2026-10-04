// Octee Duty Free: things you can never take on board, paid for in peanuts.
import { $, el, setMsg } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { peanutsOf, fmtPeanuts, spendPeanuts } from "./peanuts.js";

const ITEMS = [
  { id: "water", name: "1 litre of water (sealed, airside)", cost: 1, note: "Must be drunk before the gate. The gate is not announced." },
  { id: "scissors", name: "Very large scissors", cost: 3, note: "Ideal for cutting the queue. Not allowed on any aircraft, or near one." },
  { id: "extinguisher", name: "Fire extinguisher (family size)", cost: 4, note: "For emergencies that are on board. You cannot bring it on board." },
  { id: "cloud", name: "A small cloud, in a jar", cost: 5, note: "Cabin crew will ask it to leave. It will not leave." },
  { id: "shampoo", name: "Shampoo, 1.5 litres", cost: 2, note: "Liquids over 100 ml are for the ground. This one is for the floor." },
  { id: "umbrella", name: "Umbrella (with the rain)", cost: 3, note: "Rain is included and cannot be cancelled." },
  { id: "runway", name: "A piece of runway", cost: 6, note: "Cut from runway 2. We will not say which part." },
  { id: "sandwich", name: "A sandwich Joel made", cost: 2, note: "Allowed in the cupboard only." },
  { id: "buckle", name: "A seatbelt buckle", cost: 5, note: "The only one. Not for sale on board. Not for sale here either, but here it is." }
];
const root = $("#app");
function draw() {
  const u = currentUser();
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const own = (u && u.dutyfree) || {};
  const owned = Object.keys(own).filter((k) => own[k] > 0);
  root.replaceChildren(
    el("div", { class: "card wallet-top" }, u ? el("p", { class: "note", style: "margin:0" }, `You have ${fmtPeanuts(peanutsOf(u))}. Duty Free does not give change. It gives receipts.`)
      : el("p", { style: "margin:0" }, el("a", { href: "login.html" }, "Log in"), " to spend peanuts. Browsing is free. Browsing is all you can do on board anyway.")),
    msg,
    el("div", { class: "shop" }, ITEMS.map((it) => el("div", { class: "card shop-item" },
      el("h3", { style: "margin:0" }, it.name),
      el("p", { class: "note", style: "margin:4px 0 8px" }, it.note, el("br"), el("strong", {}, "Not permitted on board.")),
      el("button", { class: "btn small", type: "button", disabled: u && peanutsOf(u) >= it.cost ? null : true, onclick: () => {
        try {
          updateUser((x) => { spendPeanuts(x, it.cost, "Duty Free: " + it.name); x.dutyfree = { ...(x.dutyfree || {}), [it.id]: ((x.dutyfree || {})[it.id] || 0) + 1 }; });
          const no = "DF-" + String(Math.floor(Math.random() * 9000) + 1000);
          draw(); setMsg($("#app .msg"), `Receipt ${no}: ${it.name}. Collect it on arrival. There is no arrival collection point. We are sorry.`, "ok");
        } catch (e) { setMsg(msg, e.message, "error"); }
      } }, `Buy · ${it.cost} 🥜`)))),
    el("h2", {}, "Your receipts"),
    owned.length ? el("ul", {}, owned.map((k) => { const it = ITEMS.find((x) => x.id === k); return el("li", {}, `${own[k]} × ${it ? it.name : k}: receipt held, item not available.`); }))
      : el("p", { class: "note" }, "You have bought nothing. This is the most you can take on board."),
    el("p", { class: "note" }, "All sales are final. All items are left behind. See also the ", el("a", { href: "peanuts.html" }, "Peanut Wallet"), "."));
}
draw();
