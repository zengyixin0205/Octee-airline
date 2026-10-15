// Joelmiles: the money of the JoelTEH area (joel.html). They fly JT flights and pay for the JoelTEH hotels.
// They swap with the other Octee currencies at the rates below. Octeetokens and Fujitech are worth the most.
// Browser-only accounts do the swaps here; cloud accounts have every swap checked again by Octee Cloud
// (cloud/index.js, WALLET.jmIn / jmOut), so the numbers in this file and in the Worker must stay the same.
import { updateUser, currentUser } from "./auth.js";
import { cloudLinked, cloudState, push, pull } from "./cloud.js";
import { CONFIG } from "./config.js";
import { fujitechTenthsOf } from "./fujitech.js";
import { fujitechUnlimited } from "./perks.js";
import { tokensOf, scraggyOf } from "./miles.js";

export const JM_DAY_CAP = 5000;      // Joelmiles one account may swap IN per day
// What 1 unit of each currency gives (IN) and what 1 unit costs (OUT), in Joelmiles. Fujitech is counted in tenths (0.1 Fujitech).
export const JM_IN = { octmiles: 5, scraggy: 10, tokens: 50, fujitech: 6 };
export const JM_OUT = { octmiles: 6, scraggy: 12, tokens: 60, fujitech: 7 };
export const JT_IN = 50, JT_OUT = 40;  // JoelTokens per Joelmile (you pay 50 to get one, and get 40 back when you swap one back)

export const CURRENCIES = {
  octmiles: { label: "Octmiles", unit: "Octmile", step: 1, text: "Octmiles" },
  scraggy: { label: "Scraggymiles", unit: "Scraggymile", step: 1, text: "Scraggymiles" },
  tokens: { label: "Octeetokens", unit: "Octeetoken", step: 1, text: "Octeetokens" },
  fujitech: { label: "Fujitech", unit: "0.1 Fujitech", step: 1, text: "Fujitech" }
};

export const joelmilesOf = (u) => Math.max(0, Math.floor(Number(u && u.joelmiles) || 0));
export const fmtJoelmiles = (n) => `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("en-GB")} Joelmiles`;
const nowIso = () => new Date().toISOString();
const dayKey = () => new Date().toISOString().slice(0, 10);

// How many Joelmiles this account has swapped in today (counted from its own history, like the Worker does).
export function boughtToday(u) {
  const d = dayKey();
  return ((u && u.history) || []).filter((h) => String(h.at || "").slice(0, 10) === d && /^Exchanged (Octmiles|Scraggymiles|Octeetokens|Fujitech|JoelTokens) for Joelmiles$/.test(h.text || "") && h.joelmiles > 0).reduce((n, h) => n + h.joelmiles, 0);
}
export const roomToday = (u) => Math.max(0, JM_DAY_CAP - boughtToday(u));

const have = (u, field) => ({ octmiles: u.octmiles || 0, scraggy: scraggyOf(u), tokens: tokensOf(u), fujitech: fujitechTenthsOf(u) })[field] || 0;
const HIST = { octmiles: "amount", scraggy: "scraggy", tokens: "tokens", fujitech: "fujitechTenths" };

