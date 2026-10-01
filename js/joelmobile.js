// JOELMOBILE: the FIA airport buggy that "helps". Managed by Joel Teh Yit Siang.
import { $, el, setMsg, pick, reducedMotion, today } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { addMiles } from "./miles.js";

const RESULTS = [
  "The JOELMOBILE is on its way. It is currently going the other way.",
  "You have arrived! At a gate. Not your gate, but a gate.",
  "The JOELMOBILE has stopped for snacks. Please hold.",
  "Joel says you are already at your gate. Joel is very confident.",
  "Ride complete. Your bags have taken a separate JOELMOBILE."
];
const PICKUPS = ["Check-in Hall", "Food Court", "Toilets", "Baggage Belt 7", "Any Gate"];
const GATES = Array.from({ length: 12 }, (_, i) => "FIA" + String(i + 1).padStart(2, "0"));

const form = $("#ride-form");
PICKUPS.forEach((p) => form.elements.pickup.append(el("option", { value: p }, p)));
GATES.forEach((g) => form.elements.dropoff.append(el("option", { value: g }, "Gate " + g)));

// Live tracker: the buggy drives to a gate and always just misses it
const map = $("#terminal");
const spots = GATES.map((g, i) => ({ g, x: 6 + (i % 6) * 16, y: i < 6 ? 12 : 72 }));
spots.forEach((s) => map.append(el("span", { class: "gate", style: `left:${s.x}%;top:${s.y}%` }, s.g)));
const buggy = el("span", { class: "buggy", "aria-hidden": "true" }, "🛺");
map.append(buggy);
const status = $("#tracker-status");
function drive() {
  const s = pick(spots);
  buggy.style.left = `calc(${s.x}% + ${Math.random() < .5 ? -30 : 50}px)`;
  buggy.style.top = `calc(${s.y}% + 28px)`;
  status.textContent = `JOELMOBILE location: nearby ${s.g} (spiritually)`;
}
if (reducedMotion()) status.textContent = "JOELMOBILE location: parked. Joel is on a break.";
else { drive(); setInterval(drive, 2600); }

const msg = $("#ride-msg");
const syncHint = () => {
  const u = currentUser();
  const n = u ? (u.rides || []).filter((r) => r.day === today()).length : 0;
  $("#ride-hint").textContent = u ? `You've been helped ${n} of 3 times today (20 Octmiles each).` : "Log in to earn Octmiles for being helped.";
};
syncHint();
window.addEventListener("octee:account", syncHint);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  setMsg(msg, "Locating the JOELMOBILE…", "info");
  setTimeout(() => {
    const result = pick(RESULTS);
    const u = currentUser();
    let extra = "";
    if (u) {
      const done = (u.rides || []).filter((r) => r.day === today()).length;
      if (done < 3) {
        updateUser((x) => {
          x.rides = [...(x.rides || []), { day: today(), pickup: form.elements.pickup.value, dropoff: form.elements.dropoff.value, result }];
          addMiles(x, 20, "JOELMOBILE ride (you were helped)");
        });
        extra = " +20 Octmiles.";
      } else extra = " (No more Octmiles today: you have been helped enough.)";
    }
    setMsg(msg, result + extra, "ok");
    syncHint();
  }, reducedMotion() ? 0 : 1400);
});
