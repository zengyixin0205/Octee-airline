// Reviews = the archive in data/reviews.json (shown to everyone) + reviews written in this browser.
// A static site can't share new reviews between visitors; to publish one for everyone, add it to data/reviews.json.
import { load, save } from "./store.js";

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
export async function allReviews() {
  return [...(await loadArchive()), ...localReviews()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
export function myReview(username) { return load(KEY, {})[String(username).toLowerCase()] || null; }
export function saveMyReview(username, review) {
  const all = load(KEY, {});
  all[String(username).toLowerCase()] = { ...review, username };
  save(KEY, all);
}
export function deleteMyReview(username) {
  const all = load(KEY, {});
  delete all[String(username).toLowerCase()];
  save(KEY, all);
}
export const starsText = (n) => "★".repeat(n) + "☆".repeat(5 - n);