// Swap `units` of a currency INTO Joelmiles. Returns the Joelmiles gained.
export function swapIn(field, units) {
  units = Math.floor(Number(units));
  if (!CURRENCIES[field]) throw new Error("Choose a currency.");
  if (!(units >= 1)) throw new Error("Choose at least 1 " + CURRENCIES[field].unit + ".");
  return updateUser((u) => {
    if (field === "fujitech" && fujitechUnlimited(u)) throw new Error("Your unlimited Fujitech is not a balance, so it cannot be swapped. Earn some Fujitech first.");
    if (have(u, field) < units) throw new Error(`You only have ${have(u, field).toLocaleString("en-GB")} ${CURRENCIES[field].label.toLowerCase()}${field === "fujitech" ? " (in tenths)" : ""}.`);
    const gain = units * JM_IN[field];
    if (gain > roomToday(u)) throw new Error(`The Joelmiles bank takes at most ${JM_DAY_CAP.toLocaleString("en-GB")} Joelmiles a day. You can still swap in ${roomToday(u).toLocaleString("en-GB")} today.`);
    if (field === "octmiles") u.octmiles -= units; else if (field === "scraggy") u.scraggymiles = scraggyOf(u) - units; else if (field === "tokens") u.tokens = tokensOf(u) - units; else u.fujitechTenths = fujitechTenthsOf(u) - units;
    u.joelmiles = joelmilesOf(u) + gain;
    u.history.unshift({ at: nowIso(), text: `Exchanged ${CURRENCIES[field].label} for Joelmiles`, [HIST[field]]: -units, joelmiles: gain });
    return gain;
  });
}
// Swap Joelmiles back OUT. `units` is how many of the other currency you want. Returns the Joelmiles it cost.
export function swapOut(field, units) {
  units = Math.floor(Number(units));
  if (!CURRENCIES[field]) throw new Error("Choose a currency.");
  if (!(units >= 1)) throw new Error("Choose at least 1 " + CURRENCIES[field].unit + ".");
  return updateUser((u) => {
    const cost = units * JM_OUT[field];
    if (joelmilesOf(u) < cost) throw new Error(`That costs ${cost.toLocaleString("en-GB")} Joelmiles. You have ${joelmilesOf(u).toLocaleString("en-GB")}.`);
    u.joelmiles = joelmilesOf(u) - cost;
    if (field === "octmiles") u.octmiles += units; else if (field === "scraggy") u.scraggymiles = scraggyOf(u) + units; else if (field === "tokens") u.tokens = tokensOf(u) + units; else u.fujitechTenths = fujitechTenthsOf(u) + units;
    u.history.unshift({ at: nowIso(), text: `Exchanged Joelmiles for ${CURRENCIES[field].label}`, [HIST[field]]: units, joelmiles: -cost });
    return cost;
  });
}

// ---- JoelTokens <-> Joelmiles: the cloud does the whole swap (it owns the JoelToken ledger) ----
const token = () => (cloudLinked() ? cloudState().token : "");
export const jtSwapAvailable = () => !!token();
async function cloudCall(dir, units) {
  let res;
  try { res = await fetch(CONFIG.CLOUD_URL + "/api/joel/exchange", { method: "POST", headers: { authorization: "Bearer " + token(), "content-type": "application/json" }, body: JSON.stringify({ dir, units }) }); }
  catch { throw new Error("The cloud could not be reached. Nothing was swapped."); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || (res.status === 401 ? "Your cloud login expired. Log in again." : "The swap did not go through. Nothing was changed."));
  return j;
}
// units = Joelmiles. dir "in": pay JoelTokens for Joelmiles. dir "out": hand Joelmiles back for JoelTokens.
export async function swapJoelTokens(dir, units) {
  if (!token()) throw new Error("JoelTokens live in Octee Cloud. Log in with a cloud account to swap them.");
  units = Math.floor(Number(units));
  if (!(units >= 1)) throw new Error("Choose at least 1 Joelmile.");
  await push(true);
  const r = await cloudCall(dir, units);
  await pull();
  return r;
}

// ---- spending ----
// A JT purchase. `cost` is in Joelmiles; the free-JT perk makes it 0. Throws if short. Returns the amount actually taken.
export function spendJoelmiles(u, cost, text, free = false) {
  cost = Math.max(0, Math.ceil(Number(cost) || 0));
  if (free) { u.history.unshift({ at: nowIso(), text: `${text} (free for you: nothing deducted)`, joelmiles: 0 }); return 0; }
  if (joelmilesOf(u) < cost) throw new Error(`You need ${(cost - joelmilesOf(u)).toLocaleString("en-GB")} more Joelmiles. The Joelmiles bank is in the JoelTEH menu.`);
  u.joelmiles = joelmilesOf(u) - cost;
  if (cost) u.history.unshift({ at: nowIso(), text, joelmiles: -cost });
  return cost;
}
export const signedIn = () => !!currentUser();
