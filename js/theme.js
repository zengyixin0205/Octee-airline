// Seasonal themes: Christmas, Chinese New Year, Deepavali, Halloween, Hari Raya Aidilfitri, Hari Raya Haji, Vesak,
// Mid-Autumn, Thaipusam and Easter, switched on (or off) from the Control Tower's Theme tab, same cloud-published
// pattern as ads and music (data/theme.json is the fallback). Each theme has its own on/off switch and an optional
// start/end date range (same shape as an ad's dates — blank means "no date limit, just use the switch").
// At most one theme is ever shown at once: if more than one is somehow left on, the first one in THEME_KEYS order
// that is active today wins (the original four keep their order, then the new festivals in the order listed).
// The Control Tower's own preview warns when more than one is on, so this should not normally come up.
//
// Every effect here is pure decoration: CSS animations plus small DOM nodes this module spawns and removes
// itself, all behind pointer-events:none so nothing sits on top of the page's real buttons and links. Nothing
// is fetched from anywhere except this site's own published theme data.
//
// Five festivals pay a small daily reward through one floating button bottom-right of every page: Chinese New
// Year (ang pao), Hari Raya Aidilfitri (duit raya), Mid-Autumn (lantern) and Easter (egg). One click a day credits
// Fujitech to whoever is logged in. The amount is set by the Control Tower (THEME_REWARDS below holds only the
// fallback, for before anything has been saved). It reuses the exact crediting pattern FujiAIR's daily Fujitech
// claim already uses (see js/fujitech.js), so the cloud validates it the same way (cloud/index.js THEME_REWARDS).
import { el, today } from "./dom.js";
import { fetchPublished } from "./published.js";
import { currentUser } from "./auth.js";
import { claimThemeReward, themeRewardClaimedToday, fmtFujitech } from "./fujitech.js";
import { push } from "./cloud.js";
import { mountPieces, settleCandy } from "./festival-pieces.js";

export const THEME_KEYS = ["christmas", "cny", "deepavali", "halloween", "aidilfitri", "haji", "vesak", "midautumn", "thaipusam", "easter"];
export const THEME_CNY_REWARD = 188; // Fujitech, before the Control Tower has saved its own amount

// Festivals with a daily reward. `text` is the history line the claim writes and the cloud checks: keep it exactly
// as in cloud/index.js THEME_REWARDS. `fallback` is used until the Control Tower saves an amount.
export const THEME_REWARDS = {
  cny:        { text: "Chinese New Year ang pao",       icon: "🧧", aria: "Open today's Chinese New Year ang pao",  login: "Log in to open today's ang pao.",        flash: "Gong xi fa cai!",    fallback: THEME_CNY_REWARD },
  aidilfitri: { text: "Hari Raya Aidilfitri duit raya", icon: "💵", aria: "Open today's Hari Raya duit raya",       login: "Log in to open today's duit raya.",       flash: "Selamat Hari Raya!", fallback: 88 },
  midautumn:  { text: "Mid-Autumn lantern",             icon: "🏮", aria: "Light today's Mid-Autumn lantern",       login: "Log in to light today's lantern.",        flash: "Happy Mid-Autumn!",  fallback: 88 },
  easter:     { text: "Easter egg",                     icon: "🥚", aria: "Find today's Easter egg",                login: "Log in to find today's egg.",             flash: "Happy Easter!",      fallback: 88 },
};

// Clean one theme entry (also used by the Control Tower before saving).
export function cleanThemeEntry(t, key) {
  const d = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
  const entry = { on: !!(t && t.on), start: d(t?.start), end: d(t?.end) };
  if (THEME_REWARDS[key]) entry.reward = Math.max(0, Math.min(100000, Math.floor(Number(t?.reward) || 0))) || THEME_REWARDS[key].fallback;
  return entry;
}
export function cleanTheme(data) {
  const out = {};
  THEME_KEYS.forEach((k) => { out[k] = cleanThemeEntry(data?.[k] || {}, k); });
  return out;
}
// Which, if any, theme is active right now: on, and (no date limits, or today falls inside them).
export function activeThemeKey(data, day = today()) {
  return THEME_KEYS.find((k) => {
    const t = data?.[k];
    return t && t.on && (!t.start || t.start <= day) && (!t.end || t.end >= day);
  }) || null;
}

