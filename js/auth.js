// Accounts. There is no server, so an account lives in two possible places:
//  * THIS browser (localStorage): every account made with Sign up.
//  * THE CODE (data/accounts.json): accounts the airline has "etched" into the website from the FAG
//    administration. Those can log in on ANY device and arrive with their Octmiles, Octeetokens and trips
//    as they were when the file was last published.
// Passwords are never stored: only a salted PBKDF2 hash.
import { load, save, remove } from "./store.js";
import { hashPassword, randomSalt } from "./crypto.js";
import { CONFIG } from "./config.js";

const USERS = "octee.users";
const SESSION = "octee.session";
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const WELCOME_BONUS = 100;

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export const MESSAGES = {
  bad_login: "Wrong password. Or wrong username. We lose track of things.",
  taken: "That username is taken. Someone boarded first.",
  bad_username: "Usernames need 3–20 letters, numbers or underscores. No spaces, no peanuts.",
  short_password: "Password too short. Like our legroom.",
  mismatch: "Those passwords don't match. Neither do our timetables.",
  storage: "Login is delayed. Please hold. (This browser won't let us save anything.)"
};

const allUsers = () => load(USERS, {});
const saveUsers = (u) => save(USERS, u);

// ----- accounts etched in the code -----
let etchedCache = null;
export function etchedAccounts() {
  if (!etchedCache) {
    etchedCache = fetch("data/accounts.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((j) => (Array.isArray(j.accounts) ? j.accounts.filter((a) => a && USERNAME_RE.test(a.username || "") && a.salt && a.hash) : []))
      .catch(() => []);
  }
  return etchedCache;
}
const BLANK = () => ({ octmiles: 0, lifetime: 0, tokens: 0, scraggymiles: 0, history: [], trips: [], redemptions: [], codesUsed: {}, codeFails: [], rides: [], reviewBonus: false });
const fromEtched = (e) => ({ ...BLANK(), ...e });
const etchedFor = async (key) => (await etchedAccounts()).find((a) => a.username.toLowerCase() === key) || null;
// What the Account page shows: is this account in the code, and since when?
export async function etchedInfo(username) {
  const e = await etchedFor(String(username || "").toLowerCase());
  return e ? { etchedAt: e.etchedAt || null } : null;
}
// A logged-in account picks up a newer copy from the code by itself (same password only).
export async function syncEtched() {
  const key = load(SESSION, null);
  if (!key) return false;
  const users = allUsers(), u = users[key], e = await etchedFor(key);
  if (!u || !e || !(String(e.etchedAt || "") > String(u.etchedAt || "")) || e.hash !== u.hash || e.salt !== u.salt) return false;
  users[key] = fromEtched(e);
  saveUsers(users);
  notify();
  return true;
}

export function notify() { window.dispatchEvent(new CustomEvent("octee:account")); }

export async function signUp(username, password, confirm) {
  username = String(username || "").trim();
  if (!USERNAME_RE.test(username)) throw new AuthError("bad_username");
  if (String(password || "").length < CONFIG.PASSWORD_MIN) throw new AuthError("short_password");
  if (confirm !== undefined && password !== confirm) throw new AuthError("mismatch");
  const users = allUsers();
  const key = username.toLowerCase();
  if (users[key] || (await etchedFor(key))) throw new AuthError("taken");
  const salt = randomSalt();
  const now = new Date().toISOString();
  users[key] = {
    username, salt, hash: await hashPassword(password, salt), createdAt: now,
    octmiles: WELCOME_BONUS, lifetime: WELCOME_BONUS,
    history: [{ at: now, text: "Welcome bonus. Please do not ask what they are worth.", amount: WELCOME_BONUS }],
    trips: [], redemptions: [], codesUsed: {}, codeFails: [], rides: [], reviewBonus: false
  };
  saveUsers(users);
  save(SESSION, key);
  notify();
  return users[key];
}

export async function logIn(username, password) {
  const key = String(username || "").trim().toLowerCase();
  const users = allUsers();
  let u = users[key];
  // The copy in the code wins when this browser has no copy, or an older one.
  const e = await etchedFor(key);
  if (e && (!u || String(e.etchedAt || "") > String(u.etchedAt || "")) && (await hashPassword(password || "", e.salt)) === e.hash) {
    u = users[key] = fromEtched(e);
    saveUsers(users);
  } else if (!u || (await hashPassword(password || "", u.salt)) !== u.hash) throw new AuthError("bad_login");
  save(SESSION, key);
  notify();
  return u;
}

export function logOut() { remove(SESSION); notify(); }

export function currentUser() {
  const key = load(SESSION, null);
  if (!key) return null;
  return allUsers()[key] || null;
}

// Change the logged-in user's record safely: updateUser(u => { u.octmiles += 5; })
export function updateUser(fn) {
  const key = load(SESSION, null);
  const users = allUsers();
  if (!key || !users[key]) throw new AuthError("not_logged_in");
  const result = fn(users[key]);
  saveUsers(users);
  notify();
  return result;
}

// All bookings made in this browser (by any account) — used to count seats.
export function allTripsInBrowser() {
  return Object.values(allUsers()).flatMap((u) => u.trips || []);
}

export function requireLogin() {
  if (currentUser()) return true;
  const here = location.pathname.split("/").pop() || "index.html";
  location.href = "login.html?next=" + encodeURIComponent(here);
  return false;
}

export function safeNext(fallback = "octmiles.html") {
  const next = new URLSearchParams(location.search).get("next");
  return next && /^[a-z0-9-]+\.html$/.test(next) ? next : fallback;
}
