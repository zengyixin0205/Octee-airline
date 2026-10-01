// Safe localStorage: never throws. Falls back to memory when storage is blocked (private mode etc.).
const mem = new Map();
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? (mem.has(key) ? mem.get(key) : fallback) : JSON.parse(raw);
  } catch {
    return mem.has(key) ? mem.get(key) : fallback;
  }
}
export function save(key, value) {
  mem.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* memory only */ }
}
export function remove(key) {
  mem.delete(key);
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
export function loadSession(key, fallback) {
  try { const raw = sessionStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; }
}
export function saveSession(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
export function removeSession(key) {
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}
