// Seat Upgrade Lottery: pay Octeetokens, spin the wheel. Winning Business or First really changes the flight's class.
import { $, el, niceDate, setMsg, reducedMotion } from "./dom.js";
import { currentUser, requireLogin, updateUser } from "./auth.js";
import { placeShort } from "./destinations.js";
import { spendTokens, tokensOf, TOKEN_PRICES, fmtTokens } from "./miles.js";
import { tripId } from "./tripkit.js";
import { addPeanuts } from "./peanuts.js";

const root = $("#lottery");
const PRICE = TOKEN_PRICES.spin;
// 16 segments: label on the wheel, the prize name, colour
const SEG = [
  ["FIRST", "first", "#b3261e"], ["SORRY", "sorry", "#ffe2c2"], ["BETTER", "better", "#ff9a3c"], ["SORRY", "sorry", "#fff6d6"],
  ["BETTER", "better", "#ffb870"], ["WINDOW", "window", "#e5bd7f"], ["SORRY", "sorry", "#ffe2c2"], ["BIZ", "business", "#8f1d17"],
  ["BETTER", "better", "#ff9a3c"], ["SORRY", "sorry", "#fff6d6"], ["PEANUT", "peanut", "#e5bd7f"], ["BETTER", "better", "#ffb870"],
  ["SORRY", "sorry", "#ffe2c2"], ["WINDOW", "window", "#e5bd7f"], ["BETTER", "better", "#ff9a3c"], ["SORRY", "sorry", "#fff6d6"]
];
const N = SEG.length, ANG = 360 / N;
const PRIZES = {
  first: "FIRST CLASS! (Check your flight. We are as shocked as you.)",
  business: "BUSINESS CLASS! Before Economy. After First.",
  better: "A slightly better seat. It is the same seat, turned a little.",
  sorry: "The same seat, but we said sorry. We are sorry. We are so sorry.",
  window: "A window seat (the window is a picture of a window).",
  peanut: "One peanut, in place of an upgrade. It is a very good peanut."
};

const rand = () => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 2 ** 32; } catch { return Math.random(); } };
const polar = (r, deg) => [100 + r * Math.sin(deg * Math.PI / 180), 100 - r * Math.cos(deg * Math.PI / 180)];

function wheelSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 200 200"); svg.setAttribute("class", "wheel-svg"); svg.setAttribute("aria-hidden", "true");
  SEG.forEach(([label, , col], k) => {
    const a0 = k * ANG, a1 = (k + 1) * ANG, [x0, y0] = polar(96, a0), [x1, y1] = polar(96, a1);
    const path = document.createElementNS(ns, "path"); path.setAttribute("d", `M100 100 L${x0} ${y0} A96 96 0 0 1 ${x1} ${y1} Z`); path.setAttribute("fill", col); path.setAttribute("stroke", "#2b1a0e"); path.setAttribute("stroke-width", "1");
    svg.append(path);
    const [tx, ty] = polar(70, a0 + ANG / 2);
    const t = document.createElementNS(ns, "text"); t.setAttribute("x", tx); t.setAttribute("y", ty); t.setAttribute("font-size", "7"); t.setAttribute("font-weight", "800"); t.setAttribute("text-anchor", "middle"); t.setAttribute("dominant-baseline", "middle");
    t.setAttribute("fill", ["#b3261e", "#8f1d17"].includes(col) ? "#fff" : "#2b1a0e"); t.setAttribute("transform", `rotate(${a0 + ANG / 2 - 90} ${tx} ${ty})`); t.textContent = label;
    svg.append(t);
  });
  const hub = document.createElementNS(ns, "circle"); hub.setAttribute("cx", 100); hub.setAttribute("cy", 100); hub.setAttribute("r", 9); hub.setAttribute("fill", "#2b1a0e"); svg.append(hub);
  return svg;
}

