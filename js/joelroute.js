// JoelAI as a trip finder: "how do I get from MFIA to SIA?", "next flight to TDA", "FIA to Tabletop".
// It uses the real timetable (the same trip finder as the booking form), so it can never disagree with it.
// "flights to X" (a list of every flight) is left to the older handbook; this answers "how do I get from A to B".
import { PLACES, normalize, nextDates, describeItinerary, placeName, placeShort, mins } from "./destinations.js";
import { scraggyData } from "./scraggy.js";
import { today, niceDate } from "./dom.js";

// the longest place name or alias found in the text, as whole words
function findPlace(text) {
  const t = " " + String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim() + " ";
  let best = null;
  for (const [code, p] of Object.entries(PLACES)) {
    for (const n of [p.name, p.short, code, ...p.aliases]) {
      const k = String(n).toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
      if (k.length < 3 || !t.includes(" " + k + " ")) continue;
      if (!best || k.length > best.len) best = { code, len: k.length, at: t.indexOf(" " + k + " ") };
    }
  }
  return best;
}
const strip = (s) => s.replace(/\b(please|today|tomorrow|tonight|now|airport|the|and|then|on|at)\b.*$/, "").trim();

export function parseRoute(q) {
  const m = q.match(/\bfrom (.+?) to (.+?)(?:[?.!]|$)/) || q.match(/\b(?:get|fly|go|travel|journey|route|way|connect|connection|flight|flights|trip)\b.*?\b(?:from )?(.+?) to (.+?)(?:[?.!]|$)/) || q.match(/^(.+?) (?:to|->|→) (.+?)$/);
  if (m) {
    const a = findPlace(m[1]), b = findPlace(strip(m[2]));
    if (a && b && a.code !== b.code) return { from: a.code, to: b.code };
  }
  // "how do I get to MFIA", "next flight to TDA": from FIA (where you are)
  const n = q.match(/\b(?:how (?:do|can|would) i (?:get|go|fly|travel)|next flight|first flight|earliest flight|way)\b.*?\b(?:to|into) (.+?)(?:[?.!]|$)/);
  if (n) { const b = findPlace(strip(n[1])); if (b && b.code !== "FIA") return { from: "FIA", to: b.code }; }
  return null;
}

export async function routeAnswer(q, state) {
  const r = parseRoute(q);
  if (!r) return null;
  const { routes } = await scraggyData();
  const ups = nextDates(r.from, r.to, routes, today(), 2);
  const fromN = placeName(r.from), toN = placeName(r.to);
  if (state?.last) { state.last.place = placeShort(r.to); state.last.topic = "route"; }
  if (!ups.length) return { text: `I looked, and there is no way to get from ${fromN} to ${toN} in the next three weeks. Not even eventually. Try going somewhere else first. (Every journey here goes through somewhere you did not plan.)`, links: [["Destinations", "destinations.html"]], chips: ["Flights to " + placeShort(r.to), "Plan a trip for me"] };
  const lines = ups.map((u) => {
    const legs = u.it.map((s) => `${s.no} ${placeShort(s.from)} ${s.dep} → ${placeShort(s.to)} ${s.arr}`).join(", then ");
    return `${niceDate(u.date)}: ${legs} (${describeItinerary(u.it)}).`;
  });
  const first = ups[0].it, last = first[first.length - 1];
  const total = mins(last.arr) - mins(first[0].dep);
  let text = `Here is how to get from ${fromN} to ${toN}.\n\n` + lines.join("\n") + `\n\nThe first option takes about ${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m, in theory. In practice, add the delay.`;
  const hasMfiaFia = ups.some((u) => u.it.some((s) => (s.from === "MFIA" && s.to === "FIA") || (s.from === "FIA" && s.to === "MFIA")));
  if (hasMfiaFia) text += "\n\nNote: the MFIA to FIA leg is Octee Airlines only. No other airline flies it.";
  if (ups.some((u) => u.it.some((s) => s.airline === "SA"))) text += "\n\nScraggy Airlines legs are booked on a second form (the SIA form), one passenger at a time.";
  return { text, links: [["Book it", `book.html?from=${r.from}&to=${r.to}&date=${ups[0].date}`], ["Destinations", "destinations.html"]], chips: ["Flights to " + placeShort(r.to), "Can I take a chainsaw on board?"] };
}

// "Can I take a chainsaw on board?" -> the Duty Free Security Scan
const CAN = /\b(?:can|may|could|am i allowed to|is it ok(?:ay)? to|is it allowed to|are we allowed to|do you allow)\b.{0,12}?\b(?:i|we|you)?\s*(?:take|bring|carry|pack|board with|travel with|fly with|have|check in|put)\b\s+(.+?)\s+(?:on|onto|in|into|through|past|to|aboard|with me|on board)\b/;
const ALLOWED = /\b(?:allowed|permitted|banned|prohibited|forbidden)\b/;
export async function scanAnswer(q) {
  const m = q.match(CAN) || q.match(/\bis (?:a |an |the |my )?(.+?) (?:allowed|permitted|banned|prohibited|forbidden)\b/);
  if (!m) return null;
  let item = m[1].replace(/^(a|an|the|my|some|any)\s+/, "").trim();
  if (!item || item.length > 40 || /^(it|this|that|they|them|something|anything)$/.test(item)) return null;
  const { scanVerdict, scanAllowed } = await import("./dutyscan.js");
  const ok = scanAllowed(item);
  return { text: `${ok ? "ALLOWED. " : "NOT PERMITTED ON BOARD. "}${scanVerdict(item)}\n\n(That was the Duty Free Security Scan. The answer is always no. The reason is the interesting bit. There are 32 things for sale there that you cannot carry.)`, links: [["Duty Free", "dutyfree.html"]], chips: ["Can I take a trombone on board?", "What is in Duty Free?"] };
}
