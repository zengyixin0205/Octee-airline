// The pages of the JoelTEH area. joel-shell.js builds the frame and calls PAGES_BY_KEY[page](redraw), which returns the page body.
import { el } from "./dom.js";
import { today, niceDate } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { fmtJoelmiles, joelmilesOf } from "./joelmiles.js";
import { jtFree } from "./perks.js";
import { JT_FLIGHTS, JT_OWN_PRICE, nameOf, timesText } from "./jt-data.js";
import { airlinesPage, bankPage, hotelsPage } from "./joel-trade.js";
import { push } from "./cloud.js";

const hero = (eyebrow, title, lead) => el("section", { class: "jl-hero" }, el("p", { class: "eyebrow" }, eyebrow), el("h1", {}, title), el("p", { class: "lead" }, lead));
const card = (title, ...kids) => el("div", { class: "jl-card" }, title ? el("h2", {}, title) : "", ...kids);
const msgBox = () => el("p", { class: "jl-msg", "aria-live": "polite" });
const say = (box, text, kind = "info") => { box.textContent = text; box.className = "jl-msg " + kind; };
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); };
const field = (label, input, id) => el("div", {}, el("label", { for: id }, label), input);

// ---------------- JoelTEH home ----------------
function homePage() {
  const u = currentUser();
  const tiles = [
    ["joel-jtp.html", "JTP · Joel Teh Police", "Wanted notices, press releases, and a form to report Joel."],
    ["joel-jtia.html", "JTIA · the airport", "Joel Teh International Airport. Home base of JT."],
    ["joel-cupboard.html", "Joel's Cupboard, expanded", "Shelves, notes and a sandwich of unknown age."],
    ["joel-airlines.html", "JoelTEH Airlines (JT)", "Fly to Fuji and Mt Fuji in Joelmiles."],
    ["joel-bank.html", "Joelmiles Bank", "Swap every Octee currency into Joelmiles and back."],
    ["joel-jtbc.html", "JTBC", "Joel Teh Broadcasting. Always on, whatever it is."],
    ["joel-museum.html", "Museum of Joel", "Eight exhibits. Please do not touch the apology."],
    ["joel-baggage.html", "JT Baggage", "Allowances and a belt finder."],
    ["joel-hotels.html", "JTIA Hotels", "Sleep near the gate."],
    ["joel-lostfound.html", "JT Lost Property", "Lost something? Joel has probably sat on it."]
  ];
  return el("div", {}, hero("Welcome to JoelTEH · you are still on the Octee site", "JoelTEH", "A site inside the site: its own police, its own airport, its own airline and its own money. The button at the top goes back to Octee home. Or not."),
    el("div", { class: "jl-grid" }, tiles.map(([href, b, s]) => el("a", { class: "jl-tile", href }, el("b", {}, b), el("span", {}, s)))),
    card("Your Joelmiles", el("p", {}, el("span", { class: "jl-price" }, fmtJoelmiles(joelmilesOf(u)))), jtFree(u) ? el("p", { class: "jl-note" }, "Your account flies JT free (Control Tower perk).") : el("p", { class: "jl-note" }, "Fly JT with Joelmiles. Swap your Octmiles, Scraggymiles, Octeetokens, Fujitech or JoelTokens at the bank."),
      el("p", {}, el("a", { class: "jl-btn", href: "joel-bank.html", style: "text-decoration:none;display:inline-block" }, "Open the bank"))));
}

