// Shared bits for the games: best scores (this browser) and the once-a-day peanut.
import { today } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { addPeanuts } from "./peanuts.js";
import { load, save } from "./store.js";

const BEST = "octee.games.best";
export const best = (id) => load(BEST, {})[id];
export const setBest = (id, v, higher = true) => { const b = load(BEST, {}); if (b[id] === undefined || (higher ? v > b[id] : v < b[id])) { b[id] = v; save(BEST, b); return true; } return false; };
export function reward(id, text) {
  const u = currentUser(); if (!u) return "Log in to earn peanuts for this.";
  if ((u.gameDay || {})[id] === today()) return "You already earned today's peanut for this game.";
  updateUser((x) => { x.gameDay = { ...(x.gameDay || {}), [id]: today() }; }); addPeanuts(text, 1); return "+1 peanut in your wallet.";
}
