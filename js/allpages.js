// A hub listing every extra page, each as its own card with a link.
import { $, el } from "./dom.js";

const GROUPS = [
  ["Peanuts and money", [["peanuts.html", "Peanut Wallet", "Your peanuts, the peanut shop, and your collection."], ["creditcard.html", "Octee Credit Card", "Always approved. Every purchase declined."], ["dutyfree.html", "Duty Free", "Things you cannot take on board, for peanuts."], ["auction.html", "Lost Property Auction", "Bid on bags you cannot open."], ["insurance.html", "Octee Insurance", "Covers everything except what actually happens."], ["upgrade.html", "Upgrade Lottery", "Spin the wheel for a seat that is no better."]]],
  ["Airport and flights", [["lostfound.html", "Lost and Found", "Report or claim a lost thing. Joel may have it."], ["runway.html", "FIA Runway Status", "Live weather, runway conditions, and sorrow."], ["meal.html", "Meal Pre-order", "Choose a peanut dish for every passenger."], ["bingo.html", "Delay Bingo", "Five in a row wins a certificate."], ["baggame.html", "The Baggage Game", "Push the bags to the plane. Do not push them to Lost."], ["wifi.html", "Octee Wi-Fi", "Connect to OcteeGuest. It loads."]]],
  ["On board", [["safety.html", "Safety Demo", "Six cards and a quiz. The seatbelt has no buckle."], ["safetycard.html", "Safety Card", "A printable card for your seat pocket."], ["cockpit.html", "The Cockpit", "Dials, buttons, and one marked Do not."], ["radio.html", "Octee Radio", "Delay FM, Joel's Sorry Station and more."]]],
  ["Reading", [["news.html", "The Octee Times", "Stories, horoscope and a crossword that has an answer."], ["magazine.html", "In-Flight Magazine", "Articles, adverts and a sudoku with no solution."]]]
];
$("#app").replaceChildren(...GROUPS.flatMap(([h, items]) => [el("h2", {}, h),
  el("div", { class: "shop" }, items.map(([href, t, d]) => el("a", { class: "card shop-item", href, style: "text-decoration:none;color:inherit" }, el("h3", { style: "margin:0" }, t), el("p", { class: "note", style: "margin:4px 0 0" }, d))))]),
  el("p", { class: "note" }, "Also: Turbulence mode, the button at the bottom right of every page."));
