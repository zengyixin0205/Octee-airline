// The version label at the side of every page. The Control Tower (Ads tab, "Site version") sets the number, the note and the on/off switch;
// it rides along in the published "ads" data as `version: { on, text }`.
import { el } from "./dom.js";
import { fetchPublished } from "./published.js";

export const DEFAULT_VERSION = "3.3";
export const cleanVersion = (v) => ({ on: !(v && v.on === false), text: String((v && v.text) || DEFAULT_VERSION).trim().slice(0, 12) || DEFAULT_VERSION });

export async function showVersion() {
  if (document.querySelector(".ver-tab")) return;
  let data = {};
  try { data = await fetchPublished("ads", "data/ads.json", { ads: [] }); } catch { /* fine */ }
  const v = cleanVersion(data && data.version);
  if (!v.on || document.querySelector(".ver-tab")) return;
  document.body.append(el("div", { class: "ver-tab", role: "note", title: "Site version", "aria-label": "Site version " + v.text }, "Version " + v.text));
}
