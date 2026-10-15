// The JoelTEH area: a site inside the site. Own header and menu, dark brown, and instead of the Octee logo a button that always goes home
// ("Go back to home, or not"). You have to be logged in with your normal Octee account. Each joel-*.html page is just <body class="joel" data-page="…">;
// this file builds the frame and asks joel-pages.js for the page itself.
import { $, el, fmtMiles } from "./dom.js";
import { currentUser, logOut } from "./auth.js";
import { joelmilesOf, fmtJoelmiles } from "./joelmiles.js";
import "./cloud.js";
import "./perks.js";

export const JOEL_PAGES = [
  ["joel.html", "JoelTEH", "home"],
  ["joel-jtp.html", "JTP", "jtp"],
  ["joel-jtia.html", "JTIA", "jtia"],
  ["joel-cupboard.html", "Joel's Cupboard", "cupboard"],
  ["joel-airlines.html", "JoelTEH Airlines", "airlines"],
  ["joel-bank.html", "Joelmiles Bank", "bank"],
  ["joel-jtbc.html", "JTBC", "jtbc"],
  ["joel-museum.html", "Museum", "museum"],
  ["joel-baggage.html", "Baggage", "baggage"],
  ["joel-hotels.html", "Hotels", "hotels"],
  ["joel-lostfound.html", "Lost Property", "lostfound"]
];
const page = document.body.dataset.page || "home";
const here = location.pathname.split("/").pop() || "joel.html";

function accountBox(box) {
  const u = currentUser();
  if (!u) { box.replaceChildren(el("a", { class: "jl-pill", href: "login.html?next=" + encodeURIComponent(here) }, "Log in / Sign up")); return; }
  box.replaceChildren(
    el("a", { class: "jl-pill", href: "account.html", title: "Your Octee account" }, u.username),
    el("a", { class: "jl-pill gold", href: "joel-bank.html", title: "Your Joelmiles" }, fmtJoelmiles(joelmilesOf(u))),
    el("a", { class: "jl-pill", href: "octmiles.html", title: "Your Octmiles" }, fmtMiles(u.octmiles) + " Octmiles"),
    el("button", { class: "jl-btn ghost", type: "button", onclick: () => { logOut(); location.href = "index.html"; } }, "Log out"));
}

function frame() {
  const account = el("div", { class: "jl-account" });
  const header = el("header", { class: "jl-header" },
    el("div", { class: "jl-top" },
      el("a", { class: "jl-home", href: "index.html", title: "It goes to the Octee home page. Always." }, "Go back to home, or not"),
      el("a", { class: "jl-brand", href: "joel.html" }, "JoelTEH", el("small", {}, "a site inside the site")),
      account),
    el("nav", { class: "jl-nav", "aria-label": "JoelTEH" }, JOEL_PAGES.map(([href, label, key]) => el("a", { href, "aria-current": key === page ? "page" : null }, label))));
  accountBox(account);
  window.addEventListener("octee:account", () => accountBox(account));
  window.addEventListener("storage", () => accountBox(account));
  const main = el("main", { class: "jl-main", id: "main" });
  const footer = el("footer", { class: "jl-foot" },
    el("p", {}, "JoelTEH is a parody place inside Octee Airlines. JT is JoelTEH Airlines, JTIA is Joel Teh International Airport, and JTP is the police. None of it is real. All of it is Joel."),
    el("p", {}, el("a", { href: "index.html" }, "Octee home"), " · ", el("a", { href: "cupboard.html" }, "Joel's other cupboard here, not there"), " · ", el("a", { href: "joel-bank.html" }, "Joelmiles Bank")));
  document.body.replaceChildren(header, main, footer);
  return main;
}

function gate(main) {
  main.append(el("div", { class: "jl-card jl-gate" },
    el("h1", {}, "JoelTEH is for Octee accounts"),
    el("p", { class: "jl-note" }, "Log in with your normal Octee account to come in. No separate account, no second password."),
    el("p", {}, el("a", { class: "jl-btn", href: "login.html?next=" + encodeURIComponent(here), style: "text-decoration:none;display:inline-block" }, "Log in / Sign up")),
    el("p", { class: "jl-note" }, "Or ", el("a", { href: "index.html" }, "go back to home, or not"), ".")));
}

async function start() {
  const main = frame();
  if (!currentUser()) { gate(main); return; }
  try {
    const mod = await import("./joel-pages.js");
    const render = mod.PAGES_BY_KEY[page] || mod.PAGES_BY_KEY.home;
    const draw = () => { if (!currentUser()) { location.reload(); return; } main.replaceChildren(render(draw)); };
    document.body.classList.add(page);
    draw();
  } catch (e) {
    console.error(e);
    main.append(el("div", { class: "jl-card" }, el("h2", {}, "This part of JoelTEH fell over"), el("p", { class: "jl-note" }, String(e && e.message || e))));
  }
  import("./joelfab.js").catch(() => {});
}
start();
