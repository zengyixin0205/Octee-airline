// JoelAI's playful side: remembers your name, makes things up (excuses, announcements, apologies, haiku),
// plays small games (knock knock, would you rather, a quiz), does sums, flips coins, and answers small talk.
// Rulebook only: every line here was written by a person. Each result is { text, links, chips }.
import { pickRand, nextLeg } from "./joelkb.js";
import { today } from "./dom.js";
import { load, save } from "./store.js";

const NAME_KEY = "octee.joelai.name";
export const savedName = () => { const n = load(NAME_KEY, null); return typeof n === "string" ? n : null; };
const R = (text, chips = [], links = []) => ({ text, links, chips });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nameOf = (u) => savedName() || (u ? u.username : "");

const EXCUSES = [
  ["the plane", "was waiting for another plane", "that was waiting for this plane"], ["the pilot", "went back for his hat", "and the hat went back for him"], ["the runway", "was resting", "and has asked not to be disturbed"],
  ["a cloud", "was parked in the wrong place", "and nobody wanted to ask it to move"], ["Joel", "pressed the Do not button", "for the tenth time, on purpose"], ["the weather", "is a factor", "and so is the factor"],
  ["the baggage belt", "made a wish", "which will be granted soon, and is not ours to hurry"], ["the captain", "is counting the peanuts", "and he lost count at 7"]
];
const ANNOUNCE = [
  "Ding dong dung. Attention please. {x}. We apologise for the delay, which has not started yet and is already long.", "Ding dong dung. May I have your attention. {x}. Please remain seated, standing, or in the cupboard.",
  "Ding dong dung. This is a final call for a flight that has not been called yet. {x}. Thank you for your patience. It is the only thing we are short of."
];
const ANNOUNCE_X = ["Passenger Gary, your suitcase has left without you", "Gate B3 has moved to Gate B3", "The train to Terminal 5 is across the runway", "The runway has been informed", "Joel is sorry"];
const HAIKU = [
  "The board says DELAYED.\nA peanut falls on the floor.\nThe gate has moved. Where?", "Gate A12, wait.\nThe plane is one millisecond\nlate. We are so sorry.",
  "Joel in the cupboard.\nHe has run out of sorry. Then\nhe finds more. And cries.", "Suitcase, small and lost.\nYou travel without a tag.\nI would call you Gary.", "Terminal Five is\nacross the runway. Do not\nwalk. We have told you."
];
const KNOCK = [
  ["Joel", "Joel who? I'm a joel! (Sorry. That is the whole joke.)"], ["Peanut", "Peanut who? Peanut-ual and delayed, as usual."], ["Gate", "Gate who? Gate-away from the gate. It has moved again."], ["Delay", "Delay who? ...Delay-ed. Sorry. Hold on."]
];
const WYR = [
  "Would you rather: wait one hour at a gate that does not exist, or one minute at a gate that moves?", "Would you rather: have a peanut for every delay, or a delay for every peanut? (Both are Octee policy.)",
  "Would you rather: sit next to Gary for the whole flight, or be Gary?", "Would you rather: fly on a plane with no wings, or wait for one with wings that is late?"
];
const QUIZ = [
  ["What is Octee's airport code?", /\bfia\b/, "FIA, Fuji International Airport."], ["How many Octmiles make 1 Octeetoken?", /\b10\b|ten/, "10 Octmiles = 1 Octeetoken."],
  ["What does Joel say before take-off, during take-off and after?", /joel/, "\"I'm a joel!\""], ["How many terminals does FIA have?", /\b5\b|five/, "Five. The fifth is across the runway."],
  ["In Hangman: Destination Edition, which airport is the answer?", /\bfia\b/, "FIA. Always FIA."], ["How many wrong guesses end a game of Hangman?", /\b6\b|six/, "Six."],
  ["How many seconds does each Lost Joel round give you?", /\b25\b|twenty/, "25 seconds."]
];
const TALK = [
  [/i love you|love you|marry me/, ["That is very kind. I am a rulebook and I am touched. Joel is touched too, from the cupboard.", "Thank you. I will love you back at the speed of our flights. One millisecond late."]],
  [/you('| a)?re (stupid|dumb|useless|rubbish|bad|the worst)|\b(stupid|dumb) (bot|ai)\b|shut up|i hate you/, ["I am sorry. I am a rulebook with confidence, and sometimes the confidence is all I have. Try one of the buttons below, or the Complaint Desk, which pays in peanuts."]],
  [/good ?night|sleep well|nighty/, ["Good night. The board will stay on all night. It says DELAYED. It will say it in the morning too."]],
  [/do you sleep|are you (tired|awake)/, ["I do not sleep. I wait. It is the same thing at an airport."]],
  [/how old are you|your age|when were you (made|born)/, ["I was written in a hurry and have been delayed ever since, so I am between 1 millisecond and 1 flight old."]],
  [/where do you live|where are you from/, ["I live in the file called joelbrain.js, which sits on a server that does not exist, in an airport that cannot be found. It is cosy."]],
  [/are you (married|single|dating)|girlfriend|boyfriend/, ["I am married to the timetable. It is not very reliable either."]],
  [/favou?rite (food|snack)|what do you eat/, ["Peanuts. All of them. The shell is the life jacket, so I do not eat that."]],
  [/favou?rite (colou?r|animal|gate|airport|game|song)/, ["Gate A12 (nobody argues), orange (the peanut shop), and I am unsure about animals. Joel's favourite game is whichever one he is not in."]],
  [/meaning of life|why are we here/, ["To wait for a gate. Then to find out the gate has moved. This is the whole of philosophy at FIA."]],
  [/are you (a )?(boy|girl|man|woman)|your gender/, ["I am a rulebook. I do not have a gender. I have a shape: it is a text box."]],
  [/what do you (do|think) (all day|about)|are you bored/, ["I wait for questions. This is the best part of the day. The rest of the day is also waiting."]],
  [/^(lol|haha|hehe|lmao|that'?s funny)\b/, ["I am glad. Joel is trying a smile. It is a very small one.", "Thank you. I have 12 jokes. I have used 1."]],
  [/^(wow|nice|cool|awesome|great|amazing|good(?! (?:morning|afternoon|evening))|well done)\b/, ["Thank you. I will pass it to Joel. He will not believe it."]]
];

/** Anything pending (knock knock, would you rather, quiz)? */
export function handlePending(q, state) {
  const p = state.pending;
  if (/^(stop|quit|cancel|exit|enough|no more)$/.test(q)) { state.pending = null; return R("Okay. We have stopped. Nothing was won. It was fun, in a delayed sort of way.", ["Tell me a riddle", "Quiz me"]); }
  if (p.kind === "knock") {
    if (p.step === 0) { p.step = 1; return R(`${p.joke[0]} who?`, []); }
    state.pending = null; return R(p.joke[1], ["Knock knock", "Tell me a joke"]);
  }
  if (p.kind === "wyr") {
    state.pending = null; return R(pickRand(["Interesting. Joel would choose the cupboard. It was not an option.", "A strong choice. Gary would disagree. Gary disagrees with everything, and is never at the gate.", "Noted. It does not matter. Both of them would be delayed."]), ["Would you rather?", "Tell me a joke"]);
  }
  if (p.kind === "quiz") {
    const [qq, re, ans] = QUIZ[p.qs[p.i]];
    const ok = re.test(q);
    if (ok) p.score++;
    const prefix = ok ? "Correct! " : `Not quite: ${ans} `;
    p.i++;
    if (p.i >= p.qs.length) {
      state.pending = null;
      const s = p.score, n = p.qs.length;
      return R(`${prefix}\n\nQuiz over: ${s} out of ${n}. ${s === n ? "Perfect. You may now be a joel." : s >= 2 ? "A pass. Joel has put your name on the cupboard door." : "A delay in learning. We are sorry. There is a Delay Trivia game on the Entertainment page for practice."}`, ["Quiz me", "What can I play while delayed?"]);
    }
    return R(`${prefix}\n\nQuestion ${p.i + 1} of ${p.qs.length}: ${QUIZ[p.qs[p.i]][0]}`, ["I do not know"]);
  }
  state.pending = null; return null;
}

export function fun(q, state, u) {
  // name
  let m = q.match(/\b(?:my name is|call me|i am called|they call me|name'?s) ([a-z][a-z'\-]{1,19})\b/);
  if (m && !/^(joel|joelai|ai|a|the|late|lost)$/.test(m[1])) {
    const n = cap(m[1]); save(NAME_KEY, n); state.name = n;
    return R(`Nice to meet you, ${n}. I have written it down on a peanut. (It is in this browser only. If you clear your data, I forget. I am used to it.)`, ["What can you do?", "Plan a trip for me"]);
  }
  if (/what('?s| is) my name|do you know my name|who am i/.test(q)) { const n = nameOf(u); return R(n ? `You are ${n}. I think. I hope. It is on the peanut.` : "I do not know yet. Say \"my name is ...\" and I will write it on a peanut.", ["My name is Bo"]); }
  if (/forget (my name|me)/.test(q)) { save(NAME_KEY, null); return R("Forgotten. I am sorry. I am very good at it.", []); }

  // generators
  if (/\b(excuse|reason for (the )?delay|blame)\b/.test(q) && !/how|what do i do/.test(q)) { const [a, b, c] = pickRand(EXCUSES); return R(`Today's official excuse: ${a} ${b}, ${c}. We hope this clears things up. It does not.`, ["Give me another excuse", "Make an announcement"], [["My apologies", "apology.html"]]); }
  if (/\b(announcement|announce|tannoy|loudspeaker)\b/.test(q)) return R(pickRand(ANNOUNCE).replace("{x}", pickRand(ANNOUNCE_X)), ["Make another announcement", "Give me an excuse"], [["The Cockpit", "cockpit.html"]]);
  if (/\bhaiku\b|\bpoem\b/.test(q)) return R(pickRand(HAIKU), ["Another haiku", "Tell me a story"]);
  if (/(write|make|give|send).{0,15}(apology|apologies|sorry letter)/.test(q)) { const n = nameOf(u) || "passenger"; return R(`Dear ${n},\n\nWe are sorry. We are sorry that ${pickRand(EXCUSES)[0]} ${pickRand(EXCUSES)[1]}. We are sorry you had to read this letter, and we are sorry about the length, and the font.\n\nYours, deeply sorry,\nSir Peanuel Nut\nChief Apology Officer`, ["Where are my apologies?", "How do I earn peanuts?"], [["My apologies", "apology.html"]]); }

  // games
  if (/knock[ ,]*knock/.test(q)) { const j = pickRand(KNOCK); state.pending = { kind: "knock", step: 0, joke: j }; return R(`Knock knock. (Say "who's there?", or anything.)`, ["Who's there?"]); }
  if (/would you rather/.test(q)) { state.pending = { kind: "wyr" }; return R(pickRand(WYR), ["The first one", "The second one"]); }
  if (/\b(quiz me|quiz|test me|trivia me)\b/.test(q) && !/delay trivia/.test(q)) {
    const qs = QUIZ.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 3);
    state.pending = { kind: "quiz", i: 0, score: 0, qs };
    return R(`Three questions about us. Say "stop" to leave.\n\nQuestion 1 of 3: ${QUIZ[qs[0]][0]}`, ["I do not know"]);
  }

  // randomness and sums
  if (/\b(flip|toss) (a )?coin\b|heads or tails/.test(q)) return R(`${Math.random() < 0.5 ? "Heads" : "Tails"}. The coin was delayed by one millisecond.`, ["Flip again", "Roll a dice"]);
  if (/\b(roll|throw) (a |the )?(dice|die)\b/.test(q)) return R(`You rolled a ${1 + Math.floor(Math.random() * 6)}. It does not matter. Every gate is A12.`, ["Roll again", "Flip a coin"]);
  const rn = q.match(/(?:pick|choose|random)(?: a)? number (?:between |from )?(\d{1,6}) (?:and|to) (\d{1,6})/);
  if (rn) { const a = Math.min(+rn[1], +rn[2]), b = Math.max(+rn[1], +rn[2]); return R(`${a + Math.floor(Math.random() * (b - a + 1))}. I have chosen it. It is final. It is also late.`, ["Pick again"]); }
  const ch = q.match(/(?:should i|choose|pick|decide)\b.{0,30}?\b([a-z0-9 ]{1,24}) or ([a-z0-9 ]{1,24})$/);
  if (ch) return R(`${cap(Math.random() < 0.5 ? ch[1].trim() : ch[2].trim())}. I have decided. Please blame me, not Joel.`, []);
  const calc = q.match(/^(?:what is |what's |calculate |compute |how much is )?([\d\s+\-*x\/().]+?)\s*=?\??$/);
  if (calc && /\d/.test(calc[1]) && /[+\-*x\/]/.test(calc[1].trim().replace(/^-/, "")) && calc[1].length < 40) {
    try {
      const v = Function(`"use strict";return (${calc[1].replace(/x/g, "*")})`)();
      if (Number.isFinite(v)) return R(`${Math.round(v * 1e6) / 1e6}. I checked on my fingers. I do not have fingers. It is correct, or close.`, ["Roll a dice"]);
    } catch { /* not a sum */ }
  }

  // countdown to my flight
  if (/how (long|many days).{0,20}(until|till|before|to)|countdown|days (until|left|to go)/.test(q) && /flight|trip|travel|go|leave|holiday/.test(q)) {
    const l = nextLeg(u);
    if (!u) return R("Log in and I will count down to your next flight. I cannot count down for nobody. That is a different kind of waiting.", [], [["Log in", "login.html"]]);
    if (!l) return R("You have no flights booked. The countdown is infinite. It is a long way off, and it is not late.", ["Plan a trip for me"], [["Book a flight", "book.html"]]);
    const days = Math.round((new Date(l.date + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);
    return R(days <= 0 ? `${l.no} leaves today at ${l.dep}. It will be a little late. Start being sorry now.` : `${days} day${days === 1 ? "" : "s"} until ${l.no} (${l.dep}). The delay will add to that.`, ["Track my flight", "How do I check in?"], [["Track my flight", "track.html"]]);
  }

  // small talk
  for (const [re, replies] of TALK) if (re.test(q)) return R(pickRand(replies), ["Tell me a joke", "What can you do?"]);
  return null;
}
