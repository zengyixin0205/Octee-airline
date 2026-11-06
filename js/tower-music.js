// Tower Music: whatever the Control Tower's Music tab has saved (1 or 2 track IDs — never the audio or video
// itself, just the ID) plays here, through that platform's own embedded player: YouTube or, now, Spotify (the
// Control Tower picks one source at a time, not both at once). The site never downloads or re-hosts anyone's
// audio; it only ever asks the platform's own player to show it, same as embedding a video in a news article.
// One track loops forever; two play back to back and loop as a pair. On YouTube that's the player's own
// loop+playlist trick (playerVars.loop + playerVars.playlist); Spotify's embed has no equivalent for an ad-hoc
// pair of tracks, so this watches its playback_update/playback_started events and, when a track's position
// resets to 0 right after it was genuinely playing, loads the next one itself (or restarts the same one, for a
// single track) — a heuristic, since Spotify's iFrame API has no documented "ended" event to hook directly.
//
// The control is one small square icon carrying Oliver Chng's existing site icon (the same drawn picture
// already used for him elsewhere — assets/img/oliver-scraggy.png, never a real photo), sitting in the same
// bottom-left row as the background-music button and the Radio link. First click starts it (needs a click:
// browsers block audio before a user gesture); after that, clicking again just shows/hides the player frame,
// kept as small as that platform's embed can reasonably go, without pausing it.
//
// The site's own welcome splash ("Board (sound on)" in js/music.js) also starts this on its "yes": one click
// both boards the flight and starts the track. Once something is saved here, the site's own synthesized music
// does not play at all — Tower Music takes over completely (see hasTowerMusic, and how js/music.js checks it
// before ever starting its own engine).
//
// This is a plain multi-page site (every link is a real navigation, not a single-page-app route swap), so a
// brand new page always means a brand new player with no memory of its own. To make the track feel like it
// keeps going as you click around rather than restarting from the top each time, the currently-playing source,
// track index and position are checkpointed to sessionStorage (every second, plus a final precise save on
// pagehide) and, on the next page, read back and used to pick up right where it left off — same source, same
// track, same spot, give or take the player start-up time — with playback attempted immediately (no click
// needed, since the visitor already gave a real gesture earlier in this tab). If the browser's autoplay policy
// blocks that anyway, the player's own on-screen controls let the visitor nudge it once, still at the resumed
// spot. Closing the tab clears the checkpoint — a fresh visit starts from the top again.
import { el } from "./dom.js";
import { fetchPublished } from "./published.js";
import { loadSession, saveSession } from "./store.js";

const OLIVER_ICON = "assets/img/oliver-scraggy.png";
const POS_KEY = "octee.music.towerpos";       // { source, i: index, t: seconds into that track, at: Date.now() }

function loadYouTubeApi() {
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
function loadSpotifyApi() {
  return new Promise((resolve) => {
    if (window.__spotifyIframeApi) return resolve(window.__spotifyIframeApi);
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => { window.__spotifyIframeApi = api; prev?.(api); resolve(api); };
    if (!document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]')) {
      const s = document.createElement("script");
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      document.body.append(s);
    }
  });
}

// Fetched once; shared by the icon button and by the welcome splash's "Board (sound on)" button.
const dataPromise = fetchPublished("music", "data/music.json", { tracks: [] }).catch(() => ({ tracks: [] }));
let info = null;
async function trackInfo() {
  if (info) return info;
  const data = await dataPromise;
  const source = data?.source === "spotify" ? "spotify" : "youtube";
  const ids = (Array.isArray(data?.tracks) ? data.tracks : []).map((t) => t?.id).filter((id) => typeof id === "string" && id).slice(0, 2);
  info = { source, ids };
  return info;
}
// Whether the Control Tower has anything saved at all. js/music.js checks this before letting its own
// synthesized tunes play, so the two never compete.
export async function hasTowerMusic() { return (await trackInfo()).ids.length > 0; }

let mount, box, icon;
let started = false, hiddenPlayer = false, joelSinging = false, checkpointTimer = null;
// A small shared interface over whichever platform's player is active, so the rest of this file (the
// Joel-singing listener, the checkpoint timer) doesn't need to know which one it's talking to.
let ctl = null;   // { source, play(), pause(), position(): seconds, index(): number }

// Where to pick up: a checkpoint saved from the previous page, in this same tab, for the same source and
// track(s) — otherwise null, meaning "start from the top". Keeps the raw saved time + timestamp rather than
// pre-computing the elapsed position, so the actual seek (once the player's ready) can work out "how far in"
// right when it happens — loading the platform's API can itself take a second or more, and that gap should count too.
function readCheckpoint(source, list) {
  const pos = loadSession(POS_KEY, null);
  if (!pos || pos.source !== source || typeof pos.t !== "number" || typeof pos.at !== "number") return null;
  const i = Number.isInteger(pos.i) && pos.i >= 0 && pos.i < list.length ? pos.i : 0;
  return { i, t: pos.t, at: pos.at };
}
const elapsedNow = (resume) => resume.t + Math.max(0, (Date.now() - resume.at) / 1000);

