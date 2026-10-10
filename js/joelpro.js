// JoelAI Pro, handbook edition. Same rulebook as plain JoelAI, but the answer is longer: it adds the
// "more on this" paragraph for the topic, a random page of the site to explore, and questions to ask next.
// No server, no model: it works on GitHub Pages. Secrets are still refused, with nothing added.
import { converse, getState, SECRET } from "./joelbrain.js";
import { MORE } from "./joelguide.js";
import { PAGES } from "./siteindex.js";
import { pickRand } from "./joelkb.js";
import { PLACES, OA_FLIGHTS, MFIA_NOTE, placeName, placeShort, daysText, nextDates, itinerariesOn, describeItinerary, fiaGate, fiaTerminalOf, FIA_TERMINALS, normalize, DAY_NAMES } from "./destinations.js";

const FOLLOW = {
  delayed: ["How long will my delay be?", "What can I play while delayed?", "Who do I complain to?"],
  peanuts: ["How do I earn peanuts?", "What can I buy with peanuts?", "Tell me about the auction"],
  miles: ["What are the Octmiles tiers?", "How do I get Octeetokens?", "Why are my miles missing in incognito?"],
  lostbag: ["Where is my bag?", "How does the auction work?", "Who is Gary?"],
  complaint: ["How upset should I be?", "Who reads the complaints?"],
  seat: ["How do I upgrade my seat?", "What is the Upgrade Lottery?"],
  food: ["What is on the menu?", "Can I bring my own food?"],
  safety: ["Quiz me", "How do I pass the safety quiz?"],
  account: ["How do I make a backup code?", "How do I get my account into another browser?"],
  dutyfree: ["What can I buy in Duty Free?", "What does the cloud in a jar do?"],
  auction: ["How do I win the auction?", "Who is Gary?"],
  who: ["Where is Joel right now?", "Why does Joel say sorry?"],
  hangman: ["What is the answer to Hangman?", "How do I earn peanuts?"],
  capabilities: ["Plan a trip for me", "Tell me a riddle", "Surprise me"],
  meta: ["Are you a real AI?", "What can you do?"]
};
const GENERIC = ["What can you do?", "Plan a trip for me", "Tell me a riddle", "Quiz me", "Where is Joel right now?", "Tell me a joke"];

