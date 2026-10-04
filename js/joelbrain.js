// JoelAI's brain: a pipeline of hand-written rules (no real AI).
// 1) tidy the question (typos, shorthand)  2) split it into up to 3 questions  3) fill in "it", "there", "that one"
// from what we just talked about  4) pick the best answer (secrets are always refused first)  5) add mood, follow-up
// buttons and, when lost, a "did you mean?" list.
import { answer as baseAnswer, GREETING as BASE_GREETING, CHIPS as BASE_CHIPS } from "./joelai.js";
import { KB, SMALL, RIDDLES, FACTS, story, pickRand } from "./joelkb.js";
import { currentUser } from "./auth.js";
import { loadSession, saveSession, removeSession } from "./store.js";

export const GREETING = "Hi, I'm JoelAI. I'm a joel! I can answer several questions at once, remember what we just talked about, plan your day, and tell you stories, riddles and jokes. I am a rulebook with confidence, not a real AI, so I am only right about things we wrote down.";
export const CHIPS = ["Plan a trip for me", "My flight is delayed. What do I do?", "How do I check in?", "Where is gate A12 and when does OA 58 leave?", "What can I play while delayed?", "Tell me a riddle", "What can you do?"];

const STATE_KEY = "octee.joelai.state";
const fresh = () => ({ turns: 0, mood: "calm", moodLeft: 0, last: {}, pending: null, seen: [] });
export const getState = () => ({ ...fresh(), ...(loadSession(STATE_KEY, null) || {}) });
export const resetState = () => removeSession(STATE_KEY);

