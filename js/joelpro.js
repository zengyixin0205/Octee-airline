// JoelAI Pro, handbook edition. Same rulebook as plain JoelAI, but the answer is longer: it adds the
// "more on this" paragraph for the topic, a random page of the site to explore, and questions to ask next.
// No server, no model: it works on GitHub Pages. Secrets are still refused, with nothing added.
import { converse, getState, SECRET } from "./joelbrain.js";
import { MORE } from "./joelguide.js";
import { PAGES } from "./siteindex.js";
import { pickRand } from "./joelkb.js";

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

export async function proConverse(text) {
  const res = await converse(text);
  if (SECRET.test(String(text).toLowerCase()) || res.error) return res;
  const topic = getState().last?.topic;
  const extra = [];
  if (topic && MORE[topic] && !res.text.includes(MORE[topic].slice(0, 40))) extra.push(MORE[topic]);
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