// ---------------- JTP: Joel Teh Police (serious) ----------------
const OFFENCES = ["Being a Joel in a public place", "Being a Joel in a private cupboard", "Loitering near a sandwich", "Impersonating a Joel", "Failure to apologise within the permitted period", "Obstruction of the Normal Thursday", "Other conduct unbecoming of a Joel"];
const STATUSES = ["Received", "Under review", "Joel located", "Joel interviewed", "Joel has apologised", "Closed: still Joel"];
const caseStatus = (c) => STATUSES[Math.min(STATUSES.length - 1, (hash(c.no) % 3) + Math.floor((Date.now() - Date.parse(c.at)) / 86400000))];
function jtpPage(redraw) {
  const u = currentUser();
  const msg = msgBox();
  const offence = el("select", { id: "jtp-off" }, OFFENCES.map((o) => el("option", { value: o }, o)));
  const place = el("input", { id: "jtp-place", maxlength: 60, placeholder: "Where was Joel last seen?" });
  const detail = el("textarea", { id: "jtp-detail", rows: 3, maxlength: 400, placeholder: "State what happened. Facts only." });
  const submit = () => {
    const d = detail.value.trim(), p = place.value.trim();
    if (d.length < 10) { say(msg, "A statement needs at least 10 characters. JTP does not accept silence.", "err"); return; }
    const no = "JTP-" + new Date().getFullYear() + "-" + String(Math.floor(10000 + Math.random() * 90000));
    updateUser((a) => { a.jtCases = [{ no, at: new Date().toISOString(), offence: offence.value, place: p || "unknown", detail: d }, ...(a.jtCases || [])].slice(0, 25); });
    push().catch(() => {});
    say(msg, `Report filed. Your case number is ${no}. Keep it. An officer will not contact you.`, "ok");
    redraw();
  };
  const lookup = el("input", { id: "jtp-look", placeholder: "JTP-2026-12345" });
  const result = el("p", { class: "jl-note" });
  const check = () => {
    const no = lookup.value.trim().toUpperCase();
    const c = (u.jtCases || []).find((x) => x.no === no);
    result.textContent = c ? `${c.no}: ${caseStatus(c)}. Offence: ${c.offence}.` : /^JTP-\d{4}-\d{5}$/.test(no) ? `${no}: no such case on this account. Case files are private to the person who filed them.` : "That is not a JTP case number. They look like JTP-2026-12345.";
  };
  const mine = u.jtCases || [];
  const releases = [
    ["Press release 14: Joel remains at large", "JTP confirms that Joel has been seen being a Joel on three separate occasions this week. Members of the public are asked not to approach, and not to give him a sandwich."],
    ["Press release 13: statement on the cupboard", "Officers attended a cupboard at the report of a noise. The noise was Joel. No arrests were made. A form was left."],
    ["Press release 12: apology review", "JTP has reviewed Joel's most recent apology and found it to be an apology. This does not affect the investigation."],
    ["Press release 11: JTIA security notice", "Passengers at Joel Teh International Airport must remove belts, shoes and any excuses before the scanner."]
  ];
  return el("div", { class: "jtp" }, hero("JTP · Joel Teh Police · serious business", "Joel Teh Police", "JTP investigates conduct unbecoming of a Joel. Every report is taken seriously. Every report is about Joel."),
    card("Wanted", el("div", { class: "jl-wanted" }, el("h3", {}, "WANTED"), el("div", { class: "face", "aria-hidden": "true" }, "J"), el("p", {}, el("b", {}, "JOEL")), el("p", {}, "Wanted for: being a Joel."), el("p", {}, "Last seen: a cupboard."), el("p", {}, "Reward: one apology."), el("p", { class: "jl-note", style: "color:#4a2c12" }, "Considered harmless. Do not lend him anything."))),
    card("Press releases", releases.map(([h, t]) => el("details", {}, el("summary", {}, h), el("p", {}, t)))),
    card("Report Joel", el("div", { class: "jl-row" }, field("Offence", offence, "jtp-off"), field("Last seen", place, "jtp-place")), field("Statement", detail, "jtp-detail"),
      el("p", {}, el("button", { class: "jl-btn", type: "button", onclick: submit }, "File report")), msg),
    card("Check a case", el("div", { class: "jl-row" }, field("Case number", lookup, "jtp-look"), el("button", { class: "jl-btn ghost", type: "button", onclick: check }, "Check")), result,
      mine.length ? el("div", {}, el("h3", {}, "Your cases"), mine.map((c) => el("p", {}, `${c.no} · ${niceDate(c.at.slice(0, 10))} · ${c.offence} · ${caseStatus(c)}`))) : el("p", { class: "jl-note" }, "You have not filed any cases.")));
}