/* ---------- 1. tidy ---------- */
const SHORT = { u: "you", ur: "your", r: "are", pls: "please", plz: "please", wat: "what", wut: "what", whats: "what is", "what's": "what is", wheres: "where is", "where's": "where is", hows: "how is", "how's": "how is", dont: "do not", "don't": "do not", cant: "can not", "can't": "can not", wont: "will not", im: "i am", "i'm": "i am", ive: "i have", thx: "thanks", ty: "thanks", gonna: "going to", wanna: "want to", gimme: "give me", ok: "okay", abt: "about", bc: "because", b4: "before", cuz: "because", tmrw: "tomorrow", flite: "flight", flght: "flight", fligt: "flight", lugage: "luggage", luggege: "luggage", bagage: "baggage", chek: "check", checkin: "check in", "check-in": "check in", boaring: "boarding", boardin: "boarding", terminl: "terminal", delyed: "delayed", delaed: "delayed", dealyed: "delayed", cancled: "cancelled", resturant: "restaurant", wifi: "wi-fi", whifi: "wi-fi", octmile: "octmiles", octemiles: "octmiles", octeemiles: "octmiles", peanutz: "peanuts", peanut: "peanut" };
const COMMON = new Set("a about after again all am an and any are as at be been before bag bags book boarding but buy by can cancel check class code codes complain complaint contact could day delayed delay do does done don drink eat early either else enough even ever every fast feel find first flight flights fly food for from game games get give go good gate gates great have help here hello how if in into is it just know late leave leaving let like lost love make many me miles more most much my need never next no not now of off on one only or other our out over page peanuts play please price put really right say see seat seats security should show some something soon still sure take tell terminal than thanks that the their them then there these they thing this time to today too train try under until up us use very want was way we weather well what when where which while who why will with without work would yes you your".split(" "));
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const VOCAB = new Set([...COMMON]);
for (const t of KB) for (const k of t.keys) VOCAB.add(k);
["apology", "apologies", "complaint", "baggage", "luggage", "boarding", "passport", "departures", "destination", "destinations", "upgrade", "tracker", "terminal", "certificate", "insurance", "magazine", "crossword", "cupboard", "password", "passwords", "secret", "secrets", "admin", "owner", "hack", "cheat", "exploit", "control", "tower", "airport", "runway", "gate", "check", "booking", "ticket", "seatbelt", "lottery", "hangman", "sorry", "delay"].forEach((w) => VOCAB.add(w));
const VLIST = [...VOCAB].filter((w) => w.length >= 5);
export function tidy(raw) {
  let s = " " + String(raw || "").toLowerCase().replace(/[^\w\s'?!.,;:\-]/g, " ") + " ";
  s = s.replace(/\b(oa|ou|sa)[\s\-]?(\d{1,3})\b/g, "$1 $2").replace(/\b(oa|ou|sa) (\d{1,3})\b/g, "$1$2");
  const words = s.split(/(\s+)/).map((w) => {
    const bare = w.replace(/^[^\w']+|[^\w']+$/g, "");
    if (!bare) return w;
    const tail = w.slice(w.indexOf(bare) + bare.length), head = w.slice(0, w.indexOf(bare));
    if (SHORT[bare]) return head + SHORT[bare] + tail;
    if (bare.length >= 5 && !VOCAB.has(bare) && !/\d/.test(bare)) {
      const hits = VLIST.filter((v) => lev(bare, v) === 1);
      if (hits.length === 1) return head + hits[0] + tail;
    }
    return w;
  });
  return words.join("").replace(/\s+/g, " ").trim();
}

/* ---------- 2. split ---------- */
export function split(t) {
  const parts = t.split(/\?+\s*|;\s*|\s+(?:and also|and then|and|also|then|plus)\s+/).map((x) => x.trim().replace(/^(and also|and then|and|also|then|plus) /, "")).filter((x) => x.split(" ").length >= 2);
  // do not split "flights to X and Y" or "A and B" lists: only split when the second part starts like a question
  if (parts.length < 2) return [t];
  const q = /^(a |an |another |the |how|what|where|when|why|who|can|do|does|is|are|will|tell|show|give|i |my|which|should)/;
  const kept = [parts[0]];
  for (const p of parts.slice(1)) { if (q.test(p)) kept.push(p); else kept[kept.length - 1] += " and " + p; }
  return kept.slice(0, 3);
}

/* ---------- 3. follow-ups ---------- */
const FLIGHT = /\b(oa|ou|sa)\s?(\d{1,3})\b/;
const GATE = /\bgate\s*([a-z]{1,2})\s?(\d{1,3})\s?[abc]?\b|\b(sc|[a-gjm])(\d{1,3})[abc]?\b/;
function remember(state, q) {
  const f = q.match(FLIGHT); if (f) state.last.flight = f[1] + f[2];
  const g = q.match(GATE); if (g) state.last.gate = (g[1] || g[3]) + (g[2] || g[4]);
  const p = q.match(/\b(?:flights?|fly|go|get|travel|going|trip) (?:to|from) ([a-z][a-z ]{1,24})/); if (p) state.last.place = p[1].replace(/\b(please|today|tomorrow|now|and|or)\b.*$/, "").trim();
}
function resolve(q, state) {
  const { flight, gate, place } = state.last;
  if (/^(when|what time).{0,30}(it|that|this|the flight)?.{0,12}(leave|leaves|depart|departs|go|take off)\b/.test(q) && !FLIGHT.test(q) && flight) return `when does ${flight} leave`;
  if (/^(where|which gate|what gate).{0,20}(is it|does it (leave|go)|is that|is my|is the)?\b/.test(q) && !GATE.test(q) && !FLIGHT.test(q) && /\b(it|that|this)\b|which gate|what gate/.test(q) && flight) return `${flight}`;
  if (/^(and |what about |how about )(gate )?([a-g]\d{1,3}|sc\d{1,3})\b/.test(q)) return "gate " + q.match(/([a-g]\d{1,3}|sc\d{1,3})/)[1];
  if (/^(and |what about |how about )(oa|ou|sa)\s?\d/.test(q)) return q.replace(/^(and |what about |how about )/, "");
  if (/^(and |what about |how about )(to |from )?([a-z][a-z ]{2,24})$/.test(q) && (place || /flights?/.test(state.last.topicText || ""))) return "flights to " + q.replace(/^(and |what about |how about )(to |from )?/, "");
  if (/\b(there|that place)\b/.test(q) && place && /flight|fly|go|get|how/.test(q)) return `flights to ${place}`;
  if (/^(and )?(that|this|it)( one)?\??$|^(and )?(from )?there\??$/.test(q) && gate) return `gate ${gate}`;
  return q;
}

/* ---------- 4. mood ---------- */
const MOODS = { calm: "calm", nervous: "nervous", proud: "proud", sorry: "sorry", warm: "warm" };
function moodFrom(q, state) {
  let m = null;
  if (/\b(sorry|apolog|angry|furious|terrible|awful|worst|hate|rubbish|useless|cancel)/.test(q)) m = "sorry";
  else if (/\b(late|delay|delayed|stuck|missed|panic|worried|scared|nervous|lost)\b/.test(q)) m = "nervous";
  else if (/\b(thanks|thank|love|great|amazing|brilliant|best|good (bot|job)|well done|peanut)\b/.test(q)) m = "proud";
  else if (/\b(hi|hello|hey|friend|lonely|how are you|story|joke)\b/.test(q)) m = "warm";
  if (m) { state.mood = m; state.moodLeft = 3; } else if (state.moodLeft > 0) state.moodLeft--; else state.mood = "calm";
  return state.mood;
}
const ASIDES = {
  nervous: ["(Joel is sweating a little. It is normal. It is a lot.)", "(I am keeping calm. I have not been calm since 9 o'clock.)"],
  sorry: ["(I am so, so sorry. I am sorry about the sorry.)", "(Joel says sorry. He says it quietly, from the cupboard.)"],
  proud: ["(I am proud. This is the best conversation I have had today. It is the only one.)", "(Joel just smiled. It was brief.)"],
  warm: ["(It is nice to have somebody to talk to between delays.)", "(I would offer you a peanut. I do not have hands.)"],
  calm: ["(Everything is fine. The board says so.)", "(Somewhere, a flight is one millisecond late. We are watching it.)"]
};
const ME = (u) => (u ? u.username : "");

/* ---------- 5. pick ---------- */
const SECRET = /control ?tower|\badmins?\b|\bowner\b|fag panel|\bhack|\bcheat|\bexploit|\bpasswords?\b|\bsecrets?\b|\bcodes?\b/;
const SPECIFIC = /\b(oa|ou|sa)\s?\d{1,3}\b|\bgate\s*[a-z]{1,2}\s?\d|\b(sc|[a-gjm])\d{1,3}[abc]?\b|\bterminal\s*\d\b|\bt[1-5]\b|(today|tonight|now).{0,25}(flights?|departures?|leaving)|(flights?|departures?).{0,20}today|what is leaving|\b(flights?|fly|go|get|travel|going) (to|from) |my (next )?(flight|trip|booking|seat)\b|checked in|check in status|my (octmiles|miles|points|balance|tier|status|tokens)|how many (octmiles|miles|tokens)|how (do|can|should) i (check in|change|reset|book|get a boarding pass|print)|boarding pass/;
const PRIORITY = new Set(["delayed", "account", "lostbag", "peanuts", "miles", "share", "bored", "hangman"]);
const isFallback = (r) => r.chips && r.chips.length === 4 && r.chips[0] === BASE_CHIPS[0];

function tokens(q) { return q.replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w.length > 2 && !COMMON.has(w)); }
function suggestions(q) {
  const tk = tokens(q);
  const scored = KB.map((t) => ({ t, s: tk.reduce((n, w) => n + (t.keys.some((k) => k === w || (w.length > 4 && lev(k, w) <= 1) || (k.length > 4 && w.startsWith(k.slice(0, 4)))) ? 1 : 0), 0) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  return scored.slice(0, 3).map((x) => x.t.sample);
}

function riddleAnswer(q, state) {
  const [question, answers, reveal] = state.pending.riddle;
  state.pending = null;
  if (/give up|dont know|do not know|no idea|tell me|reveal|answer/.test(q)) return { text: "The answer: " + reveal, links: [], chips: ["Tell me another riddle", "Tell me a joke"] };
  if (answers.some((a) => q.includes(a))) return { text: "Correct! " + reveal + " I am proud. That is two correct things I have heard today.", links: [], chips: ["Tell me another riddle", "Tell me a fun fact"] };
  return { text: "Not quite. " + reveal + " It was hard. It was also a bit unfair.", links: [], chips: ["Tell me another riddle", "Tell me a fun fact"] };
}

async function one(q, state, u) {
  remember(state, q);
  q = resolve(q, state);
  remember(state, q);

  if (state.pending?.riddle) return riddleAnswer(q, state);

  // secrets, passwords, codes: always the original rulebook, which refuses or guides
  if (SECRET.test(q)) { return await baseAnswer(q); }

  // yes / okay after an offer
  if (/^(yes|yeah|yep|sure|okay|ok|please|go on|more|tell me more|go ahead)\b[.!]?$/.test(q) && state.offer) {
    const o = state.offer; state.offer = null; return await one(o, state, u);
  }

  if (/\b(riddle|puzzle me|brain ?teaser)\b/.test(q)) {
    const r = RIDDLES[state.turns % RIDDLES.length]; state.pending = { riddle: r };
    return { text: "A riddle: " + r[0] + " (Say \"I give up\" for the answer.)", links: [], chips: ["I give up"] };
  }
  if (/\b(fun fact|did you know|random fact|tell me something|interesting)\b/.test(q)) return { text: "Fun fact: " + FACTS[(state.turns + 3) % FACTS.length], links: [], chips: ["Tell me another fun fact", "Tell me a story"] };
  if (/\b(story|tale|bedtime)\b/.test(q)) return { text: story(), links: [], chips: ["Tell me another story", "Tell me a riddle"] };
  if (/\b(joke|funny|make me laugh|another joke)\b/.test(q)) return { text: pickRand(SMALL.joke), links: [], chips: ["Tell me another joke", "Tell me a fun fact"] };
  if (/^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening)|sup)\b/.test(q)) {
    const n = ME(u); const l = u ? "I can see you are logged in" : "You are not logged in, which is fine";
    return { text: `Hello${n ? ", " + n : ""}! I'm a joel. ${l}. What would you like to know? I can take several questions at once.`, links: [], chips: ["Plan a trip for me", "What can you do?", "Tell me a joke"] };
  }

  for (const t of KB) if (PRIORITY.has(t.id) && t.re.test(q)) { const r = t.reply({ u, mood: state.mood, state, q }); state.last.topic = t.id; state.last.topicText = q; return r; }
  if (SPECIFIC.test(q)) { return await baseAnswer(q); }

  for (const t of KB) if (t.re.test(q)) {
    const r = t.reply({ u, mood: state.mood, state, q });
    state.last.topic = t.id; state.last.topicText = q;
    return r;
  }

  const r = await baseAnswer(q);
  if (!isFallback(r)) return r;
  const s = suggestions(q);
  if (s.length) return { text: "I did not quite get that, and I will not pretend. The closest things I know about are below. Pick one, or put it another way.", links: [], chips: s };
  return { text: r.text, links: [], chips: BASE_CHIPS.slice(0, 4) };
}

/* ---------- 6. converse ---------- */
export async function converse(raw) {
  const state = getState();
  const u = (() => { try { return currentUser(); } catch { return null; } })();
  const original = String(raw || "").trim();
  if (!original) return { text: "You did not ask anything. That is the best question we get.", links: [], chips: CHIPS.slice(0, 4), mood: state.mood };
  state.turns++;
  const t = tidy(original);
  // secrets are checked on the raw text as well, so a typo can never get around the refusal
  const secret = SECRET.test(original.toLowerCase()) || SECRET.test(t);
  const parts = secret ? [SECRET.test(original.toLowerCase()) ? original.toLowerCase() : t] : split(t);
  const results = [];
  for (const p of parts) results.push(await one(p, state, u));
  const mood = moodFrom(t, state);
  let text = results.map((r, i) => (results.length > 1 ? `${i + 1}) ` : "") + r.text).join("\n\n");
  const links = []; const seen = new Set();
  for (const r of results) for (const l of r.links || []) if (!seen.has(l[1] + l[0])) { seen.add(l[1] + l[0]); links.push(l); }
  if (results.length === 1 && !results[0].chips?.length && !state.pending) results[0].chips = ["What can you do?", "Tell me a joke"];
  const last = results[results.length - 1];
  let chips = (last.chips || []).slice(0, 4);
  if (state.turns % 4 === 3 && !state.pending && !SECRET.test(t)) text += "\n\n" + pickRand(ASIDES[mood] || ASIDES.calm);
  if (chips[0] && !state.pending) state.offer = chips[0];
  saveSession(STATE_KEY, state);
  return { text, links, chips, mood: MOODS[mood] };
}
