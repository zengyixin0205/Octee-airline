// Background music with an on/off button (bottom left of every page).
// Browsers will not play sound until the visitor clicks, taps or presses a key once, so the music
// starts on that first interaction. The choice (on / off) is remembered in this browser.
//
// The music is made up live in the browser (Web Audio): no audio files, so no copyright. It alternates two
// original tunes: a bright 122 bpm groove in E major and a slow 63 bpm tune in B-flat minor, with the airport
// "ding dong dung" chime when the tunes change.
import { load, save, loadSession, saveSession } from "./store.js";

const PREF = "octee.music";            // "on" | "off"  (default: on)
const VOLUME = 0.24;
const SPLASH_SEEN = "octee.music.splash";

const btn = document.createElement("button");
btn.type = "button";
btn.className = "music-btn";
document.body.append(btn);
const radio = document.createElement("a");              // link to Octee Radio, beside the music button
radio.className = "music-btn radio-link"; radio.href = "radio.html"; radio.textContent = "\u{1F4FB} Radio";
document.body.append(radio);

let on = load(PREF, "on") !== "off";
let engine = null;                      // { start(), stop() }
let started = false;

const paint = () => {
  btn.setAttribute("aria-pressed", String(on));
  btn.textContent = on ? "♪ Music on" : "♪ Music off";
  btn.title = on ? "Turn the background music off" : "Turn the background music on";
};

/* ---------- made-up music (Web Audio) ---------- */
function synthEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx, master, noise, timer, nextBar = 0, bar = 0;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rng = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

  // Tune A: bright groove, E major, 122 bpm. Chords E, B, C#m, A (triads + a colour note), pentatonic lead.
  const A = { bpm: 122, bars: 16, drums: true,
    chords: [[64, 68, 71, 75], [59, 63, 66, 70], [61, 64, 68, 71], [57, 61, 64, 68]], bass: [40, 35, 37, 33],
    scale: [76, 78, 80, 83, 85, 88], lead: 0.62, motif: rng(7) };
  // Tune B: slow and moody, B-flat minor, 63 bpm. Chords Bbm, Gb, Db, Ab.
  const B = { bpm: 63, bars: 8, drums: false,
    chords: [[58, 61, 65, 68], [54, 58, 61, 65], [61, 65, 68, 72], [56, 60, 63, 68]], bass: [34, 30, 37, 32],
    scale: [70, 73, 75, 77, 80, 82], lead: 0.35, motif: rng(23) };
  A.phrase = Array.from({ length: 8 }, () => Math.floor(A.motif() * A.scale.length));
  B.phrase = Array.from({ length: 4 }, () => Math.floor(B.motif() * B.scale.length));

  function note(m, t, dur, type, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const keys = (m, t, dur, vol) => { note(m, t, dur, "triangle", vol, master); note(m + 12, t, dur * 0.5, "sine", vol * 0.25, master); };
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.22);
  }
  function hat(t, vol) {
    const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; hp.type = "highpass"; hp.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
    src.connect(hp); hp.connect(g); g.connect(master); src.start(t); src.stop(t + 0.08);
  }
  function chime(t) {          // airport "ding, dong, dung" (going down)
    [[79, 0], [76, 0.62], [72, 1.24]].forEach(([m, d]) => {
      note(m, t + d, 2.2, "sine", 0.34, master);
      note(m + 12, t + d, 1.2, "sine", 0.1, master);
      note(m + 19, t + d, 0.6, "sine", 0.04, master);
    });
  }
  // song = repeating plan: 16 bars of A then 8 bars of B
  const plan = (n) => { const m = n % (A.bars + B.bars); return m < A.bars ? [A, m] : [B, m - A.bars]; };
  function scheduleBar(t, n) {
    const [T, k] = plan(n), beat = 60 / T.bpm, c = k % 4, chord = T.chords[c];
    if (k === 0 && n > 0) chime(t + beat * 0.5);
    // bass
    if (T.drums) { [0, 1.5, 2, 3].forEach((b) => note(T.bass[c], t + b * beat, beat * 0.9, "sine", 0.5, master)); }
    else { note(T.bass[c], t, beat * 3.6, "sine", 0.5, master); note(T.bass[c] + 7, t + beat * 2, beat * 1.8, "sine", 0.18, master); }
    // chords: soft pad each bar, arpeggio on top
    chord.forEach((m) => note(m - 12, t, beat * 3.9, "sine", T.drums ? 0.07 : 0.1, master));
    const order = T.drums ? [0, 1, 2, 3, 2, 1, 2, 1] : [0, 2, 1, 3];
    order.forEach((i, j) => keys(chord[i] + (T.drums ? 12 : 0), t + j * (4 * beat) / order.length, beat * (T.drums ? 0.9 : 2.2), T.drums ? 0.13 : 0.12));
    // drums (A only)
    if (T.drums) { for (let b = 0; b < 4; b++) { kick(t + b * beat); hat(t + b * beat + beat / 2, 0.09); } hat(t + beat * 3.75, 0.05); }
    else for (let b = 0; b < 8; b++) hat(t + b * beat / 2, 0.025);
    // lead: the tune's phrase, answered with a variation every other bar
    const steps = T.drums ? 8 : 4, len = (4 * beat) / steps;
    for (let j = 0; j < steps; j++) {
      const idx = T.phrase[(j + (k % 2 ? 2 : 0)) % T.phrase.length];
      if (((j * 7 + k * 3 + n) % 10) / 10 < T.lead) note(T.scale[idx], t + j * len, len * (T.drums ? 1.6 : 2.4), "triangle", T.drums ? 0.11 : 0.09, master);
    }
  }
  const barLen = (n) => (4 * 60) / plan(n)[0].bpm;
  function pump() { while (nextBar < ctx.currentTime + 1.2) { scheduleBar(nextBar, bar); nextBar += barLen(bar); bar++; } }
  return {
    start() {
      if (!ctx) {
        ctx = new AC();
        const out = ctx.createGain(); out.gain.value = VOLUME;
        const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 3200;
        master = ctx.createGain(); master.gain.value = 1;
        const delay = ctx.createDelay(1); delay.delayTime.value = 0.36;       // a little echo, like a big hall
        const fb = ctx.createGain(); fb.gain.value = 0.28;
        master.connect(tone); master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(tone);
        tone.connect(out); out.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        nextBar = ctx.currentTime + 0.15;
        timer = setInterval(pump, 250);
      }
      pump();
      ctx.resume();
      return new Promise((r) => setTimeout(() => r(ctx.state === "running"), 450));
    },
    stop() { if (ctx) ctx.suspend(); }
  };
}

