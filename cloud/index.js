// Octee Cloud: accounts and one saved profile (JSON) per user, on Cloudflare Workers + D1.
// Passwords are hashed with PBKDF2; session tokens are stored hashed. This is a parody airline: do not reuse real passwords.
const ORIGINS = ["https://zengyixin0205.github.io", "http://localhost:8765", "http://127.0.0.1:8765"];
const MAX_PROFILE = 300 * 1024;          // bytes of JSON per user
const SESSION_MS = 30 * 24 * 3600 * 1000; // 30 days
const ETCHED_URL = "https://zengyixin0205.github.io/Octee-airline/data/accounts.json";
// JoelAI Pro ledger (the browser copies these numbers in js/miles.js; the server is the one that counts).
const JOEL = { price: 100, rate: 2500, grant: 10000, minReserve: 1000, maxCharge: 20000, maxBuy: 50 };
const enc = new TextEncoder();
const iso = () => new Date().toISOString();

const cors = (req) => {
  const o = req.headers.get("origin");
  const h = { "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS", "access-control-max-age": "600", vary: "origin" };
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

// Accounts etched in the website's code (data/accounts.json, public). Cached for 5 minutes.
let etchedMemo = { at: 0, list: [] };
async function etchedList(env) {
  if (Date.now() - etchedMemo.at < 300000) return etchedMemo.list;
  try {
    // the copy saved from the Control Tower comes first; the file on GitHub Pages is the fallback
    const row = await env.DB.prepare("SELECT body FROM published WHERE name='accounts'").first().catch(() => null);
    let j = null;
    if (row) { try { j = JSON.parse(row.body); } catch { j = null; } }
    if (!j) { const r = await fetch(env.ETCHED_URL || ETCHED_URL, { cf: { cacheTtl: 60 } }); j = r.ok ? await r.json() : null; }
    if (j && Array.isArray(j.accounts)) etchedMemo = { at: Date.now(), list: j.accounts.filter((a) => a && a.username && a.hash).map((a) => ({ key: String(a.username).toLowerCase(), name: String(a.username), hash: String(a.hash), rec: a })) };
  } catch { /* keep the old list */ }
  return etchedMemo.list;
}
// Files the Control Tower publishes (instead of downloading them and committing to GitHub). Anyone may read; only a Control Tower owner or admin may write.
// Ads from the Control Tower: plain text, https links or pages of the site, at most 30.
const adOk = (a) => a && typeof a === "object" && !Array.isArray(a) && typeof a.title === "string" && a.title.length <= 80
  && ["text", "icon", "button", "pages", "start", "end", "id"].every((k) => a[k] === undefined || typeof a[k] === "string")
  && (!a.text || a.text.length <= 200) && ["link", "image"].every((k) => !a[k] || (typeof a[k] === "string" && a[k].length <= 300 && (/^https:\/\/\S+$/i.test(a[k]) || (k === "link" && /^[\w-]+\.html(#[\w-]*)?$/i.test(a[k])))));
// Music from the Control Tower: a track ID, not the audio itself — the site always embeds the platform's own
// player (YouTube or, now, Spotify) to play it, never downloads or re-hosts it. At most 2 tracks (the second
// makes it a loop of two). `source` picks which platform the IDs are for; missing/unrecognised defaults to
// "youtube" so data saved before this field existed keeps working unchanged.
const MUSIC_ID = { youtube: /^[\w-]{6,20}$/, spotify: /^[A-Za-z0-9]{22}$/ };
const musicIdOk = (t, source) => t && typeof t === "object" && !Array.isArray(t) && typeof t.id === "string" && MUSIC_ID[source].test(t.id);
// Seasonal themes from the Control Tower: Christmas, Chinese New Year and Halloween, each just an on/off switch
// plus an optional date range (same "" = no limit shape as an ad's start/end). Chinese New Year also carries the
// Fujitech amount its "ang pao" button pays out, 0-100000.
const THEME_KEYS = ["christmas", "cny", "deepavali", "halloween", "aidilfitri", "haji", "vesak", "midautumn", "thaipusam", "easter"];
// Festivals that pay a daily reward, keyed by the history text the browser writes (must match THEME_REWARDS in js/theme.js).
const THEME_REWARDS = { "Chinese New Year ang pao": "cny", "Hari Raya Aidilfitri duit raya": "aidilfitri", "Mid-Autumn lantern": "midautumn", "Easter egg": "easter" };
const THEME_REWARD_KEYS = Object.values(THEME_REWARDS);
const themeDateOk = (v) => v === undefined || v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);
const themeEntryOk = (t) => t && typeof t === "object" && !Array.isArray(t) && typeof t.on === "boolean" && themeDateOk(t.start) && themeDateOk(t.end);
const themeOk = (d) => d && typeof d === "object" && !Array.isArray(d)
  && THEME_KEYS.every((k) => d[k] === undefined || themeEntryOk(d[k]))
  && THEME_REWARD_KEYS.every((k) => d[k] === undefined || d[k].reward === undefined || (Number.isFinite(d[k].reward) && d[k].reward >= 0 && d[k].reward <= 100000));
const DATA_NAMES = { codes: (d) => Array.isArray(d.codes), accounts: (d) => Array.isArray(d.accounts), permissions: (d) => d.crew && typeof d.crew === "object" && !Array.isArray(d.crew), "control-tower": (d) => "owner" in d && Array.isArray(d.admins), "flight-discounts": (d) => Array.isArray(d.discounts), ads: (d) => Array.isArray(d.ads) && d.ads.length <= 30 && d.ads.every(adOk), perks: (d) => d.unlimitedFujitech && typeof d.unlimitedFujitech === "object" && !Array.isArray(d.unlimitedFujitech), music: (d) => (d.source === undefined || d.source === "youtube" || d.source === "spotify") && Array.isArray(d.tracks) && d.tracks.length <= 2 && d.tracks.every((t) => musicIdOk(t, d.source || "youtube")), theme: themeOk };
const MAX_DATA = 400 * 1024;
// Account perks the Control Tower publishes ("perks"). Until a setting is saved there, these defaults apply.
const DEFAULT_PERKS = { freePro: { octee: true, joel: true }, freeModels: { octee: true, joel: true } };
async function perkOn(db, key, username) {
  const row = await db.prepare("SELECT body FROM published WHERE name='perks'").first().catch(() => null);
  let j = null; try { j = row ? JSON.parse(row.body) : null; } catch { j = null; }
  const list = j && j[key] && typeof j[key] === "object" ? j[key] : DEFAULT_PERKS[key];
  return !!list && list[String(username).toLowerCase()] === true;
}
// Joel models with a flat JoelToken price (they report no token usage). Mirrors js/joel-models.js.
const FLAT = { "joel-3.3pro": { price: 150, name: "Joel-3.3 Pro" }, "joel-4.3neo": { price: 400, name: "Joel-4.3 NEO" } };
// Accounts etched into the code that may always open the code viewer and manage who else can (the names also have to be etched accounts).
const CODE_OWNERS = ["octee"];
// Reviews an account may write: this many a day and this many in all.
const REVIEW_LIMITS = { day: 5, total: 50 };
const clip = (v, n) => String(v ?? "").slice(0, n);

// ---- Octee City: the CCT wallet, the OCT Bank (tiered daily interest), job pay and arrests. The server keeps all of it. ----
// CCT is earned by doing jobs in the city, or exchanged from Octmiles. The bank keeps money in hundredths of a CCT, pays
// interest every day at the tier's yearly rate, and never sends the interest through the browser.
const DAY = 86400000;
const CITY = {
  rate: 10,                 // Octmiles for 1 CCT (buying)
  sell: 8,                  // Octmiles for 1 CCT (selling back; the 2 gap stops round trips making money)
  spotChance: 0.25,         // chance that a clock-in is also a police spot check
  jobPay: 10,               // CCT paid for each finished shift
  fine: 5,                  // CCT taken when arrested
  jailMinutes: 30,          // how long an arrest keeps you from shifts
  hardPay: 15,              // CCT for the harder jobs (bank, tax audit, police)
  gameMax: 5,               // most CCT the Game Tower pays in one day
  towerTarget: 20,          // blocks needed for the weekly tower challenge
  challengeBonus: 10,       // CCT paid once a week to each citizen who reaches the target
  price: 300,               // CCT for a whole building (ten shares)
  shares: 10,               // shares in every building; each share earns a tenth of the rent
  rent: 3,                  // CCT a day that a building earns for its owner
  buildings: ["bank","hall","clinic","fire","post","bakery","library","cinema","power","radio","food","harbour","police","tax","car","gym","museum","bus","square","tower","lost"],
  streakDays: 3,            // working this many days in a row earns the streak bonus
  streakBonus: 5,           // extra CCT on every shift while on a streak
  hard: ["bank-teller", "bank-vault", "tax-audit", "police-patrol", "police-desk"],
  tiers: [{ name: "Bronze", min: 0, rate: 0.01 }, { name: "Silver", min: 1000, rate: 0.025 }, { name: "Gold", min: 10000, rate: 0.04 }],
  jobs: ["bank-teller", "bank-vault", "hall-stamp", "hall-notes", "clinic-nurse", "clinic-pharmacy", "fire-hose", "fire-dispatch", "post-parcel", "post-stamp",
    "bakery-assistant", "bakery-till", "library-shelf", "library-returns", "cinema-usher", "cinema-projector", "power-switch", "power-meter", "radio-dial", "radio-playlist",
    "food-waiter", "food-dish", "harbour-crane", "harbour-dock", "police-patrol", "police-desk",
    "tax-clerk", "tax-audit", "car-attendant", "car-ticket", "gym-instructor", "gym-towel", "museum-guide", "museum-cleaner", "bus-driver", "bus-timetable"]
};
const tierFor = (cct) => { let t = CITY.tiers[0]; for (const x of CITY.tiers) if (cct >= x.min) t = x; return t; };
async function ensureCity(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS city_accounts (user_id INTEGER PRIMARY KEY, wallet INTEGER NOT NULL DEFAULT 0, bank_c INTEGER NOT NULL DEFAULT 0, bank_at INTEGER NOT NULL DEFAULT 0, jail_until INTEGER NOT NULL DEFAULT 0, shifts TEXT NOT NULL DEFAULT '{}', arrests INTEGER NOT NULL DEFAULT 0)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_news (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, text TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, at INTEGER NOT NULL, kind TEXT NOT NULL, cents INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '')").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_streak (user_id INTEGER PRIMARY KEY, last_day TEXT NOT NULL DEFAULT '', streak INTEGER NOT NULL DEFAULT 0)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_chat (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, username TEXT NOT NULL, at INTEGER NOT NULL, text TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_reviews (user_id INTEGER NOT NULL, building TEXT NOT NULL, username TEXT NOT NULL, stars INTEGER NOT NULL, text TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL, PRIMARY KEY (user_id, building))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_game (user_id INTEGER PRIMARY KEY, last_day TEXT NOT NULL DEFAULT '')").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_buildings (id TEXT PRIMARY KEY, name TEXT NOT NULL, blurb TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_job_extra (job TEXT PRIMARY KEY, prompt2 TEXT NOT NULL, right2 TEXT NOT NULL, wrong2 TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_share_rent (building TEXT PRIMARY KEY, cents INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_holidays (day TEXT PRIMARY KEY)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_claims (log_id INTEGER PRIMARY KEY)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_challenge (user_id INTEGER NOT NULL, week INTEGER NOT NULL, PRIMARY KEY (user_id, week))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_scores (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, username TEXT NOT NULL, score INTEGER NOT NULL, at INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_building_rules (building TEXT PRIMARY KEY, min_shares INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_tower (user_id INTEGER PRIMARY KEY, best INTEGER NOT NULL, at INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_shares (building TEXT NOT NULL, user_id INTEGER NOT NULL, shares INTEGER NOT NULL, paid INTEGER NOT NULL, collected_at INTEGER NOT NULL, carry INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (building, user_id))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_building_terms (building TEXT PRIMARY KEY, price INTEGER NOT NULL, rent INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS city_jobs (id TEXT PRIMARY KEY, building TEXT NOT NULL, title TEXT NOT NULL, prompt TEXT NOT NULL, right_answer TEXT NOT NULL, wrong TEXT NOT NULL, hard INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL)").run();
}
// What a building costs and earns: the owner's own terms, or the town's defaults.
async function cityTerms(db, building) {
  const t = await db.prepare("SELECT price, rent FROM city_building_terms WHERE building=?").bind(building).first();
  return t ? { price: Number(t.price), rent: Number(t.rent) } : { price: CITY.price, rent: CITY.rent };
}
// The fewest shares one purchase may buy (the owner's rule). The last shares left may always be bought.
async function cityMinShares(db, building) {
  const r = await db.prepare("SELECT min_shares FROM city_building_rules WHERE building=?").bind(building).first();
  return r ? Number(r.min_shares) : 1;
}
// Police on duty are the citizens who clocked in to a police job today. The city's owner can always moderate.
const POLICE_JOBS = ["police-patrol", "police-desk"];
function cityOnDuty(city) {
  const today = iso().slice(0, 10);
  return (city.shifts[today] || []).some((j) => POLICE_JOBS.includes(j));
}
// Buildings and jobs made by the city's owner. The built-in ones above are never stored here.
const CITY_ID = /^[a-z][a-z0-9-]{2,20}$/;
async function cityBuildingExists(db, id) {
  if (CITY.buildings.includes(id)) return true;
  return !!(await db.prepare("SELECT id FROM city_buildings WHERE id=?").bind(id).first());
}
async function cityJob(db, id) {
  if (CITY.jobs.includes(id)) return { hard: CITY.hard.includes(id) };
  const r = await db.prepare("SELECT hard FROM city_jobs WHERE id=?").bind(id).first();
  return r ? { hard: !!r.hard } : null;
}
// The bank statement: every movement of CCT, in hundredths. Written by the server only.
const cityLog = (db, uid, kind, cents, note = "") => db.prepare("INSERT INTO city_log(user_id, at, kind, cents, note) VALUES(?, ?, ?, ?, ?)").bind(uid, Date.now(), kind, Math.round(cents), note).run();
const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);
// The weekly edition of the Gazette: written the first time the paper is read after a week has passed.
async function weeklyEdition(db) {
  const since = Date.now() - 7 * DAY;
  const last = await db.prepare("SELECT at FROM city_news WHERE text LIKE 'Weekly edition%' ORDER BY id DESC LIMIT 1").first();
  if (last && Number(last.at) > since) return;
  const rent = await db.prepare("SELECT COALESCE(SUM(cents), 0) AS c FROM city_log WHERE kind = 'rent' AND at >= ?").bind(since).first();
  const bought = await db.prepare("SELECT COUNT(*) AS n FROM city_log WHERE kind = 'buy' AND note LIKE 'bought the %' AND at >= ?").bind(since).first();
  const sold = await db.prepare("SELECT COUNT(*) AS n FROM city_log WHERE kind = 'sell' AND note LIKE 'sold the %' AND at >= ?").bind(since).first();
  const top = await db.prepare("SELECT u.username AS name, SUM(s.shares) AS n FROM city_shares s JOIN users u ON u.id = s.user_id GROUP BY s.user_id ORDER BY n DESC LIMIT 1").first();
  const n = (x) => `${x} building${Number(x) === 1 ? "" : "s"}`;
  const text = `Weekly edition: ${n(bought.n)} bought, ${n(sold.n)} sold, and ${Math.round(Number(rent.c) / 100).toLocaleString("en-GB")} CCT of rent paid out. ` +
    (top ? `The biggest landlord is ${top.name}, with ${top.n} share${Number(top.n) === 1 ? "" : "s"}.` : "Nobody owns a share yet. The town is renting from itself.");
  const hol = await cityHolidays(db);
  const rich = await db.prepare("SELECT u.username AS name, c.wallet AS wallet, c.bank_c AS bank, c.bank_at AS bank_at FROM city_accounts c JOIN users u ON u.id = c.user_id LIMIT 500").all();
  const worth = (r) => Number(r.wallet) + accrue(Number(r.bank), Number(r.bank_at), hol).bank_c / 100;
  const best = (rich.results || []).map((r) => ({ name: r.name, cct: worth(r) })).sort((x, y) => y.cct - x.cct)[0];
  const star = await db.prepare("SELECT username, score FROM city_scores WHERE at >= ? ORDER BY score DESC LIMIT 1").bind(since).first();
  await cityNews(db, text + (best && best.cct > 0 ? ` Richest citizen: ${best.name}, with ${Math.floor(best.cct).toLocaleString("en-GB")} CCT.` : "") + (star ? ` Tower of the week: ${star.username}, with ${star.score} blocks.` : ""));
}
async function cityStreak(db, uid) {
  const r = await db.prepare("SELECT last_day, streak FROM city_streak WHERE user_id=?").bind(uid).first();
  return r ? { last: r.last_day, streak: Number(r.streak) || 0 } : { last: "", streak: 0 };
}
const cityNews = (db, text) => db.prepare("INSERT INTO city_news(at, text) VALUES(?, ?)").bind(Date.now(), text).run();
// Interest for every whole day since the last payment, compounding, at the tier of each day's balance. Returns the new balance in hundredths.
function accrue(bank_c, bank_at, hol = new Set()) {
  const days = Math.min(3650, Math.max(0, Math.floor((Date.now() - bank_at) / DAY)));
  let c = bank_c;
  for (let i = 0; i < days; i++) {
    const double = hol.has(dayStr(bank_at + i * DAY)) ? 2 : 1; // a bank holiday pays double interest for its day
    c += Math.floor((c * tierFor(Math.floor(c / 100)).rate * double) / 365);
  }
  return { bank_c: c, days };
}
async function cityHolidays(db) {
  const r = await db.prepare("SELECT day FROM city_holidays").all();
  return new Set((r.results || []).map((x) => x.day));
}
async function cityAccount(db, uid) {
  await ensureCity(db);
  await db.prepare("INSERT OR IGNORE INTO city_accounts(user_id, bank_at) VALUES(?, ?)").bind(uid, Date.now()).run();
  const r = await db.prepare("SELECT * FROM city_accounts WHERE user_id=?").bind(uid).first();
  let shifts = {}; try { shifts = JSON.parse(r.shifts || "{}"); } catch { shifts = {}; }
  const a = { wallet: Number(r.wallet) || 0, bank_c: Number(r.bank_c) || 0, bank_at: Number(r.bank_at) || 0, jail_until: Number(r.jail_until) || 0, shifts, arrests: Number(r.arrests) || 0 };
  const hol = await cityHolidays(db);
  const before = a.bank_c, acc = accrue(a.bank_c, a.bank_at, hol);
  a.bank_c = acc.bank_c;
  if (acc.days > 0) a.bank_at += acc.days * DAY;
  if (acc.bank_c > before) await cityLog(db, uid, "interest", acc.bank_c - before, `${acc.days} day${acc.days === 1 ? "" : "s"} at ${tierFor(Math.floor(before / 100)).name}`);
  // rent: every share of every building pays a tenth of that building's rent a day. Kept in hundredths, so rounding loses nothing.
  const owned = await db.prepare("SELECT s.building AS building, s.shares AS shares, s.collected_at AS collected_at, s.carry AS carry, COALESCE(sr.cents, COALESCE(t.rent, ?) * 10) AS cents FROM city_shares s LEFT JOIN city_building_terms t ON t.building = s.building LEFT JOIN city_share_rent sr ON sr.building = s.building WHERE s.user_id = ?").bind(CITY.rent, uid).all();
  for (const pr of owned.results || []) {
    const due = Math.min(3650, Math.floor((Date.now() - Number(pr.collected_at)) / DAY));
    if (due > 0) {
      const cents = Number(pr.carry) + due * Number(pr.cents) * Number(pr.shares);
      const cct = Math.floor(cents / 100);
      a.wallet += cct;
      await db.prepare("UPDATE city_shares SET collected_at=?, carry=? WHERE building=? AND user_id=?").bind(Number(pr.collected_at) + due * DAY, cents % 100, pr.building, uid).run();
      if (cct > 0) await cityLog(db, uid, "rent", cct * 100, `${pr.building} · ${due} day${due === 1 ? "" : "s"}, ${pr.shares} share${Number(pr.shares) === 1 ? "" : "s"}`);
    }
  }
  return a;
}
async function saveCity(db, uid, a) {
  await db.prepare("UPDATE city_accounts SET wallet=?, bank_c=?, bank_at=?, jail_until=?, shifts=?, arrests=? WHERE user_id=?")
    .bind(a.wallet, a.bank_c, a.bank_at, a.jail_until, JSON.stringify(a.shifts), a.arrests, uid).run();
}
const cityView = (a, now) => {
  const t = tierFor(Math.floor(a.bank_c / 100)), today = iso().slice(0, 10);
  return { wallet: a.wallet, bank: a.bank_c / 100, bankCents: a.bank_c, tier: t.name, rate: t.rate, tiers: CITY.tiers, pay: CITY.jobPay, rateOcts: CITY.rate, sellOcts: CITY.sell,
    todayJobs: a.shifts[today] || [], jailUntil: a.jail_until > now ? a.jail_until : 0, arrests: a.arrests };
};


// ---- Octmiles, Octeetokens, Fujitech and Scraggymiles: the cloud keeps the balances (table `balances`) ----
// The browser still works the numbers out locally and writes a history line for each change. When it saves the account, the cloud
// checks the change against those new history lines: spending is always accepted (never below zero), but a credit is only accepted
// when a rule explains it (an exchange at the real rate, a code that really exists, a booking that really is in the account, ...).
// Anything else is dropped, and the cloud's balance is sent back and replaces the browser's copy.
const WALLET = { tokenRate: 10, fujiMiles: 50, fujiTenths: 55, scraggyRate: 2, topTier: 10000, welcome: 100,
  bookEntry: 2800, bookDay: 3000, scraggyEntry: 2000, scraggyDay: 3000, rideMiles: 20, rideDay: 200, reviewMiles: 30, potDay: 300,
  // Joelmiles (JoelTEH): Joelmiles per unit swapped in, and Joelmiles per unit swapped back out (about 20% dearer). JoelTokens: 50 per Joelmile in, 40 per Joelmile out.
  jmIn: { octmiles: 5, scraggy: 10, tokens: 50, fujitech: 6 }, jmOut: { octmiles: 6, scraggy: 12, tokens: 60, fujitech: 7 }, jtPer: 50, jtOut: 40, jmDay: 5000 };
const wint = (v) => Math.max(0, Math.floor(Number(v) || 0));
const balFromProfile = (p) => ({ octmiles: wint(p?.octmiles), lifetime: wint(p?.lifetime), tokens: wint(p?.tokens), fujitech: wint(p?.fujitechTenths), scraggy: wint(p?.scraggymiles), joelmiles: wint(p?.joelmiles) });
const balanceFields = (b) => ({ octmiles: b.octmiles, lifetime: b.lifetime, tokens: b.tokens, fujitechTenths: b.fujitech, scraggymiles: b.scraggy, joelmiles: b.joelmiles || 0 });
async function getBalances(db, env, u) {
  const row = await db.prepare("SELECT * FROM balances WHERE user_id=?").bind(u.id).first();
  if (row) { let st = {}; try { st = JSON.parse(row.state || "{}"); } catch { st = {}; } return { user_id: u.id, octmiles: row.octmiles, lifetime: row.lifetime, tokens: row.tokens, fujitech: row.fujitech, scraggy: row.scraggy, joelmiles: row.joelmiles || 0, state: { codes: {}, uses: {}, review: false, days: {}, ...st } }; }
  // first time: start from what the account already has saved in the cloud, an etched account's own record, or the welcome bonus
  const p = await db.prepare("SELECT body FROM profiles WHERE user_id=?").bind(u.id).first();
  let prof = null; try { prof = p ? JSON.parse(p.body) : null; } catch { prof = null; }
  const e = prof ? null : (await etchedList(env)).find((x) => x.key === u.username_key || x.key === String(u.username).toLowerCase());
  const seed = prof ? balFromProfile(prof) : e ? balFromProfile(e.rec) : { octmiles: WALLET.welcome, lifetime: WALLET.welcome, tokens: 0, fujitech: 0, scraggy: 0, joelmiles: 0 };
  const src = prof || (e && e.rec) || {};
  const codes = {}; for (const h of Object.keys(src.codesUsed || {})) codes[h] = true;
  const uses = {}; for (const [h, n] of Object.entries(src.repeatUses || {})) uses[h] = wint(n);
  return { user_id: u.id, ...seed, state: { codes, uses, review: !!src.reviewBonus, days: {} } };
}
const saveBalances = (db, b) => db.prepare("INSERT INTO balances(user_id,octmiles,lifetime,tokens,fujitech,scraggy,joelmiles,state,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET octmiles=?, lifetime=?, tokens=?, fujitech=?, scraggy=?, joelmiles=?, state=?, updated_at=?")
  .bind(b.user_id, b.octmiles, b.lifetime, b.tokens, b.fujitech, b.scraggy, b.joelmiles || 0, JSON.stringify(b.state), iso(), b.octmiles, b.lifetime, b.tokens, b.fujitech, b.scraggy, b.joelmiles || 0, JSON.stringify(b.state), iso());
// Control Tower files (codes, permissions): the saved copy first, the file on GitHub Pages as the fallback. Cached for a minute.
const dataMemo = {};
async function publishedData(env, db, name) {
  const m = dataMemo[name];
  if (m && Date.now() - m.at < 60000) return m.value;
  let value = null;
  const row = await db.prepare("SELECT body FROM published WHERE name=?").bind(name).first().catch(() => null);
  if (row) { try { value = JSON.parse(row.body); } catch { value = null; } }
  if (!value) { try { const r = await fetch((env.DATA_BASE || ETCHED_URL.replace(/accounts\.json$/, "")) + name + ".json", { cf: { cacheTtl: 60 } }); value = r.ok ? await r.json() : null; } catch { value = null; } }
  dataMemo[name] = { at: Date.now(), value };
  return value;
}
const histKey = (e) => JSON.stringify([e && e.at, e && e.text, wint2(e?.amount), wint2(e?.tokens), wint2(e?.fujitechTenths), wint2(e?.scraggy)]);
const wint2 = (v) => Math.trunc(Number(v) || 0);
// Check the new history lines of a saved account against the cloud's balance. Returns the cloud's balance after them.
async function applyWallet(env, db, u, bal, prevProf, nextProf) {
  const b = { ...bal, state: { ...bal.state, codes: { ...bal.state.codes }, uses: { ...bal.state.uses }, days: { ...bal.state.days }, claimed: { ...(bal.state.claimed || {}) } } };
  const seen = new Map();
  for (const e of (prevProf && Array.isArray(prevProf.history)) ? prevProf.history : []) seen.set(histKey(e), (seen.get(histKey(e)) || 0) + 1);
  const fresh = [];
  const hist = Array.isArray(nextProf.history) ? nextProf.history : [];
  for (let i = hist.length - 1; i >= 0; i--) { const k = histKey(hist[i]); if (seen.get(k) > 0) seen.set(k, seen.get(k) - 1); else if (prevProf) fresh.push(hist[i]); } // oldest first; the very first save only sets the balance
  const day = iso().slice(0, 10);
  const today = (b.state.days[day] = { book: 0, scraggy: 0, ride: 0, pot: 0, jm: 0, angpao: false, ...(b.state.days[day] || {}) });
  for (const k of Object.keys(b.state.days)) if (k < day) delete b.state.days[k];
  const prevRefs = new Set(((prevProf && prevProf.trips) || []).map((t) => t && t.ref));
  const trips = Array.isArray(nextProf.trips) ? nextProf.trips : [];
  const moveOut = (dM, dT, dF, dS, dJ = 0) => { b.joelmiles = Math.max(0, (b.joelmiles || 0) + Math.min(0, dJ)); b.octmiles = Math.max(0, b.octmiles + Math.min(0, dM)); b.tokens = Math.max(0, b.tokens + Math.min(0, dT)); b.fujitech = Math.max(0, b.fujitech + Math.min(0, dF)); b.scraggy = Math.max(0, b.scraggy + Math.min(0, dS)); };
  const credit = (dM, dT, dF, dS, life) => { b.octmiles += dM; b.tokens += dT; b.fujitech += dF; b.scraggy += dS; if (life) b.lifetime += dM; };
  let codes = null, perms = null;
  for (const e of fresh) {
    const text = String(e.text || ""), dM = wint2(e.amount), dT = wint2(e.tokens), dF = wint2(e.fujitechTenths), dS = wint2(e.scraggy), dJ = wint2(e.joelmiles);
    if (/^Welcome bonus/.test(text)) continue;
    if (/^Exchanged (JoelTokens for Joelmiles|Joelmiles for JoelTokens)$/.test(text)) continue;                  // the cloud already did these (POST /api/joel/exchange)
    if (dM <= 0 && dT <= 0 && dF <= 0 && dS <= 0 && dJ <= 0) { moveOut(dM, dT, dF, dS, dJ); continue; }          // spending
    if (text === "Exchanged Octmiles for Octeetokens") {
      if (dM < 0 && dT > 0 && !dF && !dS && -dM === dT * WALLET.tokenRate && b.octmiles >= -dM) { b.octmiles += dM; b.tokens += dT; }
    } else if (text === "Exchanged Octmiles for Fujitech") {
      if (dM < 0 && dF > 0 && !dT && !dS && -dM % WALLET.fujiMiles === 0 && dF === (-dM / WALLET.fujiMiles) * WALLET.fujiTenths && b.octmiles >= -dM) { b.octmiles += dM; b.fujitech += dF; }
    } else if (/^Exchanged Scraggymiles for Octmiles/.test(text)) {
      if (dS < 0 && dM === -dS * WALLET.scraggyRate && !dT && !dF) {
        const short = Math.max(0, -dS - b.scraggy);                                                 // the part that came from the pot shared with Scraggy Airlines
        if (short <= WALLET.potDay - today.pot) { today.pot += short; b.scraggy = Math.max(0, b.scraggy + dS); credit(dM, 0, 0, 0, true); }
      }
    } else if (/^Exchanged (Octmiles|Scraggymiles|Octeetokens|Fujitech) for Joelmiles$/.test(text)) {
      const kind = text.match(/^Exchanged (\w+) for/)[1];
      const sp = { Octmiles: ["octmiles", dM, WALLET.jmIn.octmiles, !dT && !dF && !dS], Scraggymiles: ["scraggy", dS, WALLET.jmIn.scraggy, !dM && !dT && !dF], Octeetokens: ["tokens", dT, WALLET.jmIn.tokens, !dM && !dF && !dS], Fujitech: ["fujitech", dF, WALLET.jmIn.fujitech, !dM && !dT && !dS] }[kind];
      const [field, d, rate, clean] = sp;
      if (clean && d < 0 && dJ === -d * rate && b[field] >= -d && today.jm + dJ <= WALLET.jmDay) { b[field] += d; b.joelmiles = (b.joelmiles || 0) + dJ; today.jm += dJ; }
    } else if (/^Exchanged Joelmiles for (Octmiles|Scraggymiles|Octeetokens|Fujitech)$/.test(text)) {
      const kind = text.match(/for (\w+)$/)[1];
      const sp = { Octmiles: ["octmiles", dM, WALLET.jmOut.octmiles, !dT && !dF && !dS], Scraggymiles: ["scraggy", dS, WALLET.jmOut.scraggy, !dM && !dT && !dF], Octeetokens: ["tokens", dT, WALLET.jmOut.tokens, !dM && !dF && !dS], Fujitech: ["fujitech", dF, WALLET.jmOut.fujitech, !dM && !dT && !dS] }[kind];
      const [field, d, rate, clean] = sp;
      if (clean && d > 0 && dJ < 0 && -dJ === d * rate && (b.joelmiles || 0) >= -dJ) { b.joelmiles += dJ; b[field] += d; }
    } else if (/^Booking SCRAG-/.test(text)) {
      const ref = (text.match(/^Booking (SCRAG-\d+)/) || [])[1], t = trips.find((x) => x && x.scraggyRef === ref);
      if (dS > 0 && !dM && t && !prevRefs.has(t.ref) && dS <= WALLET.scraggyEntry && today.scraggy + dS <= WALLET.scraggyDay) { today.scraggy += dS; credit(0, 0, 0, dS, false); }
    } else if (/^Booking OCT-/.test(text)) {
      const ref = (text.match(/^Booking (OCT-\d+)/) || [])[1], t = trips.find((x) => x && x.ref === ref);
      if (dM > 0 && !dT && !dF && !dS && t && !prevRefs.has(t.ref) && dM <= WALLET.bookEntry && today.book + dM <= WALLET.bookDay) { today.book += dM; credit(dM, 0, 0, 0, true); }
    } else if (/^Code \S+$/.test(text)) {
      const hash = await sha("octee-code:" + text.slice(5).toUpperCase().replace(/\s+/g, ""));
      codes = codes || ((await publishedData(env, db, "codes")) || {}).codes || [];
      const digits = text.slice(5).toUpperCase().replace(/[^0-9]/g, "");
      let c = codes.find((x) => x && x.hash === hash);
      if (!c && /^[12]\d{3}[13579]$/.test(text.slice(5)) ) c = { octmiles: Number(digits.slice(0, 3)), active: true };
      if (!c || c.active === false || (c.expires && new Date(c.expires + "T23:59:59") < new Date())) continue;
      if (!c.repeat && b.state.codes[hash]) continue;
      const limited = wint(c.maxUses) >= 1;                                                       // a code with a usage limit needs a use claimed first (POST /api/code/claim)
      if (limited) {
        const cl = await db.prepare("SELECT n FROM code_claims WHERE user_id=? AND hash=?").bind(u.id, hash).first();
        if (((cl && cl.n) || 0) <= ((b.state.claimed || {})[hash] || 0)) continue;
      }
      const top = c.atTopTier && b.lifetime >= WALLET.topTier ? c.atTopTier : null;
      if (top && c.freeTopUses != null) {
        perms = perms || ((await publishedData(env, db, "permissions")) || {}).crew || {};
        if ((b.state.uses[hash] || 0) >= c.freeTopUses + wint(perms[String(u.username).toLowerCase()])) continue;
        b.state.uses[hash] = (b.state.uses[hash] || 0) + 1;
      }
      const wantM = top ? wint(top.octmiles) : wint(c.octmiles), wantT = top ? wint(top.tokens) : 0;
      if (dM !== wantM || dT !== wantT || dF || dS) continue;
      b.state.codes[hash] = true;
      if (limited) b.state.claimed = { ...(b.state.claimed || {}), [hash]: ((b.state.claimed || {})[hash] || 0) + 1 };
      credit(dM, dT, 0, 0, true);
    } else if (text === "JOELMOBILE ride (you were helped)") {
      if (dM === WALLET.rideMiles && !dT && !dF && !dS && today.ride + dM <= WALLET.rideDay) { today.ride += dM; credit(dM, 0, 0, 0, true); }
    } else if (text === "First review") {
      if (dM === WALLET.reviewMiles && !dT && !dF && !dS && !b.state.review) { b.state.review = true; credit(dM, 0, 0, 0, true); }
    } else if (THEME_REWARDS[text]) {
      // A festival reward: one a day per account. The ang pao keeps its old day flag ("angpao") so today's claims carry over.
      const key = THEME_REWARDS[text], flag = key === "cny" ? "angpao" : "reward_" + key;
      if (!dM && !dT && !dS && dF > 0 && !today[flag]) {
        const theme = await publishedData(env, db, "theme");
        const reward = Math.max(0, Math.min(100000, wint(theme?.[key]?.reward))) * 10;
        if (reward > 0 && dF === reward) { today[flag] = true; credit(0, 0, dF, 0, false); }
      }
    } else moveOut(Math.min(0, dM), Math.min(0, dT), Math.min(0, dF), Math.min(0, dS), Math.min(0, dJ));         // anything else may only take away
  }
  return b;
}
async function profileView(db, env, u, body) {
  const prof = JSON.parse(body);
  return { ...prof, ...balanceFields(await getBalances(db, env, u)), ...joelFields(await wallet(db, u.id)) };
}

// ---- JoelAI Pro wallet: Pro flag, purchased JoelTokens, this month's use. Lives on the server only. ----
const monthNow = () => new Date().toISOString().slice(0, 7);
async function wallet(db, userId) {
  const w = (await db.prepare("SELECT * FROM joel_wallet WHERE user_id=?").bind(userId).first()) || { user_id: userId, pro: 0, paid: 0, month: monthNow(), used: 0, in_t: 0, out_t: 0, total_t: 0 };
  if (w.month !== monthNow()) Object.assign(w, { month: monthNow(), used: 0, in_t: 0, out_t: 0, total_t: 0 }); // the monthly grant refreshes
  return w;
}
const monthlyLeft = (w) => (w.pro ? Math.max(0, JOEL.grant - w.used) : 0);
const balanceOf = (w) => w.paid + monthlyLeft(w);
function walletView(w) {
  const [y, m] = w.month.split("-").map(Number);
  return { pro: !!w.pro, balance: balanceOf(w), paid: w.paid, monthlyLeft: monthlyLeft(w), grant: JOEL.grant, month: w.month, resetsAt: new Date(Date.UTC(y, m, 1)).toISOString(),
    usage: { month: w.month, inputTokens: w.in_t, outputTokens: w.out_t, totalTokens: w.total_t, fromMonthly: w.used }, price: JOEL.price, rate: JOEL.rate, minReserve: JOEL.minReserve };
}
// The same numbers written into the saved profile, so the site shows what the server says (a browser edit is overwritten).
const joelFields = (w) => ({ joelPro: !!w.pro, joelPaidTokens: w.paid, joelMonthlyUsage: { month: w.month, usedTokens: w.used }, joelUsage: { month: w.month, inputTokens: w.in_t, outputTokens: w.out_t, totalTokens: w.total_t }, joelTokens: balanceOf(w) });
const saveWallet = (db, w) => db.prepare("INSERT INTO joel_wallet(user_id,pro,paid,month,used,in_t,out_t,total_t) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET pro=?, paid=?, month=?, used=?, in_t=?, out_t=?, total_t=?")
  .bind(w.user_id, w.pro ? 1 : 0, w.paid, w.month, w.used, w.in_t, w.out_t, w.total_t, w.pro ? 1 : 0, w.paid, w.month, w.used, w.in_t, w.out_t, w.total_t);
const ledgerRow = (db, userId, kind, octee, joel, model = "", inT = 0, outT = 0) => db.prepare("INSERT INTO joel_ledger(user_id,at,kind,octee,joel,model,in_t,out_t) VALUES(?,?,?,?,?,?,?,?)").bind(userId, iso(), kind, octee, joel, model, inT, outT);
async function profileWithJoel(db, userId, body) {
  const prof = JSON.parse(body);
  return { ...prof, ...joelFields(await wallet(db, userId)) };
}

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
      const u = await userFrom(db, req);
      const isCloudOwner = !!u && !!env.CONTROL_TOWER_OWNER_USERNAME && u.username.toLowerCase() === String(env.CONTROL_TOWER_OWNER_USERNAME).toLowerCase();
      const adminRole = async () => {
        if (!u) return null;
        if (isCloudOwner) return "owner";
        return (await db.prepare("SELECT user_id FROM cloud_admins WHERE user_id=?").bind(u.id).first()) ? "admin" : null;
      };
      // ---- code viewer access and code usage limits ----
      const codeOwner = !!u && (isCloudOwner || CODE_OWNERS.includes(u.username.toLowerCase()));
      const codeRole = async () => {
        if (!u) return null;
        if (codeOwner) return "owner";
        return (await db.prepare("SELECT user_id FROM code_viewers WHERE user_id=?").bind(u.id).first()) ? "viewer" : null;
      };
      if (path === "/api/code/me" && req.method === "GET") {
        if (!u) return reply(req, { error: "login" }, 401);
        const role = await codeRole();
        return role ? reply(req, { role, username: u.username }) : reply(req, { error: "forbidden" }, 403);
      }
      if (path === "/api/code/viewers" || path.startsWith("/api/code/viewers/")) {
        if (!u) return reply(req, { error: "login" }, 401);
        if (!codeOwner) return reply(req, { error: "owner_only" }, 403);
        if (path === "/api/code/viewers" && req.method === "GET") {
          const rows = await db.prepare("SELECT users.username, code_viewers.granted_at FROM code_viewers JOIN users ON users.id=code_viewers.user_id ORDER BY users.username").all();
          return reply(req, { owners: CODE_OWNERS, viewers: rows.results || [] });
        }
        if (path === "/api/code/viewers" && req.method === "POST") {
          const b = await req.json().catch(() => ({})), name = clip(b.username, 20).trim();
          const target = await db.prepare("SELECT id, username FROM users WHERE username_key=?").bind(name.toLowerCase()).first();
          if (!target) return reply(req, { error: "no_user", message: "That Cloud account does not exist." }, 404);
          if (CODE_OWNERS.includes(target.username.toLowerCase())) return reply(req, { error: "owner" }, 400);
          await db.prepare("INSERT INTO code_viewers(user_id,granted_by,granted_at) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING").bind(target.id, u.id, iso()).run();
          return reply(req, { ok: true });
        }
        const del = path.match(/^\/api\/code\/viewers\/([^/]+)$/);
        if (del && req.method === "DELETE") {
          const target = await db.prepare("SELECT id FROM users WHERE username_key=?").bind(decodeURIComponent(del[1]).toLowerCase()).first();
          if (target) await db.prepare("DELETE FROM code_viewers WHERE user_id=?").bind(target.id).run();
          return reply(req, { ok: true });
        }
      }
      // A code with a usage limit: claim one use before the Octmiles are added. The cloud counts every account's uses together.
      if (path === "/api/code/claim" && req.method === "POST") {
        if (!u) return reply(req, { error: "login" }, 401);
        const b = await req.json().catch(() => ({})), hash = clip(b.hash, 64);
        if (!/^[0-9a-f]{64}$/.test(hash)) return reply(req, { error: "bad_data" }, 400);
        const c = (((await publishedData(env, db, "codes")) || {}).codes || []).find((x) => x && x.hash === hash);
        const max = c ? wint(c.maxUses) : 0;
        if (!c || c.active === false || (c.expires && new Date(c.expires + "T23:59:59") < new Date())) return reply(req, { error: "not_real" }, 404);
        if (max < 1) return reply(req, { ok: true, limited: false });
        const bal = await getBalances(db, env, u), done = (bal.state.claimed || {})[hash] || 0;
        if (!c.repeat && (bal.state.codes[hash] || done >= 1)) return reply(req, { error: "already" }, 409);
        const cl = await db.prepare("SELECT n FROM code_claims WHERE user_id=? AND hash=?").bind(u.id, hash).first();
        if (((cl && cl.n) || 0) > done) return reply(req, { ok: true, limited: true });              // an earlier claim that was never credited
        const r = await db.prepare("INSERT INTO code_uses(hash,n) VALUES(?,1) ON CONFLICT(hash) DO UPDATE SET n=n+1 WHERE n<?").bind(hash, max).run();
        if (!r.meta || !r.meta.changes) return reply(req, { error: "used_up" }, 410);
        await db.prepare("INSERT INTO code_claims(user_id,hash,n) VALUES(?,?,1) ON CONFLICT(user_id,hash) DO UPDATE SET n=n+1").bind(u.id, hash).run();
        return reply(req, { ok: true, limited: true });
      }
      if (path.startsWith("/api/admin/")) {
        const role = await adminRole();
        if (!role) return reply(req, { error: u ? "forbidden" : "login" }, u ? 403 : 401);
        if (path === "/api/admin/code-uses" && req.method === "GET") {
          const rows = await db.prepare("SELECT hash, n FROM code_uses").all();
          return reply(req, { uses: Object.fromEntries((rows.results || []).map((x) => [x.hash, x.n])) });
        }
        if (path === "/api/admin/me" && req.method === "GET") return reply(req, { role, username: u.username });
        if (path === "/api/admin/users" && req.method === "GET") {
          const rows = await db.prepare("SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 500").all();
          return reply(req, { users: (rows.results || []).map((x) => ({ username: x.username, createdAt: x.created_at })) });
        }
        if ((path === "/api/admin/admins" || path.startsWith("/api/admin/admins/")) && role !== "owner") return reply(req, { error: "owner_only" }, 403);
        if (path === "/api/admin/admins" && req.method === "GET") {
          const rows = await db.prepare("SELECT users.username, cloud_admins.granted_at FROM cloud_admins JOIN users ON users.id=cloud_admins.user_id ORDER BY users.username").all();
          return reply(req, { admins: rows.results || [] });
        }
        if (path === "/api/admin/admins" && req.method === "POST") {
          const b = await req.json().catch(() => ({})), username = clip(b.username, 20).trim();
          const target = await db.prepare("SELECT id FROM users WHERE username_key=?").bind(username.toLowerCase()).first();
          if (!target) return reply(req, { error: "no_user", message: "That Cloud account does not exist." }, 404);
          if (target.id === u.id) return reply(req, { error: "owner" }, 400);
          await db.prepare("INSERT INTO cloud_admins(user_id,granted_by,granted_at) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING").bind(target.id, u.id, iso()).run();
          return reply(req, { ok: true });
        }
        const demote = path.match(/^\/api\/admin\/admins\/([^/]+)$/);
        if (demote && req.method === "DELETE") {
          const username = decodeURIComponent(demote[1]);
          await db.prepare("DELETE FROM cloud_admins WHERE user_id=(SELECT id FROM users WHERE username_key=?)").bind(username.toLowerCase()).run();
          return reply(req, { ok: true });
        }
        return reply(req, { error: "not_found" }, 404);
      }
      // An etched account (in the code) joins the cloud the first time its owner logs in. The browser has already checked the
      // password against the etched hash; the cloud checks that the name really is etched, and that nobody has claimed it yet.
      if (req.method === "POST" && path === "/api/claim") {
        const b = await req.json().catch(() => ({}));
        const username = String(b.username || "").trim(), password = String(b.password || ""), key = username.toLowerCase();
        const ip = req.headers.get("cf-connecting-ip") || "x";
        const e = (await etchedList(env)).find((x) => x.key === key);
        if (!e || e.hash !== String(b.proof || "")) return reply(req, { error: "bad_login" }, 401);
        if (password.length < 8 || password.length > 200) return reply(req, { error: "bad_password" }, 400);
        const rl = await limited(db, "reg:" + ip); if (rl) return reply(req, { error: "wait", seconds: rl }, 429);
        if (await db.prepare("SELECT id FROM users WHERE username_key=?").bind(key).first()) return reply(req, { error: "bad_login" }, 401);
        await fail(db, "reg:" + ip);
        const r = await db.prepare("INSERT INTO users(username,username_key,password_hash,created_at) VALUES(?,?,?,?)").bind(e.name, key, await hashPassword(password), iso()).run();
        return reply(req, { ok: true, username: e.name, token: await newSession(db, r.meta.last_row_id), profile: null, updatedAt: null }, 201);
      }
      // ---- JoelAI Pro: unlock, buy JoelTokens, read the wallet. Octeetokens are taken from the saved profile. ----
      if (path === "/api/joel" && req.method === "GET") {
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud to see your JoelTokens." }, 401);
        const w = await wallet(db, u.id);
        const rows = await db.prepare("SELECT at, kind, octee, joel, model, in_t, out_t FROM joel_ledger WHERE user_id=? ORDER BY id DESC LIMIT 20").bind(u.id).all();
        return reply(req, { ...walletView(w), ledger: rows.results || [] });
      }
      if (path === "/api/joel/unlock" || path === "/api/joel/buy") {
        if (req.method !== "POST") return reply(req, { error: "not_found" }, 404);
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud first." }, 401);
        const b = await req.json().catch(() => ({}));
        const w = await wallet(db, u.id), buying = path === "/api/joel/buy";
        const count = buying ? Math.floor(Number(b.count)) : 1;
        if (buying && !(count >= 1 && count <= JOEL.maxBuy)) return reply(req, { error: "bad_count", message: `Choose 1 to ${JOEL.maxBuy} Octeetokens.` }, 400);
        if (buying && !w.pro) return reply(req, { error: "not_pro", message: "Unlock JoelAI Pro first." }, 409);
        if (!buying && w.pro) return reply(req, { error: "already", message: "JoelAI Pro is already unlocked." }, 409);
        const free = !buying && (await perkOn(db, "freePro", u.username));
        const cost = buying ? count : free ? 0 : JOEL.price;
        const p = await db.prepare("SELECT body, updated_at FROM profiles WHERE user_id=?").bind(u.id).first();
        if (!p) return reply(req, { error: "no_profile", message: "Your account has not been saved to the cloud yet. Try again in a moment." }, 409);
        const prof = JSON.parse(p.body), bal = await getBalances(db, env, u), have = bal.tokens;
        if (have < cost) return reply(req, { error: "short", message: `You need ${cost - have} more Octeetoken${cost - have === 1 ? "" : "s"} (this costs ${cost}). Nothing was charged.` }, 402);
        if (buying) w.paid += count * JOEL.rate; else { w.pro = 1; w.month = monthNow(); w.used = 0; }
        const at = iso();
        const next = { ...prof, ...balanceFields({ ...bal, tokens: have - cost }), ...joelFields(w), history: [{ at, text: buying ? "Bought JoelTokens" : "Unlocked JoelAI Pro", amount: 0, tokens: -cost, ...(buying ? { joelTokens: count * JOEL.rate } : {}) }, ...(Array.isArray(prof.history) ? prof.history : [])].slice(0, 60) };
        // compare-and-set on updated_at, so two devices cannot spend the same Octeetokens twice
        const done = await db.prepare("UPDATE profiles SET body=?, updated_at=? WHERE user_id=? AND updated_at=?").bind(JSON.stringify(next), at, u.id, p.updated_at).run();
        if (!done.meta?.changes) return reply(req, { error: "busy", message: "Your account changed at the same moment. Nothing was charged. Please try again." }, 409);
        await db.batch([saveWallet(db, w), saveBalances(db, { ...bal, tokens: have - cost }), ledgerRow(db, u.id, buying ? "buy" : "unlock", -cost, buying ? count * JOEL.rate : 0)]);
        return reply(req, { ok: true, ...walletView(w), tokens: have - cost, updatedAt: at });
      }
      // JoelTokens <-> Joelmiles (the other currencies are checked from the saved account, see applyWallet). units = Joelmiles.
      // ---- Octee City: CCT wallet, shifts, exchange from Octmiles, and the OCT Bank. Log in first. ----
      if (path === "/api/city/news" && req.method === "GET") {
        await ensureCity(db);
        await weeklyEdition(db);
        const rows = await db.prepare("SELECT at, text FROM city_news ORDER BY id DESC LIMIT 12").all();
        return reply(req, { news: rows.results || [] });
      }
      if (path === "/api/city/leaderboard" && req.method === "GET") {
        await ensureCity(db);
        const rich = await db.prepare("SELECT u.username AS name, c.wallet AS wallet, c.bank_c AS bank, c.bank_at AS bank_at FROM city_accounts c JOIN users u ON u.id = c.user_id LIMIT 200").all();
        const hol = await cityHolidays(db);
        const ranked = (rich.results || []).map((r) => ({ name: r.name, cct: Number(r.wallet) + accrue(Number(r.bank), Number(r.bank_at), hol).bank_c / 100 })).sort((x, y) => y.cct - x.cct).slice(0, 10);
        const jailed = await db.prepare("SELECT u.username AS name, c.arrests AS arrests FROM city_accounts c JOIN users u ON u.id = c.user_id WHERE c.arrests > 0 ORDER BY c.arrests DESC LIMIT 10").all();
        return reply(req, {
          rich: ranked,
          arrests: (jailed.results || []).map((r) => ({ name: r.name, arrests: Number(r.arrests) })) });
      }
      if (path === "/api/city/setup" && req.method === "GET") {
        await ensureCity(db);
        const bs = await db.prepare("SELECT id, name, blurb FROM city_buildings ORDER BY at").all();
        const js = await db.prepare("SELECT j.id AS id, j.building AS building, j.title AS title, j.prompt AS prompt, j.right_answer AS right_answer, j.wrong AS wrong, j.hard AS hard, x.prompt2 AS prompt2, x.right2 AS right2, x.wrong2 AS wrong2 FROM city_jobs j LEFT JOIN city_job_extra x ON x.job = j.id ORDER BY j.at").all();
        return reply(req, {
          buildings: bs.results || [],
          jobs: (js.results || []).map((j) => ({ id: j.id, building: j.building, title: j.title, prompt: j.prompt, right: j.right_answer, wrong: JSON.parse(j.wrong || "[]"), hard: !!j.hard, ...(j.prompt2 ? { prompt2: j.prompt2, right2: j.right2, wrong2: JSON.parse(j.wrong2 || "[]") } : {}) })) });
      }
      if (path === "/api/city/property" && req.method === "GET") {
        await ensureCity(db);
        const rows = await db.prepare("SELECT s.building AS building, u.username AS owner, s.shares AS shares FROM city_shares s JOIN users u ON u.id = s.user_id ORDER BY s.building, s.shares DESC").all();
        const terms = await db.prepare("SELECT building, price, rent FROM city_building_terms").all();
        const rules = await db.prepare("SELECT building, min_shares FROM city_building_rules").all();
        const shareRent = await db.prepare("SELECT building, cents FROM city_share_rent").all();
        return reply(req, { shareRent: Object.fromEntries((shareRent.results || []).map((r) => [r.building, Number(r.cents)])), rules: Object.fromEntries((rules.results || []).map((r) => [r.building, Number(r.min_shares)])), price: CITY.price, rent: CITY.rent, owners: rows.results || [], terms: Object.fromEntries((terms.results || []).map((t) => [t.building, { price: Number(t.price), rent: Number(t.rent) }])) });
      }
      if (path === "/api/city/report" && req.method === "GET") {
        await ensureCity(db);
        const rows = await db.prepare("SELECT l.at AS at, l.cents AS cents, l.note AS note, u.username AS name FROM city_log l JOIN users u ON u.id = l.user_id WHERE l.kind = 'fine' ORDER BY l.id DESC LIMIT 30").all();
        return reply(req, { report: (rows.results || []).map((r) => ({ at: Number(r.at), fine: -Number(r.cents) / 100, note: r.note, name: r.name })) });
      }
      if (path === "/api/city/tower" && req.method === "GET") {
        await ensureCity(db);
        const rows = await db.prepare("SELECT u.username AS name, t.best AS best FROM city_tower t JOIN users u ON u.id = t.user_id ORDER BY t.best DESC, t.at ASC LIMIT 10").all();
        return reply(req, { scores: (rows.results || []).map((r) => ({ name: r.name, best: Number(r.best) })), challenge: { target: CITY.towerTarget, bonus: CITY.challengeBonus } });
      }
      if (path === "/api/city/chat" && req.method === "GET") {
        await ensureCity(db);
        const rows = await db.prepare("SELECT id, at, username, text FROM city_chat ORDER BY id DESC LIMIT 50").all();
        return reply(req, { messages: (rows.results || []).reverse() });
      }
      if (path === "/api/city/reviews" && req.method === "GET") {
        await ensureCity(db);
        const id = clip(url.searchParams.get("b"), 20);
        const rows = await db.prepare("SELECT username, stars, text, at FROM city_reviews WHERE building=? ORDER BY at DESC LIMIT 30").bind(id).all();
        const list = rows.results || [];
        const avg = list.length ? list.reduce((t, r) => t + Number(r.stars), 0) / list.length : 0;
        return reply(req, { building: id, average: Math.round(avg * 10) / 10, count: list.length, reviews: list });
      }
      if (path.startsWith("/api/city")) {
        if (!u) return reply(req, { error: "login", message: "Log in to Octee Cloud first." }, 401);
        const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
        if (path === "/api/city/setup" && req.method === "POST") {
          if (!(await adminRole())) return reply(req, { error: "forbidden", message: "Only the city's owner can set up buildings." }, 403);
          await ensureCity(db);
          const now = Date.now();
          if (b.kind === "building") {
            const id = String(b.id || "").toLowerCase().trim();
            const name = clip(String(b.name ?? "").trim(), 40), blurb = clip(String(b.blurb ?? "").trim(), 160);
            if (!CITY_ID.test(id)) return reply(req, { error: "bad_id", message: "Ids are 3 to 21 characters: lower-case letters, numbers and dashes, starting with a letter." }, 400);
            if (!name) return reply(req, { error: "bad_name", message: "Give the building a name." }, 400);
            if (await cityBuildingExists(db, id)) return reply(req, { error: "taken", message: "That id is already a building in the city." }, 409);
            await db.prepare("INSERT INTO city_buildings(id, name, blurb, at) VALUES(?, ?, ?, ?)").bind(id, name, blurb, now).run();
            return reply(req, { ok: true, id });
          }
          if (b.kind === "job") {
            const id = String(b.id || "").toLowerCase().trim(), building = String(b.building || "");
            const title = clip(String(b.title ?? "").trim(), 40), prompt = clip(String(b.prompt ?? "").trim(), 200), right = clip(String(b.right ?? "").trim(), 120);
            const wrong = Array.isArray(b.wrong) ? b.wrong.map((x) => clip(String(x ?? "").trim(), 120)) : [];
            if (!CITY_ID.test(id)) return reply(req, { error: "bad_id", message: "Ids are 3 to 21 characters: lower-case letters, numbers and dashes, starting with a letter." }, 400);
            if (!(await cityBuildingExists(db, building))) return reply(req, { error: "no_building", message: "Pick a building that is in the city." }, 400);
            if (!title || !prompt || !right || wrong.length < 1 || wrong.some((x) => !x)) return reply(req, { error: "incomplete", message: "A job needs a title, a question, a right answer and at least one wrong answer." }, 400);
            if (await cityJob(db, id)) return reply(req, { error: "taken", message: "That job id is already in use." }, 409);
            const p2 = clip(String(b.prompt2 ?? "").trim(), 200), r2 = clip(String(b.right2 ?? "").trim(), 120);
            const w2 = Array.isArray(b.wrong2) ? b.wrong2.map((x) => clip(String(x ?? "").trim(), 120)).filter(Boolean) : [];
            const second = !!(p2 || r2 || w2.length);
            if (second && !b.hard) return reply(req, { error: "not_hard", message: "A second question is only for hard jobs." }, 400);
            if (second && (!p2 || !r2 || !w2.length)) return reply(req, { error: "incomplete", message: "A second question needs a question, a right answer and at least one wrong answer." }, 400);
            await db.prepare("INSERT INTO city_jobs(id, building, title, prompt, right_answer, wrong, hard, at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)").bind(id, building, title, prompt, right, JSON.stringify(wrong), b.hard ? 1 : 0, now).run();
            if (second) await db.prepare("INSERT INTO city_job_extra(job, prompt2, right2, wrong2) VALUES(?, ?, ?, ?)").bind(id, p2, r2, JSON.stringify(w2)).run();
            return reply(req, { ok: true, id });
          }
          if (b.kind === "terms") {
            const building = String(b.building || "");
            const price = Math.floor(Number(b.price)), rent = Math.floor(Number(b.rent));
            if (!(await cityBuildingExists(db, building))) return reply(req, { error: "no_building", message: "Pick a building that is in the city." }, 400);
            if (!(price >= 50 && price <= 5000)) return reply(req, { error: "bad_price", message: "A building costs between 50 and 5,000 CCT." }, 400);
            if (price % CITY.shares !== 0) return reply(req, { error: "bad_price", message: `The price must split into ${CITY.shares} equal shares, so a multiple of ${CITY.shares}.` }, 400);
            if (!(rent >= 1 && rent <= 50)) return reply(req, { error: "bad_rent", message: "Rent is between 1 and 50 CCT a day." }, 400);
            await db.prepare("INSERT INTO city_building_terms(building, price, rent) VALUES(?, ?, ?) ON CONFLICT(building) DO UPDATE SET price=excluded.price, rent=excluded.rent").bind(building, price, rent).run();
            if (b.shareCents !== undefined && b.shareCents !== null && b.shareCents !== "") {
              const cents = Math.floor(Number(b.shareCents));
              if (!(cents >= 1 && cents <= 500)) return reply(req, { error: "bad_share_rent", message: "Rent per share is between 1 and 500 cents a day." }, 400);
              await db.prepare("INSERT INTO city_share_rent(building, cents) VALUES(?, ?) ON CONFLICT(building) DO UPDATE SET cents=excluded.cents").bind(building, cents).run();
            }
            const minShares = b.minShares === undefined ? null : Math.floor(Number(b.minShares));
            if (minShares !== null) {
              if (!(minShares >= 1 && minShares <= CITY.shares)) return reply(req, { error: "bad_min", message: `A lot is between 1 and ${CITY.shares} shares.` }, 400);
              await db.prepare("INSERT INTO city_building_rules(building, min_shares) VALUES(?, ?) ON CONFLICT(building) DO UPDATE SET min_shares=excluded.min_shares").bind(building, minShares).run();
            }
            return reply(req, { ok: true, building, price, rent, minShares });
          }
          if (b.kind === "holiday") {
            const day = String(b.date || "");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < dayStr(Date.now())) return reply(req, { error: "bad_date", message: "Pick a date from today on." }, 400);
            await db.prepare("INSERT OR IGNORE INTO city_holidays(day) VALUES(?)").bind(day).run();
            await cityNews(db, `The city has declared a bank holiday on ${day}. Interest at OCT Bank is doubled for the day.`);
            return reply(req, { ok: true, day });
          }
          return reply(req, { error: "bad_kind", message: "Say whether this is a building or a job." }, 400);
        }
        if (path.startsWith("/api/city/setup/") && req.method === "DELETE") {
          if (!(await adminRole())) return reply(req, { error: "forbidden", message: "Only the city's owner can remove buildings." }, 403);
          await ensureCity(db);
          const id = decodeURIComponent(path.slice("/api/city/setup/".length)).toLowerCase();
          if (CITY.buildings.includes(id) || CITY.jobs.includes(id)) return reply(req, { error: "builtin", message: "The built-in parts of the city cannot be removed." }, 400);
          await db.prepare("DELETE FROM city_jobs WHERE building=?").bind(id).run();
          await db.prepare("DELETE FROM city_jobs WHERE id=?").bind(id).run();
          await db.prepare("DELETE FROM city_buildings WHERE id=?").bind(id).run();
          return reply(req, { ok: true });
        }
        if (path.startsWith("/api/city/chat/") && req.method === "DELETE") {
          await ensureCity(db);
          const pol = await cityAccount(db, u.id);
          if (!cityOnDuty(pol) && !(await adminRole())) return reply(req, { error: "forbidden", message: "Only police on duty, or the city's owner, can remove a message." }, 403);
          const id = Math.floor(Number(path.slice("/api/city/chat/".length)));
          const row = await db.prepare("SELECT username FROM city_chat WHERE id=?").bind(id).first();
          if (!row) return reply(req, { error: "gone", message: "That message has already gone." }, 404);
          await db.prepare("DELETE FROM city_chat WHERE id=?").bind(id).run();
          await cityNews(db, `The police removed a message from the Town Square, from ${row.username}.`);
          return reply(req, { ok: true });
        }
        if (path === "/api/city/chat" && req.method === "POST") {
          await ensureCity(db);
          const text = clip(String(b.text ?? "").trim(), 200);
          if (!text) return reply(req, { error: "bad_text", message: "Say something first. The square is listening." }, 400);
          const last = await db.prepare("SELECT at FROM city_chat WHERE user_id=? ORDER BY id DESC LIMIT 1").bind(u.id).first();
          if (last && Date.now() - Number(last.at) < 10000) return reply(req, { error: "slow", message: "Slow down. The square is busy and the bench is full." }, 429);
          await db.prepare("INSERT INTO city_chat(user_id, username, at, text) VALUES(?, ?, ?, ?)").bind(u.id, u.username, Date.now(), text).run();
          return reply(req, { ok: true });
        }
        if (path === "/api/city/review" && req.method === "POST") {
          await ensureCity(db);
          const building = String(b.building || "");
          const stars = Math.floor(Number(b.stars));
          const text = clip(String(b.text ?? "").trim(), 280);
          if (!(await cityBuildingExists(db, building))) return reply(req, { error: "bad_building", message: "There is no such building." }, 400);
          if (!(stars >= 1 && stars <= 5)) return reply(req, { error: "bad_stars", message: "Give one to five stars." }, 400);
          await db.prepare("INSERT INTO city_reviews(user_id, building, username, stars, text, at) VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, building) DO UPDATE SET stars=excluded.stars, text=excluded.text, at=excluded.at, username=excluded.username").bind(u.id, building, u.username, stars, text, Date.now()).run();
          return reply(req, { ok: true });
        }
        if (path === "/api/city/game" && req.method === "POST") {
          await ensureCity(db);
          const score = Math.floor(Number(b.score));
          if (!(score >= 0 && score <= 500)) return reply(req, { error: "bad_score", message: "That is not a real score. The tower is not that tall." }, 400);
          let bonus = 0;
          const week = Math.floor(Date.now() / (7 * DAY));
          if (score >= CITY.towerTarget && !(await db.prepare("SELECT 1 FROM city_challenge WHERE user_id=? AND week=?").bind(u.id, week).first())) {
            await db.prepare("INSERT INTO city_challenge(user_id, week) VALUES(?, ?)").bind(u.id, week).run();
            const cz = await cityAccount(db, u.id);
            cz.wallet += CITY.challengeBonus;
            bonus = CITY.challengeBonus;
            await cityLog(db, u.id, "bonus", bonus * 100, `weekly tower challenge, ${CITY.towerTarget} blocks`);
            await saveCity(db, u.id, cz);
          }
          if (score > 0) await db.prepare("INSERT INTO city_scores(user_id, username, score, at) VALUES(?, ?, ?, ?)").bind(u.id, u.username, score, Date.now()).run();
          await db.prepare("INSERT INTO city_tower(user_id, best, at) VALUES(?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET best=MAX(best, excluded.best), at=excluded.at").bind(u.id, score, Date.now()).run();
          const today = iso().slice(0, 10);
          const g = await db.prepare("SELECT last_day FROM city_game WHERE user_id=?").bind(u.id).first();
          if (g && g.last_day === today) return reply(req, { ok: true, reward: 0, bonus, score, message: "You already earned from the tower today. You can still play for fun." });
          const reward = score >= 10 ? Math.min(CITY.gameMax, Math.floor(score / 10)) : 0;
          if (reward > 0) {
            const city = await cityAccount(db, u.id);
            city.wallet += reward;
            await cityLog(db, u.id, "game", reward * 100, `tower, ${score} blocks`);
            await saveCity(db, u.id, city);
            await db.prepare("INSERT INTO city_game(user_id, last_day) VALUES(?, ?) ON CONFLICT(user_id) DO UPDATE SET last_day=excluded.last_day").bind(u.id, today).run();
          }
          return reply(req, { ok: true, reward, bonus, score, message: reward ? `The tower stood. You earned ${reward} CCT.` : "The tower fell over. It was not your fault." });
        }
        const city = await cityAccount(db, u.id), now = Date.now();
        if (path === "/api/city" && req.method === "GET") {
          await saveCity(db, u.id, city);
          const log = await db.prepare("SELECT at, kind, cents, note FROM city_log WHERE user_id=? ORDER BY id DESC LIMIT 20").bind(u.id).all();
          const st = await cityStreak(db, u.id), yesterday = dayStr(now - DAY);
          const live = st.last === dayStr(now) || st.last === yesterday ? st.streak : 0;
          const mine = await db.prepare("SELECT building, shares, paid FROM city_shares WHERE user_id=?").bind(u.id).all();
          const hols = await db.prepare("SELECT day FROM city_holidays WHERE day >= ? ORDER BY day LIMIT 10").bind(dayStr(now)).all();
          return reply(req, { ...cityView(city, now), holidays: (hols.results || []).map((h) => h.day), canModerate: cityOnDuty(city) || !!(await adminRole()), statement: log.results || [], streak: live, streakBonus: CITY.streakBonus, streakDays: CITY.streakDays, owned: (mine.results || []).map((r) => r.building), sharesFor: Object.fromEntries((mine.results || []).map((r) => [r.building, Number(r.shares)])), paidFor: Object.fromEntries((mine.results || []).map((r) => [r.building, Number(r.paid)])), price: CITY.price, rent: CITY.rent });
        }
        if (path === "/api/city/shift" && req.method === "POST") {
          const job = String(b.job || "");
          const known = await cityJob(db, job);
          if (!known) return reply(req, { error: "bad_job", message: "There is no such job." }, 400);
          if (city.jail_until > now) return reply(req, { error: "jailed", message: "You are in the cells. No shifts until your time is up. Nothing was paid.", jailUntil: city.jail_until }, 403);
          const today = iso().slice(0, 10), done = city.shifts[today] || [];
          if (done.includes(job)) {
            // a second shift on the same job in one day is a rule break: arrested, fined, locked up for a while
            const fine = Math.min(CITY.fine, city.wallet);
            city.wallet -= fine; city.arrests += 1; city.jail_until = now + CITY.jailMinutes * 60000;
            await cityLog(db, u.id, "fine", -fine * 100, "arrested: double shift at " + job.replace(/-/g, " "));
            await cityNews(db, `${u.username} was arrested for a double shift at ${job.replace(/-/g, " ")}. Fine: ${fine} CCT.`);
            const week = await db.prepare("SELECT COUNT(*) AS n FROM city_log WHERE user_id=? AND kind = 'fine' AND note LIKE 'arrested:%' AND at >= ?").bind(u.id, Date.now() - 7 * DAY).first();
            if (Number(week.n) === 3) await cityNews(db, `WANTED: ${u.username}, arrested three times this week. Please come quietly to the Police Station.`);
            if (city.arrests === 5 || city.arrests === 10) await cityNews(db, `${u.username} is now a repeat offender, with ${city.arrests} arrests. The cells have a chair with their name on it.`);
            await saveCity(db, u.id, city);
            return reply(req, { ok: false, arrested: true, fine, ...cityView(city, now), message: `Arrested. You already did that shift today. Fine: ${fine} CCT. Please wait in the cells.` });
          }
          const st = await cityStreak(db, u.id);
          const streak = st.last === today ? st.streak : st.last === dayStr(now - DAY) ? st.streak + 1 : 1;
          await db.prepare("INSERT INTO city_streak(user_id, last_day, streak) VALUES(?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET last_day=excluded.last_day, streak=excluded.streak").bind(u.id, today, streak).run();
          const bonus = streak >= CITY.streakDays ? CITY.streakBonus : 0;
          const pay = (known.hard ? CITY.hardPay : CITY.jobPay) + bonus;
          city.shifts = { [today]: [...done, job] };
          city.wallet += pay;
          await cityLog(db, u.id, "shift", pay * 100, job.replace(/-/g, " ") + (bonus ? ` (day ${streak} streak bonus)` : ""));
          let spot = null;
          if (Math.random() < CITY.spotChance) {
            const rules = [
              { rule: "No more than 100 CCT on the street. Pockets are for lint.", fails: () => city.wallet > 100 },
              { rule: "The bank must not hold 1,000 CCT or more on a shift day.", fails: () => Math.floor(city.bank_c / 100) >= 1000 },
              { rule: "Two jobs before going home. One job is a hobby.", fails: () => (city.shifts[today] || []).length < 2 }
            ];
            const pick = rules[Math.floor(Math.random() * rules.length)];
            const failed = pick.fails();
            const fine = failed ? Math.min(CITY.fine, city.wallet) : 0;
            city.wallet -= fine;
            if (fine > 0) await cityLog(db, u.id, "fine", -fine * 100, "spot check failed");
            spot = { rule: pick.rule, failed, fine };
            if (failed) await cityNews(db, `${u.username} failed a police spot check: "${pick.rule}" Fine: ${fine} CCT.`);
          }
          await saveCity(db, u.id, city);
          return reply(req, { ok: true, paid: pay, bonus, streak, spot, ...cityView(city, now) });
        }
        if (path === "/api/city/exchange" && req.method === "POST") {
          const units = Math.floor(Number(b.units));
          if (!(units >= 1 && units <= 10000)) return reply(req, { error: "bad_count", message: "Choose 1 to 10,000 CCT." }, 400);
          const cost = units * CITY.rate, bal = await getBalances(db, env, u);
          if (bal.octmiles < cost) return reply(req, { error: "short", message: `That needs ${cost.toLocaleString("en-GB")} Octmiles. You have ${bal.octmiles.toLocaleString("en-GB")}. Nothing was changed.` }, 402);
          await saveBalances(db, { ...bal, octmiles: bal.octmiles - cost }).run();
          city.wallet += units;
          await cityLog(db, u.id, "buy", units * 100, `${cost} Octmiles`);
          await saveCity(db, u.id, city);
          return reply(req, { ok: true, bought: units, octmiles: bal.octmiles - cost, ...cityView(city, now) });
        }
        if (path === "/api/city/sell" && req.method === "POST") {
          const units = Math.floor(Number(b.units));
          if (!(units >= 1 && units <= 10000)) return reply(req, { error: "bad_count", message: "Choose 1 to 10,000 CCT." }, 400);
          if (city.wallet < units) return reply(req, { error: "short", message: `You only have ${city.wallet} CCT in your wallet. Nothing was changed.` }, 402);
          const gain = units * CITY.sell, bal = await getBalances(db, env, u);
          await saveBalances(db, { ...bal, octmiles: bal.octmiles + gain }).run();
          city.wallet -= units;
          await cityLog(db, u.id, "sell", -units * 100, `${gain} Octmiles`);
          await saveCity(db, u.id, city);
          return reply(req, { ok: true, sold: units, got: gain, octmiles: bal.octmiles + gain, ...cityView(city, now) });
        }
        if (path === "/api/city/claims" && req.method === "GET") {
          const rows = await db.prepare("SELECT l.id AS id, l.at AS at, l.cents AS cents, l.note AS note FROM city_log l LEFT JOIN city_claims c ON c.log_id = l.id WHERE l.user_id = ? AND l.kind = 'fine' AND l.cents < 0 AND l.at >= ? AND c.log_id IS NULL ORDER BY l.id DESC LIMIT 20").bind(u.id, Date.now() - 7 * DAY).all();
          return reply(req, { claims: (rows.results || []).map((r) => ({ id: r.id, at: r.at, fine: -Number(r.cents) / 100, refund: Math.floor(-Number(r.cents) / 200), note: r.note })) });
        }
        if (path === "/api/city/claim" && req.method === "POST") {
          const id = Math.floor(Number(b.log));
          const f = await db.prepare("SELECT cents FROM city_log WHERE id=? AND user_id=? AND kind = 'fine' AND cents < 0 AND at >= ?").bind(id, u.id, Date.now() - 7 * DAY).first();
          if (!f) return reply(req, { error: "no_claim", message: "That fine cannot be claimed. Fines can be claimed within a week, once." }, 400);
          if (await db.prepare("SELECT 1 FROM city_claims WHERE log_id=?").bind(id).first()) return reply(req, { error: "claimed", message: "You have already claimed that one." }, 409);
          const refund = Math.floor(-Number(f.cents) / 200);
          await db.prepare("INSERT INTO city_claims(log_id) VALUES(?)").bind(id).run();
          const city = await cityAccount(db, u.id), now = Date.now();
          city.wallet += refund;
          await cityLog(db, u.id, "claim", refund * 100, "lost property refund, half a fine");
          await saveCity(db, u.id, city);
          return reply(req, { ok: true, refund, ...cityView(city, now) });
        }
        if (path === "/api/city/property/buy" && req.method === "POST") {
          const building = String(b.building || "");
          const n = Math.floor(Number(b.shares ?? 1));
          if (!(await cityBuildingExists(db, building))) return reply(req, { error: "no_building", message: "There is no such building." }, 400);
          if (!(n >= 1 && n <= CITY.shares)) return reply(req, { error: "bad_shares", message: `Buy between 1 and ${CITY.shares} shares.` }, 400);
          const sold = await db.prepare("SELECT COALESCE(SUM(shares), 0) AS n FROM city_shares WHERE building=?").bind(building).first();
          const left = CITY.shares - Number(sold.n);
          if (n > left) return reply(req, { error: "taken", message: left ? `Only ${left} share${left === 1 ? "" : "s"} left.` : "Every share is taken. Ask an owner nicely." }, 409);
          const min = await cityMinShares(db, building);
          if (n < min && n !== left) return reply(req, { error: "minimum", message: `This building sells in lots of at least ${min} share${min === 1 ? "" : "s"}, except for the last shares left.` }, 400);
          const terms = await cityTerms(db, building);
          const cost = Math.round((terms.price / CITY.shares) * n);
          if (city.wallet < cost) return reply(req, { error: "short", message: `${n} share${n === 1 ? "" : "s"} cost ${cost} CCT. You have ${city.wallet}. Nothing was changed.` }, 402);
          city.wallet -= cost;
          const mine = await db.prepare("SELECT shares FROM city_shares WHERE building=? AND user_id=?").bind(building, u.id).first();
          if (mine) await db.prepare("UPDATE city_shares SET shares=shares+?, paid=paid+? WHERE building=? AND user_id=?").bind(n, cost, building, u.id).run();
          else await db.prepare("INSERT INTO city_shares(building, user_id, shares, paid, collected_at, carry) VALUES(?, ?, ?, ?, ?, 0)").bind(building, u.id, n, cost, now).run();
          await cityLog(db, u.id, "buy", -cost * 100, `bought ${n} share${n === 1 ? "" : "s"} of the ${building} building`);
          await cityNews(db, `${u.username} bought ${n} share${n === 1 ? "" : "s"} of the ${building} building. The building earns ${terms.rent} CCT a day, shared out between its owners.`);
          if (Number(sold.n) + n === CITY.shares) {
            const holders = await db.prepare("SELECT COUNT(*) AS c, MIN(user_id) AS only FROM city_shares WHERE building=?").bind(building).first();
            const whole = Number(holders.c) === 1 ? await db.prepare("SELECT username FROM users WHERE id=?").bind(holders.only).first() : null;
            await cityNews(db, whole ? `${whole.username} now owns all of the ${building} building. Every share, every day.` : `All ten shares of the ${building} building have been sold. It has changed hands fully.`);
          }
          await saveCity(db, u.id, city);
          return reply(req, { ok: true, ...cityView(city, now) });
        }
        if (path === "/api/city/property/sell" && req.method === "POST") {
          const building = String(b.building || "");
          const n = Math.floor(Number(b.shares ?? 1));
          const mine = await db.prepare("SELECT shares, paid FROM city_shares WHERE building=? AND user_id=?").bind(building, u.id).first();
          if (!mine || Number(mine.shares) < 1) return reply(req, { error: "not_owner", message: "You do not own a share in that building." }, 403);
          if (!(n >= 1 && n <= Number(mine.shares))) return reply(req, { error: "bad_shares", message: `You have ${mine.shares} share${Number(mine.shares) === 1 ? "" : "s"} there.` }, 400);
          const paidPart = Math.round((Number(mine.paid) * n) / Number(mine.shares));
          const refund = Math.floor(paidPart / 2);
          city.wallet += refund;
          if (Number(mine.shares) === n) await db.prepare("DELETE FROM city_shares WHERE building=? AND user_id=?").bind(building, u.id).run();
          else await db.prepare("UPDATE city_shares SET shares=shares-?, paid=paid-? WHERE building=? AND user_id=?").bind(n, paidPart, building, u.id).run();
          await cityLog(db, u.id, "sell", refund * 100, `sold ${n} share${n === 1 ? "" : "s"} of the ${building} building, half of what they cost`);
          await saveCity(db, u.id, city);
          return reply(req, { ok: true, refund, ...cityView(city, now) });
        }
        if (path === "/api/city/bank" && req.method === "POST") {
          const amount = Math.floor(Number(b.amount)), dir = b.dir === "out" ? "out" : "in";
          if (!(amount >= 1 && amount <= 10000000)) return reply(req, { error: "bad_count", message: "Choose a whole number of CCT." }, 400);
          if (dir === "in") {
            if (city.wallet < amount) return reply(req, { error: "short", message: `You only have ${city.wallet} CCT in your wallet. Nothing was moved.` }, 402);
            const before = tierFor(Math.floor(city.bank_c / 100)).name;
            city.wallet -= amount; city.bank_c += amount * 100;
            await cityLog(db, u.id, "deposit", amount * 100, "into OCT Bank");
            if (before !== "Gold" && tierFor(Math.floor(city.bank_c / 100)).name === "Gold") await cityNews(db, `${u.username} has reached Gold tier at OCT Bank. The bank has bought a second pen.`);
          } else {
            if (Math.floor(city.bank_c / 100) < amount) return reply(req, { error: "short", message: "The bank does not hold that much for you. Nothing was moved." }, 402);
            city.bank_c -= amount * 100; city.wallet += amount;
            await cityLog(db, u.id, "withdraw", -amount * 100, "out of OCT Bank");
          }
          await saveCity(db, u.id, city);
          return reply(req, { ok: true, ...cityView(city, now) });
        }
        return reply(req, { error: "not_found" }, 404);
      }
      if (path === "/api/joel/exchange" && req.method === "POST") {
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud first." }, 401);
        const b = await req.json().catch(() => ({})), dir = b.dir === "out" ? "out" : "in", units = Math.floor(Number(b.units));
        if (!(units >= 1 && units <= 100000)) return reply(req, { error: "bad_count", message: "Choose how many Joelmiles (1 to 100,000)." }, 400);
        const w = await wallet(db, u.id), bal = await getBalances(db, env, u), day = iso().slice(0, 10);
        const today = (bal.state.days[day] = { book: 0, scraggy: 0, ride: 0, pot: 0, jm: 0, ...(bal.state.days[day] || {}) });
        let tokens = 0;
        if (dir === "in") {
          tokens = units * WALLET.jtPer;
          if (w.paid < tokens) return reply(req, { error: "short", message: `That needs ${tokens.toLocaleString("en-GB")} bought JoelTokens. You have ${w.paid.toLocaleString("en-GB")}. Nothing was changed.` }, 402);
          if (today.jm + units > WALLET.jmDay) return reply(req, { error: "cap", message: `At most ${WALLET.jmDay.toLocaleString("en-GB")} Joelmiles can be bought a day. Nothing was changed.` }, 429);
          w.paid -= tokens; bal.joelmiles = (bal.joelmiles || 0) + units; today.jm += units;
        } else {
          tokens = units * WALLET.jtOut;
          if (!w.pro) return reply(req, { error: "not_pro", message: "Unlock JoelAI Pro first." }, 409);
          if ((bal.joelmiles || 0) < units) return reply(req, { error: "short", message: "You do not have that many Joelmiles. Nothing was changed." }, 402);
          bal.joelmiles -= units; w.paid += tokens;
        }
        await db.batch([saveWallet(db, w), saveBalances(db, bal), ledgerRow(db, u.id, "exchange", 0, dir === "in" ? -tokens : tokens)]);
        return reply(req, { ok: true, joelmiles: bal.joelmiles, ...walletView(w) });
      }
      // A flat-price answer (Joel-3.3 Pro, Joel-4.3 NEO). The price, the free list and the balance are all decided here.
      if (path === "/api/joel/spend" && req.method === "POST") {
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud first." }, 401);
        const b = await req.json().catch(() => ({})), m = Object.hasOwn(FLAT, b.model) ? FLAT[b.model] : null;
        if (!m) return reply(req, { error: "bad_model", message: "That model has no flat price." }, 400);
        const w = await wallet(db, u.id);
        if (!w.pro) return reply(req, { error: "not_pro", message: "Unlock JoelAI Pro first." }, 409);
        if (await perkOn(db, "freeModels", u.username)) return reply(req, { ok: true, charged: 0, free: true, ...walletView(w) });
        if (balanceOf(w) < m.price) return reply(req, { error: "short", message: `${m.name} needs ${m.price} JoelTokens. Nothing was charged.` }, 402);
        const fromMonthly = Math.min(m.price, monthlyLeft(w)), fromPaid = m.price - fromMonthly;
        w.used += fromMonthly; w.paid -= fromPaid;
        const p = await db.prepare("SELECT body FROM profiles WHERE user_id=?").bind(u.id).first();
        const at = iso(), stmts = [saveWallet(db, w), ledgerRow(db, u.id, "use", 0, -m.price, clip(b.model, 40))];
        if (p) {
          const prof = JSON.parse(p.body);
          const next = { ...prof, ...joelFields(w), history: [{ at, text: `JoelAI Pro · ${m.name}`, amount: 0, tokens: 0, joelTokens: -m.price }, ...(Array.isArray(prof.history) ? prof.history : [])].slice(0, 60) };
          stmts.push(db.prepare("UPDATE profiles SET body=?, updated_at=? WHERE user_id=?").bind(JSON.stringify(next), at, u.id));
        }
        await db.batch(stmts);
        return reply(req, { ok: true, charged: m.price, ...walletView(w) });
      }
      // The model server (Vercel) reports what a finished answer used. Needs the shared secret, so a browser cannot call it.
      if (path === "/api/joel/charge" && req.method === "POST") {
        if (!env.JOEL_LEDGER_SECRET || req.headers.get("x-ledger-secret") !== env.JOEL_LEDGER_SECRET) return reply(req, { error: "forbidden" }, 403);
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud first." }, 401);
        const b = await req.json().catch(() => ({}));
        const inT = Math.max(0, Math.floor(Number(b.usage?.inputTokens) || 0)), outT = Math.max(0, Math.floor(Number(b.usage?.outputTokens) || 0));
        const total = Math.min(JOEL.maxCharge, Math.max(0, Math.floor(Number(b.usage?.totalTokens) || inT + outT)));
        if (!total) return reply(req, { error: "no_usage", message: "The model did not report token usage, so nothing was charged." }, 400);
        const w = await wallet(db, u.id);
        if (!w.pro) return reply(req, { error: "not_pro", message: "Unlock JoelAI Pro first." }, 409);
        const fromMonthly = Math.min(total, monthlyLeft(w)), fromPaid = Math.min(w.paid, total - fromMonthly);
        w.used += fromMonthly; w.paid -= fromPaid; w.in_t += inT; w.out_t += outT; w.total_t += total;
        const p = await db.prepare("SELECT body FROM profiles WHERE user_id=?").bind(u.id).first();
        const at = iso(), stmts = [saveWallet(db, w), ledgerRow(db, u.id, "use", 0, -(fromMonthly + fromPaid), clip(b.model, 40), inT, outT)];
        if (p) {
          const prof = JSON.parse(p.body);
          const next = { ...prof, ...joelFields(w), history: [{ at, text: `JoelAI Pro · ${clip(b.modelName || b.model, 40)}`, amount: 0, tokens: 0, joelTokens: -(fromMonthly + fromPaid) }, ...(Array.isArray(prof.history) ? prof.history : [])].slice(0, 60) };
          stmts.push(db.prepare("UPDATE profiles SET body=?, updated_at=? WHERE user_id=?").bind(JSON.stringify(next), at, u.id));
        }
        await db.batch(stmts);
        return reply(req, { ok: true, charged: fromMonthly + fromPaid, ...walletView(w) });
      }
      // ---- Control Tower: files published to the cloud (codes, accounts, permissions, crew, flight discounts) ----
      if (path.startsWith("/api/data/")) {
        const name = decodeURIComponent(path.slice(10));
        if (!Object.hasOwn(DATA_NAMES, name)) return reply(req, { error: "not_found" }, 404);
        if (req.method === "GET") {
          const row = await db.prepare("SELECT body, updated_at, updated_by FROM published WHERE name=?").bind(name).first();
          if (!row) return reply(req, { error: "not_found" }, 404);
          return reply(req, { data: JSON.parse(row.body), updatedAt: row.updated_at, updatedBy: row.updated_by });
        }
        if (req.method === "PUT") {
          if (!u) return reply(req, { error: "login" }, 401);
          if (!(await adminRole())) return reply(req, { error: "not_publisher" }, 403);
          const text = await req.text();
          if (text.length > MAX_DATA) return reply(req, { error: "too_big" }, 413);
          let b; try { b = JSON.parse(text); } catch { return reply(req, { error: "bad_json" }, 400); }
          if (!b || typeof b.data !== "object" || b.data === null || Array.isArray(b.data) || !DATA_NAMES[name](b.data)) return reply(req, { error: "bad_data" }, 400);
          const at = iso(), body = JSON.stringify(b.data);
          await db.prepare("INSERT INTO published(name,body,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET body=?, updated_at=?, updated_by=?").bind(name, body, at, u.username, body, at, u.username).run();
          if (name === "accounts") etchedMemo = { at: 0, list: [] };
          delete dataMemo[name];
          return reply(req, { ok: true, updatedAt: at });
        }
      }
      // Reviews: everyone can read them; a cloud login writes one review each.
      if (req.method === "GET" && path === "/api/reviews") {
        const rows = await db.prepare("SELECT id, username, stars, title, body, date, route, trip_ref, verified, created_at, updated_at FROM review_posts ORDER BY updated_at DESC LIMIT 300").all();
        // edited: changed after it was first posted (by its writer, or by the Control Tower)
        return reply(req, { reviews: (rows.results || []).map((r) => ({ id: r.id, username: r.username, stars: r.stars, title: r.title, body: r.body, date: r.date, route: r.route || "", tripRef: r.trip_ref || "", verified: !!r.verified, edited: r.updated_at !== r.created_at })) });
      }
      if (req.method === "POST" && (path === "/api/register" || path === "/api/login")) {
        const b = await req.json().catch(() => ({}));
        const username = String(b.username || "").trim(), password = String(b.password || "");
        const ip = req.headers.get("cf-connecting-ip") || "x";
        if (path === "/api/register") {
          if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return reply(req, { error: "bad_username" }, 400);
          if (password.length < 8 || password.length > 200) return reply(req, { error: "bad_password" }, 400);
          const rl = await limited(db, "reg:" + ip); if (rl) return reply(req, { error: "wait", seconds: rl }, 429);
          const key = username.toLowerCase();
          if ((await etchedList(env)).some((e) => e.key === key)) return reply(req, { error: "etched" }, 409);
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
        return reply(req, { ok: true, username: u.username, token: await newSession(db, u.id), profile: p ? await profileView(db, env, u, p.body) : null, updatedAt: p?.updated_at || null });
      }
      if (path === "/api/profile") {
        if (!u) return reply(req, { error: "login" }, 401);
        const p = await db.prepare("SELECT body, updated_at FROM profiles WHERE user_id=?").bind(u.id).first();
        if (req.method === "GET") return reply(req, { username: u.username, profile: p ? await profileView(db, env, u, p.body) : null, updatedAt: p?.updated_at || null });
        if (req.method === "PUT") {
          const text = await req.text();
          if (text.length > MAX_PROFILE) return reply(req, { error: "too_big" }, 413);
          let b; try { b = JSON.parse(text); } catch { return reply(req, { error: "bad_json" }, 400); }
          if (!b || typeof b.profile !== "object" || b.profile === null || Array.isArray(b.profile)) return reply(req, { error: "bad_profile" }, 400);
          if (b.baseUpdatedAt !== undefined && p && p.updated_at !== b.baseUpdatedAt && !b.force) return reply(req, { error: "conflict", profile: await profileView(db, env, u, p.body), updatedAt: p.updated_at }, 409);
          const at = iso(), bal = await getBalances(db, env, u);
          let prevProf = null; try { prevProf = p ? JSON.parse(p.body) : null; } catch { prevProf = null; }
          const after = await applyWallet(env, db, u, bal, prevProf, b.profile);
          const claimed = JSON.stringify(balFromProfile(b.profile)), actual = JSON.stringify({ octmiles: after.octmiles, lifetime: after.lifetime, tokens: after.tokens, fujitech: after.fujitech, scraggy: after.scraggy, joelmiles: after.joelmiles || 0 });
          const merged = { ...b.profile, ...balanceFields(after), ...joelFields(await wallet(db, u.id)) };
          await db.batch([
            db.prepare("INSERT INTO profiles(user_id,body,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET body=?, updated_at=?").bind(u.id, JSON.stringify(merged), at, JSON.stringify(merged), at),
            saveBalances(db, after)
          ]);
          // when the cloud's numbers differ from the ones the browser claimed, send the saved copy back so the browser takes it
          if (claimed !== actual) return reply(req, { ok: true, updatedAt: at, corrected: true, profile: merged });
          return reply(req, { ok: true, updatedAt: at });
        }
      }
      // Reviews: an account can write many (up to REVIEW_LIMITS), edit or delete its own, one per trip.
      if (path === "/api/review" || /^\/api\/review\/\d+$/.test(path)) {
        if (!u) return reply(req, { error: "login" }, 401);
        const idm = path.match(/^\/api\/review\/(\d+)$/), rid = idm ? Number(idm[1]) : null;
        if (req.method === "DELETE") {
          if (rid && (await adminRole())) { await db.prepare("DELETE FROM review_posts WHERE id=?").bind(rid).run(); return reply(req, { ok: true, staff: true }); }   // Control Tower owner/admin may remove any review
          if (rid) await db.prepare("DELETE FROM review_posts WHERE id=? AND user_id=?").bind(rid, u.id).run();
          else await db.prepare("DELETE FROM review_posts WHERE id=(SELECT id FROM review_posts WHERE user_id=? ORDER BY id DESC LIMIT 1)").bind(u.id).run();   // older pages: delete the newest
          return reply(req, { ok: true });
        }
        if (req.method === "PUT" || req.method === "POST") {
          const text = await req.text();
          if (text.length > 4000) return reply(req, { error: "too_big" }, 413);
          let b; try { b = JSON.parse(text); } catch { return reply(req, { error: "bad_json" }, 400); }
          const stars = Math.round(Number(b?.stars)), title = clip(b?.title, 60).trim(), body = clip(b?.body, 500).trim();
          if (!(stars >= 1 && stars <= 5)) return reply(req, { error: "bad_stars" }, 400);
          if (!title) return reply(req, { error: "bad_title" }, 400);
          if (body.length < 20) return reply(req, { error: "bad_body" }, 400);
          const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b?.date || "")) ? b.date : iso().slice(0, 10);
          const at = iso(), route = clip(b?.route, 60), trip = clip(b?.tripRef, 20), ver = b?.verified ? 1 : 0;
          if (rid && (await adminRole())) {   // Control Tower owner/admin: change only the words and stars; the writer, flight and date stay
            const found = await db.prepare("SELECT id FROM review_posts WHERE id=?").bind(rid).first();
            if (!found) return reply(req, { error: "not_found" }, 404);
            await db.prepare("UPDATE review_posts SET stars=?, title=?, body=?, updated_at=? WHERE id=?").bind(stars, title, body, at, rid).run();
            return reply(req, { ok: true, id: rid, staff: true });
          }
          const mine = ((await db.prepare("SELECT id, trip_ref, created_at FROM review_posts WHERE user_id=?").bind(u.id).all()).results) || [];
          if (rid && !mine.some((r) => r.id === rid)) return reply(req, { error: "not_found" }, 404);
          if (trip && mine.some((r) => r.trip_ref === trip && r.id !== rid)) return reply(req, { error: "trip_taken" }, 409);
          if (rid) {
            await db.prepare("UPDATE review_posts SET username=?, stars=?, title=?, body=?, date=?, route=?, trip_ref=?, verified=?, updated_at=? WHERE id=? AND user_id=?").bind(u.username, stars, title, body, date, route, trip, ver, at, rid, u.id).run();
            return reply(req, { ok: true, id: rid });
          }
          if (mine.length >= REVIEW_LIMITS.total) return reply(req, { error: "limit_total" }, 429);
          if (mine.filter((r) => String(r.created_at).slice(0, 10) === at.slice(0, 10)).length >= REVIEW_LIMITS.day) return reply(req, { error: "limit_day" }, 429);
          const ins = await db.prepare("INSERT INTO review_posts(user_id,username,stars,title,body,date,route,trip_ref,verified,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(u.id, u.username, stars, title, body, date, route, trip, ver, at, at).run();
          return reply(req, { ok: true, id: ins.meta && ins.meta.last_row_id });
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