// Festival names and home-page greetings, shown while that theme is on (home page and departures board).
export const THEME_NAMES = {
  christmas: "Christmas", cny: "Chinese New Year", deepavali: "Deepavali", halloween: "Halloween",
  aidilfitri: "Hari Raya Aidilfitri", haji: "Hari Raya Haji", vesak: "Vesak", midautumn: "Mid-Autumn", thaipusam: "Thaipusam", easter: "Easter",
};
export const THEME_GREETINGS = {
  christmas: "Merry Christmas from Octee. Your presents are delayed too.",
  cny: "Gong xi fa cai from Octee. Your ang pao is waiting bottom right.",
  deepavali: "Happy Deepavali from Octee. May all your delays be lit.",
  halloween: "Happy Halloween from Octee. Every flight is a little spooky.",
  aidilfitri: "Selamat Hari Raya from Octee. Maaf zahir dan batin, and sorry for the delays.",
  haji: "Selamat Hari Raya Haji from Octee. Safe travels, eventually.",
  vesak: "Happy Vesak from Octee. Please be patient, like the lotus.",
  midautumn: "Happy Mid-Autumn from Octee. Our lanterns are lit. Our flights are not.",
  thaipusam: "Happy Thaipusam from Octee. Carry your burdens, not your luggage.",
  easter: "Happy Easter from Octee. Egg hunt only, no flights found.",
};
// The theme on right now (or null), read once per page and shared by everything that asks.
let themeNowPromise = null;
export function currentThemeKey() {
  if (!themeNowPromise) themeNowPromise = fetchPublished("theme", "data/theme.json", {}).then((data) => activeThemeKey(data)).catch(() => null);
  return themeNowPromise;
}

function fxLayer() {
  const layer = el("div", { class: "theme-fx", "aria-hidden": "true" });
  document.body.append(layer);
  return layer;
}

function mountSnow() {
  const layer = fxLayer();
  const spawn = () => {
    const dur = 8 + Math.random() * 8, drift = 3 + Math.random() * 3;
    const flake = el("span", { class: "theme-snowflake" }, "❄");
    flake.style.left = (Math.random() * 100) + "vw";
    flake.style.fontSize = (16 + Math.random() * 20) + "px";
    flake.style.opacity = (0.45 + Math.random() * 0.5).toFixed(2);
    flake.style.animationDuration = dur + "s, " + drift + "s";
    layer.append(flake);
    setTimeout(() => flake.remove(), dur * 1000 + 200);
  };
  for (let i = 0; i < 40; i++) setTimeout(spawn, Math.random() * 5000);
  setInterval(spawn, 220);
}

function mountFireworks() {
  const layer = fxLayer();
  const COLORS = ["#ffd54a", "#ff6b4a", "#ff4a7a", "#ffffff", "#ffb347", "#5ad1ff"];
  const burst = () => {
    const cx = 8 + Math.random() * 84, cy = 8 + Math.random() * 46, n = 14;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n, dist = 36 + Math.random() * 58;
      const dot = el("span", { class: "theme-firework" });
      dot.style.left = cx + "vw"; dot.style.top = cy + "vh";
      dot.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      dot.style.setProperty("--fx", (Math.cos(angle) * dist).toFixed(1) + "px");
      dot.style.setProperty("--fy", (Math.sin(angle) * dist).toFixed(1) + "px");
      layer.append(dot);
      setTimeout(() => dot.remove(), 1000);
    }
  };
  burst();
  setInterval(burst, 2200 + Math.random() * 1400);
}

