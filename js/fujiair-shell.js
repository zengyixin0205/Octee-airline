// FujiAIR's own header, nav and footer — a site inside the site, like JoelTEH, but blue/white and cheap.
// FujiAIR uses your normal Octee account (no separate login): Fujitech already lives on it, the same as JoelTEH uses Joelmiles.
// Browsing works logged out; booking, checking in and claiming the daily Fujitech ask you to log in.
import { el } from "./dom.js";
import { currentUser, logOut } from "./auth.js";
import { fujitechTenthsOf, fmtFujitech } from "./fujitech.js";
import "./cloud.js";
import "./perks.js";

export const FJ_PAGES = [
  ["fujiair.html", "FujiAIR", "home"],
  ["fujiair-book.html", "Book a flight", "book"],
  ["fujiair-checkin.html", "Check-in", "checkin"],
  ["lounge.html", "Lounge", ""]
];
const page = document.body.dataset.page || "home";
const here = () => location.pathname.split("/").pop() || "fujiair.html";

function accountBox(box) {
  const u = currentUser();
  if (!u) { box.replaceChildren(el("a", { class: "fj-pill", href: "login.html?next=" + encodeURIComponent(here()) }, "Log in / Sign up")); return; }
  box.replaceChildren(
    el("a", { class: "fj-pill", href: "account.html", title: "Your Octee account" }, u.username),
    el("span", { class: "fj-pill gold", title: "Your Fujitech" }, fmtFujitech(fujitechTenthsOf(u))),
    el("button", { class: "fj-btn ghost", type: "button", onclick: () => { logOut(); location.href = "index.html"; } }, "Log out"));
}

function frame() {
  const account = el("div", { class: "fj-account" });
  const header = el("header", { class: "fj-header" },
    el("div", { class: "fj-top" },
      el("a", { class: "fj-home", href: "index.html" }, "← Octee"),
      el("a", { class: "fj-brand", href: "fujiair.html" }, "FujiAIR", el("small", {}, "cheap, and we mean it")),
      account),
    el("nav", { class: "fj-nav", "aria-label": "FujiAIR" }, FJ_PAGES.map(([href, label, key]) => el("a", { href, "aria-current": key === page ? "page" : null }, label))));
  accountBox(account);
  window.addEventListener("octee:account", () => accountBox(account));
  window.addEventListener("storage", () => accountBox(account));
  const main = el("main", { class: "fj-main", id: "main" });
  const footer = el("footer", { class: "fj-foot" },
    el("p", {}, "FujiAIR is a parody airline inside Octee Airlines, flying out of Mt Fuji (MFIA). None of it is real. The cheapness is the whole joke."),
    el("p", {}, el("a", { href: "index.html" }, "Octee home"), " · ", el("a", { href: "fujiair.html" }, "FujiAIR home"), " · ", el("a", { href: "octmiles.html" }, "Get more Fujitech")));
  document.body.replaceChildren(header, main, footer);
  return main;
}

async function start() {
  const main = frame();
  try {
    const mod = await import("./fujiair-pages.js");
    const render = mod.PAGES_BY_KEY[page] || mod.PAGES_BY_KEY.home;
    const draw = () => main.replaceChildren(render(draw));
    document.body.classList.add(page);
    draw();
  } catch (e) {
    console.error(e);
    main.append(el("div", { class: "fj-card" }, el("h2", {}, "This part of FujiAIR fell over"), el("p", { class: "fj-note" }, String(e && e.message || e))));
  }
  import("./joelfab.js").catch(() => {});
}
start();
