// Octee Search: always returns a page that does NOT match what you typed (and says so).
import { $, el } from "./dom.js";

const PAGES = [
  ["index.html", "Home", "welcome main start front", "The front page. You were already here, in a way."],
  ["destinations.html", "Destinations", "destination places where travel city country fly to", "Places we fly to, and places we mean to."],
  ["book.html", "Book a Flight", "book buy ticket reserve flight fare price", "Book a flight, and be sorry later."],
  ["status.html", "Flight Status", "status flight delayed time arrival departure board", "The status of every flight. It is the same status."],
  ["checkin.html", "Check-in", "check in checkin seat boarding pass online", "Check in for a flight you have not taken."],
  ["baggage.html", "Baggage", "baggage bag luggage suitcase allowance weight", "Rules for bags, one of which is a wonky link."],
  ["bagtrack.html", "Bag Tracker", "bag tracker tag luggage lost wander", "Watch a bag wander around the airport."],
  ["experience.html", "In-Flight", "in flight inflight cabin seat service onboard", "What happens in the air. Mostly waiting."],
  ["fia.html", "FIA Airport", "airport fia terminal gate map", "The airport. It has a runway somewhere."],
  ["joelmobile.html", "JOELMOBILE", "joelmobile car ride taxi transport joel drive", "Joel will drive you there. Joel has questions."],
  ["cupboard.html", "Joel's Cupboard", "cupboard joel sandwich closet", "Where Joel lives when he runs out of sorry."],
  ["oneunited.html", "One United", "united partner alliance merger", "A partnership nobody has explained."],
  ["reviews.html", "Reviews", "reviews rating stars feedback customer", "Five stars. Mostly from us."],
  ["octmiles.html", "Octmiles", "miles points loyalty frequent flyer octmiles tokens", "Points that you earn and cannot use."],
  ["about.html", "About", "about us company history team who", "About us. We are sorry about us."],
  ["contact.html", "Contact", "contact phone email help support reach", "Contact us. We will contact you back. Eventually."],
  ["complaint.html", "Complaint Desk", "complain complaint desk refund compensation anger", "Complain, and get peanuts."],
  ["peanuts.html", "Peanut Wallet", "peanut wallet shop currency money", "Your peanuts and the shop that takes them."],
  ["lostfound.html", "Lost and Found", "lost found missing item claim lost property", "Report or claim lost things."],
  ["upgrade.html", "Upgrade Lottery", "upgrade lottery spin wheel seat class", "Spin for an upgrade that is not better."],
  ["news.html", "The Octee Times", "news newspaper crossword horoscope story times", "News, horoscope, crossword."],
  ["runway.html", "FIA Runway Status", "runway weather wind rain conditions status", "Runway conditions and sorrow."],
  ["meal.html", "Meal Pre-order", "meal food dish dinner hungry order peanut", "Pre-order a peanut meal."],
  ["bingo.html", "Delay Bingo", "bingo delay card game certificate", "Bingo, on your own delay."],
  ["baggame.html", "The Baggage Game", "game baggage conveyor belt push play", "A game with a T-shaped belt."],
  ["safety.html", "Safety Demo", "safety demo quiz seatbelt life jacket oxygen brace", "Six cards and a quiz. No buckle."],
  ["safetycard.html", "Safety Card", "safety card print printable seat pocket", "A printable card for your seat pocket."],
  ["radio.html", "Octee Radio", "radio music songs station listen fm announcement", "Delay FM and other stations."],
  ["dutyfree.html", "Duty Free", "duty free shop buy souvenir perfume", "Things you cannot take on board."],
  ["auction.html", "Lost Property Auction", "auction bid bags lost property winning", "Bid on bags you cannot open."],
  ["creditcard.html", "Octee Credit Card", "credit card payment apply purchase bank", "Always approved, always declined."],
  ["cockpit.html", "The Cockpit", "cockpit pilot dials buttons captain controls", "Dials, buttons and one marked Do not."],
  ["wifi.html", "Octee Wi-Fi", "wifi wi-fi internet network speed test connect", "Connects. Loads. Negative speed."],
  ["magazine.html", "In-Flight Magazine", "magazine articles sudoku puzzle adverts read", "Articles and a sudoku with no solution."],
  ["insurance.html", "Octee Insurance", "insurance insure policy claim cover protection", "Covers everything except what happens."],
  ["departures.html", "Departures Board", "departures board flip delayed flights all delayed full screen", "A flip board where every flight is delayed."],
  ["entertainment.html", "Entertainment", "entertainment games play game bored delayed fun plane clicker memory waiting", "Airport games for when you are delayed."],
  ["account.html", "Backup code", "backup code restore account incognito another device miles", "Restore your account in any browser."],
  ["entertainment.html", "Hangman: Destination Edition", "hangman guess airport fia letters game", "Guess the airport. The answer is always FIA."],
  ["whackajoel.html", "Whack-a-Joel", "whack joel hammer cupboard game sorry mole", "Hit Joel with a hammer when he pops up."],
  ["apology.html", "Our Apology", "apology sorry apologise letter", "A long, sincere apology."],
  ["login.html", "Log in / Sign up", "login log in sign up account register password", "Log in. Or sign up and be welcomed."]
];
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const words = (q) => q.toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 1);
const hits = (p, ws) => ws.filter((w) => (p[1] + " " + p[2]).toLowerCase().includes(w)).length;

const root = $("#app");
const input = el("input", { type: "search", id: "q", placeholder: "Search Octee Airlines", "aria-label": "Search Octee Airlines", maxlength: "60" });
const out = el("div", { id: "results", role: "status", "aria-live": "polite" });
const form = el("form", { class: "card", role: "search" }, el("div", { class: "actions" }, input, el("button", { class: "btn", type: "submit" }, "Search")));
root.replaceChildren(form, out, el("p", { class: "note" }, "Octee Search never shows pages that match. Matching pages are for people who know what they want."));

function search(q) {
  const ws = words(q);
  const nonMatches = PAGES.filter((p) => hits(p, ws) === 0);
  const matches = PAGES.filter((p) => hits(p, ws) > 0);
  const pool = nonMatches.length ? nonMatches : PAGES;
  const found = pool[hash(q.toLowerCase().trim() || String(Date.now())) % pool.length];
  const next = pool[(pool.indexOf(found) + 7) % pool.length];
  const hidden = matches.length;
  out.replaceChildren(
    el("p", { class: "note" }, q ? `Results for "${q}": 1 (${hidden} other ${hidden === 1 ? "page" : "pages"} matched and ${hidden === 1 ? "was" : "were"} removed for your safety)` : "Results for nothing: 1"),
    el("a", { class: "card", href: found[0], style: "display:block;text-decoration:none;color:inherit" }, el("h3", { style: "margin:0" }, found[1]), el("p", { style: "margin:4px 0" }, found[3]), el("span", { class: "note" }, `${found[0]} · 0% match. Exactly what you were not looking for.`)),
    el("p", {}, "Did you mean: ", el("a", { href: next[0] }, next[1]), "? (You did not.)"));
}
form.addEventListener("submit", (e) => { e.preventDefault(); search(input.value.trim()); history.replaceState(null, "", "?q=" + encodeURIComponent(input.value.trim())); });
const q0 = new URLSearchParams(location.search).get("q");
if (q0) { input.value = q0; search(q0); }
