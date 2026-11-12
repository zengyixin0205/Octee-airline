// Octee City: a small town next to FIA. Walking around is free. Working, the bank and the police need an Octee Cloud login.
// Everything that counts (CCT, pay, interest, fines, cells) lives on the Worker in /api/city/*. This file only shows it and asks.
import { $, el } from "./dom.js";
import { CONFIG } from "./config.js";
import { cloudState, cloudLinked } from "./cloud.js";

// The buildings. Each job is a one-question quiz; a right answer clocks you in (the server pays), a wrong answer costs nothing.
const BUILDINGS = [
  { id: "bank", name: "OCT Bank", blurb: "Keep your CCT here and it grows every day. Do not ask how." },
  { id: "hall", name: "City Hall", blurb: "Where the stamps are. There are more stamps than there are citizens." },
  { id: "clinic", name: "Clinic", blurb: "Open all hours, staffed by people who have read a leaflet." },
  { id: "fire", name: "Fire Station", blurb: "The fire is always somewhere else. The hose is always here." },
  { id: "post", name: "Post Office", blurb: "Everything posted here arrives. Eventually. Some of it arrives in the wrong town." },
  { id: "bakery", name: "Bakery", blurb: "Bread, buns and a cake with no name. It smells like an airport gate." },
  { id: "library", name: "Library", blurb: "Quiet, except for the shelf that talks about its overdue books." },
  { id: "cinema", name: "Cinema", blurb: "Showing the same film since the town was founded. Nobody has reached the end." },
  { id: "power", name: "Power Station", blurb: "Keeps the lights on for FIA and, sometimes, for everyone else." },
  { id: "radio", name: "Radio Tower", blurb: "Octee Radio's city branch. The playlist is one song, on loop, very politely." },
  { id: "food", name: "Food Court", blurb: "Every dish is peanuts in a different hat." },
  { id: "harbour", name: "Harbour", blurb: "A harbour with no sea. The cranes are very committed anyway." },
  { id: "police", name: "Police Station", blurb: "Keeps the town orderly. Breaking the rules gets you arrested. Ask anyone who has tried." },
  { id: "tax", name: "Tax Office", blurb: "Every peanut is taxed. Some peanuts are taxed twice." },
  { id: "car", name: "Car Park", blurb: "Four floors, zero spaces, all of them full." },
  { id: "gym", name: "Gym", blurb: "Lifts things, puts them down, and says they were heavy." },
  { id: "museum", name: "Peanut Museum", blurb: "One exhibit, a peanut, under glass. It is very valuable." },
  { id: "bus", name: "Airport Bus Stop", blurb: "The bus to FIA. It goes everywhere except FIA." }
];
const JOBS = {
  "bank-teller": { b: "bank", title: "Bank teller", prompt: "A customer asks for their money back. What do you do?", right: "Count it twice, then say the bank is closed for money today.", wrong: ["Give them all of it in peanuts", "Ask them to come back next Tuesday, with a form"] },
  "bank-vault": { b: "bank", title: "Vault guard", prompt: "The vault has a sign: DO NOT OPEN. Someone is knocking from inside. What now?", right: "Check the sign is still there, then knock back politely.", wrong: ["Open it. Curiosity pays", "Open it and leave the door open for the interest"] },
  "hall-stamp": { b: "hall", title: "Stamp clerk", prompt: "A form has no box for your name. Where do you stamp it?", right: "Across the middle. The form is now yours.", wrong: ["In the box for the weather", "Nowhere. Stamps are for other forms"] },
  "hall-notes": { b: "hall", title: "Minutes clerk", prompt: "The meeting minutes say 'nothing was decided'. What do you write?", right: "Nothing was decided, and that was the decision.", wrong: ["The meeting was cancelled, so there are no minutes", "A poem about the decision"] },
  "clinic-nurse": { b: "clinic", title: "Nurse on the ward", prompt: "A patient says they have a fever of 'about a fortnight'. Your answer?", right: "Ask them to take a nap and to call back in a fortnight.", wrong: ["Give them a peanut for the fever", "Tell them the fever is fine, it is in the leaflet"] },
  "clinic-pharmacy": { b: "clinic", title: "Pharmacy counter", prompt: "The label says 'twice a day'. The bottle says 'every hour'. Which do you trust?", right: "The bottle. It is closer to the patient.", wrong: ["The label. Labels are older", "Neither. Just shake it"] },
  "fire-hose": { b: "fire", title: "Hose handler", prompt: "The hose is pointed at a bakery that is on fire. Do you…", right: "Turn the hose on the bakery's fire. The bread is fine.", wrong: ["Water the bakery's flowers", "Hand the hose to the cinema, it has a good film on"] },
  "fire-dispatch": { b: "fire", title: "Dispatcher", prompt: "A call comes in: 'there is a fire in the library, it is very quiet'. You send…", right: "Two trucks, one quietly.", wrong: ["A bus with a sign", "Nobody. Libraries are fireproof, the leaflet says so"] },
  "post-parcel": { b: "post", title: "Parcel sorter", prompt: "A parcel is labelled 'to me'. It is addressed to a city that does not exist.", right: "Send it to the harbour. The cranes will decide.", wrong: ["Keep it. It is yours now", "Open it and put the contents in the wrong box"] },
  "post-stamp": { b: "post", title: "Stamp counter", prompt: "A stamp has come out upside down. The postage rule says…", right: "Upside down is also postage. Thirty per cent less.", wrong: ["Stamps must be right way up, or they fly away", "A stamp must be licked twice"] },
  "bakery-assistant": { b: "bakery", title: "Bakery assistant", prompt: "The cake is labelled 'do not eat'. A customer asks for a slice. You say…", right: "It is a no-name cake. Nobody can be sure what it is.", wrong: ["Yes, the label is only a suggestion", "Cut it in half and charge double"] },
  "bakery-till": { b: "bakery", title: "Till operator", prompt: "A bun costs 1 CCT. The customer pays with 3 CCT. Change?", right: "Two buns. They are a gift.", wrong: ["Two buns and a bit of your heart", "You keep the 3 CCT, the bun was free"] },
  "library-shelf": { b: "library", title: "Shelf stacker", prompt: "A book on the shelf is whispering. Your move?", right: "Read it quietly. It is a recipe.", wrong: ["Shout back. Books like that", "Put it in the cinema, it is a film now"] },
  "library-returns": { b: "library", title: "Returns desk", prompt: "A book is four years overdue. The fine is…", right: "Four years of a smile. The library is very kind.", wrong: ["The whole book, in CCT", "Nothing. Overdue books have feelings too"] },
  "cinema-usher": { b: "cinema", title: "Usher", prompt: "The film has no ending. A customer asks where the ending is. You say…", right: "It is in the next film. Tickets are 1 CCT.", wrong: ["The ending is in the bakery", "Sit down, you will see it eventually"] },
  "cinema-projector": { b: "cinema", title: "Projectionist", prompt: "The film is running backwards. Do you…", right: "Leave it. The audience is getting younger.", wrong: ["Turn it round, the audience will complain", "Run the film forwards in the bakery"] },
  "power-switch": { b: "power", title: "Switch operator", prompt: "The town goes dark. The lights in FIA stay on. The correct move is…", right: "Leave FIA lit. The town can be dark, FIA cannot.", wrong: ["Turn FIA off so the town is fair", "Turn the whole sky on"] },
  "power-meter": { b: "power", title: "Meter reader", prompt: "The meter says 'enough'. How much is enough?", right: "Exactly the amount the leaflet says. The leaflet is short.", wrong: ["Whatever the bakery says", "More. Always more"] },
  "radio-dial": { b: "radio", title: "Dial turner", prompt: "The dial is stuck on the same song. What do you do?", right: "Turn it to the song after. It is the same song.", wrong: ["Hit the dial with the bakery", "Sing along, loudly"] },
  "radio-playlist": { b: "radio", title: "Playlist keeper", prompt: "A listener asks for a song that is not on the list. You…", right: "Add it. The list is only a suggestion too.", wrong: ["Play the sorry station instead", "Ask them to come back when the list is longer"] },
  "food-waiter": { b: "food", title: "Waiter", prompt: "A customer asks for 'the usual'. You have never met them. You say…", right: "Of course. The usual is peanuts, in a hat.", wrong: ["Bring them a bun, it is the usual at the bakery", "Ask them what their usual is, then charge for it"] },
  "food-dish": { b: "food", title: "Dish chef", prompt: "The recipe says 'add peanuts until it is right'. When is it right?", right: "When the customer stops asking.", wrong: ["When the bakery says so", "When the hat fits"] },
  "harbour-crane": { b: "harbour", title: "Crane operator", prompt: "A crane lifts a box marked 'do not lift'. You…", right: "Lift it higher. It was rude to say so.", wrong: ["Lower it into the empty harbour", "Lift it to the cinema"] },
  "harbour-dock": { b: "harbour", title: "Dock hand", prompt: "A ship arrives at a harbour with no sea. Where does it dock?", right: "On the car park. Ships love a car park.", wrong: ["In the library", "Back out. It is a plane"] },
  "tax-clerk": { b: "tax", title: "Tax clerk", prompt: "A citizen says their tax is 'whatever the peanuts say'. You…", right: "Ask the peanuts for a receipt.", wrong: ["Accept it. Peanuts are reliable", "Tax them back, twice"] },
  "tax-audit": { b: "tax", title: "Auditor", prompt: "The audit finds 3 CCT missing. Where did it go?", right: "A spot check, probably. Write it down.", wrong: ["In the bakery's bun", "It was never there. Audits do not count air"] },
  "car-attendant": { b: "car", title: "Car park attendant", prompt: "A car has been in the bus lane for three days. Ticket?", right: "A ticket, and a note that the bus is also parked.", wrong: ["Clamp the bus", "The car is a monument now"] },
  "car-ticket": { b: "car", title: "Ticket machine", prompt: "The machine says 'insert coin' but has no slot. What do you do?", right: "Insert the coin into the machine's opinion.", wrong: ["Shake the machine", "Give up. Parking is a state of mind"] },
  "gym-instructor": { b: "gym", title: "Gym instructor", prompt: "A member asks how many reps to do. You say…", right: "Until the bench gives up first.", wrong: ["Zero. Resting is the workout", "All of them, in one go"] },
  "gym-towel": { b: "gym", title: "Lost property, gym", prompt: "A towel is lost in the sauna. Lost property says…", right: "Check the sauna is not the towel.", wrong: ["The towel is in the cinema", "Towels do not get lost, they go on holiday"] },
  "museum-guide": { b: "museum", title: "Museum guide", prompt: "A visitor asks what the peanut exhibit is. You say…", right: "It is a peanut. Please do not touch it, it is valuable.", wrong: ["It is a bus timetable", "It is the exhibit from the bakery"] },
  "museum-cleaner": { b: "museum", title: "Museum cleaner", prompt: "The exhibit's sign has fallen off. Your move?", right: "Put the sign back, next to the exhibit it describes.", wrong: ["Put the exhibit on the sign", "Sweep the sign into the bakery"] },
  "bus-driver": { b: "bus", title: "Bus driver", prompt: "Passengers ask to go to FIA. The bus goes to the sea. You…", right: "Drive to the sea. FIA is a state of mind.", wrong: ["Turn round politely, FIA is a short walk", "Charge the passengers double for the scenic route"] },
  "bus-timetable": { b: "bus", title: "Timetable keeper", prompt: "The timetable says the next bus is 'soon'. How soon?", right: "Soon is a time. Check the clock.", wrong: ["Exactly as soon as you get here", "It is printed on a bun"] },
  "police-patrol": { b: "police", title: "Patrol officer", prompt: "A citizen has already clocked in twice today. What is the offence?", right: "Double shifting. Arrest, fine, and time in the cells.", wrong: ["Overtime. Pay them more", "Nothing. They are just very keen"] },
  "police-desk": { b: "police", title: "Desk sergeant", prompt: "A suspect asks for a lawyer. What does the desk say?", right: "A lawyer is on the way. The lawyer is also on the way to jail.", wrong: ["Here is a peanut, the matter is closed", "Lawyers are not in the leaflet"] }
};
const PAY = 10, HARD_PAY = 15, RATE = 10, SELL = 8;
// Harder jobs pay more. Keep in step with CITY.hard in cloud/index.js.
const HARD = ["bank-teller", "bank-vault", "tax-audit", "police-patrol", "police-desk"];
const payOf = (id) => (HARD.includes(id) ? HARD_PAY : PAY);
// The police spot-check rules. The Worker picks one at random for one clock-in in four; keep these in step with cloud/index.js.
const SPOT_RULES = [
  "No more than 100 CCT on the street. Pockets are for lint.",
  "The bank must not hold 1,000 CCT or more on a shift day.",
  "Two jobs before going home. One job is a hobby."
];
// The city map: five by four. The airport is off the edge of the town, next to the Ring Road.
const MAP = ["tax", "car", "gym", "museum", "bus", "bank", "hall", "clinic", "fire", "post", "bakery", "library", "cinema", "power", "radio", "food", "harbour", "police", "FIA", "ring"];
const cityIds = () => BUILDINGS.map((b) => b.id);
let state = { view: null }; // last city data from the Worker (logged-in only)

