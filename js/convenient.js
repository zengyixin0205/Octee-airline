// Convenient mode: almost everything on the site becomes (suspiciously) convenient. Off by default; the switch is remembered in this browser.
// It offers to fly you to FIA, adds "Do it for me" to booking and complaints, makes confirm buttons big, and keeps a bar of shortcuts at the bottom.
import { el } from "./dom.js";
import { load, save } from "./store.js";

const KEY = "octee.convenient";
export const convenientOn = () => load(KEY, "off") === "on";
const here = () => location.pathname.split("/").pop() || "index.html";
const tomorrow = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); };
const FIA_URL = () => `book.html?from=SIA&to=FIA&passengers=1&date=${tomorrow()}`;
let bar = null, ask = null;

export function setConvenient(on) {
  save(KEY, on ? "on" : "off");
  document.body.classList.toggle("convenient", on);
  if (on) start(); else stop();
  paint();
}

function paint() {
  document.querySelectorAll(".conv-toggle").forEach((b) => {
    b.textContent = convenientOn() ? "Convenient mode: ON (conveniently press to stop)" : "Convenient mode: off";
    b.setAttribute("aria-pressed", String(convenientOn()));
  });
  const v = document.querySelector(".conv-btn");
  if (v) { v.textContent = convenientOn() ? "Convenient mode: ON" : "Convenient mode: off"; v.setAttribute("aria-pressed", String(convenientOn())); }
}

function offer() {
  if (ask || document.querySelector(".jai-modal, .modal-back")) return;
  try { if (sessionStorage.getItem("octee.conv.asked") === "1") return; sessionStorage.setItem("octee.conv.asked", "1"); } catch { /* fine */ }
  const close = () => { ask?.remove(); ask = null; };
  ask = el("div", { class: "conv-ask", role: "dialog", "aria-label": "A convenient offer", "data-joel-keep": "1" },
    el("p", { class: "conv-q" }, "Do you want to fly to FIA conveniently?"),
    el("div", { class: "actions" },
      el("a", { class: "btn conv-yes", href: FIA_URL() }, "Yes, conveniently"),
      el("button", { class: "btn ghost small", type: "button", onclick: close }, "No, inconveniently")),
    el("p", { class: "note" }, "Convenient mode picks tomorrow, one passenger, and the cheapest everything. You can change any of it, which is less convenient."));
  document.body.append(ask);
}

function shortcuts() {
  bar = el("nav", { class: "conv-bar", "aria-label": "Convenient shortcuts", "data-joel-keep": "1" },
    el("span", {}, "Convenient:"),
    el("a", { href: FIA_URL() }, "Fly to FIA"),
    el("a", { href: "checkin.html" }, "Check in"),
    el("a", { href: "complaint.html" }, "Complain for me"),
    el("a", { href: "#main", onclick: (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); } }, "Top"),
    el("button", { class: "linklike", type: "button", onclick: () => setConvenient(false) }, "Make it inconvenient"));
  document.body.append(bar);
}

// "Do it for me" on the pages that have a form worth doing for you.
function doItForMe() {
  const pg = here();
  if (pg === "complaint.html") {
    const f = document.getElementById("complaint-form"); if (!f || f.querySelector(".conv-do")) return;
    const b = el("button", { class: "btn conv-do", type: "button", "data-joel-keep": "1", onclick: () => {
      const t = document.getElementById("cp-text"); if (t && t.value.trim().length < 5) t.value = "The gate was not announced. Conveniently, I would like it announced, and a peanut.";
      const n = document.getElementById("cp-name"); if (n && !n.value.trim()) n.value = "A Convenient Passenger";
      f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event("submit", { cancelable: true }));
    } }, "Do it for me");
    f.prepend(el("p", {}, b, " ", el("span", { class: "note" }, "Fills in a sensible complaint and sends it.")));
  } else if (pg === "book.html") {
    const m = document.getElementById("main"); if (!m || m.querySelector(".conv-do")) return;
    m.prepend(el("p", { class: "card conv-do-card", "data-joel-keep": "1" }, el("a", { class: "btn conv-do", href: FIA_URL() }, "Do it for me: tomorrow to FIA"), " ", el("span", { class: "note" }, "One passenger. Everything else is up to you, which is inconvenient.")));
  }
}

function start() {
  stop(); document.body.classList.add("convenient");
  shortcuts(); doItForMe();
  setTimeout(offer, 1500);
}
function stop() { bar?.remove(); bar = null; ask?.remove(); ask = null; document.querySelectorAll(".conv-do, .conv-do-card").forEach((n) => (n.closest("p") || n).remove()); }

function addToggle() {
  const f = document.querySelector("footer.site-footer"); if (!f || f.querySelector(".conv-toggle")) return;
  f.append(el("p", { "data-joel-keep": "1" }, el("button", { class: "linklike conv-toggle", type: "button", title: "Almost everything becomes convenient", onclick: () => setConvenient(!convenientOn()) }, "Convenient mode: off")));
}
function addVisibleButton() {
  if (document.querySelector(".conv-btn")) return;
  const btn = el("button", { class: "joel-mode-btn conv-btn", type: "button", "data-joel-keep": "1", title: "Almost everything becomes convenient", onclick: () => setConvenient(!convenientOn()) }, "Convenient mode: off");
  const wrap = document.querySelector(".joel-fab-wrap");
  if (wrap) wrap.append(btn); else document.body.append(el("div", { class: "joel-fab-wrap joel-mode-solo conv-solo", "data-joel-keep": "1" }, btn));
  paint();
}
addToggle(); paint();
const later = () => setTimeout(() => { addToggle(); addVisibleButton(); paint(); }, 700);
if (document.readyState === "loading") addEventListener("DOMContentLoaded", later); else later();
if (convenientOn()) { document.body.classList.add("convenient"); const go = () => setTimeout(start, 400); if (document.readyState === "loading") addEventListener("DOMContentLoaded", go); else go(); }
