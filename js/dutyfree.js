// Octee Duty Free: buy things with peanuts or Octeetokens. Purchases go into "Your purchases" and can be used (but never taken on board).
import { $, el, setMsg } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { peanutsOf, fmtPeanuts, spendPeanuts } from "./peanuts.js";
import { tokensOf, fmtTokens, spendTokens } from "./miles.js";

const TOKEN_X = 3;                       // token price = peanut price x 3
const ITEMS = [
  { id: "water", name: "1 litre of water (sealed, airside)", cost: 1, note: "Must be drunk before the gate. The gate is not announced.", use: "You drink it. It is gone. The gate has still not been announced." },
  { id: "scissors", name: "Very large scissors", cost: 3, note: "Ideal for cutting the queue. Not allowed on any aircraft, or near one.", use: "You cut the queue. The queue is now two queues. Both are slower." },
  { id: "extinguisher", name: "Fire extinguisher (family size)", cost: 4, note: "For emergencies that are on board. You cannot bring it on board.", use: "There is no fire. You feel prepared anyway. It is the best feeling you have had at the airport." },
  { id: "cloud", name: "A small cloud, in a jar", cost: 5, note: "Cabin crew will ask it to leave. It will not leave.", use: "You open the jar. It rains on you, a little. It looks sorry." },
  { id: "shampoo", name: "Shampoo, 1.5 litres", cost: 2, note: "Liquids over 100 ml are for the ground. This one is for the floor.", use: "You wash your hair. It is very clean. Security has noticed." },
  { id: "umbrella", name: "Umbrella (with the rain)", cost: 3, note: "Rain is included and cannot be cancelled.", use: "You open it. The rain arrives on time. It is the only thing at FIA that does." },
  { id: "runway", name: "A piece of runway", cost: 6, note: "Cut from runway 2. We will not say which part.", use: "You hold it. It is runway. Somewhere, a plane is missing it." },
  { id: "sandwich", name: "A sandwich Joel made", cost: 2, note: "Allowed in the cupboard only.", use: "You eat it. It tastes like an apology. Joel waves from very far away." },
  { id: "buckle", name: "A seatbelt buckle", cost: 5, note: "The only one. Not for sale on board. Not for sale here either, but here it is.", use: "You click it. It clicks. It is not connected to anything. It is the best click of your life." }
];
const root = $("#app");
let pay = "peanuts";                      // peanuts | tokens
const priceOf = (it) => (pay === "tokens" ? it.cost * TOKEN_X : it.cost);

function draw() {
  const u = currentUser();
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const own = (u && u.dutyfree) || {};
  const owned = Object.keys(own).filter((k) => own[k] > 0);
  const have = u ? (pay === "tokens" ? tokensOf(u) : peanutsOf(u)) : 0;
  const unit = pay === "tokens" ? "Octeetokens" : "🥜";
  const payBox = el("div", { class: "actions" },
    el("label", {}, "Pay with ", el("select", { id: "df-pay", "aria-label": "Payment method", onchange: (e) => { pay = e.target.value; draw(); } },
      el("option", { value: "peanuts", selected: pay === "peanuts" ? true : null }, "Peanuts"), el("option", { value: "tokens", selected: pay === "tokens" ? true : null }, "Octeetokens"))));
  root.replaceChildren(
    el("div", { class: "card wallet-top" }, u ? el("p", { style: "margin:0" }, `You have ${fmtPeanuts(peanutsOf(u))} and ${fmtTokens(tokensOf(u))}. Duty Free does not give change. It gives receipts, and your goods.`)
      : el("p", { style: "margin:0" }, el("a", { href: "login.html" }, "Log in"), " (or ", el("a", { href: "login.html" }, "sign up"), ", you get Octeetokens as a welcome bonus) to buy things. Browsing is free."), payBox),
    msg,
    el("div", { class: "shop" }, ITEMS.map((it) => {
      const price = priceOf(it), can = u && have >= price;
      return el("div", { class: "card shop-item" },
        el("h3", { style: "margin:0" }, it.name),
        el("p", { class: "note", style: "margin:4px 0 8px" }, it.note, el("br"), el("strong", {}, "Not permitted on board.")),
        el("button", { class: "btn small", type: "button", disabled: can ? null : true, onclick: () => {
          try {
            updateUser((x) => { pay === "tokens" ? spendTokens(x, price, "Duty Free: " + it.name) : spendPeanuts(x, price, "Duty Free: " + it.name); x.dutyfree = { ...(x.dutyfree || {}), [it.id]: ((x.dutyfree || {})[it.id] || 0) + 1 }; });
            const no = "DF-" + String(Math.floor(Math.random() * 9000) + 1000);
            draw(); setMsg($("#app .msg"), `Bought: ${it.name} for ${price} ${unit}. Receipt ${no}. It is in "Your purchases" below. It may not be taken on board.`, "ok");
          } catch (e) { setMsg(msg, e.message, "error"); }
        } }, `Buy · ${price} ${unit}`),
        !u ? el("p", { class: "note", style: "margin:4px 0 0" }, "Log in to buy.") : !can ? el("p", { class: "note", style: "margin:4px 0 0" }, `You need ${price - have} more ${unit}.`) : null);
    })),
    el("h2", {}, "Your purchases"),
    owned.length ? el("div", { class: "shop" }, owned.map((k) => { const it = ITEMS.find((x) => x.id === k);
      return el("div", { class: "card shop-item" }, el("h3", { style: "margin:0" }, `${own[k]} × ${it ? it.name : k}`), el("p", { class: "note", style: "margin:4px 0 8px" }, "Yours. Not allowed on board."),
        it ? el("button", { class: "btn small ghost", type: "button", onclick: () => setMsg($("#app .msg"), it.use, "ok") }, "Use it") : null); }))
      : el("p", { class: "note" }, "You have bought nothing. This is the most you can take on board."),
    el("p", { class: "note" }, "All sales are final. All goods stay on the ground. Get more peanuts in the ", el("a", { href: "peanuts.html" }, "Peanut Wallet"), "; Octeetokens come from codes and Octmiles."));
}
draw();
