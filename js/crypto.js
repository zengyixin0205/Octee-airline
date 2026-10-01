// Hashing with the browser's built-in Web Crypto (no libraries).
const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}
export function randomSalt() {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}
// Slow, salted password hash (PBKDF2-SHA256)
export async function hashPassword(password, saltB64, iterations = 150000) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromB64(saltB64), iterations, hash: "SHA-256" }, key, 256);
  return toB64(new Uint8Array(bits));
}
// Codes are stored only as hashes in data/codes.json, so reading the repo doesn't reveal them.
export const normalizeCode = (code) => String(code || "").toUpperCase().replace(/\s+/g, "");
export const codeHash = (code) => sha256Hex("octee-code:" + normalizeCode(code));
