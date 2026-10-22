// "Try me": every Duty Free purchase does something on the page. Small canvas toys, a few sounds, and two real games:
// the fire extinguisher (the page is on fire, aim with the cursor, hold Space to spray) and the Octee Flare (big words on your screen).
// All of it is drawn on top of the page and stops with Esc. Nothing here touches the account except the charge of the two rechargeable items.
import { el } from "./dom.js";

export const BUILD = "Try me build 3";
export const CHARGE = { extinguisher: { full: 12, price: 1, unit: "s of foam" }, flare: { full: 60, price: 1, unit: "s of glow" } };
const R = Math.random;
const calm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };


// What each item does and what to press (shown in the Duty Free guide and on each purchase).
export const HINTS = {
  extinguisher: "Move the mouse to aim at the flames and HOLD Space to spray. Put all ten out before the foam runs out, or the page burns to dust (Error 400). Esc gives up, and the page burns too.",
  flare: "Type your own words (it says I AM LOST), then press Shoot: they fly up the screen like a flare. Each shot costs some charge; recharge it when it runs low.",
  sparkler: "Move the mouse. Sparks follow it for 9 seconds.", cloud: "Move the mouse. The cloud follows it and rains.", shampoo: "Move the mouse to blow bubbles.",
  umbrella: "Move the mouse and keep the rain off the cursor.", fireworks: "Aim with the mouse. Click, or tap Space, to fire.", glitter: "Just watch. It lasts 7 seconds.",
  marbles: "Just watch them roll.", volcano: "Just watch, from a safe distance.", paint: "Click anywhere to splash paint.",
  breadcrumbs: "Move the mouse. Crumbs drop behind it and a pigeon follows.", candle: "Move the mouse. It burns for 5 seconds.", cooker: "Just watch the peanuts pop.",
  lightning: "Brace yourself. One flash, one thunder (sound on).", anchor: "Move the mouse first. The anchor drops where the cursor is.", chainsaw: "Move the mouse to carry it around for 2.5 seconds (sound on).",
  banana: "Nothing to press. The page slips.", pogo: "Nothing to press. The page bounces.", magnet: "Move the mouse close to the buttons and watch them come.",
  jetpack: "Nothing to press. It flies to the top of the page.", scissors: "Click to cut a dashed line across the page.", bowling: "Just watch it roll.",
  bat: "Move the mouse to place the bat. It swings once.", compass: "Wait four seconds. The needle settles on Gate B3 (probably).",
  whistle: "A loud sound. Mind your volume.", horn: "A very loud sound. Mind your volume.", duck: "A squeak.", buckle: "A click.", bucket: "A clang.", water: "A gulp (sound on).", sandwich: "A crunch (sound on).",
  runway: "A thump.", lanyard: "A cheerful ding.", eel: "A quiet, dignified noise.", skate: "It slides the page sideways."
};

// ---- sound ----
let AC = null;
const ac = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; } catch { return null; } };
function tone(f, d = 0.2, type = "sine", v = 0.15, to = 0, at = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d = 0.5, v = 0.1, freq = 3000, type = "bandpass") {
  const a = ac(); if (!a) return { stop() {} };
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * Math.min(d, 2))), a.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = R() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; src.loop = d > 2; f.type = type; f.frequency.value = freq; g.gain.value = v;
  src.connect(f); f.connect(g); g.connect(a.destination); src.start();
  if (d <= 2) { g.gain.setValueAtTime(v, a.currentTime + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d); }
  return { stop() { try { g.gain.value = 0; src.stop(); } catch { /* already stopped */ } } };
}