// ---------------- JTIA ----------------
function jtiaPage() {
  const day = ((new Date().getDay() + 6) % 7) + 1;
  const board = JT_FLIGHTS.filter((f) => f.days.includes(day) && (f.from === "JTIA" || f.to === "JTIA")).sort((a, b) => a.dep.localeCompare(b.dep));
  const now = new Date(); const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  return el("div", {}, hero("JTIA · Joel Teh International Airport", "JTIA", "Home base of JoelTEH Airlines. One terminal, two runways, and a cupboard that was there first."),
    card("Departures and arrivals today", el("div", { class: "jl-tablewrap" }, el("table", { class: "jl-table" },
      el("thead", {}, el("tr", {}, ["Flight", "From", "To", "Departs", "Arrives", "Status"].map((h) => el("th", {}, h)))),
      el("tbody", {}, board.map((f) => el("tr", {}, el("td", {}, f.no), el("td", {}, f.from), el("td", {}, f.to), el("td", {}, f.dep), el("td", {}, f.arr), el("td", {}, f.dep < hhmm ? "Departed, probably" : "On time, officially")))))),
      el("p", { class: "jl-note" }, "Times are Singapore time like the rest of Octee. Book a seat at ", el("a", { href: "joel-airlines.html" }, "JoelTEH Airlines"), ".")),
    card("Terminal and gates", el("p", {}, "One terminal, Terminal J. Gates J1 to J12. J1 to J4 are for JT's own planes, J5 to J8 for Octee, One United and Scraggy flights carrying a JT number, and J9 to J12 are closed for a reason nobody remembers."),
      el("p", { class: "jl-note" }, "FIA and MFIA connect to JTIA by JT. For FIA ↔ MFIA only Octee flies.")),
    card("Facilities", el("ul", {}, ["JTP station at the entrance (turn left at the sorry)", "Joel's Cupboard Lounge, open to anyone who knocks", "The Museum of Joel, one floor up", "Hotels: Hotel Cupboard, Transit Inn, The Joel Grand, Sorry Suites", "Baggage hall with seven belts. Three move", "Lost Property, behind the other Lost Property"].map((t) => el("li", {}, t)))),
    card("Getting here", el("p", {}, `${nameOf("JTIA")} has no road. You fly in. If you are already in Fuji, JT 001 and JT 003 leave JTIA at 06:30 and 15:00; JT 002 and JT 004 bring you back.`)));
}

// ---------------- Cupboard, expanded ----------------
const SHELVES = [
  ["Top shelf", [["The sandwich", "Still here. Nobody has proved it is a sandwich."], ["A spare apology", "Folded, in case the first one wears out."], ["Torch (no batteries)", "Very good at being a torch in daylight."], ["Joel's list", "1. Hide. 2. Sorry. 3. Hide again."]]],
  ["Middle shelf", [["Forty-one umbrellas", "None of them his. All of them lost property. See JT Lost Property."], ["Boarding passes", "A shoebox of boarding passes for flights he missed on purpose."], ["Tiny chair", "For the tiny meeting."], ["The Normal Thursday folder", "Contains Thursday. It looks normal."]]],
  ["Floor", [["A rug", "It moves when nobody is looking. JTP is aware."], ["Trophy: Best Sorry 2025", "Awarded by Joel to Joel."], ["Locked box", "Marked: not the code. Sorry."], ["The other door", "Leads to the cupboard on the main site. Here, not there."]]]
];
function cupboardPage() {
  const out = el("p", { class: "jl-note", "aria-live": "polite" }, "Click an item to look at it.");
  const all = SHELVES.flatMap(([, items]) => items);
  return el("div", {}, hero("Joel's Cupboard · expanded edition", "Joel's Cupboard", "The cupboard on the main site has a door. This one has shelves."),
    card("", SHELVES.map(([name, items]) => el("div", {}, el("h3", {}, name), el("div", { class: "jl-shelf" }, items.map(([t, d]) => el("button", { class: "jl-item", type: "button", onclick: () => { out.textContent = `${t}: ${d}`; } }, el("b", {}, t), "Look")))))),
    card("What you found", out, el("button", { class: "jl-btn ghost", type: "button", onclick: () => { const [t, d] = all[Math.floor(Math.random() * all.length)]; out.textContent = `You rummaged and found: ${t}. ${d}`; } }, "Rummage")),
    el("p", { class: "jl-note" }, "The original is still on the Octee site: ", el("a", { href: "cupboard.html" }, "Joel's other cupboard here, not there"), "."));
}