function checkpoint() {
  if (!ctl) return;
  try {
    const i = ctl.index(), t = ctl.position();
    saveSession(POS_KEY, { source: ctl.source, i: Number.isInteger(i) && i >= 0 ? i : 0, t: typeof t === "number" ? t : 0, at: Date.now() });
  } catch { /* player not ready yet */ }
}
addEventListener("pagehide", checkpoint);

async function startYouTube(list, resume) {
  await loadYouTubeApi();
  return new Promise((resolveCtl) => {
    const yt = new YT.Player(mount, {
      // No playerVars.autoplay here on purpose: with it on, YouTube starts playing from the top itself the
      // moment the embed is ready, racing the seekTo() below — the visitor would briefly hear the track restart
      // before it jumped to the resumed spot. Seeking first, then calling playVideo() ourselves once that's
      // done, gives a single clean start at the right position instead.
      width: "46", height: "26", videoId: list[resume?.i ?? 0],
      playerVars: { loop: 1, playlist: list.join(","), controls: 1, modestbranding: 1, rel: 0 },
      events: {
        onReady: (e) => {
          try { if (resume) e.target.seekTo(elapsedNow(resume), true); } catch { /* not resuming, or browser blocked it */ }
          try { if (joelSinging) e.target.pauseVideo(); else e.target.playVideo(); } catch { /* browser blocked it; the visible controls still let the visitor press play, already at the resumed spot */ }
          resolveCtl({
            source: "youtube",
            play: () => yt.playVideo(), pause: () => yt.pauseVideo(),
            position: () => yt.getCurrentTime(), index: () => (yt.getPlaylistIndex ? yt.getPlaylistIndex() : 0)
          });
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) icon?.classList.add("tower-music-playing");
          else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) icon?.classList.remove("tower-music-playing");
        }
      }
    });
  });
}

async function startSpotify(list, resume) {
  const IFrameAPI = await loadSpotifyApi();
  let spIndex = resume?.i ?? 0, spStarted = false, spLastPos = (resume ? elapsedNow(resume) : 0), controller;
  return new Promise((resolveCtl) => {
    IFrameAPI.createController(mount, { uri: `spotify:track:${list[spIndex]}`, width: 260, height: 80 }, (c) => {
      controller = c;
      const advance = () => {
        spIndex = (spIndex + 1) % list.length;
        spStarted = false;
        try { controller.loadUri(`spotify:track:${list[spIndex]}`); controller.play(); } catch { /* not ready */ }
      };
      controller.addListener("ready", () => {
        try { if (resume) controller.seek(Math.floor(elapsedNow(resume))); } catch { /* seek not available yet */ }
        try { if (joelSinging) controller.pause(); else controller.play(); } catch { /* browser blocked it; the visible controls still let the visitor press play */ }
        resolveCtl({
          source: "spotify",
          play: () => controller.play(), pause: () => controller.pause(),
          position: () => spLastPos, index: () => spIndex
        });
      });
      controller.addListener("playback_started", () => { spStarted = true; });
      // Spotify's iFrame API has no documented "track ended" event. A track that was genuinely playing and then
      // shows paused-at-the-very-start again looks exactly like it reaching its end and looping back to 0 — so
      // that combination is treated as "ended" and the next track (or the same one, for a single track) is
      // loaded. This is a best-effort heuristic, not documented platform behaviour.
      controller.addListener("playback_update", (e) => {
        const { isPaused, position } = e.data || {};
        if (typeof position === "number") spLastPos = position / 1000;
        icon?.classList.toggle("tower-music-playing", isPaused === false);
        if (spStarted && isPaused && position === 0) advance();
      });
    });
  });
}

// Starts the saved track(s). Returns false and does nothing when nothing is saved, so a caller (the welcome
// splash) knows to fall back to the site's own synthesized music instead. Safe to call more than once. Picks up
// from the last page's checkpoint when there is one for this tab and source, instead of starting at the top.
export async function startTowerMusic() {
  if (started) return true;
  const { source, ids: list } = await trackInfo();
  if (!list.length) return false;
  started = true;
  const resume = readCheckpoint(source, list);
  icon?.classList.add("tower-music-playing");
  box?.classList.remove("tower-music-hidden");          // show the frame right away, don't wait on the network
  box?.classList.toggle("tower-music-spotify", source === "spotify");
  ctl = await (source === "spotify" ? startSpotify(list, resume) : startYouTube(list, resume));
  checkpointTimer = setInterval(checkpoint, 1000);      // keeps the next page's resume spot fresh
  return true;
}

// Joel singing asks Tower Music to step aside while he's going, same as it asks the site's own synthesized
// music — resumes on its own once he stops.
addEventListener("octee:joelsinging", (e) => {
  joelSinging = !!e.detail.playing;
  if (!started || !ctl) return;
  try { if (joelSinging) ctl.pause(); else ctl.play(); } catch { /* player not ready yet */ }
});

export async function mountTowerMusic() {
  const { ids: list } = await trackInfo();
  if (!list.length) return;

  mount = el("div");
  icon = el("button", { class: "tower-music-icon", type: "button", "aria-label": "Tower Music: play, or show/hide the player" },
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
