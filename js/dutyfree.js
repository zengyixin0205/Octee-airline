// Octee Duty Free: buy things with peanuts or Octeetokens. Purchases go into "Your purchases" and can be used (but never taken on board).
import { $, el, setMsg } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { peanutsOf, fmtPeanuts, spendPeanuts } from "./peanuts.js";
import { tokensOf, fmtTokens, spendTokens } from "./miles.js";
import { scanVerdict, scanAllowed } from "./dutyscan.js";

const TOKEN_X = 3;                       // token price = peanut price x 3
const ITEMS = [
  { id: "water", cat: "Liquid", name: "1 litre of water (sealed, airside)", cost: 1, note: "Must be drunk before the gate. The gate is not announced.", use: "You drink it. It is gone. The gate has still not been announced." },
  { id: "scissors", cat: "Sharp", name: "Very large scissors", cost: 3, note: "Ideal for cutting the queue. Not allowed on any aircraft, or near one.", use: "You cut the queue. The queue is now two queues. Both are slower." },
  { id: "extinguisher", cat: "Fire", name: "Fire extinguisher (family size)", cost: 4, note: "For emergencies that are on board. You cannot bring it on board.", use: "There is no fire. You feel prepared anyway. It is the best feeling you have had at the airport." },
  { id: "cloud", cat: "Weather", name: "A small cloud, in a jar", cost: 5, note: "Cabin crew will ask it to leave. It will not leave.", use: "You open the jar. It rains on you, a little. It looks sorry." },
  { id: "shampoo", cat: "Liquid", name: "Shampoo, 1.5 litres", cost: 2, note: "Liquids over 100 ml are for the ground. This one is for the floor.", use: "You wash your hair. It is very clean. Security has noticed." },
  { id: "umbrella", cat: "Weather", name: "Umbrella (with the rain)", cost: 3, note: "Rain is included and cannot be cancelled.", use: "You open it. The rain arrives on time. It is the only thing at FIA that does." },
  { id: "runway", cat: "Heavy", name: "A piece of runway", cost: 6, note: "Cut from runway 2. We will not say which part.", use: "You hold it. It is runway. Somewhere, a plane is missing it." },
  { id: "sandwich", cat: "Other", name: "A sandwich Joel made", cost: 2, note: "Allowed in the cupboard only.", use: "You eat it. It tastes like an apology. Joel waves from very far away." },
  { id: "buckle", cat: "Other", name: "A seatbelt buckle", cost: 5, note: "The only one. Not for sale on board. Not for sale here either, but here it is.", use: "You click it. It clicks. It is not connected to anything. It is the best click of your life." },
  { id: "bowling", name: "A bowling ball (signed by nobody)", cost: 4, cat: "Heavy", note: "Very round. Very heavy. Hard to explain at the gate.", why: "It would roll to the front of the cabin on take-off. Then to the back on landing. Then to Gary.", use: "You bowl it down the terminal. It gets a strike on a family of cones. Everyone claps. Security does not." },
  { id: "chainsaw", name: "Chainsaw (decorative, almost quiet)", cost: 6, cat: "Sharp", note: "For the garden you do not have. Comes with a ribbon.", why: "Sharp, loud, and the ribbon is not allowed either.", use: "You start it. It purrs. A man in a hi-vis jacket walks away without turning round." },
  { id: "lightning", name: "A jar of lightning", cost: 7, cat: "Weather", note: "Already caught. Please do not shake.", why: "Static, sparks, and the seat belt sign is not rated for it.", use: "You open the jar. There is a very short, very bright moment. Your hair stays like that." },
  { id: "fireworks", name: "Indoor fireworks (outdoor ones are in the car park)", cost: 5, cat: "Fire", note: "Eight colours. Seven are loud.", why: "Fire is for the ground. The ground is only in the car park.", use: "You light one. It says 'sorry' in the air, in red. It is gone before you can read it." },
  { id: "anchor", name: "A medium-sized anchor", cost: 4, cat: "Heavy", note: "For ships. And, as of today, for gates.", why: "Planes are meant to go up. Anchors have not been told.", use: "You drop it at Gate B3. The gate stays exactly where it was. It had never planned to move." },
  { id: "candle", name: "Dynamite-shaped candle", cost: 3, cat: "Fire", note: "Smells like a birthday that went badly.", why: "It is shaped like dynamite. That is the whole problem. The smell is only a part.", use: "You light the wick. It burns for four seconds and then, calmly, for four hours." },
  { id: "eel", name: "A retired eel", cost: 5, cat: "Other", note: "Has done its time. Wants a quiet seat.", why: "Wet, and he asked for the window.", use: "You say hello. The eel nods. Nobody has ever seen an eel nod before. It is a good day." },
  { id: "cooker", name: "Pressure cooker of peanuts", cost: 4, cat: "Heavy", note: "Contains a pressure. And peanuts. The pressure is bigger.", why: "A pressure cooker is never allowed through, and this one is the shape of a bomb with opinions.", use: "You open it. The peanuts are fine. The pressure leaves. You feel lighter. Joel feels lighter too, from a long way off." },
  { id: "marbles", name: "A bag of marbles (for the floor)", cost: 2, cat: "Other", note: "A bag of five hundred. Ten are blue.", why: "The floor would become a surprise. The cabin crew already has one of those.", use: "You pour them out. A queue slides into a different queue. Everyone is gracious about it." },
  { id: "bat", name: "Cricket bat (the sport kind)", cost: 3, cat: "Heavy", note: "English willow. Has never hit anything.", why: "A bat is a bat, and a bat on board is a weapon, even when it is from Surrey.", use: "You swing it. It hits the air. The air says 'ow' and a smiling woman gives you a form." },
  { id: "banana", name: "A banana skin (prepared)", cost: 1, cat: "Other", note: "Pre-placed. Pre-slipped. No refunds.", why: "Slips, trips, and falls are for the ground. They are a ground thing.", use: "You place it carefully. You step over it. You are proud. A stranger does not step over it." },
  { id: "pogo", name: "Pogo stick (child-sized, adult-ambitious)", cost: 3, cat: "Other", note: "Goes boing. That is the whole review.", why: "The cabin ceiling has 2.2 metres of headroom. The pogo stick needs 2.4.", use: "You bounce down the concourse. Seventeen boings later you hit a sign that says 'Mind the boing'." },
  { id: "glitter", name: "Glitter bomb (celebration grade)", cost: 4, cat: "Other", note: "Everyone will be sparkly. For weeks.", why: "The glitter would be in the engines. The engines would be sparkly. We would never hear the end of it.", use: "You set it off. The whole terminal is gold. The cleaners write 'we will find you' in glitter on the floor." },
  { id: "sparkler", name: "One sparkler", cost: 2, cat: "Fire", note: "A small one. It is only one.", why: "It is a sparkler. It is on fire. It is small, so is the excuse.", use: "You light it. For nine seconds you are a lighthouse. Then you are a person holding a stick." },
  { id: "skate", name: "A skateboard that has opinions", cost: 4, cat: "Other", note: "Will tell you which way to go. Wrong.", why: "It will not stay on the ground. It says that is a choice and it is choosing.", use: "You step on. It takes you to the duty free shop, which is behind you. It is very proud of itself." },
  { id: "magnet", name: "A very strong magnet", cost: 3, cat: "Heavy", note: "Strong. Very. You will feel it in your coat.", why: "It would pull every watch, phone and spoon towards the middle of the aircraft.", use: "You hold it up. Every spoon at the café faces you. They stay like that, politely." },
  { id: "jetpack", name: "Jet pack (display model)", cost: 8, cat: "Fire", note: "For display. Please do not display.", why: "It is the one thing on this list that is faster than the plane.", use: "You strap it on. It flies you four centimetres off the ground. You stay there for a long, quiet minute." },
  { id: "volcano", name: "A tiny volcano", cost: 6, cat: "Weather", note: "Active. Mild. Shy.", why: "Lava, smoke, and the seat is not rated.", use: "You put it on a table. It erupts a little, and then says sorry, and then does it again." },
  { id: "whistle", name: "The loud whistle", cost: 2, cat: "Loud", note: "Louder than the engines. Louder than Joel. Louder than the announcement.", why: "It would drown out the safety demonstration, which is the quietest thing on the plane.", use: "You blow it. The departures board jumps one flight forward and then, embarrassed, jumps back." },
  { id: "duck", name: "A rubber duck (security-grade)", cost: 1, cat: "Other", note: "Yellow. Spotless. Staring.", why: "Rubber ducks are allowed, which is why this one is not. It has a look.", use: "You squeeze it. It squeaks, once, in the exact tone of the gate announcer." },
  { id: "paint", name: "A tin of wet paint", cost: 3, cat: "Liquid", note: "Orange. Obviously.", why: "Liquid, over 100 ml, and also the seat is now orange.", use: "You paint a small sign: 'wet paint'. People avoid it. It was already dry." },
  { id: "horn", name: "A foghorn", cost: 5, cat: "Loud", note: "From a ship. The ship misses it.", why: "It would wake the whole cabin and the one on the next runway.", use: "You press it once. Birds leave the building. The building is also thinking about it." },
  { id: "bucket", name: "A bucket (from the cupboard, used)", cost: 2, cat: "Liquid", note: "Joel's. He has asked for it back. He has not asked kindly.", why: "It is a bucket. It has done things. Please stop asking.", use: "You hold it up. From the cupboard, very faintly, a voice says 'sorry'." }
];
const CATS = [...new Set(ITEMS.map((i) => i.cat || "Other"))];
const shown = () => ITEMS.filter((i) => (cat === "All" || (i.cat || "Other") === cat) && (!find.trim() || (i.name + " " + i.note).toLowerCase().includes(find.trim().toLowerCase())));
function scanner() {
  const out = el("p", { class: "msg", id: "df-scan-out", role: "status", "aria-live": "polite" });
  const inp = el("input", { type: "text", id: "df-scan", maxlength: "60", autocomplete: "off", "aria-label": "Item to scan", placeholder: "Type an item: e.g. a sandwich, a trombone" });
  return el("form", { class: "card df-scan", onsubmit: (e) => {
    e.preventDefault();
    const t = inp.value.trim(); if (!t) { setMsg(out, "Type something first. The scanner is bored.", "info"); return; }
    const pea = scanAllowed(t);
    setMsg(out, (pea ? "ALLOWED. " : "NOT PERMITTED ON BOARD. ") + scanVerdict(t), pea ? "ok" : "error");
  } }, el("h3", { style: "margin:0 0 4px" }, "The Security Scan"), el("p", { class: "note", style: "margin:0 0 6px" }, "Wondering if you can take something on board? Type it in. The answer is no. The reason changes."),
    el("div", { class: "actions" }, el("label", { class: "visually-hidden", for: "df-scan" }, "Item to scan"), inp, el("button", { class: "btn small", type: "submit" }, "Scan it")), out);
}
const root = $("#app");
let pay = "peanuts", cat = "All", find = "";                      // peanuts | tokens
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
    scanner(),
    el("div", { class: "actions df-filters" },
      el("label", {}, "Show ", el("select", { "aria-label": "Category", onchange: (e) => { cat = e.target.value; draw(); } }, ["All", ...CATS].map((c) => el("option", { value: c, selected: c === cat ? true : null }, c)))),
      el("label", {}, "Find ", el("input", { type: "search", id: "df-find", value: find, placeholder: "e.g. anchor", "aria-label": "Find an item", oninput: (e) => { find = e.target.value; const pos = e.target.selectionStart; draw(); const n = $("#df-find"); n.focus(); n.setSelectionRange(pos, pos); } })),
      el("span", { class: "note" }, `${shown().length} of ${ITEMS.length} things you cannot carry`)),
    el("div", { class: "shop" }, shown().map((it) => {
      const price = priceOf(it), can = u && have >= price;
      return el("div", { class: "card shop-item" },
        el("h3", { style: "margin:0" }, it.name),
        el("p", { class: "note", style: "margin:2px 0" }, el("span", { class: "tag" }, it.cat || "Other")),
        el("p", { class: "note", style: "margin:4px 0 8px" }, it.note, el("br"), el("strong", {}, "Not permitted on board."), it.why ? el("span", {}, " Why: " + it.why) : ""),
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
