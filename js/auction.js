// Lost Property Auction: timed lots, a rival bidder (Joel), peanuts only. Won bags can never be opened.
import { $, el, setMsg } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { peanutsOf, spendPeanuts } from "./peanuts.js";
import { load, save } from "./store.js";

const KEY = "octee.auction";
const LOTS = [
  ["l1", "A suitcase with one wheel", "Terminal 1 · belt 7", 1], ["l2", "A blue holdall (heavy)", "Gate B3", 2],
  ["l3", "A bag shaped like another bag", "Security", 1], ["l4", "A rucksack that is warm", "Carousel 4", 3],
  ["l5", "A briefcase labelled DO NOT OPEN", "Lounge", 2], ["l6", "A guitar case (no guitar sound)", "Gate A9", 2],
  ["l7", "A tote bag, full of tote bags", "Check-in", 1], ["l8", "A trunk with a lock and no keyhole", "Cupboard", 4]
];
const RIVALS = ["Joel", "A man named Gary", "Someone in the cupboard", "Sir Peanuel Nut", "The lost peanut"];
const SECS = 40, bagNote = [
  "It shakes a little when you look at it.", "You hear something that sounds like a very small announcement.", "It is heavier now. You did not put anything in it.",
  "There is a label: 'Do not open. Sincerely, the bag.'", "It has been opened. It was already open. It is closed again."];
const st = () => load(KEY, { lots: {}, opened: {} });
const put = (s) => save(KEY, s);
const now = () => Date.now();
const fresh = (id, start) => ({ end: now() + SECS * 1000, bid: start, who: "", next: now() + 4000 + Math.random() * 3000, done: false });
const root = $("#app");

function settle(s) {                       // close every lot whose time is up (also covers time spent away)
  const u = currentUser();
  for (const [id, name] of LOTS.map((l) => [l[0], l[1]])) {
    const lot = s.lots[id];
    if (lot && !lot.done && lot.end <= now()) {
      lot.done = true;
      if (lot.who === "you" && u) {
        try { updateUser((x) => { spendPeanuts(x, lot.bid, `Won at auction: ${name}`); x.auctionBags = [...(x.auctionBags || []), { id, name, paid: lot.bid, at: now() }]; }); lot.result = `You won it for ${lot.bid} 🥜.`; }
        catch { lot.result = "You won, but could not pay. The bag went to Joel."; lot.who = "Joel"; }
      } else lot.result = `Sold to ${lot.who || "nobody"}${lot.who ? ` for ${lot.bid} 🥜` : ""}.`;
    }
  }
}
function committed(s, skip) { return LOTS.reduce((n, l) => { const x = s.lots[l[0]]; return n + (x && !x.done && x.who === "you" && l[0] !== skip ? x.bid : 0); }, 0); }
function step(s) {                         // rival bids and relisting
  LOTS.forEach(([id, , , start]) => {
    let lot = s.lots[id];
    if (!lot) lot = s.lots[id] = fresh(id, start);
    if (lot.done && !lot.shown) return;
    if (!lot.done && lot.next <= now()) { if (Math.random() < 0.55) { lot.bid += 1; lot.who = RIVALS[Math.floor(Math.random() * RIVALS.length)]; } lot.next = now() + 3500 + Math.random() * 4000; }
  });
}
function draw() {
  const s = st(), u = currentUser();
  settle(s); step(s); put(s);
  const left = u ? peanutsOf(u) - committed(s) : 0;
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const bags = (u && u.auctionBags) || [];
  root.replaceChildren(
    el("div", { class: "card wallet-top" }, u ? el("p", { class: "note", style: "margin:0" }, `You have ${peanutsOf(u)} 🥜, of which ${committed(s)} is committed to winning bids. Free to bid: ${left}.`)
      : el("p", { style: "margin:0" }, el("a", { href: "login.html" }, "Log in"), " to bid. Watching is free.")),
    msg,
    el("div", { class: "shop" }, LOTS.map(([id, name, where]) => {
      const lot = s.lots[id], secs = Math.max(0, Math.ceil((lot.end - now()) / 1000));
      return el("div", { class: "card shop-item auc-lot" },
        el("h3", { style: "margin:0" }, name), el("p", { class: "note", style: "margin:4px 0" }, `Found at: ${where}`),
        lot.done ? el("p", {}, el("strong", {}, "SOLD. "), lot.result, " ", el("button", { class: "linklike", type: "button", onclick: () => { s.lots[id] = fresh(id, LOTS.find((l) => l[0] === id)[3]); put(s); draw(); } }, "Relist it"))
          : el("div", {}, el("p", { style: "margin:4px 0" }, el("strong", {}, `${lot.bid} 🥜`), ` · ${lot.who ? "high bidder: " + (lot.who === "you" ? "YOU" : lot.who) : "no bids yet"} · `, el("span", { class: "auc-time" }, `${secs}s left`)),
            el("button", { class: "btn small", type: "button", disabled: u && lot.who !== "you" && left >= lot.bid + 1 ? null : true, onclick: () => {
              const c = st(); const l = c.lots[id]; if (l.done || l.end <= now()) return draw();
              l.bid += 1; l.who = "you"; if (l.end - now() < 3000) l.end = now() + 3000; put(c); draw(); setMsg($("#app .msg"), `You bid ${l.bid} 🥜 on ${name}.`, "ok");
            } }, lot.who === "you" ? "You are winning" : `Bid ${lot.bid + 1} 🥜`)));
    })),
    el("h2", {}, "Your bags"),
    bags.length ? el("div", { class: "shop" }, bags.map((b, k) => { const n = (s.opened[b.at] || 0);
      return el("div", { class: "card shop-item" }, el("h3", { style: "margin:0" }, b.name), el("p", { class: "note", style: "margin:4px 0 8px" }, `Paid ${b.paid} 🥜. Cannot be opened.`),
        el("button", { class: "btn small ghost", type: "button", onclick: () => { const c = st(); c.opened[b.at] = (c.opened[b.at] || 0) + 1; put(c); draw();
          setMsg($("#app .msg"), `You try to open it. ${bagNote[Math.min(c.opened[b.at], bagNote.length) - 1]} It stays closed.`, "ok"); } }, n ? `Try to open it again (${n})` : "Open it"));
    })) : el("p", { class: "note" }, "You own no bags. This is the best way to own a bag."),
    el("p", { class: "note" }, "Bags are sold as found. Contents unknown, unknowable and not ours. See ", el("a", { href: "lostfound.html" }, "Lost and Found"), ". All bids are final. Joel always bids."));
}
draw();
let tick = setInterval(() => { if (!document.hidden) { const s = st(); const wasDone = LOTS.filter((l) => s.lots[l[0]] && s.lots[l[0]].done).length; settle(s); const nowDone = LOTS.filter((l) => s.lots[l[0]] && s.lots[l[0]].done).length;
  const rivalMoved = LOTS.some((l) => s.lots[l[0]] && !s.lots[l[0]].done && s.lots[l[0]].next <= now()); step(s); put(s);
  if (wasDone !== nowDone || rivalMoved) draw(); else document.querySelectorAll(".auc-time").forEach((e, i) => { }); updateTimes(); } }, 1000);
function updateTimes() {
  const s = st(); const open = LOTS.filter((l) => s.lots[l[0]] && !s.lots[l[0]].done);
  document.querySelectorAll(".auc-time").forEach((e, i) => { const l = open[i]; if (l) e.textContent = `${Math.max(0, Math.ceil((s.lots[l[0]].end - now()) / 1000))}s left`; });
}
