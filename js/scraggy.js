// Scraggy Airlines (SA) data. Read from the REAL Scraggy site so SA flights always match it.
// Falls back to scraggy-data-snapshot.js (a copy of Scraggy's js/data.js) if the live one can't load
// or is an older version without flight times.
import { CONFIG } from "./config.js";
import * as snapshot from "./scraggy-data-snapshot.js";

// Scraggy's destination ids -> Octee place codes
export const SCRAGGY_PLACE = { "scraggy-house": "SCH", "mdm-wrong-wrong": "MIA", lujin: "LUJ", fia: "FIA", mfia: "MFIA" };

let cached = null;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

export async function scraggyData() {
  if (cached) return cached;
  let data = snapshot;
  let source = "snapshot";
  if (CONFIG.SCRAGGY_SITE_URL) {
    try {
      const live = await withTimeout(import(new URL("js/data.js", CONFIG.SCRAGGY_SITE_URL).href), 3000);
      const routes = Object.values(live.ROUTES || {});
      if (routes.length && routes.every((r) => r.outDep && r.inDep)) { data = live; source = "live"; }
    } catch { /* use the snapshot */ }
  }
  // Scraggy Airlines also flies SIA <-> Mt Fuji International Airport (MFIA), the transit hub. Added here, because the Scraggy site's own list may not have it yet.
  if (!data.ROUTES.mfia) {
    const MFIA = { base: 180, outNo: "SA109", inNo: "SA110", gate: "SCG015", outDep: "12:20", outArr: "13:00", inDep: "14:00", inArr: "14:40",
      blurb: "The transit hub under the mountain. Change here, but not to FIA: only Octee Airlines flies you on from MFIA to FIA.", detail: "Mt Fuji International Airport. A hub for changing planes, and your mind." };
    const base = data;
    data = { ...base, ROUTES: { ...base.ROUTES, mfia: MFIA }, PLACES: { ...base.PLACES, mfia: { name: "Mt Fuji International Airport (MFIA)", short: "MFIA" } },
      legPoints: (dest, cls) => (dest === "mfia" ? MFIA.base + (base.classBonus ? base.classBonus(cls) : 0) : base.legPoints(dest, cls)),
      flightTimes: (no) => (no === MFIA.outNo ? { dep: MFIA.outDep, arr: MFIA.outArr } : no === MFIA.inNo ? { dep: MFIA.inDep, arr: MFIA.inArr } : base.flightTimes(no)) };
  }
  const routes = Object.entries(data.ROUTES).map(([id, r]) => ({
    id, place: SCRAGGY_PLACE[id] || id, name: data.PLACES[id]?.name || id,
    outNo: r.outNo, inNo: r.inNo, gate: r.gate,
    outDep: r.outDep, outArr: r.outArr, inDep: r.inDep, inArr: r.inArr, blurb: r.blurb
  }));
  cached = { data, source, routes };
  return cached;
}