async function api(method, path, body) {
  const token = cloudLinked() ? cloudState().token : "";
  let res;
  try {
    res = await fetch(CONFIG.CLOUD_URL + path, { method, headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(token ? { authorization: "Bearer " + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new Error("The cloud could not be reached. Nothing was changed."); }
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Log in to Octee Cloud to use the city. Walking around is still free.");
  if (!res.ok && !j.arrested) throw new Error(j.message || "Nothing was changed.");
  return j;
}
// Public reads (news, leaderboard) need no login. A failed read shows nothing rather than an error.
async function pub(path) {
  try { const r = await fetch(CONFIG.CLOUD_URL + path); return r.ok ? await r.json() : null; } catch { return null; }
}

const loggedIn = () => cloudLinked();
const fmtCct = (n) => Number(n || 0).toLocaleString("en-GB") + " CCT";
const fmtBank = (n) => Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " CCT";

function status(app) {
  let box = app.querySelector("#city-status");
  if (!box) { box = el("div", { class: "city-status", id: "city-status" }); app.prepend(box); }
  if (!loggedIn()) { box.replaceChildren("You are looking around as a visitor. ", el("a", { href: "login.html?next=" + encodeURIComponent("city.html") }, "Log in"), " to clock in, use the bank, or get arrested properly."); return box; }
  const v = state.view;
  if (!v) { box.textContent = "Loading your city card…"; return box; }
  const parts = [`Wallet: ${fmtCct(v.wallet)}`, `Bank: ${fmtBank(v.bank)} (${v.tier}, ${(v.rate * 100).toFixed(1)}% a year, paid daily)`];
  if (v.jailUntil) parts.push(`You are in the cells until ${new Date(v.jailUntil).toLocaleTimeString("en-GB")}.`);
  box.replaceChildren(parts.join(" · "));
  return box;
}

async function refresh() {
  if (!loggedIn()) { state.view = null; return; }
  try { state.view = await api("GET", "/api/city"); } catch (e) { state.view = null; }
}

function cityMap() {
  return el("div", { class: "city-map", role: "img", "aria-label": "Map of Octee City" }, MAP.map((id) => {
    if (id === "FIA") return el("div", { class: "city-cell fia" }, "FIA airport", el("small", {}, "the planes are that way"));
    if (id === "ring") return el("div", { class: "city-cell road" }, "Ring Road", el("small", {}, "the bus does not stop here"));
    const b = BUILDINGS.find((x) => x.id === id);
    return el("a", { class: "city-cell", href: "#" + id }, b.name);
  }));
}

function table(head, rows) {
  return el("table", { class: "city-table" }, el("tr", {}, head.map((h) => el("th", {}, h))), ...rows.map((r) => el("tr", {}, r.map((c) => el("td", {}, c)))));
}

async function loadPanels(app) {
  const news = app.querySelector("#city-news"), board = app.querySelector("#city-board");
  if (news) {
    const j = await pub("/api/city/news");
    news.replaceChildren(...(j && j.news && j.news.length ? j.news.map((x) => el("p", { class: "note" }, x.text)) : [el("p", { class: "note" }, "No news yet. The town is quiet, which is suspicious.")]));
  }
  if (board) {
    const j = await pub("/api/city/leaderboard");
    if (!j) { board.replaceChildren(el("p", { class: "note" }, "The leaderboard is in the cells. Try again later.")); return; }
    board.replaceChildren(
      el("h3", {}, "Richest citizens"),
      j.rich.length ? table(["Citizen", "Wallet + bank"], j.rich.map((r) => [r.name, fmtCct(r.cct)])) : el("p", { class: "note" }, "Nobody has any money yet. Give it time."),
      el("h3", {}, "Most arrested"),
      j.arrests.length ? table(["Citizen", "Arrests"], j.arrests.map((r) => [r.name, String(r.arrests)])) : el("p", { class: "note" }, "Nobody has been arrested. The police are very disappointed.")
    );
  }
}

function hub() {
  return [el("h2", {}, "The town"), el("p", { class: "note" }, "Click a building on the map, or in the list below. You can look at all of them for free."),
    cityMap(),
    el("h2", {}, "The buildings"),
    el("div", { class: "city-grid" }, BUILDINGS.map((b) => el("a", { class: "city-card", href: "#" + b.id }, el("h3", {}, b.name), el("p", { class: "note", style: "margin:0" }, b.blurb)))),
    el("h2", {}, "The Octee City Gazette"),
    el("div", { id: "city-news" }, el("p", { class: "note" }, "Loading the news…")),
    el("h2", {}, "Leaderboard"),
    el("div", { id: "city-board" }, el("p", { class: "note" }, "Counting the money…")),
    el("h2", {}, "The rules"),
    el("ul", {}, el("li", {}, "A job pays " + PAY + " CCT, or " + HARD_PAY + " for the bank, tax audit and police jobs. One shift per job, per day."), el("li", {}, "Clocking in to the same job twice in one day is a crime. You will be fined and put in the cells for half an hour."), el("li", {}, "One clock-in in four may also be a police spot check. Fail it and you pay a fine."), el("li", {}, "Octmiles buy CCT at " + RATE + " to 1. CCT sell back at " + SELL + " to 1. The gap is the town's cut.")),
    el("p", { class: "note" }, "Nothing here is real. The bank is not a real bank. The police are not a real police. The town is not a town. Everything you earn is parody money.")];
}

function jobRow(jobId, onDone) {
  const j = JOBS[jobId];
  const pick = el("div", { class: "city-quiz", hidden: true }, el("p", {}, j.prompt));
  const doneMsg = el("p", { class: "note" });
  const options = [j.right, ...j.wrong].sort(() => Math.random() - 0.5);
  options.forEach((o) => pick.append(el("button", { class: "btn", type: "button", onclick: async () => {
    if (o !== j.right) { doneMsg.textContent = "Wrong answer. Nobody is paid for a wrong answer. The leaflet is clear about this."; return; }
    doneMsg.textContent = "Checking the shift…";
    try {
      const r = await api("POST", "/api/city/shift", { job: jobId });
      if (r.arrested) { doneMsg.className = "city-warn"; doneMsg.textContent = r.message; }
      else if (r.ok === false) { doneMsg.textContent = r.message || "No pay. Nothing was changed."; }
      else {
        let text = `Shift done. You earned ${r.paid} CCT.`;
        if (r.spot) text += r.spot.failed ? ` Spot check failed: "${r.spot.rule}" Fine: ${r.spot.fine} CCT.` : ` Spot check passed: "${r.spot.rule}"`;
        doneMsg.className = r.spot && r.spot.failed ? "city-warn" : "note";
        doneMsg.textContent = text + " Please go and be useful somewhere else.";
      }
      state.view = r.wallet !== undefined ? r : state.view;
      if (onDone) onDone();
    } catch (e) { doneMsg.textContent = e.message; }
  } }, o)));
  const start = el("button", { class: "btn", type: "button", onclick: () => {
    if (!loggedIn()) { doneMsg.textContent = "Log in first. You can look for free, but not clock in."; return; }
    if (state.view && state.view.jailUntil) { doneMsg.className = "city-warn"; doneMsg.textContent = "You are in the cells. No shifts until your time is up."; return; }
    if (state.view && (state.view.todayJobs || []).includes(jobId)) { doneMsg.className = "city-warn"; doneMsg.textContent = "You already did this shift today. Clocking in again is a crime. Going ahead anyway…"; }
    pick.hidden = false;
  } }, "Clock in");
  return el("div", {}, el("div", { class: "city-job" }, el("div", {}, el("strong", {}, j.title), el("p", { class: "note", style: "margin:2px 0 0" }, "Pays " + payOf(jobId) + " CCT")), start), pick, doneMsg);
}

function buildingView(id, app) {
  const b = BUILDINGS.find((x) => x.id === id);
  const jobsHere = Object.entries(JOBS).filter(([, j]) => j.b === id).map(([k]) => k);
  const card = el("div", { class: "city-card", style: "cursor:auto" });
  card.append(el("h2", {}, b.name), el("p", {}, b.blurb));
  if (id === "bank") card.append(...bankBits(app));
  else if (id === "police") card.append(el("p", {}, "The police in Octee City have one rule: no double shifts. Break it and you are arrested, fined 5 CCT, and sent to the cells for half an hour. You cannot clock in from the cells. The cells are free, but nobody has ever come back for their CCT."),
    el("h3", {}, "Spot checks"),
    el("p", { class: "note" }, "One clock-in in four is also a spot check. The police pick one of these rules at random. Fail it and you pay a fine, and the Gazette prints your name:"),
    el("ul", {}, SPOT_RULES.map((r) => el("li", {}, r))),
    el("h3", {}, "Wanted"),
    el("p", { class: "note" }, "Citizens with two or more arrests. The police would like a word."),
    el("div", { id: "city-wanted" }, el("p", { class: "note" }, "Checking the files…")));
  jobsHere.forEach((jid) => card.append(jobRow(jid, () => render(app, id))));
  card.append(el("p", { class: "note" }, el("a", { href: "#" }, "Back to the town")));
  return card;
}

function bankBits(app) {
  if (!loggedIn()) return [el("p", { class: "note" }, "The bank asks you to log in. It cannot tell who you are otherwise.")];
  const v = state.view || { wallet: 0, bank: 0, tier: "Bronze", rate: 0.01, tiers: [] };
  const amount = el("input", { type: "number", min: 1, step: 1, value: 10 });
  const msg = el("p", { class: "note" });
  const move = (dir) => async () => {
    msg.textContent = "Moving…";
    try { const r = await api("POST", "/api/city/bank", { dir, amount: Number(amount.value) }); state.view = r; msg.textContent = dir === "in" ? "Deposited. Your bank is paying interest every day." : "Withdrawn. The bank says goodbye."; render(app, "bank"); }
    catch (e) { msg.textContent = e.message; }
  };
  const ex = el("input", { type: "number", min: 1, step: 1, value: 10 });
  const exMsg = el("p", { class: "note" });
  const exchange = async () => {
    exMsg.textContent = "Exchanging…";
    try { const r = await api("POST", "/api/city/exchange", { units: Number(ex.value) }); state.view = r; exMsg.textContent = `Bought ${r.bought} CCT. You have ${r.octmiles.toLocaleString("en-GB")} Octmiles left.`; render(app, "bank"); }
    catch (e) { exMsg.textContent = e.message; }
  };
  const sell = el("input", { type: "number", min: 1, step: 1, value: 10 });
  const sellMsg = el("p", { class: "note" });
  const sellCct = async () => {
    sellMsg.textContent = "Selling…";
    try { const r = await api("POST", "/api/city/sell", { units: Number(sell.value) }); state.view = r; sellMsg.textContent = `Sold ${r.sold} CCT for ${r.got} Octmiles. You have ${r.octmiles.toLocaleString("en-GB")} Octmiles now.`; render(app, "bank"); }
    catch (e) { sellMsg.textContent = e.message; }
  };
  return [
    el("p", {}, `Wallet: ${fmtCct(v.wallet)}. Bank: ${fmtBank(v.bank)}. You are a ${v.tier} customer.`),
    el("p", { class: "note" }, "Interest is paid every day at your tier's yearly rate. The bank does the sums, not you."),
    el("table", { class: "city-table" }, el("tr", {}, el("th", {}, "Tier"), el("th", {}, "From"), el("th", {}, "Yearly rate")), ...(v.tiers || []).map((t) => el("tr", {}, el("td", {}, t.name), el("td", {}, t.min.toLocaleString("en-GB") + " CCT"), el("td", {}, (t.rate * 100).toFixed(1) + "%")))),
    el("p", { class: "note" }, "No limit on deposits or withdrawals. The bank has, to its credit, never refused anyone."),
    el("div", { class: "city-row" }, amount, el("button", { class: "btn", type: "button", onclick: move("in") }, "Deposit CCT"), el("button", { class: "btn", type: "button", onclick: move("out") }, "Withdraw CCT")),
    msg,
    el("h3", {}, "Swap Octmiles for CCT"),
    el("p", { class: "note" }, `${RATE} Octmiles buys 1 CCT. This is the rate the city has set. It is not a good rate, but it is the one we have.`),
    el("div", { class: "city-row" }, ex, el("button", { class: "btn", type: "button", onclick: exchange }, "Buy CCT")),
    exMsg,
    el("h3", {}, "Sell CCT back"),
    el("p", { class: "note" }, `Selling pays ${SELL} Octmiles per CCT. The town keeps the other ${RATE - SELL}, which it calls a fee.`),
    el("div", { class: "city-row" }, sell, el("button", { class: "btn", type: "button", onclick: sellCct }, "Sell CCT")),
    sellMsg
  ];
}

async function loadWanted(app) {
  const box = app.querySelector("#city-wanted");
  if (!box) return;
  const j = await pub("/api/city/leaderboard");
  const wanted = j ? j.arrests.filter((r) => r.arrests >= 2) : [];
  box.replaceChildren(...(j ? (wanted.length ? wanted.map((r) => el("p", {}, el("strong", {}, r.name), " · " + r.arrests + " arrests · Please come quietly.")) : [el("p", { class: "note" }, "Nobody on the wanted list. The police are checking their own list.")]) : [el("p", { class: "note" }, "The files are in the cells. Try again later.")]));
}

function render(app, view) {
  const top = status(app);
  const body = view === "home" || !view ? hub() : [buildingView(view, app)];
  app.replaceChildren(top, ...body.filter(Boolean));
  if (view === "home" || !view) loadPanels(app);
  if (view === "police") loadWanted(app);
}

async function boot() {
  const app = $("#app");
  if (!app) return;
  const go = async () => {
    const h = (location.hash || "").replace("#", "");
    const view = cityIds().includes(h) ? h : "home";
    if (loggedIn() && !state.view) await refresh();
    render(app, view);
  };
  window.addEventListener("hashchange", go);
  app.replaceChildren(el("p", { class: "note" }, "Opening the doors…"));
  await refresh();
  go();
}
boot();
