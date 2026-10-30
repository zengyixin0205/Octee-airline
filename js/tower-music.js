// Tower Music: whatever the Control Tower's Music tab has saved (1 or 2 YouTube video IDs — never the audio or
// video itself, just the ID) plays here, through YouTube's own embedded player. The site never downloads or
// re-hosts anyone's video or audio; it only ever asks YouTube's player to show it, same as embedding a video in
// a news article. One track loops forever; two play back to back and loop as a pair (YouTube's own loop+playlist
// trick: playerVars.loop + playerVars.playlist pointing at the same id(s) as videoId).
//
// The control is one small square icon carrying Oliver Chng's existing site icon (the same drawn picture
// already used for him elsewhere — assets/img/oliver-scraggy.png, never a real photo), sitting in the same
// bottom-left row as the background-music button and the Radio link. First click starts it (needs a click:
// browsers block audio before a user gesture); after that, clicking again just shows/hides the video frame,
// kept as small as a YouTube embed can reasonably go, without pausing it.
//
// The site's own welcome splash ("Board (sound on)" in js/music.js) also starts this on its "yes": one click
// both boards the flight and starts the YouTube track. Once something is saved here, the site's own
// synthesized music does not play at all — Tower Music takes over completely (see hasTowerMusic, and how
// js/music.js checks it before ever starting its own engine).
//
// This is a plain multi-page site (every link is a real navigation, not a single-page-app route swap), so a
// brand new page always means a brand new player with no memory of its own. To make the track feel like it
// keeps going as you click around rather than restarting from the top each time, the currently-playing track
// index and position are checkpointed to sessionStorage (every second, plus a final precise save on pagehide)
// and, on the next page, read back and used to pick up right where it left off — same track, same spot, give or
// take the player start-up time — with autoplay attempted immediately (no click needed, since the visitor
// already gave a real gesture earlier in this tab). If the browser's autoplay policy blocks that anyway,
// YouTube's own on-screen play button (the player always has controls) lets the visitor nudge it once, still at
// the resumed spot. Closing the tab clears the checkpoint — a fresh visit starts from the top again.
import { el } from "./dom.js";
import { fetchPublished } from "./published.js";
import { loadSession, saveSession } from "./store.js";

const OLIVER_ICON = "assets/img/oliver-scraggy.png";
const POS_KEY = "octee.music.towerpos";       // { i: playlist index, t: seconds into that track, at: Date.now() }

function loadApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.append(s);
    }
  });
}

// Fetched once; shared by the icon button and by the welcome splash's "Board (sound on)" button.
const dataPromise = fetchPublished("music", "data/music.json", { tracks: [] }).catch(() => ({ tracks: [] }));
let ids = null;
async function trackIds() {
  if (ids) return ids;
  const data = await dataPromise;
  ids = (Array.isArray(data?.tracks) ? data.tracks : []).map((t) => t?.id).filter((id) => typeof id === "string" && id).slice(0, 2);
  return ids;
}
// Whether the Control Tower has anything saved at all. js/music.js checks this before letting its own
// synthesized tunes play, so the two never compete.
export async function hasTowerMusic() { return (await trackIds()).length > 0; }

let mount, box, icon, player;
let started = false, hiddenPlayer = false, joelSinging = false, checkpointTimer = null;

// Where to pick up: a checkpoint saved from the previous page, in this same tab, for the same track(s) —
// otherwise null, meaning "start from the top".
function readCheckpoint(list) {
  const pos = loadSession(POS_KEY, null);
  if (!pos || typeof pos.t !== "number" || typeof pos.at !== "number") return null;
  const i = Number.isInteger(pos.i) && pos.i >= 0 && pos.i < list.length ? pos.i : 0;
  const elapsed = pos.t + Math.max(0, (Date.now() - pos.at) / 1000);
  return { i, t: elapsed };
}

function checkpoint() {
  if (!player) return;
  try {
    const i = player.getPlaylistIndex ? player.getPlaylistIndex() : 0;
    const t = player.getCurrentTime();
    saveSession(POS_KEY, { i: Number.isInteger(i) && i >= 0 ? i : 0, t: typeof t === "number" ? t : 0, at: Date.now() });
  } catch { /* player not ready yet */ }
}
addEventListener("pagehide", checkpoint);

// Starts the saved YouTube track(s). Returns false and does nothing when nothing is saved, so a caller (the
// welcome splash) knows to fall back to the site's own synthesized music instead. Safe to call more than once.
// Picks up from the last page's checkpoint when there is one for this tab, instead of starting at the top.
export async function startTowerMusic() {
  if (started) return true;
  const list = await trackIds();
  if (!list.length) return false;
  started = true;
  const resume = readCheckpoint(list);
  icon?.classList.add("tower-music-playing");
  box?.classList.remove("tower-music-hidden");          // show the frame right away, don't wait on the network
  await loadApi();
  player = new YT.Player(mount, {
    width: "46", height: "26", videoId: list[resume?.i ?? 0],
    playerVars: { autoplay: 1, loop: 1, playlist: list.join(","), start: resume ? Math.floor(resume.t) : undefined, controls: 1, modestbranding: 1, rel: 0 },
    events: {
      onReady: (e) => {
        try {
          if (resume && e.target.seekTo) e.target.seekTo(resume.t, true);   // sub-second precision beyond the integer "start" param
          if (joelSinging) e.target.pauseVideo(); else e.target.playVideo();
        } catch { /* browser blocked it; the visible controls still let the visitor press play */ }
      },
      onStateChange: (e) => { icon?.classList.toggle("tower-music-playing", e.data === YT.PlayerState.PLAYING); }
    }
  });
  checkpointTimer = setInterval(checkpoint, 1000);      // keeps the next page's resume spot fresh
  return true;
}

// Joel singing asks Tower Music to step aside while he's going, same as it asks the site's own synthesized
// music — resumes on its own once he stops.
addEventListener("octee:joelsinging", (e) => {
  joelSinging = !!e.detail.playing;
  if (!started || !player) return;
  try { if (joelSinging) player.pauseVideo(); else player.playVideo(); } catch { /* player not ready yet */ }
});

export async function mountTowerMusic() {
  const list = await trackIds();
  if (!list.length) return;

  mount = el("div");
  icon = el("button", { class: "tower-music-icon", type: "button", "aria-label": "Tower Music: play, or show/hide the video" },
    el("img", { src: OLIVER_ICON, alt: "" }));
  box = el("div", { class: "tower-music tower-music-hidden", "data-joel-keep": "1" }, icon, mount);

  icon.addEventListener("click", async () => {
    if (!started) { await startTowerMusic(); return; }
    hiddenPlayer = !hiddenPlayer;
    box.classList.toggle("tower-music-hidden", hiddenPlayer);
  });

  document.body.append(box);

  // Picked up mid-flight from an earlier page in this tab: carry straight on, no click needed. (A fresh visit,
  // or the splash's own "Board (sound on)" button, has no checkpoint yet and stays idle until clicked, as before.)
  if (loadSession(POS_KEY, null)) startTowerMusic();
}