// ---------------- JTBC ----------------
const PROGRAMMES = ["Sorry O'Clock", "The Joel Hour", "Cupboard Sounds", "JTP Live", "Lost Property Antiques", "Gate Gossip", "The Quiet Hour (not quiet)", "Normal Thursday Weekly", "News with Joel", "Baggage Belt Bingo", "Apologies of the Day", "Late-Night Cupboard"];
function jtbcPage() {
  const h = new Date().getHours();
  const prog = (hr) => PROGRAMMES[(hr * 5 + 3) % PROGRAMMES.length];
  return el("div", {}, hero("JTBC · Joel Teh Broadcasting Corporation", "JTBC", "On air, whatever that is."),
    card("On air now", el("p", {}, el("span", { class: "jl-onair" }, "ON AIR"), " ", el("b", {}, prog(h)), ` (${String(h).padStart(2, "0")}:00)`)),
    card("Today's schedule", el("div", { class: "jl-tablewrap" }, el("table", { class: "jl-table" }, el("tbody", {}, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const hr = (h + i) % 24; return el("tr", {}, el("td", {}, String(hr).padStart(2, "0") + ":00"), el("td", {}, prog(hr))); }))))),
    card("Headlines", el("ul", {}, ["JTP asks public not to feed Joel after midnight", "JTIA reopens runway two. Runway one remains a car park", "JT adds a flight to Mt Fuji. Octee is still the only way back to Fuji", "Cupboard prices stable, shelves wobbling"].map((t) => el("li", {}, t)))));
}

// ---------------- Museum ----------------
const EXHIBITS = [
  ["The First Sorry", "A tiny word in a big glass case. Do not tap the glass."],
  ["The Sandwich Hall", "Eleven sandwiches, none labelled. Staff will not discuss it."],
  ["Wing of Delays", "A real departure board, stopped at 'delayed'."],
  ["The Umbrella Gallery", "Forty-one umbrellas, all lost, all dry."],
  ["Cupboard Through the Ages", "From a box to a cupboard to a bigger cupboard."],
  ["Hall of Announcements", "Press a button for an announcement you cannot hear."],
  ["The JTP Room", "Handcuffs, a notebook, and a cup of tea gone cold."],
  ["The Gift Shop", "Sells postcards of the other exhibits."]
];
const museumPage = () => el("div", {}, hero("Museum of Joel · open daily, mostly", "Museum of Joel", "Eight exhibits about one person. Entry is free. Leaving takes a while."),
  card("", EXHIBITS.map(([t, d], i) => el("details", {}, el("summary", {}, `${i + 1}. ${t}`), el("p", {}, d)))));

