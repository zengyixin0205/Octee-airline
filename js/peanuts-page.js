import { $, el, setMsg } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { peanutsOf, fmtPeanuts, SHOP, buy, JOELMOBILE_PEANUTS } from "./peanuts.js";

const root = $("#wallet");

function draw() {
  const u = currentUser();
  const own = u.peanutItems || {};
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const title = own.title ? "Sir/Dame " : "";
  root.replaceChildren(
    el("div", { class: "card wallet-top" },
      el("p", { class: "note", style: "margin:0" }, `${title}${u.username}, you have`),
      el("p", { class: "wallet-n" }, "🥜 ", String(peanutsOf(u))),
      el("p", { class: "note", style: "margin:0" }, `${peanutsOf(u) === 1 ? "peanut" : "peanuts"}. Earn more: `, el("a", { href: "complaint.html" }, "file a complaint"), " (up to 6 peanuts) or wait for an apology (1 peanut each).")),
    msg,
    el("h2", {}, "The Peanut Shop"),
    el("div", { class: "shop" }, SHOP.map((it) => el("div", { class: "card shop-item" },
      el("h3", { style: "margin:0" }, it.name),
      el("p", { class: "note", style: "margin:4px 0 8px" }, it.note),
      el("button", { class: "btn small", type: "button", disabled: peanutsOf(u) < it.cost ? true : null, onclick: () => {
        try { const got = buy(it.id); draw(); setMsg($("#wallet .msg"), `Bought: ${got.name}. ${got.note}`, "ok"); }
        catch (e) { setMsg(msg, e.message, "error"); }
      } }, `Buy · ${it.cost} 🥜`)))),
    el("div", { class: "card" }, el("h3", { style: "margin-top:0" }, "Spend them on the JOELMOBILE"),
      el("p", {}, `A ride costs 5 Octeetokens, or ${fmtPeanuts(JOELMOBILE_PEANUTS)}. Joel says peanuts are better. Joel always says that.`),
      el("a", { class: "btn small", href: "joelmobile.html#ride-form" }, "Call the JOELMOBILE")),
    el("h2", {}, "Your collection"),
    Object.keys(own).length
      ? el("ul", {}, SHOP.filter((s) => own[s.id]).map((s) => el("li", {}, `${s.name} × ${own[s.id]}`)))
      : el("p", { class: "note" }, "Nothing yet. Not even a small peanut."),
    el("h2", {}, "Peanut history"),
    (u.peanutLog || []).length
      ? el("table", { class: "plain" }, el("tbody", {}, u.peanutLog.map((h) => el("tr", {},
          el("td", {}, new Date(h.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })), el("td", {}, h.text), el("td", { style: "text-align:right;font-weight:700" }, (h.amount > 0 ? "+" : "") + h.amount)))))
      : el("p", { class: "note" }, "No peanuts have moved. Complain about something."));
}

if (requireLogin()) { draw(); window.addEventListener("octee:account", draw); }