async function begin() {
  if (started) return;
  started = true;
  engine = synthEngine();
  if (!(on && engine)) return;
  const ok = await engine.start();
  if (!ok && !loadSession(SPLASH_SEEN, false)) splash();   // the browser wants a click first: ask for one nicely
}

// The welcome screen. A browser will not play sound on a brand new visit until the visitor clicks, so the
// first page shows a "board" button: one click enters the site and starts the music.
function splash() {
  const go = (withMusic) => {
    saveSession(SPLASH_SEEN, true);
    if (!withMusic) { on = false; save(PREF, "off"); paint(); if (engine) engine.stop(); }
    else if (engine) engine.start();
    box.remove();
    document.removeEventListener("keydown", onKey);
  };
  const yes = Object.assign(document.createElement("button"), { type: "button", className: "btn", textContent: "Board (sound on)" });
  const no = Object.assign(document.createElement("button"), { type: "button", className: "splash-no", textContent: "No music, thanks" });
  const logo = Object.assign(document.createElement("img"), { src: "assets/img/octee-logo.png", alt: "Octee Airlines", className: "splash-logo" });
  const h = Object.assign(document.createElement("h2"), { textContent: "Welcome aboard Octee Airlines" });
  const p = Object.assign(document.createElement("p"), { textContent: "Please board with the sound on. The music is part of the delay." });
  const box = document.createElement("div");
  box.className = "splash";
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Welcome to Octee Airlines");
  const inner = document.createElement("div");
  inner.className = "splash-inner";
  inner.append(logo, h, p, yes, no);
  box.append(inner);
  const onKey = (e) => { if (e.key === "Escape") go(false); };
  yes.addEventListener("click", () => go(true));
  no.addEventListener("click", () => go(false));
  document.addEventListener("keydown", onKey);
  document.body.append(box);
  yes.focus();
}

// Browsers only allow sound after the visitor has clicked, tapped or pressed a key on this site, so try to
// start straight away (works on pages after the first) and, if that is blocked, start on the first interaction.
function firstGesture() {
  if (on && !radioOn) { if (!started) begin(); else if (engine) engine.start(); }
}
["pointerdown", "keydown", "touchstart"].forEach((e) => addEventListener(e, firstGesture, { capture: true, passive: true }));

btn.addEventListener("click", async (ev) => {
  ev.stopPropagation();
  on = !on;
  save(PREF, on ? "on" : "off");
  paint();
  if (on) { if (!started) await begin(); else if (engine) engine.start(); }
  else if (engine) engine.stop();
});

// Octee Radio asks the site music to step aside while it plays
let radioOn = false;
addEventListener("octee:radio", (e) => {
  radioOn = !!e.detail.playing;
  if (!engine) return;
  if (radioOn) engine.stop(); else if (on) engine.start();
});
paint();
if (on) begin();
