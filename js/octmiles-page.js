import { $, el, setMsg, fmtMiles, niceDate } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { TIERS, tierFor, nextTier, REWARDS, redeemReward, TOKEN_RATE, TOKEN_PRICES, CODES_PER_DAY, tokensOf, fmtTokens, exchangeMiles, buyExtraCode, codesToday, codesLeft } from "./miles.js";
import { codeBoxCard } from "./code-box.js";

$("#code-slot").append(codeBoxCard());
$("#tier-rows").replaceChildren(...TIERS.map((t) => el("tr", {}, el("td", {}, t.name), el("td", {}, fmtMiles(t.min) + "+"), el("td", {}, t.perk))));

function renderTokens(u) {
  const card = $("#token-card");
  if (!u) { card.replaceChildren(el("p", {}, "Log in to exchange Octmiles for Octeetokens.")); return; }
  const max = Math.floor(u.octmiles / TOKEN_RATE);
  const msg = el("p", { class: "msg", role: "status" });
  const amount = el("input", { type: "number", id: "token-amount", min: "1", max: String(Math.max(1, max)), step: "1", value: String(Math.min(10, Math.max(1, max))), inputmode: "numeric" });
  const cost = el("p", { class: "hint" });
  const showCost = () => { const n = Math.floor(Number(amount.value)) || 0; cost.textContent = `${n} Octeetoken${n === 1 ? "" : "s"} = ${fmtMiles(n * TOKEN_RATE)} Octmiles. You can afford up to ${fmtMiles(max)}.`; };
  amount.addEventListener("input", showCost); showCost();
  const c = codesToday(u);
  const act = (fn, okText) => { try { fn(); render(); setMsg($("#token-msg"), okText, "ok"); } catch (e) { setMsg(msg, e.message, "error"); } };
  msg.id = "token-msg";
  card.replaceChildren(
    el("p", { class: "big-rating", style: "font-size:3rem" }, fmtMiles(tokensOf(u))),
    el("p", {}, "Octeetokens to spend"),
    el("form", { id: "exchange-form", onsubmit: (e) => { e.preventDefault(); const n = Math.floor(Number(amount.value)); act(() => exchangeMiles(n), `Exchanged. +${fmtTokens(n)}. Spend them before we lose them.`); } },
      el("div", { class: "field" }, el("label", { for: "token-amount" }, "How many Octeetokens do you want?"), amount, cost),
      el("div", { class: "actions" }, el("button", { class: "btn", type: "submit", disabled: max < 1 }, "Exchange Octmiles"))),
    el("hr", { style: "border:0;border-top:1px solid #e4d5c4;margin:16px 0" }),
    el("p", {}, el("strong", {}, `Codes today: ${c.used} of ${CODES_PER_DAY + c.extra} used`), ` · ${codesLeft(u)} left`),
    el("div", { class: "actions" }, el("button", { class: "btn small secondary", type: "button", id: "buy-code",
      onclick: () => act(() => buyExtraCode(), "One more code unlocked for today.") }, `Get one more code today (${TOKEN_PRICES.extraCode} Octeetokens)`)),
    msg);
}

function render() {
  const u = currentUser();
  renderTokens(u);
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
      el("thead", {}, el("tr", {}, el("th", {}, "When"), el("th", {}, "What"), el("th", {}, "Octmiles"), el("th", {}, "Octeetokens"))),
      el("tbody", {}, (u.history || []).slice(0, 50).map((h) => el("tr", {},
        el("td", {}, niceDate(h.at.slice(0, 10))), el("td", {}, h.text), el("td", {}, h.amount ? (h.amount > 0 ? "+" : "") + fmtMiles(h.amount) : "—"), el("td", {}, h.tokens ? (h.tokens > 0 ? "+" : "") + fmtMiles(h.tokens) : "—")))))));
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
