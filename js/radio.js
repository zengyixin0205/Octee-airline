// Octee Radio: four stations, each with a made-up tracklist. Spoken items use the browser's speech
// (with captions and a timer as fallback); songs are made up on the spot with Web Audio, seeded by the title.
import { $, el, reducedMotion } from "./dom.js";

const root = $("#app");
const S = (title, artist, text) => ({ title, artist, kind: "say", text });
const T = (title, artist, secs = 16) => ({ title, artist, kind: "tune", secs });
const STATIONS = [
  { id: "delay", name: "Delay FM", tag: "Announcements, all of them, later.", list: [
    S("Gate change", "Gate Staff", "Attention please. Flight O C T 1 has moved gate. The new gate is the old gate. Please walk to the new gate, and then walk back."),
    S("Boarding soon", "Gate Staff", "Boarding will begin shortly. Shortly is a measure of time. We are not sure which one."),
    S("A short delay", "Control Tower", "We are experiencing a short delay of one millisecond. We apologise. The millisecond has been informed."),
    S("Final call", "Gate Staff", "This is the final call for passengers who have not yet been called for the first time."),
    S("Seatbelt sign", "Captain Peanut", "The seatbelt sign is on. The seatbelt has no buckle. Please believe, and keep believing."),
    S("Baggage", "Baggage Hall", "Your bags will be on belt number seven. Or belt number three. Belts are a state of mind.") ] },
  { id: "sorry", name: "Joel's Sorry Station", tag: "Joel, apologising, on repeat.", list: [
    S("Sorry, part one", "Joel", "Hello, it is Joel. I am sorry about the delay. And the other delay. And the one you have not had yet."),
    S("Sorry, part two", "Joel", "I am sorry again. This is a new sorry. The old sorry has gone to the cupboard."),
    S("An unrelated apology", "Joel, from the cupboard", "I have run out of sorry, so here is an unrelated one. I am sorry I ate the last biscuit in two thousand and nine."),
    S("Sorry for the sorry", "Joel", "I am sorry that I keep saying sorry. I am sorry that this is the third time I said it this minute."),
    S("Sorry, but quieter", "Joel", "Sorry. Sorry. Sorry. Okay, that was the last one. Sorry.") ] },
  { id: "classics", name: "Peanut Classics", tag: "Songs we made up just now.", list: [
    T("Walking Through the Terminal", "The Gate Changes", 18), T("Your Bag Is Not Here", "Belt Seven", 16), T("Peanut Shell Life Jacket", "The Brace Position", 18),
    T("One Millisecond Late", "Octee & The Delays", 16), T("Believing Is the Buckle", "Seatbelt Sisters", 18), T("Joel, Please Come Back", "The Cupboard Choir", 16) ] },
  { id: "lounge", name: "Lounge FM", tag: "Smooth. Slightly late.", list: [
    T("Duty Free Dreams", "Lounge Quartet", 20), S("Lounge notice", "Lounge", "Welcome to the lounge. The lounge is open. The lounge will be open. Please enjoy the peanuts that are not here."),
    T("Gate 9 After Midnight", "Lounge Quartet", 20), T("Slow Boarding", "The Queue", 18), S("Lounge notice", "Lounge", "The lounge is now closing, for the flight that is now boarding, which has been delayed.") ] }
];

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

/* ---------- playback ---------- */
let ctx = null, out = null, volume = 0.6, st = null, cur = null; // cur: { station, i, playing, stop() }
const canSpeak = "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
const announce = (playing) => dispatchEvent(new CustomEvent("octee:radio", { detail: { playing } }));

function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) { ctx = new AC(); out = ctx.createGain(); out.connect(ctx.destination); }
  out.gain.value = volume * 0.5;
  ctx.resume();
  return ctx;
}

