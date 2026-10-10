// Reviews = the archive in data/reviews.json + reviews saved in Octee Cloud (shown to everyone) + reviews written
// without a cloud login (kept in this browser only).
import { load, save } from "./store.js";
import { CONFIG } from "./config.js";
import { cloudState, cloudLinked } from "./cloud.js";

const KEY = "octee.reviews";
let archive = null;

export async function loadArchive() {
  if (archive) return archive;
  try {
    const res = await fetch("data/reviews.json", { cache: "no-store" });
    archive = res.ok ? ((await res.json()).reviews || []).map((r) => ({ ...r, archived: true })) : [];
  } catch { archive = []; }
  return archive;
}
export const localReviews = () => Object.values(load(KEY, {}));

// Reviews saved in the cloud. Returns [] if the cloud cannot be reached.
export async function cloudReviews() {
  try {
    const res = await fetch(CONFIG.CLOUD_URL + "/api/reviews", { cache: "no-store" });
    return res.ok ? ((await res.json()).reviews || []).map((r) => ({ ...r, cloud: true })) : [];
  } catch { return []; }
}
export async function allReviews() {
  const cloud = await cloudReviews(), seen = new Set(cloud.map((r) => String(r.username).toLowerCase()));
  const mine = localReviews().filter((r) => !seen.has(String(r.username).toLowerCase())); // the cloud copy wins
  return [...(await loadArchive()), ...cloud, ...mine].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
export async function myReview(username) {
  const k = String(username).toLowerCase();
  const c = (await cloudReviews()).find((r) => String(r.username).toLowerCase() === k);
  return c || load(KEY, {})[k] || null;
}
const token = () => (cloudLinked() ? cloudState().token : "");
async function cloudCall(method, body) {
  const res = await fetch(CONFIG.CLOUD_URL + "/api/review", { method, headers: { authorization: "Bearer " + token(), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error("cloud " + res.status);
}
// Returns "cloud" when the review is now visible to everyone, "local" when it is only in this browser.
export async function saveMyReview(username, review) {
  const all = load(KEY, {}), k = String(username).toLowerCase();
  if (token()) {
    try { await cloudCall("PUT", review); delete all[k]; save(KEY, all); return "cloud"; } catch { /* fall back to this browser */ }
  }
  all[k] = { ...review, username };
  save(KEY, all);
  return "local";
}
export async function deleteMyReview(username) {
  const all = load(KEY, {}), k = String(username).toLowerCase();
  delete all[k]; save(KEY, all);
  if (token()) { try { await cloudCall("DELETE"); } catch { /* it will still be there */ } }
}
export const starsText = (n) => "★".repeat(n) + "☆".repeat(5 - n);
