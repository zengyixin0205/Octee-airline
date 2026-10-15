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
// Reviews written without a cloud login: { [username lower case]: [review, ...] }. (An older copy kept one review per name.)
const localMap = () => {
  const raw = load(KEY, {}), out = {};
  for (const [k, v] of Object.entries(raw)) out[k] = (Array.isArray(v) ? v : [v]).filter(Boolean).map((r) => ({ ...r, localId: r.localId || "l" + String(r.date || "") + k }));
  return out;
};
export const localReviews = () => Object.values(localMap()).flat();

// Reviews saved in the cloud. Returns [] if the cloud cannot be reached.
export async function cloudReviews() {
  try {
    const res = await fetch(CONFIG.CLOUD_URL + "/api/reviews", { cache: "no-store" });
    return res.ok ? ((await res.json()).reviews || []).map((r) => ({ ...r, cloud: true })) : [];
  } catch { return []; }
}
export async function allReviews() {
  return [...(await loadArchive()), ...(await cloudReviews()), ...localReviews()].sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.id || 0) - (a.id || 0));
}
// All of one person's reviews, newest first (cloud ones have an id, browser-only ones a localId).
export async function myReviews(username) {
  const k = String(username).toLowerCase();
  const cloud = (await cloudReviews()).filter((r) => String(r.username).toLowerCase() === k);
  return [...cloud, ...(localMap()[k] || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.id || 0) - (a.id || 0));
}
const token = () => (cloudLinked() ? cloudState().token : "");
export const REVIEW_MESSAGES = {
  limit_day: "That is 5 reviews today, the daily limit. The queue needs a rest. Try again tomorrow.",
  limit_total: "You have written 50 reviews, the most one account can have. Delete one to write another.",
  trip_taken: "You already reviewed that flight. Edit that review, or pick a different flight.",
  login: "Log in to the cloud to post reviews.",
  server: "The cloud had a problem with that review."
};
class ReviewError extends Error { constructor(code) { super(code); this.code = code; } }
async function cloudCall(method, path, body) {
  const res = await fetch(CONFIG.CLOUD_URL + path, { method, headers: { authorization: "Bearer " + token(), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new ReviewError(res.status >= 500 ? "server" : j.error || "server");
  return j;
}
// Write a new review, or (with existing = one of myReviews) change that one.
// Returns "cloud" when it is now visible to everyone, "local" when it is only in this browser. Throws ReviewError for a limit.
export async function saveMyReview(username, review, existing = null) {
  const all = localMap(), k = String(username).toLowerCase();
  if (token() && !(existing && existing.localId)) {
    try {
      await cloudCall(existing && existing.id ? "PUT" : "POST", existing && existing.id ? "/api/review/" + existing.id : "/api/review", review);
      return "cloud";
    } catch (e) { if (e instanceof ReviewError && e.code !== "server") throw e; /* the cloud is down: keep it in this browser */ }
  }
  const list = all[k] || [];
  if (existing && existing.localId) {
    const i = list.findIndex((r) => r.localId === existing.localId);
    if (i >= 0) list[i] = { ...list[i], ...review, username };
  } else list.unshift({ ...review, username, localId: "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
  all[k] = list;
  save(KEY, all);
  return "local";
}
export async function deleteMyReview(username, existing) {
  const k = String(username).toLowerCase(), all = localMap();
  if (existing && existing.localId) { all[k] = (all[k] || []).filter((r) => r.localId !== existing.localId); save(KEY, all); return; }
  if (token() && existing && existing.id) { try { await cloudCall("DELETE", "/api/review/" + existing.id); } catch { /* it will still be there */ } }
}
export const starsText = (n) => "★".repeat(n) + "☆".repeat(5 - n);
