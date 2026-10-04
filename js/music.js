// Background music with an on/off button (bottom left of every page).
// Browsers will not play sound until the visitor clicks, taps or presses a key once, so the music
// starts on that first interaction. The choice (on / off) is remembered in this browser.
//
// By default it plays a made-up lounge tune generated live in the browser (Web Audio, no file, no
// copyright). To use your own music instead, put an MP3 at  assets/audio/music.mp3  — it is picked up
// automatically and loops.
import { load, save, loadSession, saveSession } from "./store.js";

const PREF = "octee.music";            // "on" | "off"  (default: on)
const VOLUME = 0.22;                    // made-up tune
const FILE_VOLUME = 0.5;                // your own MP3

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

/* ---------- own MP3s, if there are any ---------- */
// Songs are assets/audio/music.mp3, music2.mp3, music3.mp3 ... (as many as exist, up to 20). They play in
// that order: when one ends the next one starts, and after the last one the list starts again from music.mp3.
// With only music.mp3 that one song just repeats.
// Every page is a new page load, so the song number and position are saved several times a second and the
// next page picks up from there, adding the time the page change took, so the music carries on instead of
// starting over. A visitor who comes back after a minute starts from the top of the list.
const STATE = "octee.music.state";     // { i, pos, at, playing }
const SPLASH_SEEN = "octee.music.splash";
async function findSongs() {
  const found = [];
  for (let n = 1; n <= 20; n++) {
    const url = `assets/audio/music${n === 1 ? "" : n}.mp3`;
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (!r.ok) break;
    } catch { break; }
    found.push(url);
  }
  return found;
}
async function fileEngine() {
  const songs = await findSongs();
  if (!songs.length) return null;
  const st = load(STATE, null);
  const gap = st ? (Date.now() - st.at) / 1000 : Infinity;
  const back = st && st.playing && gap < 60;
  let i = back && st.i < songs.length ? st.i : 0;
  let resume = back && st.i < songs.length ? st.pos + gap : 0;
  const a = new Audio(songs[i]);
  a.volume = FILE_VOLUME; a.preload = "auto";
  const seek = () => {
    if (!resume) return;
    if (a.duration && resume < a.duration) a.currentTime = resume;
    else if (a.duration && songs.length > 1) { i = (i + 1) % songs.length; a.src = songs[i]; }   // the song ended during the page change
    resume = 0;
  };
  a.addEventListener("loadedmetadata", seek);
  a.addEventListener("ended", () => { i = (i + 1) % songs.length; a.src = songs[i]; a.play().catch(() => {}); });
  if (songs.length === 1) a.loop = true;
  const keep = () => save(STATE, { i, pos: a.currentTime, at: Date.now(), playing: !a.paused });
  setInterval(() => { if (!a.paused) keep(); }, 400);
  addEventListener("pagehide", keep);
  a.addEventListener("pause", keep);
  return { start: () => a.play().then(() => true, () => false), stop: () => a.pause() };
}

/* ---------- made-up lounge tune (Web Audio) ---------- */
function synthEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx, master, timer, nextBar = 0, bar = 0;
  const BEAT = 60 / 78;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Cmaj7 · Am7 · Dm7 · G7 (MIDI notes), and a bass root for each
  const CHORDS = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]];
  const BASS = [36, 33, 38, 31];
  const SCALE = [72, 74, 76, 79, 81, 84];   // C major pentatonic, for the little tune on top

  function note(m, t, dur, type, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // soft electric-piano: a triangle plus a quiet octave sine
  const keys = (m, t, dur, vol) => { note(m, t, dur, "triangle", vol, master); note(m + 12, t, dur * 0.5, "sine", vol * 0.25, master); };
  // the airport chime: ding, dong, dung (going down)
  function chime(t) {
    [[79, 0], [76, 0.62], [72, 1.24]].forEach(([m, d]) => {
      note(m, t + d, 2.2, "sine", 0.34, master);
      note(m + 12, t + d, 1.2, "sine", 0.1, master);
      note(m + 19, t + d, 0.6, "sine", 0.04, master);
    });
  }
  function scheduleBar(t, n) {
    const c = n % 4, chord = CHORDS[c];
    note(BASS[c], t, BEAT * 1.8, "sine", 0.55, master);
    note(BASS[c], t + BEAT * 2, BEAT * 1.6, "sine", 0.4, master);
    // eight arpeggio notes, up and down
    const order = [0, 1, 2, 3, 2, 1, 2, 1];
    order.forEach((i, k) => keys(chord[i], t + k * BEAT / 2, BEAT * 1.1, 0.16));
    // a few tune notes on the off-beats
    for (let k = 0; k < 8; k++) if (Math.random() < 0.34) keys(SCALE[Math.floor(Math.random() * SCALE.length)], t + k * BEAT / 2 + 0.01, BEAT * 1.4, 0.13);
    if (n % 16 === 8) chime(t + BEAT * 4 - 0.1);          // every 16 bars, "ding dong dung" before an announcement nobody hears
  }
  function pump() {
    while (nextBar < ctx.currentTime + 1.2) { scheduleBar(nextBar, bar++); nextBar += BEAT * 4; }
  }
  return {
    start() {
      if (!ctx) {
        ctx = new AC();
        const out = ctx.createGain(); out.gain.value = VOLUME;
        const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2400;
        master = ctx.createGain(); master.gain.value = 1;
        // a little echo to make it sound like a big hall
        const delay = ctx.createDelay(1); delay.delayTime.value = BEAT * 0.75;
        const fb = ctx.createGain(); fb.gain.value = 0.32;
        master.connect(tone); master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(tone);
        tone.connect(out); out.connect(ctx.destination);
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
  engine = (await fileEngine()) || synthEngine();
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
