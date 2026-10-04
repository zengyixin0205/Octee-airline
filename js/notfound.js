// The 404 page: offers a search whose results are also not found. Every result links to another missing page, which finds nothing again.
import { $, el } from "./dom.js";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "nothing";
const pretty = (s) => s.replace(/\.[a-z]+$/i, "").replace(/[-_]+/g, " ").trim();
const missing = decodeURIComponent((location.pathname.split("/").filter(Boolean).pop() || "").trim());
const start = new URLSearchParams(location.search).get("q") || pretty(missing);
const root = $("#nf");

const input = el("input", { type: "search", id: "nfq", maxlength: "60", placeholder: "Search for the page you lost", "aria-label": "Search for the page you lost", value: start });
const out = el("div", { id: "nf-results", role: "status", "aria-live": "polite" });
const form = el("form", { class: "card", role: "search" }, el("h2", { style: "margin-top:0" }, "Search for it"), el("div", { class: "actions" }, input, el("button", { class: "btn", type: "submit" }, "Search")), out);
root.replaceChildren(form, el("p", { class: "note" }, "Octee Search has searched thoroughly and found the same amount every time."));

function run(q) {
  const t = q || "nothing";
  const rows = [
    [`${t} (page not found)`, `The page called "${t}" has been delayed. It may be with your bag.`],
    [`${t}: the sequel (page not found)`, "A page about the same thing, also missing. They may have left together."],
    [`Frequently asked: where is ${t}? (page not found)`, "Answer: we do not know. We are asking Joel. Joel is in the cupboard."],
    [`Did you mean: ${t}s? (page not found)`, "Probably not. We could not find that either."]
  ];
  out.replaceChildren(el("p", { class: "note" }, `Results for "${t}": 4 results found, 0 pages found.`),
    ...rows.map(([h, d]) => el("a", { class: "card", href: `found-${slug(h)}.html?q=${encodeURIComponent(t)}`, style: "display:block;text-decoration:none;color:inherit;margin-bottom:8px" },
      el("h3", { style: "margin:0" }, h), el("p", { style: "margin:4px 0" }, d), el("span", { class: "note" }, "Error 404 · click to not find it"))));
}
form.addEventListener("submit", (e) => { e.preventDefault(); run(input.value.trim()); });
run(start);
