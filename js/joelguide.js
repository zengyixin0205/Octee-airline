// JoelAI as a site guide: finds pages ("take me to the auction"), knows which page you opened it from, lists what is
// on the site, says where Joel is right now, and has a "tell me more" for the long topics. Rulebook only.
import { PAGES } from "./siteindex.js";
import { pickRand } from "./joelkb.js";

const R = (text, chips = [], links = []) => ({ text, links, chips });
const STOP = new Set("the a an to of me my page pages please take open go show where is find link for site on in at i want".split(" "));
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w && !STOP.has(w));

export function findPage(text) {
  const tk = words(text); if (!tk.length) return null;
  let top = null;
  for (const p of PAGES) {
    const title = words(p[1]), keys = new Set(words(p[2] + " " + p[1]));
    let s = 0;
    for (const w of tk) { if (title.includes(w)) s += 3; else if (keys.has(w)) s += 1; else if (w.length > 4 && [...keys].some((k) => k.startsWith(w.slice(0, 4)))) s += 0.5; }
    if (s >= 3 && (!top || s > top.s)) top = { p, s };
  }
  return top ? top.p : null;
}
export const pageInfo = (file) => PAGES.find((p) => p[0] === file) || null;

const WHERE = [
  [0, 5, "asleep in the cupboard, with the sandwich. He is not asleep. He is lying still and sorry."],
  [6, 8, "at Gate B3, saying sorry to a plane that has not arrived."], [9, 11, "on the bucket in the cupboard, reading his to-do list. It has one line: sorry."],
  [12, 13, "in the JOELMOBILE, lost, but confident about it."], [14, 16, "at the Departures Board, trying to make one flight on time. It flips back."],
  [17, 19, "in the baggage hall, looking for a bag with his name on. It is a bag with no name."], [20, 23, "at Terminal 5, across the runway. Do not follow. He is fine."]
];
export const joelNow = () => { const h = new Date().getHours(); return (WHERE.find(([a, b]) => h >= a && h <= b) || WHERE[0])[2]; };
export const timeGreeting = () => { const h = new Date().getHours(); return h < 5 ? "Hello (it is very late; the board is still on)" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

const MORE = {
  delayed: "More on delays: every flight is exactly 1 millisecond late before it gets later. The stages are shown on the tracker in order (a bit, a lot, the plane has been informed). Each stage fills a square on Delay Bingo, and the apology letter gets longer as the delay does. The whole thing is written so that you always have something to press.",
  peanuts: "More on peanuts: the first ones come from the welcome bonus and the apology letters, and the cheapest way to earn is Whack-a-Joel and Hangman (1 a day each, just by playing well). Spend them on a JOELMOBILE (3) rather than tokens (5), and keep a few for the auction, where Gary always bids last.",
  miles: "More on Octmiles: they only come from flights (and codes, which I know nothing about). Tiers are by lifetime miles, so spending miles never lowers your tier. Turning miles into Octeetokens is one way only: the rate is 10 to 1, and tokens do not turn back.",
  lostbag: "More on lost bags: the tracker's stages are fixed, so your bag always goes through the sorting room, a gate that is not yours, and a flight to MIA. The bag is not really lost, it is on a longer trip than you. At the auction, rival bidders are Joel and Gary.",
  complaint: "More on complaints: you pick how upset you are and the reply is as long as that. The peanuts paid depend on the upset (up to 6). The letters are signed by the Customer Care Peanut, who is a peanut.",
  seat: "More on seats: a better class costs tokens (more for the front). The seat map is shown at check-in, and a seat you pick is held for you. The Upgrade Lottery has ten tokens a spin and about one win in a few spins; the win is a different seat, not always a better one.",
  food: "More on food: all dishes are a peanut in a different mood (roasted, salted, thoughtful, and so on). The pre-order receipt is printable. The only way to get anything else on board is to bring it, which Duty Free forbids.",
  safety: "More on safety: the quiz picks five questions, four right passes, and a pass pays 1 peanut a day. The printable card prints on A4 landscape and folds along the dotted line, so it fits in a seat pocket (or a shoe).",
  account: "More on accounts: everything lives in the browser that made it. The backup code on the Account page packs the whole account into text and restores it anywhere. Etched accounts (in accounts.json) work everywhere but only update when the airline publishes them again.",
  dutyfree: "More on Duty Free: every item has a use button with a deadpan reply (the cloud in a jar rains, the fire extinguisher is not needed yet). You can pay in tokens at three times the peanut price, which is always a bad idea and always allowed.",
  auction: "More on the auction: your bid must be higher than the leader's, and you can only use peanuts you are not already leading with. The last 3 seconds are extended by a rival bid, so the last second is a long one.",
  who: "More on Joel: he started as the JOELMOBILE manager, and the rest happened around him. He says sorry every 10 seconds, he lives in the cupboard when he runs out, and the only person who has seen him calm is Sir Peanuel Nut, who is not seen.",
  hangman: "More on Hangman: the answer is FIA in every round, and only the clue changes. The A to Z keys turn green for F, I and A and red for the rest. A win pays a peanut a day. Most losses come from people who do not believe the answer.",
  capabilities: "More on what I can do: ask for \"take me to the auction\" and I will find the page, say \"list the games\" for a menu, ask \"where is Joel\" for where he is right now, or say \"surprise me\" and I will choose.",
  meta: "More on how I work: your words are tidied, split into questions, matched against what we wrote down, and answered with what we know about you (only if you are logged in). There is no model and no learning. Most of what I seem to know is something a person wrote first; for questions outside FIA I may ask Wikipedia and I tell you when I do."
};
const MORE_GENERIC = "That is the whole story, and the rest is in the links. I am a rulebook, so I stop where the rules stop. Ask me something next to it, though, and I might have the rule.";

export function guideFun(q, state, u) {
  // more / explain
  if (/^(tell me more|more|more info|more details|explain( that| more)?|elaborate|why( is that)?|go on|what else|and then)\??$/.test(q) && state.last.topic) {
    const again = state.moreFor === state.last.topic; state.moreFor = state.last.topic;
    return R(again ? MORE_GENERIC : (MORE[state.last.topic] || MORE_GENERIC), ["Tell me a joke", "What can you do?"]);
  }
  if (/^(tell me more|more|explain|elaborate)\??$/.test(q)) return R("More of what? Ask me something first, and then I will have more of it.", ["What can you do?", "Plan a trip for me"]);
  // find a page
  const nav = q.match(/^(?:please )?(?:take me to|open|go to|show me|link (?:me )?to|navigate to|bring me to|where is the|where can i find the|where do i find the)\s*(?:the )?(.+?)(?: page)?\??$/);
  if (nav && !/\b(gate|terminal|security|train|toilet|lounge|flight|check in)\b/.test(nav[1])) {
    const p = findPage(nav[1]);
    if (p) return R(`That is the ${p[1]} page. ${p[3]} I cannot press it for you, so the button is below. (A peanut would help me to.)`, ["What else is there?", "List the games"], [[p[1], p[0]]]);
    return R("I looked for that page and found nothing, which is the usual result. Try the search bar at the top, or say \"list the pages\".", ["List the pages", "List the games"]);
  }
  // this page
  if (/what('?s| is) (this|the current) page|what can i do (here|on this page)|help (me )?with this page|where am i/.test(q)) {
    const p = pageInfo(state.page || "");
    if (p) return R(`You are on ${p[1]}. ${p[3]}`, ["Tell me more", "What can you do?"], [[p[1], p[0]]]);
    return R("You are on a page of Octee Airlines. I am not sure which. It is likely the one with a chat box.", ["List the pages"]);
  }
  // lists
  if (/\b(list|show|name) (all |the |every )?(games?|things to play)\b|what games/.test(q) && !/hangman|joel$/.test(q))
    return R("Games on the Entertainment page: Paper Plane, Delay Clicker, Suitcase Match, The Waiting Game, Security Line, Delay Trivia, Find the Bag, Boarding Call, Runway Landing, Whack-a-Joel, Hangman: Destination Edition and Lost Joel. Elsewhere: Delay Bingo, The Baggage Game, the Safety Quiz and the crosswords.", ["How do I play Hangman?", "How do I play Whack-a-Joel?"], [["Entertainment", "entertainment.html"]]);
  if (/\b(list|show|name) (all |the |every )?pages?\b|what pages (are there|do you have)|how many pages|site ?map|everything on (the|this) site/.test(q))
    return R(`There are ${PAGES.length} pages. The big groups are: flying (Book a Flight, Check-in, Status, Bag Tracker, Baggage, Destinations), money (Octmiles, Duty Free, Auction, Credit Card, Insurance, Peanut Wallet), the airport (Departures, Lost and Found, Runway, Meal pre-order, Wi-Fi), on board (Safety Demo, Cockpit, Radio, Safety Card) and play (Entertainment, Whack-a-Joel, Delay Bingo). Say "take me to" and a name and I will find it.`, ["Take me to the auction", "List the games"], [["Search", "search.html"]]);
  // joel now
  if (/where('?s| is) joel( right now| now| today)?\??$|what('?s| is) joel doing|how('?s| is) joel( doing)?\??$|is joel (ok|okay|here|alright)/.test(q))
    return R(`Right now, Joel is ${joelNow()} He says sorry. He said it just now. It was about this.`, ["Tell me a story", "Who is Joel?"], [["Joel's cupboard", "cupboard.html"]]);
  // surprise
  if (/^(surprise me|choose for me|pick for me|i don'?t know what to do)\??$/.test(q)) {
    const p = pickRand(PAGES.filter((x) => !["index.html", "login.html", "404.html"].includes(x[0])));
    return R(`I choose: ${p[1]}. ${p[3]}`, ["Surprise me again", "Tell me a joke"], [[p[1], p[0]]]);
  }
  return null;
}
