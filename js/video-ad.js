// The welcome video ad: when a visit starts, one of two short clips plays in a window with a tiny × in the corner.
// Once per visit (per browser tab session); the two clips take turns from visit to visit. It starts muted (browsers
// only allow sound after a tap), with a button to turn the sound on. The Control Tower can switch it off:
// the "ads" data has  video: { on: false }  (default on). Plain files in assets/video/, nothing is fetched from elsewhere.
import { el } from "./dom.js";
import { fetchPublished } from "./published.js";

export const CLIPS = [
  { src: "assets/video/welcome-1.mp4", title: "Non-stop emergency landing" },
  { src: "assets/video/welcome-2.mp4", title: "Air crash mayday song" }
];
const SEEN = "octee.vad.seen", NEXT = "octee.vad.next";
const here = () => location.pathname.split("/").pop() || "index.html";
const get = (st, k) => { try { return st.getItem(k); } catch { return null; } };
const set = (st, k, v) => { try { st.setItem(k, v); } catch { /* private mode: it just shows again */ } };

// Which clip is next (they alternate); `advance` moves it on for the following visit.
export function nextClip(advance = true) {
  const i = (Number(get(localStorage, NEXT)) || 0) % CLIPS.length;
  if (advance) set(localStorage, NEXT, String((i + 1) % CLIPS.length));
  return CLIPS[i];
}

export async function showVideoAd({ force = false } = {}) {
  if (!force && (get(sessionStorage, SEEN) === "1" || /^(login|404)\.html$/.test(here()) || document.querySelector(".vad"))) return;
  if (!force) {
    const data = await fetchPublished("ads", "data/ads.json", { ads: [] }).catch(() => ({}));
    if (data && data.video && data.video.on === false) return;
  }
  const clip = nextClip(!force);
  set(sessionStorage, SEEN, "1");
  const video = el("video", { class: "vad-video", src: clip.src, muted: "", autoplay: "", playsinline: "", loop: "", preload: "auto", "aria-label": clip.title });
  video.muted = true;
  const close = () => { video.pause(); video.removeAttribute("src"); video.load(); box.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const sound = el("button", { class: "vad-sound", type: "button", onclick: () => { video.muted = !video.muted; sound.textContent = video.muted ? "🔇 Sound off" : "🔊 Sound on"; if (video.paused) video.play().catch(() => {}); } }, "🔇 Sound off");
  const box = el("div", { class: "vad", role: "dialog", "aria-label": "Advertisement" },
    el("div", { class: "vad-card" },
      el("button", { class: "vad-x", type: "button", "aria-label": "Close this ad", title: "Close", onclick: close }, "×"),
      el("span", { class: "vad-tag", title: "Octee Airlines is a parody. This advertisement is not real." }, "Ad"),
      video,
      el("div", { class: "vad-bar" }, el("span", {}, clip.title), sound)));
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.addEventListener("keydown", onKey);
  document.body.append(box);
  video.play().catch(() => { video.controls = true; });
}
