// Shared on every page: header + nav, account area, side clock, footer, and the secret 8-click logo.
import { CONFIG } from "./config.js";
import { $, el, fmtMiles } from "./dom.js";
import { currentUser, logOut } from "./auth.js";
import { tierFor } from "./miles.js";

const PAGES = [
  ["index.html", "Home"],
  ["destinations.html", "Destinations"],
  ["book.html", "Book a Flight"],
  ["status.html", "Flight Status"],
  ["baggage.html", "Baggage", "wonky"],
  ["experience.html", "In-Flight"],
  ["fia.html", "FIA Airport"],
  ["joelmobile.html", "JOELMOBILE"],
  ["reviews.html", "Reviews"],
  ["octmiles.html", "Octmiles"],
  ["about.html", "About"],
  ["contact.html", "Contact"]
];

const here = () => location.pathname.split("/").pop() || "index.html";

function renderAccount(box) {
  const u = currentUser();
  if (!u) {
    box.replaceChildren(el("a", { class: "btn small", href: "login.html?next=" + encodeURIComponent(here()) }, "Log in / Sign up"));
    return;
  }
  const tier = tierFor(u.lifetime);
  box.replaceChildren(
    el("span", {}, "Hi, ", el("a", { href: "account.html" }, u.username)),
    el("a", { class: "pill", href: "octmiles.html", title: "Your Octmiles" }, fmtMiles(u.octmiles) + " Octmiles"),
    el("span", { class: "pill gold" }, tier.name),
    el("a", { href: "#", onclick: async (e) => { e.preventDefault(); (await import("./code-box.js")).openCodeBox(); } }, "Have a code?"),
    el("button", { class: "btn small ghost", type: "button", onclick: () => { logOut(); location.href = "index.html"; } }, "Log out")
  );
}

function buildHeader() {
  const holder = $("#site-header");
  if (!holder) return;
  const nav = el("nav", { class: "site-nav", id: "site-nav", "aria-label": "Main" },
    PAGES.map(([href, label, cls]) => el("a", { href, class: cls || null, "aria-current": here() === href ? "page" : null }, label)));
  const toggle = el("button", { class: "nav-toggle", type: "button", "aria-expanded": "false", "aria-controls": "site-nav" }, "Menu");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  const logo = el("a", { class: "logo", href: "index.html", "aria-label": "Octee Airlines home" },
    el("img", { src: "assets/img/octee-logo.svg", alt: "Octee Airlines", width: "200", height: "100" }));
  wireSecretLogo(logo);
  const account = el("div", { class: "account-box", id: "account-box" });
  holder.replaceWith(el("header", { class: "site-header" },
    el("a", { class: "skip", href: "#main" }, "Skip to content"),
    el("div", { class: "header-inner" }, logo, toggle, account, nav)));
  renderAccount(account);
  window.addEventListener("octee:account", () => renderAccount(account));
  window.addEventListener("storage", () => renderAccount(account));
}

// Click the logo 8 times quickly (within 4 s) → Control Tower. Otherwise it goes Home as normal.
function wireSecretLogo(logo) {
  let clicks = [];
  let timer = null;
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    const now = Date.now();
    clicks = [...clicks.filter((t) => now - t < CONFIG.TOWER_WINDOW_MS), now];
    clearTimeout(timer);
    if (clicks.length >= CONFIG.TOWER_CLICKS) {
      clicks = [];
      import("./control-tower.js").then((m) => m.openControlTower());
      return;
    }
    timer = setTimeout(() => {
      const n = clicks.length;
      clicks = [];
      if (n === 1 || here() !== "index.html") location.href = "index.html";
    }, 550);
  });
}

function buildClock() {
  if ($("#clock")) return;
  const fmt = (timeZone) => {
    try { return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
    catch { return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
  };
  const yours = fmt(undefined), fia = fmt(CONFIG.FIA_TIMEZONE), sia = fmt(CONFIG.SIA_TIMEZONE);
  const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const t = { yours: el("time", { class: "clock-time" }, "--:--:--"), fia: el("time", { class: "clock-time" }, "--:--:--"), sia: el("time", { class: "clock-time" }, "--:--:--") };
  const date = el("div", { class: "clock-date" });
  const panel = el("aside", { id: "clock", class: "clock", "aria-label": "Current time" },
    el("div", { class: "clock-row" }, el("span", { class: "clock-label" }, "Your time"), t.yours),
    el("div", { class: "clock-row" }, el("span", { class: "clock-label" }, "FIA time"), t.fia),
    el("div", { class: "clock-row" }, el("span", { class: "clock-label" }, "SIA time"), t.sia),
    date,
    el("div", { class: "clock-joke" }, "FIA and SIA share a time zone. Our flights still can't agree on the time."));
  const header = $(".site-header");
  header ? header.after(panel) : document.body.prepend(panel);
  const tick = () => {
    const now = new Date();
    t.yours.textContent = yours.format(now);
    t.fia.textContent = fia.format(now);
    t.sia.textContent = sia.format(now);
    date.textContent = dateFmt.format(now);
  };
  let timer = null;
  const start = () => { if (!timer) { tick(); timer = setInterval(tick, 1000); } };
  const stop = () => { clearInterval(timer); timer = null; };
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
}

function buildFooter() {
  const holder = $("#site-footer");
  if (!holder) return;
  holder.replaceWith(el("footer", { class: "site-footer" },
    el("div", { class: "inner" },
      el("p", {}, "Octee Airlines, a member of FAG (Fuji Airport Group). Operating from FIA (Fuji International Airport)."),
      el("p", { class: "foot" }, "Partner airline: Scraggy Airlines (SA), based at Scraggy International Airport (SIA). Accounts and Octmiles are kept in your browser."),
      el("p", {}, el("a", { href: "status.html" }, "Flight Status"), " · ", el("a", { href: "reviews.html" }, "Reviews"), " · ", el("a", { href: "contact.html" }, "Contact"))
    )));
}

buildHeader();
buildClock();
buildFooter();
