// Octee Search: always returns a page that does NOT match what you typed (and says so).
import { $, el } from "./dom.js";
import { PAGES } from "./siteindex.js";


const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const words = (q) => q.toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 1);
const hits = (p, ws) => ws.filter((w) => (p[1] + " " + p[2]).toLowerCase().includes(w)).length;

const root = $("#app");
const input = el("input", { type: "search", id: "q", placeholder: "Search Octee Airlines", "aria-label": "Search Octee Airlines", maxlength: "60" });
const out = el("div", { id: "results", role: "status", "aria-live": "polite" });
const form = el("form", { class: "card", role: "search" }, el("div", { class: "actions" }, input, el("button", { class: "btn", type: "submit" }, "Search")));
root.replaceChildren(form, out, el("p", { class: "note" }, "Octee Search never shows pages that match. Matching pages are for people who know what they want."));

function search(q) {
  const ws = words(q);
  const nonMatches = PAGES.filter((p) => hits(p, ws) === 0);
  const matches = PAGES.filter((p) => hits(p, ws) > 0);
  const pool = nonMatches.length ? nonMatches : PAGES;
  const found = pool[hash(q.toLowerCase().trim() || String(Date.now())) % pool.length];
  const next = pool[(pool.indexOf(found) + 7) % pool.length];
  const hidden = matches.length;
  out.replaceChildren(
    el("p", { class: "note" }, q ? `Results for "${q}": 1 (${hidden} other ${hidden === 1 ? "page" : "pages"} matched and ${hidden === 1 ? "was" : "were"} removed for your safety)` : "Results for nothing: 1"),
    el("a", { class: "card", href: found[0], style: "display:block;text-decoration:none;color:inherit" }, el("h3", { style: "margin:0" }, found[1]), el("p", { style: "margin:4px 0" }, found[3]), el("span", { class: "note" }, `${found[0]} · 0% match. Exactly what you were not looking for.`)),
    el("p", {}, "Did you mean: ", el("a", { href: next[0] }, next[1]), "? (You did not.)"));
}
form.addEventListener("submit", (e) => { e.preventDefault(); search(input.value.trim()); history.replaceState(null, "", "?q=" + encodeURIComponent(input.value.trim())); });
const q0 = new URLSearchParams(location.search).get("q");
if (q0) { input.value = q0; search(q0); }