// Red decoration "at the side": two fixed ribbons, one per edge of the viewport, with a couple of red-packet
// emoji on them — separate from the interactive ang pao button below, which stays bottom-right so it never
// overlaps these.
function mountCnySides() {
  document.body.append(el("div", { class: "theme-cny-side left", "aria-hidden": "true" }), el("div", { class: "theme-cny-side right", "aria-hidden": "true" }));
}

// Deepavali: twinkling diya (oil lamp) lights scattered over the page, plus gold side decoration echoing the
// Christmas/CNY side touches. Bo asked for "deepavali and stuff" without naming a specific effect, so this —
// like Halloween's bats — is this session's own pick, not something he specified.
function mountDiyas() {
  const layer = fxLayer();
  const spawn = () => {
    const dur = 2.5 + Math.random() * 2.5;
    const diya = el("span", { class: "theme-diya" }, "🪔");
    diya.style.left = (4 + Math.random() * 92) + "vw";
    diya.style.top = (8 + Math.random() * 78) + "vh";
    diya.style.animationDuration = dur + "s";
    layer.append(diya);
    setTimeout(() => diya.remove(), 6500);
  };
  for (let i = 0; i < 10; i++) setTimeout(spawn, Math.random() * 1500);
  setInterval(spawn, 850);
  document.body.append(el("div", { class: "theme-deepavali-side left", "aria-hidden": "true" }), el("div", { class: "theme-deepavali-side right", "aria-hidden": "true" }));
}

function mountBats() {
  const layer = fxLayer();
  const spawn = () => {
    const dur = 6 + Math.random() * 6;
    const bat = el("span", { class: "theme-bat" }, "🦇");
    bat.style.top = (Math.random() * 40) + "vh";
    bat.style.animationDuration = dur + "s";
    layer.append(bat);
    setTimeout(() => bat.remove(), dur * 1000 + 200);
  };
  for (let i = 0; i < 5; i++) setTimeout(spawn, Math.random() * 3500);
  setInterval(spawn, 1700);
  // A little decoration at the side too, echoing Christmas/CNY's own side touches, in Halloween colours.
  document.body.append(el("div", { class: "theme-halloween-side left", "aria-hidden": "true" }, "🎃"), el("div", { class: "theme-halloween-side right", "aria-hidden": "true" }, "🎃"));
}

// The newer festivals share three small helpers: emoji falling or rising across the page, emoji twinkling in place,
// and coloured side ribbons (`.theme-side`) whose colour and icon are passed in as CSS variables.
function mountFalling(emoji, every = 700, first = 10) {
  const layer = fxLayer();
  const spawn = () => {
    const dur = 7 + Math.random() * 6;
    const piece = el("span", { class: "theme-fall", "aria-hidden": "true" }, emoji);
    piece.style.left = (Math.random() * 100) + "vw";
    piece.style.fontSize = (12 + Math.random() * 12) + "px";
    piece.style.animationDuration = dur + "s";
    layer.append(piece);
    setTimeout(() => piece.remove(), dur * 1000 + 200);
  };
  for (let i = 0; i < first; i++) setTimeout(spawn, Math.random() * 5000);
  setInterval(spawn, every);
}

function mountRising(emoji, every = 1100, first = 6) {
  const layer = fxLayer();
  const spawn = () => {
    const dur = 9 + Math.random() * 6;
    const item = el("span", { class: "theme-rise", "aria-hidden": "true" }, emoji);
    item.style.left = (4 + Math.random() * 92) + "vw";
    item.style.fontSize = (16 + Math.random() * 10) + "px";
    item.style.animationDuration = dur + "s";
    layer.append(item);
    setTimeout(() => item.remove(), dur * 1000 + 200);
  };
  for (let i = 0; i < first; i++) setTimeout(spawn, Math.random() * 5000);
  setInterval(spawn, every);
}