let spinning = false, turns = 0;
function show() {
  const u = currentUser();
  const flights = [];
  (u.trips || []).forEach((b) => b.legs.forEach((l, i) => { if (l.airline === "OA") flights.push({ b, l, i }); }));
  const select = el("select", { id: "up-flight", "aria-label": "Flight to upgrade" }, flights.length
    ? flights.map(({ b, l, i }) => el("option", { value: `${tripId(b)}.${i}` }, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)} · ${niceDate(l.date)} · ${l.travelClass || "economy"}`))
    : [el("option", { value: "" }, "No Octee flights booked")]);
  const wheelBox = el("div", { class: "wheel" }, el("div", { class: "wheel-pointer", "aria-hidden": "true" }, "▼"), wheelSvg());
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const btn = el("button", { class: "btn", type: "button", disabled: !flights.length ? true : null }, `Spin · ${PRICE} Octeetokens`);
  const hint = el("p", { class: "hint" }, `You have ${fmtTokens(tokensOf(u))}. `, el("a", { href: "octmiles.html#tokens" }, "Exchange Octmiles for more."));
  const spins = (u.spins || []).slice(0, 8);

  btn.addEventListener("click", () => {
    if (spinning || !select.value) return;
    const [t, leg] = select.value.split(".");
    const idx = Math.floor(rand() * N);
    try {
      updateUser((x) => spendTokens(x, PRICE, "Seat upgrade lottery spin"));
    } catch (e) { setMsg(msg, e.message, "error"); return; }
    spinning = true; btn.disabled = true;
    setMsg(msg, "Spinning… (the wheel has been told to be fair)", "info");
    const target = 360 * 5 + (360 - (idx + 0.5) * ANG);
    turns = Math.ceil(turns / 360) * 360 + target;               // always keep spinning forwards
    const svg = wheelBox.querySelector("svg");
    svg.style.transition = reducedMotion() ? "none" : "transform 4.2s cubic-bezier(.12,.7,.1,1)";
    svg.style.transform = `rotate(${turns}deg)`;
    setTimeout(() => finish(idx, Number(t), Number(leg)), reducedMotion() ? 0 : 4300);
  });

  function finish(idx, t, leg) {
    const key = SEG[idx][1];
    let text = PRIZES[key], extra = "";
    updateUser((x) => {
      const trip = (x.trips || []).find((b) => tripId(b) === t), l = trip && trip.legs[leg];
      if (l && (key === "first" || key === "business")) {
        const rank = { economy: 0, business: 1, first: 2 }, now = l.travelClass || "economy";
        if (rank[key] > rank[now]) {
          l.travelClass = key;
          if (l.checkedIn) { delete l.checkedIn; l.seats = []; extra = " Your class changed, so your seat was released: please check in again to pick a seat in the new cabin."; }
        } else { text = `You wanted ${key === "first" ? "First" : "Business"} Class. You already have ${now === "first" ? "First" : "Business"} Class or better. Have the peanut. (+1)`; extra = ""; }
      }
      x.spins = [{ at: new Date().toISOString(), prize: text.split(".")[0], flight: l ? l.no : "" }, ...(x.spins || [])].slice(0, 20);
    });
    if (key === "peanut" || /Have the peanut/.test(text)) addPeanuts("Seat lottery consolation peanut", 1);
    setMsg(msg, text + extra, key === "first" || key === "business" ? "ok" : "info");
    spinning = false;
    show();
    setMsg($("#lottery .msg"), text + extra, key === "first" || key === "business" ? "ok" : "info");
    { const w = $("#lottery .wheel svg"); w.style.transition = "none"; w.style.transform = `rotate(${turns % 360}deg)`; }
  }

  root.replaceChildren(
    el("div", { class: "lottery-grid" },
      wheelBox,
      el("div", { class: "card" },
        el("div", { class: "field" }, el("label", { for: "up-flight" }, "Which Octee flight is this for?"), select),
        el("div", { class: "actions" }, btn), hint, msg,
        el("p", { class: "note" }, "About 1 spin in 16 is First Class and 1 in 16 is Business. The rest is sorry. If you win a class you already have, you get a peanut."))),
    el("h2", {}, "Your last spins"),
    spins.length ? el("ul", {}, spins.map((s) => el("li", {}, `${new Date(s.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · ${s.prize}${s.flight ? " · " + s.flight : ""}`)))
      : el("p", { class: "note" }, "You have not spun yet. The wheel is lonely."));
}

if (requireLogin()) show();