function playTune(track, done) {
  const c = audio();
  if (!c) return playTimer(track.secs, done);
  const r = rng(hash(track.title)), bpm = 84 + Math.floor(r() * 50), beat = 60 / bpm;
  const root = 48 + Math.floor(r() * 12), scale = [0, 2, 4, 7, 9, 12, 14, 16];
  const bus = c.createGain(); bus.gain.value = 1; bus.connect(out);
  const t0 = c.currentTime + 0.1, end = t0 + track.secs;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const note = (m, t, d, type, v) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05); };
  const prog = [0, 5, 7, 3].map((x) => x + root - 12);
  let t = t0, bar = 0, m = 0;
  while (t < end - beat) {
    note(prog[bar % 4], t, beat * 1.8, "sine", 0.5);
    for (let k = 0; k < 8; k++) { if (r() < 0.78) { m = Math.max(0, Math.min(scale.length - 1, m + Math.floor(r() * 3) - 1 + (r() < 0.2 ? 2 : 0))); note(root + 12 + scale[m], t + k * beat / 2, beat * 0.9, k % 2 ? "triangle" : "square", k % 2 ? 0.14 : 0.06); } }
    t += beat * 4; bar++;
  }
  const to = setTimeout(done, track.secs * 1000 + 300);
  return () => { clearTimeout(to); try { bus.gain.setTargetAtTime(0, c.currentTime, 0.03); setTimeout(() => bus.disconnect(), 300); } catch {} };
}
function playTimer(secs, done) { const to = setTimeout(done, secs * 1000); return () => clearTimeout(to); }
function playSay(track, done) {
  if (!canSpeak) return playTimer(Math.max(5, track.text.length / 13), done);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(track.text);
  u.volume = volume; u.rate = 0.95; u.lang = "en-GB";
  let fin = false, guard;
  const t0 = Date.now(), want = Math.max(5, track.text.length / 13) * 1000;
  const end = () => { if (fin) return; fin = true; clearTimeout(guard);
    const left = Date.now() - t0 < 1500 ? want : 0;                 // speech failed at once: show the caption for a while instead
    guard = setTimeout(done, left); };
  u.onend = end; u.onerror = end;
  guard = setTimeout(end, Math.max(8, track.text.length / 9) * 1000);   // some browsers never fire onend
  speechSynthesis.speak(u);
  return () => { fin = true; clearTimeout(guard); speechSynthesis.cancel(); };
  // (stop clears the guard, so a pending caption timer never skips a track)
}

function stopNow() { if (cur && cur.stop) cur.stop(); }
function playAt(station, i) {
  stopNow();
  const list = station.list, idx = ((i % list.length) + list.length) % list.length, track = list[idx];
  cur = { station, i: idx, playing: true };
  const done = () => playAt(station, idx + 1);
  cur.stop = track.kind === "tune" ? playTune(track, done) : playSay(track, done);
  announce(true); paint();
}
function pause() { stopNow(); if (cur) { cur.playing = false; cur.stop = null; } announce(false); paint(); }
const toggle = () => { if (!st) return; if (cur && cur.playing && cur.station === st) pause(); else playAt(st, cur && cur.station === st ? cur.i : 0); };

/* ---------- page ---------- */
st = STATIONS[0];
const tabs = el("div", { class: "radio-tabs", role: "tablist", "aria-label": "Stations" });
const panel = el("div", { class: "card radio-panel" });
const vol = el("input", { type: "range", min: "0", max: "1", step: "0.05", value: String(volume), "aria-label": "Volume" });
vol.addEventListener("input", () => { volume = Number(vol.value); if (out) out.gain.value = volume * 0.5; });
function paint() {
  tabs.replaceChildren(...STATIONS.map((s) => el("button", { class: "btn small " + (s === st ? "" : "ghost"), type: "button", role: "tab", "aria-selected": String(s === st),
    onclick: () => { st = s; paint(); } }, s.name)));
  const here = cur && cur.station === st, playing = here && cur.playing, idx = here ? cur.i : -1;
  const now = idx >= 0 ? st.list[idx] : null;
  panel.replaceChildren(
    el("h2", { style: "margin:0" }, st.name), el("p", { class: "note", style: "margin:2px 0 10px" }, st.tag),
    el("div", { class: "radio-now", "aria-live": "polite" }, now ? el("div", {}, el("strong", {}, (playing ? "Now playing: " : "Paused: ") + now.title), el("span", { class: "note" }, " · " + now.artist),
      el("p", { class: "radio-cap" }, now.kind === "say" ? "“" + now.text + "”" : "♪ (a song, made up for you just now)")) : el("p", { class: "note" }, "Press play. Sound starts only after you press the button.")),
    el("div", { class: "actions" },
      el("button", { class: "btn", type: "button", onclick: toggle }, playing ? "Pause" : "Play"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => playAt(st, here ? cur.i + 1 : 0) }, "Next"),
      el("label", { class: "radio-vol" }, "Volume ", vol)),
    el("h3", {}, "Tracklist"),
    el("ol", { class: "radio-list" }, ...st.list.map((tr, k) => el("li", { class: k === idx ? "now" : "" },
      el("button", { class: "linklike", type: "button", onclick: () => playAt(st, k) }, tr.title), el("span", { class: "note" }, ` · ${tr.artist} · ${tr.kind === "say" ? "spoken" : "song"}`)))));
}
root.replaceChildren(tabs, panel,
  el("p", { class: "note" }, "Octee Radio pauses the site music while it plays and gives it back when you pause. Spoken items need a browser that can talk. If yours cannot, you will get captions and a timer instead."));
paint();
addEventListener("pagehide", () => { if (canSpeak) speechSynthesis.cancel(); });