function mountTwinkle(emoji, every = 600) {
  const layer = fxLayer();
  const spawn = () => {
    const dur = 2.5 + Math.random() * 2.5;
    const star = el("span", { class: "theme-twinkle", "aria-hidden": "true" }, emoji);
    star.style.left = (4 + Math.random() * 92) + "vw";
    star.style.top = (8 + Math.random() * 78) + "vh";
    star.style.animationDuration = dur + "s";
    layer.append(star);
    setTimeout(() => star.remove(), 6500);
  };
  for (let i = 0; i < 10; i++) setTimeout(spawn, Math.random() * 1500);
  setInterval(spawn, every);
}

function mountSides(icon, gradient) {
  for (const side of ["left", "right"]) {
    const edge = el("div", { class: "theme-side " + side, "aria-hidden": "true" });
    edge.style.setProperty("--side-bg", gradient);
    edge.style.setProperty("--side-icon", `"${icon}"`);
    document.body.append(edge);
  }
}

function flashNear(text) {
  const msg = el("div", { class: "ang-pao-flash" }, text);
  document.body.append(msg);
  setTimeout(() => msg.remove(), 3500);
}

// One floating reward button for whichever festival with a reward is on (never more than one theme at once).
function mountReward(key, reward) {
  const cfg = THEME_REWARDS[key];
  const amount = Math.max(0, Math.floor(Number(reward) || 0)) || cfg.fallback;
  const btn = el("button", { class: "ang-pao-btn", type: "button", "aria-label": cfg.aria }, cfg.icon);
  const u0 = currentUser();
  if (u0 && themeRewardClaimedToday(u0, cfg.text)) btn.classList.add("ang-pao-opened");
  btn.addEventListener("click", () => {
    const u = currentUser();
    if (!u) return flashNear(cfg.login);
    try {
      const gained = claimThemeReward(cfg.text, amount);
      push().catch(() => {});
      flashNear(`+${fmtFujitech(gained)}! ${cfg.flash}`);
      btn.classList.add("ang-pao-opened");
    } catch (e) { flashNear(e.message); }
  });
  document.body.append(btn);
}

export async function mountTheme() {
  const data = await fetchPublished("theme", "data/theme.json", {});
  settleCandy(); // sweets taken earlier are charged on this visit, whatever theme is on
  const key = activeThemeKey(data);
  if (!key) return;
  document.body.classList.add("theme-" + key);
  if (key === "christmas") mountSnow();
  else if (key === "cny") { mountFireworks(); mountCnySides(); mountReward("cny", data.cny?.reward); }
  else if (key === "deepavali") mountDiyas();
  else if (key === "halloween") mountBats();
  else if (key === "aidilfitri") { mountTwinkle("🌙"); mountSides("🌙", "linear-gradient(180deg, #1e7a4c, #c9a227)"); mountReward("aidilfitri", data.aidilfitri?.reward); }
  else if (key === "haji") { mountTwinkle("⭐"); mountSides("🕋", "linear-gradient(180deg, #2e8b57, #f5f5f5)"); }
  else if (key === "vesak") { mountFalling("🪷"); mountSides("🪷", "linear-gradient(180deg, #1f5fa8, #e8c15a)"); }
  else if (key === "midautumn") { mountRising("🏮"); mountSides("🌕", "linear-gradient(180deg, #14213d, #d4a017)"); mountReward("midautumn", data.midautumn?.reward); }
  else if (key === "thaipusam") { mountFalling("🌼"); mountSides("🌼", "linear-gradient(180deg, #5b2a86, #e0a526)"); }
  else if (key === "easter") { mountFalling("🥚", 900); mountFalling("🐰", 1500, 4); mountSides("🐰", "linear-gradient(180deg, #f7b6d2, #a8e6cf)"); mountReward("easter", data.easter?.reward); }
  mountPieces(key);
}
