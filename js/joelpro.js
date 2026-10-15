// JoelAI Pro, handbook edition. Same rulebook as plain JoelAI, but the answer is longer: it adds the
// "more on this" paragraph for the topic, a random page of the site to explore, and questions to ask next.
// No server, no model: it works on GitHub Pages. Secrets are still refused, with nothing added.
import { converse, getState, SECRET } from "./joelbrain.js";
import { MORE } from "./joelguide.js";
import { PAGES } from "./siteindex.js";
import { pickRand } from "./joelkb.js";
import { JT_FLIGHTS, JT_OWN_PRICE, jtItineraries, priceOf, routeOf, describe, shortOf, JT_AIRPORTS } from "./jt-data.js";
import { JM_IN, JM_OUT, JT_IN, JT_OUT } from "./joelmiles.js";
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

// ---- JoelTEH facts: JT flight numbers, JTIA routes with prices, and Joelmiles sums ----
const CUR = { octmile: ["octmiles", "Octmiles"], octmiles: ["octmiles", "Octmiles"], scraggymile: ["scraggy", "Scraggymiles"], scraggymiles: ["scraggy", "Scraggymiles"], octeetoken: ["tokens", "Octeetokens"], octeetokens: ["tokens", "Octeetokens"], token: ["tokens", "Octeetokens"], tokens: ["tokens", "Octeetokens"], fujitech: ["fujitech", "Fujitech"], joeltoken: ["jt", "JoelTokens"], joeltokens: ["jt", "JoelTokens"] };
const nf = (n) => Math.round(n).toLocaleString("en-GB");
export function joelTehFacts(text, todayIso = new Date().toISOString().slice(0, 10)) {
  const raw = String(text || ""), low = raw.toLowerCase(), out = [];
  // Joelmiles sums: "3 octeetokens in joelmiles", "convert 2 fujitech to joelmiles", "500 joelmiles to octmiles"
  const toJ = low.match(/(\d+(?:\.\d+)?)\s*([a-z]+)\b[^.?!]{0,25}\bjoel ?miles?\b/) || low.match(/\bjoel ?miles?\b[^.?!\d]{0,25}(\d+(?:\.\d+)?)\s*([a-z]+)/), fromJ = low.match(/(\d+(?:\.\d+)?)\s*joel ?miles?\b[^.?!]{0,25}?\b(octmiles?|scraggymiles?|octeetokens?|tokens?|fujitech|joeltokens?)\b/);
  if (fromJ && CUR[fromJ[2]]) {
    const n = Number(fromJ[1]), [k, label] = CUR[fromJ[2]];
    if (k === "jt") out.push(`${nf(n)} Joelmiles sell for ${nf(n * JT_OUT)} JoelTokens (cloud account and JoelAI Pro needed).`);
    else if (k === "fujitech") out.push(`${nf(n)} Joelmiles buy ${(Math.floor(n / JM_OUT.fujitech) / 10).toLocaleString("en-GB")} Fujitech (7 Joelmiles per 0.1).`);
    else out.push(`${nf(n)} Joelmiles buy ${nf(Math.floor(n / JM_OUT[k]))} ${label} (${JM_OUT[k]} Joelmiles each).`);
  } else if (toJ && CUR[toJ[2]]) {
    const n = Number(toJ[1]), [k, label] = CUR[toJ[2]];
    if (k === "jt") out.push(`${nf(n)} JoelTokens buy ${nf(Math.floor(n / JT_IN))} Joelmiles (${JT_IN} each, cloud account needed).`);
    else if (k === "fujitech") out.push(`${n} Fujitech swap into ${nf(n * 10 * JM_IN.fujitech)} Joelmiles (6 per 0.1 Fujitech).`);
    else out.push(`${nf(n)} ${label} swap into ${nf(n * JM_IN[k])} Joelmiles (${JM_IN[k]} each).`);
  }
  // JT flight numbers: own planes (JT 001) and partner numbers (JT 5124 = OA 124)
  const nos = [...new Set([...low.matchAll(/\bjt ?(\d{3,4})\b/g)].map((m) => m[1]))].slice(0, 3);
  for (const d of nos) {
    const own = JT_FLIGHTS.find((f) => f.no === "JT " + d.padStart(3, "0"));
    if (own) out.push(`JT ${own.no.slice(3)}: ${own.from} ${own.dep} → ${own.to} ${own.arr}, ${own.days.length === 7 ? "every day" : "weekends (Fri to Sun)"}, ${nf(JT_OWN_PRICE[`${own.from}-${own.to}`])} Joelmiles economy.`);
    else if (/^[567]\d+$/.test(d)) { const al = { 5: "OA", 6: "OU", 7: "SA" }[d[0]], rest = d.slice(1).replace(/^0+(?=\d)/, ""); out.push(`JT ${d} is the JT number of ${al} ${rest}. Search it on the JoelTEH Airlines page.`); }
    else out.push(`JT ${d}: I cannot find that number.`);
  }
  // routes with JTIA, FIA or MFIA: cheapest/first JT trip on the next days
  if (!nos.length && /\bjtia\b|joel teh international|\bjt\b/.test(low)) {
    const codes = [];
    for (const [code, p] of Object.entries({ ...PLACES, JTIA: { short: "JTIA", aliases: ["jtia", "joel teh international"] } })) {
      const names = [code, p.short, ...(p.aliases || [])].map((n) => n.toLowerCase());
      let at = -1; for (const n of names) { const i = low.indexOf(n); if (i >= 0 && (at < 0 || i < at)) at = i; }
      if (at >= 0 && code !== "LUJ") codes.push({ code, at });
    }
    const cs = codes.sort((a, b) => a.at - b.at).map((c) => c.code).filter((c, i, a) => !(c === "FIA" && a.includes("MFIA") && !/\bfia\b/.test(low.replace(/mt fuji|mount fuji|mfia/g, ""))));
    if (cs.length >= 2) {
      const [a, b] = cs;
      for (let i = 0; i < 7; i++) {
        const d = new Date(todayIso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + i); const iso = d.toISOString().slice(0, 10);
        const its = jtItineraries(a, b, iso, []);
        if (its.length) { const it = its[0]; out.push(`${shortOf(a)} to ${shortOf(b)} with JT on ${iso}: ${routeOf(it)}, ${describe(it)}, ${it.map((s) => `${s.no} ${s.dep}-${s.arr}`).join(" then ")}, ${nf(priceOf(it))} Joelmiles economy (Business ×1.5, First ×2).`); break; }
      }
      if (!out.length) out.push(`I cannot find a JT trip from ${shortOf(a)} to ${shortOf(b)} in the next week.`);
    } else if (/\bjtia\b/.test(low)) out.push(`JT flies from JTIA to ${JT_AIRPORTS.slice(1).map(shortOf).join(" and ")} on its own planes, and anywhere Octee, One United or Scraggy go with a JT number. Name two places and I will find a trip.`);
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
  const jtf = joelTehFacts(text);
  if (jtf.length) extra.push("From JoelTEH: " + jtf.join(" "));
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
