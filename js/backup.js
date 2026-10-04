// Account backup code: a block of text that restores your account in ANY browser (incognito, a new phone...).
// There is no server, so the code IS the account: your name, miles, tokens, peanuts, trips and password hash,
// squeezed (deflate) and written in base64. Anyone holding the code can restore the account, so keep it private.
import { load, save } from "./store.js";
import { USERNAME_RE, notify } from "./auth.js";

const USERS = "octee.users", SESSION = "octee.session";
const PREFIX = "OCTEE1", RAW = "OCTEE0";
const enc = new TextEncoder(), dec = new TextDecoder();
const hasStreams = typeof CompressionStream === "function" && typeof DecompressionStream === "function";

const b64 = (bytes) => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64 = (t) => { const s = atob(t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
const sum = (t) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0").slice(0, 6); };
async function pipe(bytes, Stream, format) {
  const s = new Blob([bytes]).stream().pipeThrough(new Stream(format));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
const group = (t) => t.match(/.{1,48}/g).join("\n");

export async function makeBackup(u) {
  const copy = { ...u, history: (u.history || []).slice(-30), codeFails: [], backupAt: new Date().toISOString() };
  const bytes = enc.encode(JSON.stringify(copy));
  const body = hasStreams ? PREFIX + "." + b64(await pipe(bytes, CompressionStream, "deflate-raw")) : RAW + "." + b64(bytes);
  return group(body + "." + sum(body));
}

export async function readBackup(code) {
  const t = String(code || "").replace(/\s+/g, "");
  const m = t.match(/^(OCTEE[01])\.([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/);
  if (!m) throw new Error("not_a_code");
  if (sum(m[1] + "." + m[2]) !== m[3]) throw new Error("damaged");
  if (m[2].length > 400000) throw new Error("not_a_code");
  let bytes = unb64(m[2]);
  if (m[1] === PREFIX) { if (!hasStreams) throw new Error("no_streams"); bytes = await pipe(bytes, DecompressionStream, "deflate-raw"); }
  let u;
  try { u = JSON.parse(dec.decode(bytes)); } catch { throw new Error("damaged"); }
  if (!u || typeof u !== "object" || !USERNAME_RE.test(u.username || "") || typeof u.salt !== "string" || typeof u.hash !== "string") throw new Error("damaged");
  for (const k of ["history", "trips", "redemptions", "rides", "codeFails"]) if (u[k] != null && !Array.isArray(u[k])) throw new Error("damaged");
  return u;
}

// Put the account into THIS browser and log in. Returns the user.
export async function restoreBackup(code) {
  const u = await readBackup(code);
  const key = u.username.toLowerCase();
  const users = load(USERS, {});
  users[key] = { octmiles: 0, lifetime: 0, tokens: 0, history: [], trips: [], redemptions: [], codesUsed: {}, codeFails: [], rides: [], ...u };
  save(USERS, users);
  save(SESSION, key);
  notify();
  return users[key];
}

export const BACKUP_MESSAGES = {
  not_a_code: "That does not look like a backup code. It starts with OCTEE1. Please paste all of it.",
  damaged: "That code is damaged or cut short. Copy it again, from OCTEE1 to the last letters.",
  no_streams: "This browser cannot open that kind of code. Try a newer browser."
};
