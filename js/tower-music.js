// Tower Music: whatever the Control Tower's Music tab has saved (1 or 2 YouTube video IDs — never the audio or
// video itself, just the ID) plays here, through YouTube's own embedded player. The site never downloads or
// re-hosts anyone's video or audio; it only ever asks YouTube's player to show it, same as embedding a video in
// a news article. One track loops forever; two play back to back and loop as a pair (YouTube's own loop+playlist
// trick: playerVars.loop + playerVars.playlist pointing at the same id(s) as videoId).
//
// Needs a click to start (same browser rule js/music.js already works around): a small "▶ Play Tower Music"
// button appears bottom-left; press it once and the embedded player loads and plays. A Hide button shrinks the
// player to almost nothing without pausing it — the Control Tower link stays reachable either way.
import { el } from "./dom.js";
import { fetchPublished } from "./published.js";

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

export async function mountTowerMusic() {
  let data;
  try { data = await fetchPublished("music", "data/music.json", { tracks: [] }); } catch { return; }
  const ids = (Array.isArray(data?.tracks) ? data.tracks : []).map((t) => t?.id).filter((id) => typeof id === "string" && id).slice(0, 2);
  if (!ids.length) return;

  const mount = el("div");
  const playBtn = el("button", { class: "btn small", type: "button" }, "▶ Play Tower Music");
  const hideBtn = el("button", { class: "btn small ghost", type: "button", hidden: true }, "Hide");
  const box = el("div", { class: "tower-music", "data-joel-keep": "1" },
    el("div", { class: "tower-music-bar" }, el("span", {}, "🎶 Tower Music"), playBtn, hideBtn), mount);

  let started = false, hiddenPlayer = false;
  playBtn.addEventListener("click", async () => {
    if (started) return;
    started = true;
    playBtn.remove();
    hideBtn.hidden = false;
    await loadApi();
    const loopList = ids.join(",");
    new YT.Player(mount, {
      width: "160", height: "90", videoId: ids[0],
      playerVars: { autoplay: 1, loop: 1, playlist: loopList, controls: 1, modestbranding: 1, rel: 0 },
      events: { onReady: (e) => { try { e.target.playVideo(); } catch { /* browser blocked it; the visible controls still let the visitor press play */ } } }
    });
  });
  hideBtn.addEventListener("click", () => {
    hiddenPlayer = !hiddenPlayer;
    box.classList.toggle("tower-music-hidden", hiddenPlayer);
    hideBtn.textContent = hiddenPlayer ? "Show" : "Hide";
  });

  document.body.append(box);
}
