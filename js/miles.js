// Octmiles: tiers, rewards, history and the "Have a code?" box. All in this browser.
import { currentUser, updateUser } from "./auth.js";
import { codeHash, normalizeCode } from "./crypto.js";

export const TIERS = [
  { name: "Economy Peanut", min: 0, perk: "One peanut." },
  { name: "Silver Wing", min: 500, perk: "Priority boarding for the wrong gate." },
  { name: "Gold Wing", min: 2000, perk: "Two peanuts (one is a photo of a peanut)." },
  { name: "Platinum Wing", min: 10000, perk: "The JOELMOBILE picks you up first. Probably." }
];
export const tierFor = (lifetime) => [...TIERS].reverse().find((t) => lifetime >= t.min);
export const nextTier = (lifetime) => TIERS.find((t) => t.min > lifetime) || null;

export const REWARDS = [
  { id: "second-peanut", name: "A second peanut", cost: 250, once: false, outOfStock: true, note: "Always out of stock." },
  { id: "joelmobile", name: "Priority JOELMOBILE pickup", cost: 300, once: false, note: "Still arrives late." },
  { id: "bag-tracking", name: "Bag tracking upgrade", cost: 500, once: false, note: "Your bag is now lost in HD." },
  { id: "window-seat", name: "Window seat", cost: 800, once: false, note: "Window not included." },
  { id: "engine-check", name: "Engine check before your flight", cost: 1500, once: true, note: "Shows a \"✔ Engines (probably) working\" badge." },
  { id: "name-gate", name: "Name a gate at FIA after yourself", cost: 5000, once: true, note: "Shown on the FIA terminal map (in your browser)." },
  { id: "cockpit-tour", name: "Cockpit tour", cost: 10000, once: true, note: "Cockpit may be closed for \"reasons\"." }
];

export function addMiles(u, amount, text) {
  u.octmiles += amount;
  u.lifetime += amount;
  u.history.unshift({ at: new Date().toISOString(), text, amount });
}

export function redeemReward(id) {
  const r = REWARDS.find((x) => x.id === id);
  return updateUser((u) => {
    if (!r) throw new Error("No such reward. Like our refunds.");
    if (r.outOfStock) throw new Error("Out of stock. It was always going to be.");
    if (r.once && u.redemptions.some((x) => x.id === id)) throw new Error("You already have this. Once was plenty.");
    if (u.octmiles < r.cost) throw new Error(`You need ${(r.cost - u.octmiles).toLocaleString("en-GB")} more Octmiles.`);
    u.octmiles -= r.cost;                       // lifetime stays the same, so the tier never drops
    u.redemptions.push({ id, at: new Date().toISOString() });
    u.history.unshift({ at: new Date().toISOString(), text: "Reward: " + r.name, amount: -r.cost });
    return r;
  });
}

// ----- Codes -----
export const CODE_MESSAGES = {
  ok: (n) => `+${n.toLocaleString("en-GB")} Octmiles! Please don't spend them all on one peanut.`,
  not_real: "That code is not real. Like our on-time record.",
  already: "You already used this code. Nice try.",
  expired: "This code has expired. Like your boarding pass.",
  grounded: "This code has been grounded.",
  too_many: "Too many wrong codes. Please wait an hour and think about what you've done.",
  login: "Log in to use a code.",
  offline: "The code list is delayed. Please try again (or check you're online)."
};

let codesCache = null;
export async function loadCodes() {
  if (codesCache) return codesCache;
  const res = await fetch("data/codes.json", { cache: "no-store" });
  if (!res.ok) throw new Error("offline");
  const json = await res.json();
  codesCache = Array.isArray(json.codes) ? json.codes : [];
  return codesCache;
}

export async function redeemCode(input) {
  const u = currentUser();
  if (!u) return { ok: false, message: CODE_MESSAGES.login };
  const hourAgo = Date.now() - 3600_000;
  if ((u.codeFails || []).filter((t) => t > hourAgo).length >= 10) return { ok: false, message: CODE_MESSAGES.too_many };
  let codes;
  try { codes = await loadCodes(); } catch { return { ok: false, message: CODE_MESSAGES.offline }; }
  const hash = await codeHash(input);
  const c = codes.find((x) => x.hash === hash);
  let problem = null;
  if (!normalizeCode(input) || !c) problem = "not_real";
  else if (c.active === false) problem = "grounded";
  else if (c.expires && new Date(c.expires + "T23:59:59") < new Date()) problem = "expired";
  else if (u.codesUsed && u.codesUsed[hash]) problem = "already";
  if (problem) {
    updateUser((x) => { x.codeFails = [...(x.codeFails || []).filter((t) => t > hourAgo), Date.now()]; });
    return { ok: false, message: CODE_MESSAGES[problem] };
  }
  updateUser((x) => {
    x.codesUsed = x.codesUsed || {};
    x.codesUsed[hash] = new Date().toISOString();
    addMiles(x, c.octmiles, "Code " + normalizeCode(input));
  });
  return { ok: true, message: CODE_MESSAGES.ok(c.octmiles), amount: c.octmiles };
}