// ---------------- Baggage ----------------
function baggagePage() {
  const tag = el("input", { id: "bg-tag", placeholder: "JT123456", maxlength: 12 });
  const out = el("p", { class: "jl-note", "aria-live": "polite" });
  const find = () => {
    const t = tag.value.trim().toUpperCase();
    if (!/^[A-Z]{2}\d{4,8}$/.test(t)) { out.textContent = "A bag tag is two letters and four to eight digits, like JT123456."; return; }
    const h = hash(t); const belt = (h % 7) + 1; const moving = [1, 4, 6].includes(belt);
    out.textContent = `Bag ${t}: Belt ${belt}${moving ? "." : ", which does not move today. Ask a person."} ${h % 5 === 0 ? "Your bag has been seen near the cupboard." : "It is somewhere sensible."}`;
  };
  return el("div", {}, hero("JT Baggage · JTIA baggage hall", "JT Baggage", "Bags on JT-numbered flights follow these rules, and so do the sandwiches in them."),
    card("Allowances", el("div", { class: "jl-tablewrap" }, el("table", { class: "jl-table" }, el("thead", {}, el("tr", {}, ["Class", "Cabin bag", "Checked bags"].map((h) => el("th", {}, h)))),
      el("tbody", {}, [["Economy", "1 × 7 kg", "1 × 20 kg"], ["Business", "2 × 7 kg", "2 × 25 kg"], ["First", "2 × 10 kg", "3 × 30 kg"]].map((r) => el("tr", {}, r.map((c) => el("td", {}, c)))))))),
    card("Find your belt", el("div", { class: "jl-row" }, field("Bag tag", tag, "bg-tag"), el("button", { class: "jl-btn", type: "button", onclick: find }, "Find")), out),
    el("p", { class: "jl-note" }, "For Octee flights see ", el("a", { href: "baggage.html" }, "Baggage"), " and the ", el("a", { href: "bagtrack.html" }, "Bag Tracker"), "."));
}

// ---------------- Lost property ----------------
const FOUND = ["A single glove", "Forty-one umbrellas", "A sandwich (sealed)", "One shoe", "A boarding pass for tomorrow", "A very small chair", "Joel's list", "A passport for a person named Sorry"];
function lostfoundPage(redraw) {
  const u = currentUser();
  const what = el("input", { id: "lf-what", maxlength: 60, placeholder: "What did you lose?" }), where = el("input", { id: "lf-where", maxlength: 60, placeholder: "Where?" });
  const msg = msgBox();
  const file = () => {
    if (what.value.trim().length < 3) { say(msg, "Say what you lost.", "err"); return; }
    const ref = "JTL-" + Math.floor(10000 + Math.random() * 90000);
    updateUser((a) => { a.jtLost = [{ ref, what: what.value.trim(), where: where.value.trim() || "unknown", at: new Date().toISOString() }, ...(a.jtLost || [])].slice(0, 25); });
    push().catch(() => {});
    say(msg, `Filed as ${ref}. We will look in the cupboard first.`, "ok"); redraw();
  };
  return el("div", {}, hero("JT Lost Property · behind the other Lost Property", "JT Lost Property", "If it is lost at JTIA, it is here. If it is here, it was never lost."),
    card("Found at JTIA", el("ul", {}, FOUND.map((t) => el("li", {}, t)))),
    card("Report something lost", el("div", { class: "jl-row" }, field("What", what, "lf-what"), field("Where", where, "lf-where"), el("button", { class: "jl-btn", type: "button", onclick: file }, "File report")), msg),
    card("Your reports", (u.jtLost || []).length ? (u.jtLost || []).map((r) => el("p", {}, `${r.ref} · ${r.what} · ${r.where} · ${niceDate(r.at.slice(0, 10))} · ${["Searching", "Searching the cupboard", "Found, then lost again"][hash(r.ref) % 3]}`)) : el("p", { class: "jl-note" }, "None yet.")),
    el("p", { class: "jl-note" }, "The Octee one is at ", el("a", { href: "lostfound.html" }, "Lost and Found"), "."));
}

export const PAGES_BY_KEY = {
  home: homePage, jtp: jtpPage, jtia: jtiaPage, cupboard: cupboardPage, airlines: airlinesPage, bank: bankPage,
  jtbc: jtbcPage, museum: museumPage, baggage: baggagePage, hotels: hotelsPage, lostfound: lostfoundPage
};
export { JT_OWN_PRICE, timesText, today };
