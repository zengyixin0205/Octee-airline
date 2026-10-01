// Accounts — saved in THIS browser only (localStorage). There is no server.
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

export function notify() { window.dispatchEvent(new CustomEvent("octee:account")); }

export async function signUp(username, password, confirm) {
  username = String(username || "").trim();
  if (!USERNAME_RE.test(username)) throw new AuthError("bad_username");
  if (String(password || "").length < CONFIG.PASSWORD_MIN) throw new AuthError("short_password");
  if (confirm !== undefined && password !== confirm) throw new AuthError("mismatch");
  const users = allUsers();
  const key = username.toLowerCase();
  if (users[key]) throw new AuthError("taken");
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
  const u = allUsers()[key];
  if (!u || (await hashPassword(password || "", u.salt)) !== u.hash) throw new AuthError("bad_login");
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