// ---- the stage: a full-screen canvas on top of the page ----
let ACTIVE = null;
export const stopAll = () => { if (ACTIVE) ACTIVE(); };
function stage(o) {
  stopAll();
  const c = document.createElement("canvas"); c.className = "dfx-canvas";
  const s = { c, g: c.getContext("2d"), w: 0, h: 0, m: { x: innerWidth / 2, y: innerHeight / 2 }, t: 0, keys: {}, p: [], o };
  const fit = () => { s.w = c.width = innerWidth; s.h = c.height = innerHeight; }; fit();
  const hud = document.createElement("button"); hud.type = "button"; hud.className = "dfx-hud"; hud.setAttribute("aria-live", "polite");
  s.hud = (t) => { const x = t + " · Esc to stop"; if (hud.textContent !== x) hud.textContent = x; }; s.hud(o.label || "");
  if (o.down) c.style.pointerEvents = "auto";
  document.body.append(c, hud);
  let raf = 0, last = performance.now(), over = false;
  const mm = (e) => { s.m.x = e.clientX; s.m.y = e.clientY; };
  const kd = (e) => { if (e.key === "Escape") { end("esc"); return; } if (e.key === " ") { e.preventDefault(); if (!s.keys.space) { s.keys.space = true; o.space && o.space(s, true); } } };
  const ku = (e) => { if (e.key === " ") { e.preventDefault(); s.keys.space = false; o.space && o.space(s, false); } };
  const md = (e) => { o.down && o.down(s, e); };
  function end(msg) {
    if (over) return; over = true; cancelAnimationFrame(raf);
    removeEventListener("mousemove", mm); removeEventListener("keydown", kd); removeEventListener("keyup", ku); removeEventListener("resize", fit); c.removeEventListener("mousedown", md);
    c.remove(); hud.remove(); ACTIVE = null; o.end && o.end(s, msg);
  }
  s.end = end; ACTIVE = end;
  addEventListener("mousemove", mm); addEventListener("keydown", kd); addEventListener("keyup", ku); addEventListener("resize", fit); c.addEventListener("mousedown", md);
  hud.onclick = () => end("esc");
  try { document.activeElement && document.activeElement.blur(); } catch { /* fine */ }
  o.init && o.init(s);
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; s.t += dt; s.g.clearRect(0, 0, s.w, s.h);
    o.frame && o.frame(s, dt);
    if (!over) { if (o.ms && s.t * 1000 >= o.ms) end("time"); else raf = requestAnimationFrame(loop); }
  };
  raf = requestAnimationFrame(loop);
  return s;
}
const add = (s, x, y, vx, vy, l, c, r = 2, extra = {}) => s.p.push({ x, y, vx, vy, l, L: l, c, r, ...extra });
function step(s, dt, grav = 0) {
  const g = s.g; s.p = s.p.filter((p) => (p.l -= dt) > 0 && !p.dead);
  for (const p of s.p) {
    p.vy += grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.wob) p.x += Math.sin(s.t * 4 + p.wob) * 0.6;
    g.globalAlpha = Math.max(0, p.l / p.L); g.fillStyle = g.strokeStyle = `rgb(${p.c})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7);
    p.ring ? g.stroke() : g.fill();
  }
  g.globalAlpha = 1;
}
const emoji = (s, ch, x, y, size = 48) => { s.g.font = `${size}px serif`; s.g.textAlign = "center"; s.g.textBaseline = "middle"; s.g.fillText(ch, x, y); };
const shake = (cls, ms) => { if (calm()) return; document.body.classList.add(cls); setTimeout(() => document.body.classList.remove(cls), ms); };
const COLS = ["255,90,90", "255,200,60", "90,200,255", "170,120,255", "120,230,140", "255,140,220"];

// ---- the fire extinguisher: the page is on fire ----
function extinguisher(h) {
  let rem = h.charge("extinguisher"), hiss = null;
  if (rem <= 0) { h.say("The extinguisher is empty. Recharge it first (it is cheaper than a new one).", "error"); return false; }
  h.say("The page is on fire. Move the mouse to aim, hold Space to spray.", "info");
  stage({
    label: "Fire extinguisher", ms: 0,
    init(s) { s.fires = Array.from({ length: 10 }, () => ({ x: 70 + R() * (s.w - 140), y: s.h * 0.3 + R() * s.h * 0.6, hp: 1, ph: R() * 6 })); },
    space(s, on) { if (on && rem > 0) hiss = hiss || noise(60, 0.12, 5000); else if (hiss) { hiss.stop(); hiss = null; } },
    frame(s, dt) {
      const g = s.g, left = s.fires.filter((f) => f.hp > 0), frac = left.length / s.fires.length;
      const gr = g.createLinearGradient(0, s.h, 0, s.h * 0.35); gr.addColorStop(0, `rgba(255,90,0,${0.5 * frac})`); gr.addColorStop(1, "rgba(255,90,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, s.w, s.h);
      for (const f of left) for (let k = 0; k < 4; k++) {
        const sz = (24 + 24 * f.hp) * (1 - k * 0.2), fl = Math.sin(s.t * 12 + f.ph + k) * 4;
        g.fillStyle = ["#d62d00", "#ff7a00", "#ffc400", "#fff4a8"][k]; g.beginPath(); g.ellipse(f.x + fl, f.y - k * 9, sz * 0.6, sz * 1.1, 0, 0, 7); g.fill();
      }
      if (s.keys.space && rem > 0) {
        rem -= dt;
        for (let i = 0; i < 6; i++) add(s, s.m.x + (R() - 0.5) * 60, s.m.y + (R() - 0.5) * 60, (R() - 0.5) * 70, (R() - 0.5) * 70 - 20, 0.5, "245,250,255", 6 + R() * 6);
        for (const f of left) if (Math.hypot(f.x - s.m.x, f.y - s.m.y) < 85) {
          f.hp -= dt * 1.4;
          if (f.hp <= 0) { tone(500, 0.25, "sine", 0.08, 160); for (let i = 0; i < 12; i++) add(s, f.x, f.y, (R() - 0.5) * 80, -40 - R() * 60, 1.1, "120,120,120", 8 + R() * 8); }
        }
        if (rem <= 0) { rem = 0; if (hiss) { hiss.stop(); hiss = null; } }
      }
      step(s, dt);
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(s.m.x, s.m.y, 70, 0, 7); g.stroke();
      s.hud(`Hold Space to spray · foam ${rem.toFixed(1)}s · fires left ${left.length}`);
      if (!left.length) s.end("won"); else if (rem <= 0) s.end("empty");
    },
    end(s, msg) {
      if (hiss) hiss.stop();
      h.setCharge("extinguisher", Math.max(0, rem));
      if (msg === "won") { tone(660, 0.15, "triangle", 0.12); tone(880, 0.3, "triangle", 0.12, 0, 0.15); h.say("The fire is out. The page is saved and slightly foamy. Nobody thanked you. The fire has left a one-star review.", "ok"); }
      else dust(msg === "empty" ? "The foam ran out with the page still burning." : "You gave up with the page still burning.");
    }
  });
  return false;
}

// The page you did not save: it burns to dust, error 400.
function dust(why) {
  if (document.querySelector(".dfx-dust")) return;
  noise(1.5, 0.12, 300, "lowpass"); tone(120, 1.2, "sawtooth", 0.08, 40);
  const ov = el("div", { class: "dfx-dust", role: "alertdialog", "aria-modal": "true", "aria-label": "Error 400" },
    el("div", { class: "dfx-dust-card" },
      el("p", { class: "dfx-dust-code" }, "Error 400"),
      el("h2", {}, "The page burnt to dust."),
      el("p", {}, why + " Nothing is left but a little ash and a very small Joel, shrugging."),
      el("button", { class: "btn", type: "button", onclick: () => location.reload() }, "Rebuild the page")));
  document.body.append(ov); ov.querySelector("button").focus();
}

// ---- the Octee Flare: type your words, press Shoot, and they fly up the screen ----
const FLARE_SHOT_COST = 8; // seconds of charge used by one shot
function flare(h) {
  if (document.querySelector(".flare-panel")) return false;
  let rem = h.charge("flare");
  if (rem <= 0) { h.say("The Flare has gone dark. Recharge it first.", "error"); return false; }
  const out = el("p", { class: "flare-small" }, "");
  const words = el("input", { type: "text", maxlength: "24", value: "I AM LOST", "aria-label": "Words to shoot up the screen", class: "flare-in" });
  const refresh = () => { const shots = Math.max(0, Math.floor(rem / FLARE_SHOT_COST)); out.textContent = `Charge: ${Math.round(rem)}s · ${shots} shot${shots === 1 ? "" : "s"} left`; };
  const close = () => { removeEventListener("keydown", onKey); panel.remove(); h.setCharge("flare", rem); };
  const onKey = (e) => { if (e.key === "Escape" && e.target !== words) close(); };
  const shoot = () => {
    if (rem < FLARE_SHOT_COST) { h.say("Not enough charge left to shoot. Recharge the Flare.", "error"); return; }
    rem -= FLARE_SHOT_COST; refresh();
    fireWords((words.value.trim() || "I AM LOST").toUpperCase());
    if (rem < FLARE_SHOT_COST) h.say("That was the last shot. Recharge the Flare before the next one.", "info");
  };
  const panel = el("div", { class: "flare-panel", role: "dialog", "aria-label": "Octee Flare" },
    el("p", { class: "flare-small" }, "OCTEE FLARE"),
    el("label", { class: "flare-small" }, "Words: ", words),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "button", onclick: shoot }, "Shoot"), el("button", { class: "btn ghost small", type: "button", onclick: close }, "Put it away")),
    out);
  refresh(); document.body.append(panel); addEventListener("keydown", onKey); words.focus();
  return false;
}

// Shoots the given words up the screen like a flare, with a spark trail. The rest of the page stays as it was.
function fireWords(text) {
  const size = Math.max(22, Math.min(78, 760 / Math.max(4, text.length)));
  tone(900, 0.1, "triangle", 0.12); tone(1500, 0.22, "triangle", 0.1, 0, 0.1);
  stage({
    label: "Flare", ms: 1500,
    frame(s, dt) {
      const prog = Math.min(1, s.t / 1.3), y = s.h - 30 - prog * (s.h + 80);
      for (let i = 0; i < 4; i++) add(s, s.w / 2 + (R() - 0.5) * 24, y + 24, (R() - 0.5) * 50, 160 + R() * 120, 0.55, R() < 0.5 ? "255,120,20" : "255,210,80", 3 + R() * 2);
      step(s, dt);
      s.g.save(); s.g.font = `800 ${size}px Georgia, serif`; s.g.textAlign = "center"; s.g.textBaseline = "middle";
      s.g.shadowColor = "#ff7a00"; s.g.shadowBlur = 22; s.g.fillStyle = "#ffb347"; s.g.fillText(text, s.w / 2, y);
      s.g.shadowBlur = 0; s.g.restore();
      if (prog >= 1) s.end("done");
    }
  });
}

// ---- the toys ----
const toy = {
  sparkler: () => { tone(1800, 0.06, "square", 0.04); stage({ label: "Sparkler", ms: 9000, frame(s, dt) { for (let i = 0; i < 9; i++) add(s, s.m.x, s.m.y, (R() - 0.5) * 240, (R() - 0.8) * 240, 0.6, `255,${170 + (R() * 80 | 0)},70`, 1.8); step(s, dt, 320); } }); },
  cloud: () => stage({ label: "A small cloud, in a jar", ms: 8000, frame(s, dt) { emoji(s, "☁️", s.m.x, s.m.y - 70, 80); for (let i = 0; i < 4; i++) add(s, s.m.x + (R() - 0.5) * 60, s.m.y - 40, 0, 360, 0.7, "90,160,255", 1.6); step(s, dt); s.g.fillStyle = "#555"; emoji(s, "🙁", s.m.x, s.m.y - 70, 22); } }),
  shampoo: () => stage({ label: "Shampoo", ms: 7000, frame(s, dt) { if (R() < 0.6) add(s, s.m.x + (R() - 0.5) * 40, s.m.y, 0, -70 - R() * 50, 3, "180,220,255", 8 + R() * 14, { ring: true, wob: R() * 6 }); step(s, dt); } }),
  umbrella: () => stage({ label: "Umbrella (rain included)", ms: 9000, frame(s, dt) { for (let i = 0; i < 6; i++) add(s, R() * s.w, -5, 0, 520, 2, "90,160,255", 1.6); s.p.forEach((p) => { if (p.y < s.m.y - 20 && Math.hypot(p.x - s.m.x, p.y - (s.m.y - 40)) < 75) p.dead = true; }); step(s, dt); emoji(s, "☂️", s.m.x, s.m.y - 40, 90); } }),
  fireworks: () => stage({ label: "Fireworks: click or tap Space to fire", ms: 18000,
    down(s) { burst(s); }, space(s, on) { if (on) burst(s); },
    frame(s, dt) { step(s, dt, 140); } }),
  glitter: () => { tone(1500, 0.3, "triangle", 0.05, 3000); stage({ label: "Glitter bomb", ms: 7000, frame(s, dt) { if (s.t < 4) for (let i = 0; i < 18; i++) add(s, R() * s.w, -5, (R() - 0.5) * 40, 60 + R() * 120, 3 + R() * 2, COLS[R() * COLS.length | 0], 1.5 + R() * 2.5); step(s, dt, 20); } }); },
  marbles: () => stage({ label: "A bag of marbles", ms: 8000,
    init(s) { s.b = Array.from({ length: 45 }, () => ({ x: R() * s.w, y: -R() * 300, vx: (R() - 0.5) * 200, vy: 0, c: COLS[R() * COLS.length | 0], r: 8 })); },
    frame(s, dt) { for (const b of s.b) { b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > s.h - b.r) { b.y = s.h - b.r; b.vy *= -0.6; if (Math.abs(b.vy) > 80 && R() < 0.1) tone(1200 + R() * 800, 0.05, "sine", 0.03); } if (b.x < b.r || b.x > s.w - b.r) b.vx *= -1; s.g.fillStyle = `rgb(${b.c})`; s.g.beginPath(); s.g.arc(b.x, b.y, b.r, 0, 7); s.g.fill(); } } }),
  volcano: () => { noise(2.5, 0.08, 200, "lowpass"); stage({ label: "A tiny volcano", ms: 7000, frame(s, dt) { emoji(s, "🌋", s.w / 2, s.h - 40, 80); if (s.t < 5 && R() < 0.9) for (let i = 0; i < 4; i++) add(s, s.w / 2, s.h - 70, (R() - 0.5) * 220, -300 - R() * 260, 1.8, R() < 0.5 ? "255,100,20" : "255,200,50", 3 + R() * 3); step(s, dt, 520); } }); },
  paint: () => stage({ label: "Wet paint: click to splash", ms: 12000,
    init(s) { s.sp = []; },
    down(s) { tone(200, 0.12, "sine", 0.1, 90); const sp = { x: s.m.x, y: s.m.y, r: 24 + R() * 20, d: Array.from({ length: 8 }, () => ({ a: R() * 6.28, k: 1 + R() * 1.8, r: 3 + R() * 8 })) }; s.sp.push(sp); },
    frame(s) { s.g.fillStyle = "#ff7a00"; for (const p of s.sp) { s.g.beginPath(); s.g.arc(p.x, p.y, p.r, 0, 7); s.g.fill(); for (const d of p.d) { s.g.beginPath(); s.g.arc(p.x + Math.cos(d.a) * p.r * d.k, p.y + Math.sin(d.a) * p.r * d.k, d.r, 0, 7); s.g.fill(); } } } }),
  breadcrumbs: () => stage({ label: "Breadcrumbs (a pigeon is following you)", ms: 9000,
    init(s) { s.pg = { x: -40, y: s.h - 60 }; s.n = 0; },
    frame(s, dt) { s.n += dt; if (s.n > 0.2) { s.n = 0; add(s, s.m.x, s.m.y, 0, 0, 6, "230,200,150", 3); } step(s, dt); const q = s.p[0] || s.m; s.pg.x += (q.x - s.pg.x) * 2.5 * dt; s.pg.y += (q.y - s.pg.y) * 2.5 * dt; emoji(s, "🐦", s.pg.x, s.pg.y, 36); } }),
  candle: () => stage({ label: "Dynamite-shaped candle", ms: 5000, frame(s) { const f = 1 - s.t / 5; emoji(s, "🧨", s.m.x, s.m.y + 20, 56); s.g.fillStyle = "#ffb300"; s.g.beginPath(); s.g.ellipse(s.m.x + Math.sin(s.t * 20) * 2, s.m.y - 28, 7 * f + 2, 16 * f + 3, 0, 0, 7); s.g.fill(); },
    end() { tone(300, 0.15, "sine", 0.05, 120); } }),
  cooker: () => stage({ label: "Pressure cooker of peanuts", ms: 4500, frame(s, dt) { emoji(s, "🍲", s.w / 2, s.h - 50, 80); if (s.t > 0.8 && R() < 0.3) { tone(500 + R() * 400, 0.06, "square", 0.05); add(s, s.w / 2, s.h - 90, (R() - 0.5) * 260, -420 - R() * 200, 2.2, "0,0,0", 0, { e: "🥜" }); } s.p = s.p.filter((p) => (p.l -= dt) > 0); for (const p of s.p) { p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; emoji(s, "🥜", p.x, p.y, 30); } } }),
  lightning: () => { const f = el("div", { class: "dfx-flash" }); document.body.append(f); noise(1.6, 0.25, 250, "lowpass"); tone(90, 0.8, "sawtooth", 0.1, 40); setTimeout(() => f.remove(), 900); shake("dfx-shake", 500); },
  anchor: () => stage({ label: "A medium-sized anchor", ms: 2600,
    init(s) { s.y = -60; s.v = 0; s.hit = false; },
    frame(s, dt) { if (!s.hit) { s.v += 1600 * dt; s.y += s.v * dt; if (s.y >= s.m.y) { s.y = s.m.y; s.hit = true; tone(70, 0.5, "sine", 0.35, 35); shake("dfx-shake", 500); } } emoji(s, "⚓", s.m.x, s.y, 80); } }),
  chainsaw: () => { const n = noise(2.5, 0.05, 90, "lowpass"); tone(95, 2.4, "sawtooth", 0.07, 80); shake("dfx-shake2", 2500); stage({ label: "Chainsaw (decorative)", ms: 2500, frame(s, dt) { for (let i = 0; i < 3; i++) add(s, s.m.x, s.m.y, (R() - 0.5) * 300, (R() - 0.7) * 200, 0.5, "230,200,150", 2); step(s, dt, 300); emoji(s, "🪚", s.m.x, s.m.y, 60); }, end() { n.stop(); } }); },
  banana: () => { tone(700, 0.5, "sine", 0.1, 150); shake("dfx-slip", 1300); },
  pogo: () => { [0, 0.4, 0.8].forEach((t) => tone(250, 0.3, "sine", 0.12, 900, t)); shake("dfx-boing", 1400); },
  magnet: () => stage({ label: "A very strong magnet", ms: 7000,
    init(s) { s.els = [...document.querySelectorAll("#app button, #app .btn")].slice(0, 80).map((e) => { const r = e.getBoundingClientRect(); return { e, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }); },
    frame(s) { for (const o of s.els) { const dx = s.m.x - o.cx, dy = s.m.y - o.cy, d = Math.hypot(dx, dy), k = d < 380 ? (1 - d / 380) * 0.85 : 0; o.e.style.transform = k ? `translate(${dx * k}px, ${dy * k}px)` : ""; } emoji(s, "🧲", s.m.x, s.m.y, 56); },
    end(s) { s.els.forEach((o) => { o.e.style.transform = ""; }); } }),
  jetpack: () => { noise(3, 0.1, 600, "lowpass"); stage({ label: "Jet pack (display model)", ms: 3200, frame(s, dt) { const y = s.h + 60 - s.t * (s.h + 160) / 3; if (s.t < 0.1) scrollTo({ top: 0, behavior: "smooth" }); for (let i = 0; i < 6; i++) add(s, s.w / 2 + (R() - 0.5) * 18, y + 30, (R() - 0.5) * 60, 160 + R() * 120, 0.7, R() < 0.5 ? "255,120,20" : "255,220,80", 4); step(s, dt); emoji(s, "🚀", s.w / 2, y, 70); } }); },
  whistle: () => { [0, 0.18, 0.36].forEach((t) => tone(2700, 0.15, "square", 0.08, 3200, t)); tone(2800, 0.7, "square", 0.08, 2600, 0.6); shake("dfx-shake", 600); },
  horn: () => { tone(110, 1.2, "sawtooth", 0.2, 100); tone(113, 1.2, "sawtooth", 0.2, 103); shake("dfx-shake", 1200); },
  duck: () => { tone(1100, 0.12, "triangle", 0.2, 1700); tone(1000, 0.12, "triangle", 0.2, 1600, 0.2); },
  buckle: () => { tone(1300, 0.04, "square", 0.1); tone(800, 0.05, "square", 0.1, 0, 0.06); },
  bucket: () => { tone(420, 0.5, "triangle", 0.18, 380); tone(640, 0.4, "triangle", 0.1, 600, 0.02); },
  water: () => { [0, 0.25, 0.5].forEach((t) => noise(0.15, 0.1, 500, "lowpass") && tone(260 - t * 100, 0.12, "sine", 0.1, 0, t)); },
  sandwich: () => { for (let i = 0; i < 4; i++) setTimeout(() => noise(0.08, 0.15, 3500), i * 180); },
  runway: () => { tone(60, 0.4, "sine", 0.3, 40); },
  scissors: () => stage({ label: "Very large scissors: click to cut", ms: 12000,
    init(s) { s.cuts = []; },
    down(s) { tone(1500, 0.05, "square", 0.08); tone(1100, 0.05, "square", 0.08, 0, 0.07); s.cuts.push(s.m.y); },
    frame(s) { s.g.setLineDash([10, 8]); s.g.strokeStyle = "#e33"; s.g.lineWidth = 2; for (const y of s.cuts) { s.g.beginPath(); s.g.moveTo(0, y); s.g.lineTo(s.w, y); s.g.stroke(); } s.g.setLineDash([]); emoji(s, "✂️", s.m.x, s.m.y, 44); } }),
  bowling: () => { noise(3, 0.12, 120, "lowpass"); stage({ label: "A bowling ball (signed by nobody)", ms: 3200, frame(s) { const x = -40 + (s.w + 80) * (s.t / 3); emoji(s, "🎳", x, s.h - 50, 56); if (s.t > 2.9) tone(180, 0.3, "triangle", 0.2, 90); } }); },
  bat: () => { noise(0.25, 0.2, 1200); stage({ label: "Cricket bat", ms: 1400, frame(s) { const a = -1.2 + Math.min(1, s.t / 0.5) * 2.4; s.g.save(); s.g.translate(s.m.x, s.m.y + 40); s.g.rotate(a); emoji(s, "🏏", 0, -40, 80); s.g.restore(); if (s.t > 0.5 && !s.k) { s.k = 1; tone(900, 0.08, "square", 0.2, 300); } } }); },
  compass: () => stage({ label: "A compass that points to Gate B3", ms: 6000,
    init(s) { s.to = -0.6 + R() * 1.2; },
    frame(s) { const cx = s.w / 2, cy = s.h / 2, g = s.g, a = s.t < 4 ? s.t * 9 * (1 - s.t / 4) + s.to : s.to; g.fillStyle = "rgba(255,255,255,.92)"; g.strokeStyle = "#222"; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 110, 0, 7); g.fill(); g.stroke();
      g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = "#e33"; g.beginPath(); g.moveTo(0, -90); g.lineTo(14, 0); g.lineTo(-14, 0); g.fill(); g.fillStyle = "#333"; g.beginPath(); g.moveTo(0, 90); g.lineTo(14, 0); g.lineTo(-14, 0); g.fill(); g.restore();
      g.fillStyle = "#222"; g.font = "700 18px sans-serif"; g.textAlign = "center"; g.fillText(s.t > 4 ? "Gate B3 (probably)" : "...", cx, cy + 140); } }),
  lanyard: () => { tone(660, 0.15, "triangle", 0.1); tone(990, 0.2, "triangle", 0.1, 0, 0.12); },
  eel: () => { tone(220, 0.3, "sine", 0.1, 180); },
  skate: () => { noise(0.8, 0.12, 700, "lowpass"); shake("dfx-slip", 900); }
};
function burst(s) {
  const c = COLS[R() * COLS.length | 0]; tone(180, 0.12, "sine", 0.1, 600);
  setTimeout(() => { noise(0.3, 0.12, 1800); for (let i = 0; i < 70; i++) { const a = R() * 6.28, v = 60 + R() * 220; add(s, s.m.x, s.m.y, Math.cos(a) * v, Math.sin(a) * v, 1.4 + R() * 0.6, c, 2.2); } }, 120);
}

// Try an item. hooks: { charge(id), setCharge(id, v), say(text, kind) }.
// Returns true when the item is used up (so one is taken off your purchases); the extinguisher and the Flare are never used up.
export function tryItem(id, hooks, text) {
  if (id === "extinguisher") return extinguisher(hooks);
  if (id === "flare") return flare(hooks);
  const fx = toy[id];
  if (text) hooks.say(text, "ok");
  if (!fx) { tone(520, 0.12, "triangle", 0.1); return true; }
  fx();
  return true;
}
