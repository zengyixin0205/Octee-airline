// Small account-owned record lists. The browser copy remains usable offline; a cloud-linked
// account profile carries the same entries to another device through the existing profile sync.
import { currentUser, updateUser } from "./auth.js";
import { load, save } from "./store.js";

export function accountRecords(localKey, profileField, owner, idOf, limit = 60) {
  const local = load(localKey, []).filter((x) => x && typeof x === "object");
  const user = currentUser();
  const mine = local.filter((x) => x.owner === owner || (user && owner === user.username && !x.owner));
  const profile = user && owner === user.username && Array.isArray(user[profileField]) ? user[profileField] : [];
  const merged = new Map();
  for (const x of mine) merged.set(String(idOf(x)), x.owner ? x : { ...x, owner });
  for (const x of profile) if (x && typeof x === "object") merged.set(String(idOf(x)), { ...x, owner });
  return [...merged.values()].slice(-limit);
}

export function saveAccountRecords(localKey, profileField, owner, records, idOf, limit = 60) {
  const user = currentUser();
  const own = [...new Map(records.filter((x) => x && typeof x === "object").map((x) => [String(idOf(x)), { ...x, owner }])).values()].slice(-limit);
  const local = load(localKey, []).filter((x) => x && x.owner !== owner && !(user && owner === user.username && !x.owner));
  save(localKey, [...own, ...local].slice(-(limit + 200)));
  if (user && owner === user.username) updateUser((u) => { u[profileField] = own; });
  return own;
}