// ---- facts from the real timetable (js/destinations.js), added to the handbook answer when the question names a flight or a place ----
const stopTime = (f, code) => { const st = f.stops.find((x) => x[0] === code); return st ? (st[2] || st[1]) : ""; };
const flightLine = (f) => {
  const first = f.stops[0][0], gate = first === "FIA" ? ` · from FIA gate ${fiaGate("OA", f.no)} (Terminal ${fiaTerminalOf(fiaGate("OA", f.no))})` : "";
  return `${f.no}: ${f.stops.map((x) => `${placeShort(x[0])} ${x[2] || x[1]}`).join(" → ")} · ${daysText(f.days)}${gate}`;
};
export function timetableFacts(text, todayIso = new Date().toISOString().slice(0, 10)) {
  const raw = String(text || ""), q = " " + raw.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  const out = [];
  // flight numbers: "OA 58", "oa58"
  const nos = [...new Set([...raw.matchAll(/\boa\s?(\d{2,3})\b/gi)].map((m) => "OA " + m[1]))].slice(0, 3);
  for (const no of nos) { const f = OA_FLIGHTS.find((x) => x.no === no); out.push(f ? flightLine(f) : `${no}: I cannot find that flight in the timetable.`); }
  if (nos.length) return out;
  // places, in the order they are mentioned
  const found = [];
  for (const [code, p] of Object.entries(PLACES)) {
    if (!p.oa) continue;
    let at = -1;
    for (const name of [code, p.short, ...p.aliases].map((n) => " " + n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ")) { const i = q.indexOf(name); if (i >= 0 && (at < 0 || i < at)) at = i; }
    if (at >= 0) found.push({ code, at });
  }
  // "mt fuji" contains "fuji": keep MFIA and drop FIA when only the longer name was meant
  const codes = found.sort((a, b) => a.at - b.at).map((x) => x.code).filter((c, i, arr) => !(c === "FIA" && arr.includes("MFIA") && !/\bfia\b|fuji international airport/.test(raw.toLowerCase().replace(/mt fuji|mount fuji|mfia/g, ""))));
  if (codes.length >= 2) {
    const [a, b] = codes, direct = OA_FLIGHTS.filter((f) => f.stops.findIndex((x) => x[0] === a) >= 0 && f.stops.findIndex((x) => x[0] === b) > f.stops.findIndex((x) => x[0] === a));
    if (direct.length) out.push(`${placeShort(a)} to ${placeShort(b)} on Octee: ` + direct.slice(0, 4).map((f) => `${f.no} leaves ${stopTime(f, a)}, arrives ${f.stops.find((x) => x[0] === b)[1]} (${daysText(f.days)})`).join("; ") + ".");
    const next = nextDates(a, b, [], todayIso, 1)[0];
    if (!direct.length && next) { const it = next.it; out.push(`No single Octee flight runs ${placeShort(a)} to ${placeShort(b)}, but on ${next.date} you can go ${it.map((x) => `${x.no} (${placeShort(x.from)} ${x.dep} → ${placeShort(x.to)} ${x.arr})`).join(", then ")}: ${describeItinerary(it)}.`); }
    else if (!direct.length) out.push(`I cannot find a way from ${placeShort(a)} to ${placeShort(b)} in the next three weeks. Try the Trip finder on the Destinations page.`);
    if (a === "MFIA" || b === "MFIA") out.push(MFIA_NOTE);
  } else if (codes.length === 1) {
    const c = codes[0], from = OA_FLIGHTS.filter((f) => f.stops[0][0] === c), into = OA_FLIGHTS.filter((f) => f.stops[f.stops.length - 1][0] === c);
    out.push(`${placeName(c)} (${placeShort(c)}): ${from.length} Octee flight${from.length === 1 ? " leaves" : "s leave"} it and ${into.length} arrive.` + (from.length ? " Leaving: " + from.slice(0, 5).map((f) => `${f.no} to ${placeShort(f.stops[f.stops.length - 1][0])} at ${f.stops[0][2]} (${daysText(f.days)})`).join("; ") + (from.length > 5 ? `; and ${from.length - 5} more` : "") + "." : ""));
    if (c === "FIA") out.push(`At FIA, Octee uses Terminal 1 (${FIA_TERMINALS[0].airlines.join(", ")}); One United uses Terminal 2.`);
    if (c === "MFIA") out.push(MFIA_NOTE);
  }
  return out;
}

export async function proConverse(text) {
  const res = await converse(text);
  if (SECRET.test(String(text).toLowerCase()) || res.error) return res;
  const topic = getState().last?.topic;
  const extra = [];
  if (topic && MORE[topic] && !res.text.includes(MORE[topic].slice(0, 40))) extra.push(MORE[topic]);
  const facts = timetableFacts(text);
  if (facts.length && !facts.every((f) => res.text.includes(f.slice(0, 30)))) extra.push("From the timetable: " + facts.map((f) => (/[.!?]$/.test(f) ? f : f + ".")).join(" "));
  const here = getState().page;
  const pool = PAGES.filter((p) => p[0] !== here && p[0] !== "allpages.html" && !res.links.some((l) => l[1] === p[0]));
  const page = pool.length ? pickRand(pool) : null;
  const links = [...(res.links || [])];
  if (page) {
    extra.push(`Something to explore: ${page[1]}. ${page[3]}`);
    links.push([page[1], page[0]]);
  }
  const follow = [...new Set([...(FOLLOW[topic] || []), ...pickRandMany(GENERIC, 2)])].slice(0, 4);
  extra.push("Some questions to ask next: " + follow.map((f) => `"${f}"`).join(", ") + ".");
  return { ...res, text: res.text + "\n\n" + extra.join("\n\n"), links, chips: follow };
}
function pickRandMany(arr, n) { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }
