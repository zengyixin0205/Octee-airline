import { $, el, setMsg, fmtMiles, niceDate } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { TIERS, tierFor, nextTier, REWARDS, redeemReward } from "./miles.js";
import { codeBoxCard } from "./code-box.js";

$("#code-slot").append(codeBoxCard());
$("#tier-rows").replaceChildren(...TIERS.map((t) => el("tr", {}, el("td", {}, t.name), el("td", {}, fmtMiles(t.min) + "+"), el("td", {}, t.perk))));

function render() {
  const u = currentUser();
  if (!u) {
    $("#balance").replaceChildren(el("p", {}, "Log in to see your Octmiles. ", el("a", { class: "btn small", href: "login.html?next=octmiles.html" }, "Log in / Sign up")));
    $("#history").replaceChildren();
  } else {
    const tier = tierFor(u.lifetime), next = nextTier(u.lifetime);
    const pct = next ? Math.round(((u.lifetime - tier.min) / (next.min - tier.min)) * 100) : 100;
    $("#balance").replaceChildren(
      el("p", { class: "big-rating", style: "font-size:3rem" }, fmtMiles(u.octmiles)),
      el("p", {}, "Octmiles to spend · ", el("strong", {}, tier.name), ` (${fmtMiles(u.lifetime)} lifetime) · `, el("em", {}, tier.perk)),
      el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-label": "Progress to next tier" }, el("span", { style: `width:${pct}%` })),
      el("p", { class: "hint" }, next ? `${fmtMiles(next.min - u.lifetime)} more lifetime Octmiles to ${next.name}.` : "Top tier. There is nowhere left to go. Like our planes."));
    $("#history").replaceChildren(el("div", { class: "table-wrap" }, el("table", { class: "plain" },
      el("thead", {}, el("tr", {}, el("th", {}, "When"), el("th", {}, "What"), el("th", {}, "Octmiles"))),
      el("tbody", {}, (u.history || []).slice(0, 50).map((h) => el("tr", {},
        el("td", {}, niceDate(h.at.slice(0, 10))), el("td", {}, h.text), el("td", {}, (h.amount > 0 ? "+" : "") + fmtMiles(h.amount))))))));
  }
  const shop = $("#shop");
  shop.replaceChildren(...REWARDS.map((r) => {
    const owned = u && r.once && u.redemptions.some((x) => x.id === r.id);
    const short = u ? r.cost - u.octmiles : null;
    const disabled = !u || r.outOfStock || owned || short > 0;
    const msg = el("p", { class: "msg", "aria-live": "polite" });
    return el("article", { class: "card" },
      el("h3", {}, r.name), el("p", {}, el("span", { class: "tag" }, fmtMiles(r.cost) + " Octmiles"), r.once ? el("span", { class: "tag" }, "once per account") : ""),
      el("p", { class: "note" }, r.note),
      el("button", { class: "btn small", type: "button", disabled, onclick: () => {
        try { redeemReward(r.id); setMsg(msg, `Enjoy your ${r.name.toLowerCase()}. Probably.`, "ok"); setTimeout(render, 1200); }
        catch (e) { setMsg(msg, e.message, "error"); }
      } }, owned ? "Already yours" : r.outOfStock ? "Out of stock" : "Redeem"),
      u && !owned && !r.outOfStock && short > 0 ? el("p", { class: "hint" }, `You need ${fmtMiles(short)} more Octmiles.`) : "",
      msg);
  }));
}
render();
window.addEventListener("octee:account", render);
