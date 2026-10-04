// Optional Wikipedia lookup for questions JoelAI has no rule for. This is the ONLY part of JoelAI that uses the
// internet: it sends the question text to Wikipedia (en.wikipedia.org) and shows the first lines of the best article.
// It can be switched off by the visitor ("stop looking things up online"). Nothing else leaves the browser.
import { load, save } from "./store.js";

const KEY = "octee.joelai.online";
export const onlineOn = () => load(KEY, "on") !== "off";
export const setOnline = (on) => save(KEY, on ? "on" : "off");

export function settingsReply(q) {
  if (/(stop|do not|don'?t|turn off|disable|no more|switch off).{0,18}(look|online|wikipedia|internet|search)/.test(q) && !/(stop|don'?t) me/.test(q)) { setOnline(false); return { text: "Done. I will not look anything up online any more. I only answer from what is written in the handbook. Say \"turn on online lookup\" to bring it back.", links: [], chips: ["Turn on online lookup", "What can you do?"] }; }
  if (/(turn on|enable|start|switch on|allow).{0,18}(look|online|wikipedia|internet)/.test(q)) { setOnline(true); return { text: "Online lookup is on. When I have no rule for a question I will ask Wikipedia and tell you that I did. Your question text goes to Wikipedia when I do, and nothing else does.", links: [], chips: ["Who was Marie Curie?", "Stop looking things up online"] }; }
  if (/(do you|are you).{0,15}(look|search|use).{0,15}(online|internet|wikipedia|web)|where do you get.{0,15}(answers|information)|how do you know (things|about)/.test(q)) return { text: `Three places, in order: 1) the handbook, which is everything about FIA and this site, 2) the small real-world shelf (capitals, times, distances, units, facts about flying), and 3) if both are empty and online lookup is on (it is currently ${onlineOn() ? "on" : "off"}), the first lines of a Wikipedia article, which I will always tell you about. I do not look anything else up and I do not learn.`, links: [], chips: [onlineOn() ? "Stop looking things up online" : "Turn on online lookup", "What can you do?"] };
  return null;
}

const LEAD = /^(?:please |can you |could you |do you know |i want to know |tell me |i would like to know |i'?d like to know )?(?:who (?:is|was|were|are)|what (?:is|was|are|were)|what'?s|where (?:is|was|are)|when (?:is|was|did)|why (?:is|was|are|do|does|did)|how (?:does|do|did|is|was|are)|tell me about|explain|define|describe|meaning of|history of|about)\s+(?:an? |the )?/;
export function subject(q) {
  let s = String(q || "").toLowerCase().replace(/[?!.]+$/g, "").trim();
  s = s.replace(LEAD, "").replace(/\s+/g, " ");
  return s.slice(0, 100);
}
const BAD = /\b(may refer to|can refer to|disambiguation|commonly refers to)\b/i;
let inflight = 0;

export async function webLookup(q) {
  if (!onlineOn() || inflight) return null;
  if (/\b(my|mine|i am|i'm|i have|i've)\b/.test(q) || /\d{6,}/.test(q)) return null;           // personal talk is never sent
  const s = subject(q);
  if (s.length < 3 || s.split(" ").length > 12 || /asdf|qwer|zxcv|hjkl|(.)\1{3,}/.test(s)) return null;
  const url = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=3&gsrsearch=" + encodeURIComponent(s) +
    "&prop=extracts%7Cinfo&exintro=1&explaintext=1&exsentences=3&inprop=url&format=json&formatversion=2&origin=*";
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000);
  inflight++;
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return { failed: true };
    const j = await r.json();
    const pages = (j.query?.pages || []).slice().sort((a, b) => (a.index || 0) - (b.index || 0)).filter((p) => p.extract && p.extract.length > 40 && !BAD.test(p.extract.slice(0, 200)));
    if (!pages.length) return { none: true };
    const p = pages[0];
    const text = p.extract.replace(/\s*\n+\s*/g, " ").slice(0, 600).replace(/\s+\S*$/, (m) => (p.extract.length > 600 ? "..." : m));
    return { text: `That is not in the handbook, so I looked it up online. Wikipedia says (${p.title}):\n\n${text}\n\n(From Wikipedia, which Octee does not control. I cannot vouch for it, and Joel has not read it. Say "stop looking things up online" to turn this off.)`, links: [[`${p.title} on Wikipedia`, p.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`]], chips: ["Tell me a fun fact", "What can you do?"] };
  } catch { return { failed: true }; }
  finally { clearTimeout(timer); inflight--; }
}
