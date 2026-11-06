// Seasonal themes: Christmas, Chinese New Year and Halloween, switched on (or off) from the Control Tower's
// Theme tab, same cloud-published pattern as ads and music (data/theme.json is the fallback). Each theme has
// its own on/off switch and an optional start/end date range (same shape as an ad's dates — blank means "no
// date limit, just use the switch"). At most one theme is ever shown at once: if more than one is somehow left
// on, Christmas wins over Chinese New Year wins over Halloween, in that order — the Control Tower's own preview
// warns when more than one is on, so this should not normally come up.
//
// Every effect here is pure decoration: CSS animations plus small DOM nodes this module spawns and removes
// itself, all behind pointer-events:none so nothing sits on top of the page's real buttons and links. Nothing
// is fetched from anywhere except this site's own published theme data.
//
// Chinese New Year also gets one interactive piece: a small red-packet ("ang pao") button, bottom-right of
// every page. One click a day credits Fujitech to whoever is logged in — the amount is set by the Control
// Tower (THEME_CNY_REWARD below is only the fallback, for before anything has been saved). It reuses the exact
// crediting pattern FujiAIR's existing daily Fujitech claim already uses (see js/fujitech.js: claimAngPao is
// claimFujiairDaily's twin), so the cloud validates it the same way.
import { el, today } from "./dom.js";
import { fetchPublished } from "./published.js";
import { currentUser } from "./auth.js";
import { claimAngPao, angPaoClaimedToday, fmtFujitech } from "./fujitech.js";
import { push } from "./cloud.js";

export const THEME_KEYS = ["christmas", "cny", "halloween"];
export const THEME_CNY_REWARD = 188; // Fujitech, before the Control Tower has saved its own amount

// Clean one theme entry (also used by the Control Tower before saving).
export function cleanThemeEntry(t, key) {
  const d = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
  const entry = { on: !!(t && t.on), start: d(t?.start), end: d(t?.end) };
  if (key === "cny") entry.reward = Math.max(0, Math.min(100000, Math.floor(Number(t?.reward) || 0))) || THEME_CNY_REWARD;
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
    flake.style.fontSize = (10 + Math.random() * 14) + "px";
    flake.style.opacity = (0.45 + Math.random() * 0.5).toFixed(2);
    flake.style.animationDuration = dur + "s, " + drift + "s";
    layer.append(flake);
    setTimeout(() => flake.remove(), dur * 1000 + 200);
  };
  for (let i = 0; i < 20; i++) setTimeout(spawn, Math.random() * 5000);
  setInterval(spawn, 450);
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

function flashNear(text) {
  const msg = el("div", { class: "ang-pao-flash" }, text);
  document.body.append(msg);
  setTimeout(() => msg.remove(), 3500);
}

function mountAngPao(reward) {
  const amount = Math.max(0, Math.floor(Number(reward) || 0)) || THEME_CNY_REWARD;
  const icon = el("button", { class: "ang-pao-btn", type: "button", "aria-label": "Open today's Chinese New Year ang pao" }, "🧧");
  const u0 = currentUser();
  if (u0 && angPaoClaimedToday(u0)) icon.classList.add("ang-pao-opened");
  icon.addEventListener("click", () => {
    const u = currentUser();
    if (!u) return flashNear("Log in to open today's ang pao.");
    try {
      const gained = claimAngPao(amount);
      push().catch(() => {});
      flashNear(`+${fmtFujitech(gained)}! Gong xi fa cai.`);
      icon.classList.add("ang-pao-opened");
    } catch (e) { flashNear(e.message); }
  });
  document.body.append(icon);
}

export async function mountTheme() {
  const data = await fetchPublished("theme", "data/theme.json", {});
  const key = activeThemeKey(data);
  if (!key) return;
  document.body.classList.add("theme-" + key);
  if (key === "christmas") mountSnow();
  else if (key === "cny") { mountFireworks(); mountCnySides(); mountAngPao(data.cny?.reward); }
  else if (key === "halloween") mountBats();
}
