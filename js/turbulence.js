// Turbulence mode: a button on every page that shakes the site for a few seconds, with a cabin announcement
// and an all-time coffee-spill counter (kept in this browser).
import { load, save } from "./store.js";
import { reducedMotion } from "./dom.js";

const KEY = "octee.turbulence";
const LINES = [
  "Ladies and gentlemen, we are experiencing some turbulence. This is normal. It is also not normal. Please remain seated.",
  "This is your captain. The bumps are not on the road. We do not have a road. We are sorry about the bumps.",
  "Cabin crew, please take your seats. Cabin crew, you are already in your seats. Please take them again.",
  "Please keep your seatbelt fastened. The seatbelt has no buckle. Please keep believing, and hold on.",
  "We are passing through a small cloud. It is the one from Duty Free. It wants its jar back."
];
let s = load(KEY, { spills: 0, rides: 0 });
let active = false, timers = [];

const btn = document.createElement("button");
btn.type = "button"; btn.className = "turb-btn"; btn.textContent = "〰 Turbulence";
btn.title = "Shake the site for a few seconds";
document.body.append(btn);

const bar = document.createElement("div");
bar.className = "turb-bar"; bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite"); bar.hidden = true;
document.body.append(bar);

function show(text) { bar.innerHTML = ""; const a = document.createElement("div"); a.textContent = "🔔 " + text;
  const c = document.createElement("div"); c.className = "turb-count"; c.textContent = `☕ Coffees spilled: ${s.spills.toLocaleString("en-GB")} (all time)`; bar.append(a, c); bar.hidden = false; }
function stop(msg) {
  active = false; timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = [];
  document.body.classList.remove("turbulent"); btn.textContent = "〰 Turbulence"; btn.setAttribute("aria-pressed", "false");
  show(msg || "The turbulence has ended. The seatbelt sign remains on. Please do not be calm yet.");
  setTimeout(() => { if (!active) bar.hidden = true; }, 7000);
}
function start() {
  active = true; s.rides++; btn.textContent = "Stop shaking"; btn.setAttribute("aria-pressed", "true");
  if (!reducedMotion()) document.body.classList.add("turbulent");
  show(LINES[Math.floor(Math.random() * LINES.length)]);
  const spill = setInterval(() => { s.spills += 1 + Math.floor(Math.random() * 3); save(KEY, s);
    const c = bar.querySelector(".turb-count"); if (c) c.textContent = `☕ Coffees spilled: ${s.spills.toLocaleString("en-GB")} (all time)`; }, 900);
  timers.push(spill, setTimeout(() => stop(), 9000));
}
btn.addEventListener("click", () => (active ? stop("You stopped the turbulence yourself. We are not sure that is allowed.") : start()));
btn.setAttribute("aria-pressed", "false");
