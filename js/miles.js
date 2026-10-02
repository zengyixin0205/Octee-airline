// Octmiles: tiers, rewards, history and the "Have a code?" box. All in this browser.
import { currentUser, updateUser } from "./auth.js";
import { codeHash, normalizeCode } from "./crypto.js";
import { today } from "./dom.js";

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

// ----- Octeetokens -----
// Octmiles are exchanged for Octeetokens (one way). Tokens pay for the JOELMOBILE,
// class upgrades and one more code for today.
export const TOKEN_RATE = 10;                 // 10 Octmiles = 1 Octeetoken
export const CODES_PER_DAY = 5;               // codes one account can redeem per day
export const TOKEN_PRICES = { joelmobile: 5, extraCode: 20 };
export const tokensOf = (u) => (u && u.tokens) || 0;
export const fmtTokens = (n) => `${Number(n || 0).toLocaleString("en-GB")} Octeetoken${Number(n) === 1 ? "" : "s"}`;

// Use inside updateUser(): takes tokens off the account or throws a friendly error.
export function spendTokens(u, n, text) {
  if (tokensOf(u) < n) { const short = n - tokensOf(u); throw new Error(`You need ${short} more Octeetoken${short === 1 ? "" : "s"} (this costs ${n}). Exchange Octmiles on the Octmiles page.`); }
  u.tokens = tokensOf(u) - n;
  u.history.unshift({ at: new Date().toISOString(), text, amount: 0, tokens: -n });
}
export function exchangeMiles(tokens) {
  tokens = Math.floor(Number(tokens));
  if (!(tokens >= 1)) throw new Error("Choose at least 1 Octeetoken.");
  return updateUser((u) => {
    const cost = tokens * TOKEN_RATE;
    if (u.octmiles < cost) throw new Error(`That costs ${cost.toLocaleString("en-GB")} Octmiles. You have ${u.octmiles.toLocaleString("en-GB")}.`);
    u.octmiles -= cost;                         // lifetime stays the same, so the tier never drops
    u.tokens = tokensOf(u) + tokens;
    u.history.unshift({ at: new Date().toISOString(), text: "Exchanged Octmiles for Octeetokens", amount: -cost, tokens });
    return tokens;
  });
}
export const codesToday = (u) => ({ used: ((u && u.codeDays) || {})[today()] || 0, extra: ((u && u.codeExtra) || {})[today()] || 0 });
export const codesLeft = (u) => { const c = codesToday(u); return Math.max(0, CODES_PER_DAY + c.extra - c.used); };
export function buyExtraCode() {
  return updateUser((u) => {
    spendTokens(u, TOKEN_PRICES.extraCode, "One more code for today");
    u.codeExtra = { [today()]: codesToday(u).extra + 1 };
  });
}

// ----- Codes -----
export const CODE_MESSAGES = {
  ok: (n) => `+${n.toLocaleString("en-GB")} Octmiles! Please don't spend them all on one peanut.`,
  not_real: "That code is not real. Like our on-time record.",
  already: "You already used this code. Nice try.",
  expired: "This code has expired. Like your boarding pass.",
  grounded: "This code has been grounded.",
  limit: `You have used all your codes for today (${CODES_PER_DAY} a day). Come back tomorrow, or get one more for ${TOKEN_PRICES.extraCode} Octeetokens on the Octmiles page.`,
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
  if (codesLeft(u) <= 0) return { ok: false, message: CODE_MESSAGES.limit };
  let codes;
  try { codes = await loadCodes(); } catch { return { ok: false, message: CODE_MESSAGES.offline }; }
  const hash = await codeHash(input);
  let c = codes.find((x) => x.hash === hash);
  // Number rule: any 5 digits that start with 1 or 2 and end in an odd digit
  // are worth their first three digits (23487 -> 234 Octmiles). Listed codes win.
  const digits = normalizeCode(input);
  if (!c && /^[12]\d{3}[13579]$/.test(digits)) c = { octmiles: Number(digits.slice(0, 3)), active: true, expires: null };
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
    x.codeDays = { [today()]: codesToday(x).used + 1 };   // only successful codes count towards the daily limit
    addMiles(x, c.octmiles, "Code " + normalizeCode(input));
  });
  return { ok: true, message: CODE_MESSAGES.ok(c.octmiles), amount: c.octmiles };
}
