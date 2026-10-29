// Tower Music: whatever the Control Tower's Music tab has saved (1 or 2 YouTube video IDs — never the audio or
// video itself, just the ID) plays here, through YouTube's own embedded player. The site never downloads or
// re-hosts anyone's video or audio; it only ever asks YouTube's player to show it, same as embedding a video in
// a news article. One track loops forever; two play back to back and loop as a pair (YouTube's own loop+playlist
// trick: playerVars.loop + playerVars.playlist pointing at the same id(s) as videoId).
//
// The control is one small square icon, bottom-left, carrying Oliver Chng's existing site icon (the same drawn
// picture already used for him elsewhere — assets/img/oliver-scraggy.png, never a real photo) — about half the
// size of the floating JoelAI button. First click starts it (needs a click: browsers block audio before a user
// gesture); after that, clicking again just shows/hides the little video frame without pausing it.
//
// The site's own welcome splash ("Board (sound on)" in js/music.js) also starts this on its "yes": one click
// both boards the flight and starts the YouTube track, falling back to the site's own synthesized music only
// when nothing is saved here (see startTowerMusic below, and the call into it from js/music.js).
import { el } from "./dom.js";
import { fetchPublished } from "./published.js";

const OLIVER_ICON = "assets/img/oliver-scraggy.png";

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

let mount, box, icon, player;
let started = false, hiddenPlayer = false, joelSinging = false;

// Starts the saved YouTube track(s). Returns false and does nothing when nothing is saved, so a caller (the
// welcome splash) knows to fall back to the site's own synthesized music instead. Safe to call more than once.
export async function startTowerMusic() {
  if (started) return true;
  const list = await trackIds();
  if (!list.length) return false;
  started = true;
  icon?.classList.add("tower-music-playing");
  box?.classList.remove("tower-music-hidden");          // show the frame right away, don't wait on the network
  await loadApi();
  player = new YT.Player(mount, {
    width: "160", height: "90", videoId: list[0],
    playerVars: { autoplay: 1, loop: 1, playlist: list.join(","), controls: 1, modestbranding: 1, rel: 0 },
    events: { onReady: (e) => { try { if (joelSinging) e.target.pauseVideo(); else e.target.playVideo(); } catch { /* browser blocked it; the visible controls still let the visitor press play */ } } }
  });
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
}
