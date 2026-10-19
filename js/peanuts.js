// The peanut wallet. Complaints and apologies pay in peanuts; peanuts buy silly things and JOELMOBILE rides.
// Kept on the account (u.peanuts, u.peanutLog, u.peanutItems), so it lives in this browser like Octmiles.
import { updateUser, currentUser } from "./auth.js";

export const peanutsOf = (u) => (u && u.peanuts) || 0;
export const fmtPeanuts = (n) => `${Number(n || 0).toLocaleString("en-GB")} peanut${Number(n) === 1 ? "" : "s"}`;
export const JOELMOBILE_PEANUTS = 3;                  // a ride costs 5 Octeetokens, or this many peanuts

export const SHOP = [
  { id: "bigger", name: "A slightly bigger peanut", cost: 2, note: "It is bigger. We have not checked how much." },
  { id: "autograph", name: "Joel's autograph", cost: 4, note: "Joel drew a peanut. Then he signed the peanut." },
  { id: "queue", name: "Queue jump (the queue has one complaint in it)", cost: 6, note: "You are now second in the queue. The first one is still waiting." },
  { id: "title", name: "A title: Sir or Dame Peanut", cost: 8, note: "Shown after your name below. It has no legal force." },
  { id: "golden", name: "The Golden Peanut", cost: 15, note: "It is painted. The paint is not gold." },
  { id: "hug", name: "A hug from the airport", cost: 25, note: "The hug was not approved. Your peanuts have been kept, as a hug." }
];

const log = (u, text, amount) => { u.peanutLog = [{ at: new Date().toISOString(), text, amount }, ...(u.peanutLog || [])].slice(0, 30); };

export function addPeanuts(text, n) {
  if (!currentUser() || !(n > 0)) return false;
  updateUser((u) => { u.peanuts = peanutsOf(u) + n; log(u, text, n); });
  return true;
}
// Octmiles can be exchanged for peanuts: 25 Octmiles = 1 peanut. Works on whole peanuts only.
export const PEANUT_MILES = 25;
export function exchangeOctmilesForPeanuts(n) {
  n = Math.floor(Number(n));
  if (!Number.isSafeInteger(n) || n < 1) throw new Error("Choose at least 1 peanut to buy.");
  return updateUser((u) => {
    const miles = n * PEANUT_MILES;
    if ((u.octmiles || 0) < miles) throw new Error(`You need ${miles - (u.octmiles || 0)} more Octmiles.`);
    u.octmiles -= miles;
    u.peanuts = peanutsOf(u) + n;
    u.history.unshift({ at: new Date().toISOString(), text: "Exchanged Octmiles for peanuts", amount: -miles, peanuts: n });
    log(u, "Exchanged Octmiles for peanuts", n);
    return n;
  });
}
// Use inside updateUser(): takes peanuts off or throws a friendly error.
export function spendPeanuts(u, n, text) {
  if (peanutsOf(u) < n) throw new Error(`You have ${fmtPeanuts(peanutsOf(u))} and this costs ${n}. Peanuts do not grow on trees. They grow underground.`);
  u.peanuts = peanutsOf(u) - n;
  log(u, text, -n);
}
export function buy(id) {
  const item = SHOP.find((x) => x.id === id);
  if (!item) throw new Error("We do not sell that. We do not sell most things.");
  return updateUser((u) => {
    spendPeanuts(u, item.cost, "Bought: " + item.name);
    u.peanutItems = { ...(u.peanutItems || {}), [id]: ((u.peanutItems || {})[id] || 0) + 1 };
    return item;
  });
}
