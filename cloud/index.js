// Octee Cloud: accounts and one saved profile (JSON) per user, on Cloudflare Workers + D1.
// Passwords are hashed with PBKDF2; session tokens are stored hashed. This is a parody airline: do not reuse real passwords.
const ORIGINS = ["https://zengyixin0205.github.io", "http://localhost:8765", "http://127.0.0.1:8765"];
const MAX_PROFILE = 300 * 1024;          // bytes of JSON per user
const SESSION_MS = 30 * 24 * 3600 * 1000; // 30 days
const enc = new TextEncoder();
const iso = () => new Date().toISOString();

const cors = (req) => {
  const o = req.headers.get("origin");
  const h = { "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, PUT, OPTIONS", "access-control-max-age": "600", vary: "origin" };
  if (o && ORIGINS.includes(o)) h["access-control-allow-origin"] = o;
  return h;
};
const reply = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors(req), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (v) => hex(await crypto.subtle.digest("SHA-256", enc.encode(v)));
async function derive(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256));
}
const hashPassword = async (p) => { const salt = crypto.randomUUID(); return salt + "$" + (await derive(p, salt)); };
const checkPassword = async (p, stored) => { const [salt, h] = String(stored).split("$"); if (!salt || !h) return false; const a = await derive(p, salt); return a.length === h.length && a === h; };
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));

async function limited(db, key) {
  const r = await db.prepare("SELECT n, until FROM attempts WHERE k=?").bind(key).first();
  return r && r.until > Date.now() ? Math.ceil((r.until - Date.now()) / 1000) : 0;
}
async function fail(db, key) {
  const r = await db.prepare("SELECT n FROM attempts WHERE k=?").bind(key).first();
  const n = (r?.n || 0) + 1, until = n >= 5 ? Date.now() + 5 * 60 * 1000 : 0;
  await db.prepare("INSERT INTO attempts(k,n,until) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET n=?, until=?").bind(key, n >= 5 ? 0 : n, until, n >= 5 ? 0 : n, until).run();
}
const clear = (db, key) => db.prepare("DELETE FROM attempts WHERE k=?").bind(key).run();

async function userFrom(db, req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!t) return null;
  return db.prepare("SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await sha(t), iso()).first();
}
async function newSession(db, userId) {
  const t = token();
  await db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").bind(await sha(t), userId, new Date(Date.now() + SESSION_MS).toISOString()).run();
  await db.prepare("DELETE FROM sessions WHERE expires_at<?").bind(iso()).run();
  return t;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "") || "/";
    const db = env.DB;
    try {
      if (path === "/") return reply(req, { ok: true, service: "octee-cloud" });
      if (req.method === "POST" && (path === "/api/register" || path === "/api/login")) {
        const b = await req.json().catch(() => ({}));
        const username = String(b.username || "").trim(), password = String(b.password || "");
        const ip = req.headers.get("cf-connecting-ip") || "x";
        if (path === "/api/register") {
          if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return reply(req, { error: "bad_username" }, 400);
          if (password.length < 8 || password.length > 200) return reply(req, { error: "bad_password" }, 400);
          const rl = await limited(db, "reg:" + ip); if (rl) return reply(req, { error: "wait", seconds: rl }, 429);
          const key = username.toLowerCase();
          if (await db.prepare("SELECT id FROM users WHERE username_key=?").bind(key).first()) return reply(req, { error: "taken" }, 409);
          await fail(db, "reg:" + ip); // at most 5 new accounts per IP, then a 5 minute wait
          const r = await db.prepare("INSERT INTO users(username,username_key,password_hash,created_at) VALUES(?,?,?,?)").bind(username, key, await hashPassword(password), iso()).run();
          return reply(req, { ok: true, username, token: await newSession(db, r.meta.last_row_id), profile: null, updatedAt: null }, 201);
        }
        const k = "login:" + username.toLowerCase() + ":" + ip;
        const rl = await limited(db, k); if (rl) return reply(req, { error: "wait", seconds: rl }, 429);
        const u = await db.prepare("SELECT * FROM users WHERE username_key=?").bind(username.toLowerCase()).first();
        if (!u || !(await checkPassword(password, u.password_hash))) { await fail(db, k); return reply(req, { error: "bad_login" }, 401); }
        await clear(db, k);
        const p = await db.prepare("SELECT body, updated_at FROM profiles WHERE user_id=?").bind(u.id).first();
        return reply(req, { ok: true, username: u.username, token: await newSession(db, u.id), profile: p ? JSON.parse(p.body) : null, updatedAt: p?.updated_at || null });
      }
      const u = await userFrom(db, req);
      if (path === "/api/profile") {
        if (!u) return reply(req, { error: "login" }, 401);
        const p = await db.prepare("SELECT body, updated_at FROM profiles WHERE user_id=?").bind(u.id).first();
        if (req.method === "GET") return reply(req, { username: u.username, profile: p ? JSON.parse(p.body) : null, updatedAt: p?.updated_at || null });
        if (req.method === "PUT") {
          const text = await req.text();
          if (text.length > MAX_PROFILE) return reply(req, { error: "too_big" }, 413);
          let b; try { b = JSON.parse(text); } catch { return reply(req, { error: "bad_json" }, 400); }
          if (!b || typeof b.profile !== "object" || b.profile === null || Array.isArray(b.profile)) return reply(req, { error: "bad_profile" }, 400);
          if (b.baseUpdatedAt !== undefined && p && p.updated_at !== b.baseUpdatedAt && !b.force) return reply(req, { error: "conflict", profile: JSON.parse(p.body), updatedAt: p.updated_at }, 409);
          const at = iso();
          await db.prepare("INSERT INTO profiles(user_id,body,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET body=?, updated_at=?").bind(u.id, JSON.stringify(b.profile), at, JSON.stringify(b.profile), at).run();
          return reply(req, { ok: true, updatedAt: at });
        }
      }
      if (req.method === "POST" && path === "/api/logout") {
        const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
        if (t) await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha(t)).run();
        return reply(req, { ok: true });
      }
      if (req.method === "GET" && path === "/api/me") return u ? reply(req, { username: u.username }) : reply(req, { error: "login" }, 401);
      return reply(req, { error: "not_found" }, 404);
    } catch (e) {
      return reply(req, { error: "server", detail: String(e.message || e).slice(0, 200) }, 500);
    }
  }
};
