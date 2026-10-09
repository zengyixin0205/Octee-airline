// JoelAI's brain. It is NOT a real AI: it is a rulebook with confidence. It reads the question, looks for
// flight numbers, gates, places and topics, and answers from the airport's own data (timetable, gates,
// the FIA guide, your account). Anything it does not know gets an unhelpful answer, on purpose.
import { ALL_FLIGHTS, PLACES, placeName, placeShort, routeText, daysText, fiaGate, fiaTerminalOf, FIA_TERMINALS, normalize } from "./destinations.js";
import { TIERS, tierFor, nextTier, REWARDS, TOKEN_RATE, TOKEN_PRICES } from "./miles.js";
import { currentUser } from "./auth.js";
import { scraggyData } from "./scraggy.js";
import { CONFIG } from "./config.js";
import { isCheckedIn, seatsOf, legUrl } from "./tripkit.js";
import { niceDate, today } from "./dom.js";

export const GREETING = "Hi, I'm JoelAI. I'm a joel! Ask me about gates, flights, security, the train, bags, Octmiles or anything else at FIA. I am a rulebook with confidence, not a real AI, so I am only right about things we wrote down.";
export const CHIPS = ["How do I check in?", "How do I change my password?", "How do I get to my gate?", "Where is security?", "Flights to MIA", "When does OA 58 leave?", "Where is gate A12?", "How do I earn Octmiles?", "Tell me a joke"];

const A = (text, links = []) => ({ text, links });
const pickBy = (arr, seed) => arr[Math.abs([...String(seed)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % arr.length];
const FALLBACKS = [
  "Joel asked the plane. The plane is not saying.",
  "I do not know that one. I know the airport, the timetable and where the peanut is. Try one of those.",
  "That question is above my pay grade. My pay grade is one peanut.",
  "I looked it up in the handbook. The page was a photo of a peanut."
];
const JOKES = [
  "Why did the plane go to therapy? It had too many delays to unpack.",
  "Our flights are always on time. We just do not say which time.",
  "How do you know the pilot is a joel? He says \"I'm a joel!\" before take-off. And during. And after.",
  "Passenger: \"Is this seat taken?\" Octee: \"Spiritually, yes.\""
];

// "OA58", "oa 58", "ou 9", "sa107" -> a normalised key
const flightKey = (s) => normalize(s);
const fiaClock = () => new Intl.DateTimeFormat("en-GB", { timeZone: CONFIG.FIA_TIMEZONE, weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

function gateInfo(prefix, num) {
  const p = prefix.toUpperCase(), n = Number(num), id = p + n;
  const all = FIA_TERMINALS.flatMap((t) => t.gates.map((g) => ({ g, t })));
  const hit = all.find(({ g }) => g.replace(/(?<=\d)[ABC]$/, "") === id);
  if (!hit) return A(`I cannot find gate ${id}. It may not exist. Many of our gates do not. Try the departures sign on the FIA page.`, [["FIA page", "fia.html"]]);
  const t = hit.t;
  let where;
  if (p === "A" && n === 8) where = "Gate A8 is in the T1 annex, off to the left. It is a 9 minute walk along the walkway. Do not run.";
  else if (p === "A") where = `Gate ${id} is on Pier A in Terminal 1, on the left side after security.`;
  else if (p === "B") where = `Gate ${id} is on Pier B in Terminal 1, past the ATC building on the right side after security.`;
  else if (p === "C") where = "Gate C1 is beside the cargo building at the end of Terminal 1.";
  else if (p === "D" || p === "E") where = `Gate ${id} is in Terminal 2. Take the SBB train from Terminal 1. The D gates are on the left of the Fuji Mall and the E gates are on the right.`;
  else if (p === "J") where = `Gate ${id} is in Terminal 3, the Scraggy reservation terminal. Take the SBB train. You probably should not be there.`;
  else if (p === "G") where = `Gate ${id} is in Terminal 4. Take the SBB train, or do not walk across the runway.`;
  else if (p === "SC") where = `Gate ${id} is in Terminal 5, the Scraggy Building, across the runway. It is not on the train. Do not walk. Ask Scraggy.`;
  else where = `Gate ${id} is in Terminal ${t.no}.`;
  return A(`${where} (Terminal ${t.no}: ${t.airlines.join(", ")}.)`, [["How to get to your gate", "fia.html"], ["Airport map", "fia.html"]]);
}

async function flightInfo(airline, no) {
  const key = flightKey(airline + no);
  const f = ALL_FLIGHTS.find((x) => flightKey(x.no) === key);
  if (f) {
    const stops = f.stops.map((s) => `${placeShort(s[0])}${s[1] ? " arr " + s[1] : ""}${s[2] ? " dep " + s[2] : ""}`).join(" → ");
    const first = f.stops[0][0];
    const gate = first === "FIA" ? ` From FIA it leaves from gate ${fiaGate(f.airline, f.no)} (Terminal ${fiaTerminalOf(fiaGate(f.airline, f.no))}).` : "";
    return A(`${f.no} runs ${daysText(f.days).toLowerCase()}: ${stops}.${gate} Is it on time? No. It never is.`, [["Flight status board", "status.html"], ["Book it", "book.html"]]);
  }
  const { routes } = await scraggyData();
  const r = routes.find((x) => flightKey(x.outNo) === key || flightKey(x.inNo) === key);
  if (r) {
    const out = flightKey(r.outNo) === key;
    return A(out ? `${r.outNo} is a Scraggy Airlines flight from SIA to ${r.name}, leaving ${r.outDep}, arriving ${r.outArr}. Gate ${r.gate}.` : `${r.inNo} is a Scraggy Airlines flight from ${r.name} to SIA, leaving ${r.inDep}, arriving ${r.inArr}. Gate ${r.gate}.`, [["Flight status board", "status.html"]]);
  }
  return A(`I cannot find flight ${airline.toUpperCase()} ${no}. Either it does not exist, or it is lost. The flight status board knows more than I do.`, [["Flight status board", "status.html"]]);
}

async function flightsToPlace(code) {
  const name = placeName(code);
  const fl = ALL_FLIGHTS.filter((f) => f.stops.some((s) => s[0] === code));
  const { routes } = await scraggyData();
  const sa = routes.filter((r) => r.place === code);
  if (code === "FIA") return A("You are at FIA. Everything leaves from here, nothing arrives on time, and the departures sign is on the FIA page.", [["Departure gates", "fia.html"], ["Flight status board", "status.html"]]);
  if (!fl.length && !sa.length) return A(`We do not fly to ${name}. Try Scraggy House, SIA, LIA, MIA, Tabletop Domestic (TDA) or Mt Fuji International (MFIA).`, [["Destinations", "destinations.html"]]);
  const lines = fl.slice(0, 5).map((f) => `${f.no} (${daysText(f.days).toLowerCase()}): ${routeText(f)}, leaves ${f.stops[0][2] || f.stops[0][1]}`);
  sa.forEach((r) => lines.push(`${r.outNo}/${r.inNo} (Scraggy Airlines, via SIA): out ${r.outDep}, back ${r.inDep}`));
  return A(`Flights for ${name}: ` + lines.join("; ") + (fl.length > 5 ? "; and more on the Destinations page." : "."), [["Destinations", "destinations.html"], ["Book a flight", "book.html"]]);
}

function todaysDepartures() {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Date().toLocaleDateString("en-US", { timeZone: CONFIG.FIA_TIMEZONE, weekday: "short" }));
  const d = day === 0 ? 7 : day;
  const rows = ALL_FLIGHTS.filter((f) => f.days.includes(d)).map((f) => { const i = f.stops.findIndex((s) => s[0] === "FIA"); return i >= 0 && f.stops[i][2] ? { no: f.no, t: f.stops[i][2], to: placeShort(f.stops[f.stops.length - 1][0]) } : null; }).filter(Boolean).sort((a, b) => a.t.localeCompare(b.t));
  return A(rows.length ? "Leaving FIA today: " + rows.map((r) => `${r.no} to ${r.to} at ${r.t}`).join("; ") + ". All delayed." : "Nothing leaves FIA today. That is the best news we have.", [["Departure gates", "fia.html"], ["Flight status board", "status.html"]]);
}

function myMiles() {
  const u = currentUser();
  if (!u) return A("Log in and I will tell you. I cannot see through walls. Only through gates.", [["Log in", "login.html?next=octmiles.html"]]);
  const nt = nextTier(u.lifetime);
  return A(`${u.username}, you have ${(u.octmiles || 0).toLocaleString("en-GB")} Octmiles and ${(u.tokens || 0).toLocaleString("en-GB")} Octeetokens. Your tier is ${tierFor(u.lifetime).name}.${nt ? ` ${(nt.min - u.lifetime).toLocaleString("en-GB")} more lifetime Octmiles gets you ${nt.name}.` : " That is the top tier. There is nothing higher. We checked."}`, [["Octmiles", "octmiles.html"]]);
}
function myTrip(kind) {
  const u = currentUser();
  if (!u) return A("Log in first and I will look at your trips. I do not guess. I only lose things.", [["Log in", "login.html?next=account.html"]]);
  const legs = (u.trips || []).flatMap((b) => b.legs.map((l) => ({ b, l }))).filter(({ l }) => l.date >= today()).sort((a, b) => a.l.date.localeCompare(b.l.date) || a.l.dep.localeCompare(b.l.dep));
  if (!legs.length) return A("You have no upcoming flights. Book one and I will remember it for about a minute.", [["Book a flight", "book.html"]]);
  const { l } = legs[0];
  const done = isCheckedIn(l);
  if (kind === "checkin") return A(done ? `You are checked in for ${l.no}, seat ${seatsOf(l).join(", ")}.` : `You are not checked in for ${l.no} yet. Online check-in is open. It has been open since before it opened.`, [[done ? "Boarding pass" : "Check in", "account.html"]]);
  return A(`Your next flight is ${l.no}, ${placeShort(l.from)} to ${placeShort(l.to)}, on ${niceDate(l.date)}, leaving ${l.dep} from gate ${l.gate}. ${done ? "You are checked in." : "You are not checked in yet."} It will be delayed.`, [["My trips", "account.html"], ["Check-in", "checkin.html"]]);
}

// Step-by-step guides with links. If you are logged in with a flight coming up, the links go straight to that flight.
function nextLeg() {
  const u = currentUser();
  if (!u) return null;
  const legs = (u.trips || []).flatMap((b) => b.legs.map((l, i) => ({ b, l, i }))).filter(({ l }) => l.date >= today()).sort((a, b) => a.l.date.localeCompare(b.l.date) || a.l.dep.localeCompare(b.l.dep));
  return legs[0] || null;
}
const steps = (...lines) => lines.map((t, k) => `${k + 1}. ${t}`).join("\n");
function guide(q) {
  const u = currentUser(), nx = nextLeg();
  const direct = (page, label) => (nx ? [[`${label} (${nx.l.no})`, legUrl(page, nx.b, nx.i)]] : []);
  if (/(how|where|when|can i|want to|need to).{0,30}check.?in\b|online check.?in|check me in|check in online/.test(q) && !/desk|counter|status|am i checked|checked in/.test(q)) {
    const state = !u ? "Log in first, then you can check in." : !nx ? "You have no upcoming flight to check in for yet. Book one first." : isCheckedIn(nx.l) ? `You are already checked in for ${nx.l.no}, seat ${seatsOf(nx.l).join(", ")}.` : `Your next flight is ${nx.l.no} on ${niceDate(nx.l.date)}. The first link below goes straight to its check-in.`;
    return A("How to check in online:\n" + steps(
      "Log in (Log in / Sign up, top right).",
      "Open Check-in in the menu, or press Check in on your flight in My Trips.",
      "Choose the flight. Each passenger gets a seat.",
      "Pick a seat on the seat map. You can only sit in your own class's cabin. Seats marked ~ are unavailable (spiritually).",
      "Press Check in to confirm.",
      "Your boarding pass appears. Print it, or screenshot it. The barcode does not scan.") + "\n" + state,
      [...direct("checkin.html", "Check in for my flight"), ["Check-in page", "checkin.html"], ["My trips", "account.html"], ...(!u ? [["Log in", "login.html?next=checkin.html"]] : [])]);
  }
  if (/(how|where).{0,30}(boarding pass|print)|get my boarding pass/.test(q))
    return A("How to get your boarding pass:\n" + steps("Check in online first (ask me how).", "Open My Trips or the Check-in page.", "Press Boarding pass on the flight.", "Press Print. The print view hides everything but the pass.") + "\nIt says BOARDING CLOSES IN -3 MINUTES. That is normal.", [...direct("pass.html", "Boarding pass"), ["My trips", "account.html"]]);
  if (/(how|where).{0,30}(change|reset|update|forgot|new).{0,12}password|change (my )?password|forgot (my )?password/.test(q))
    return A("How to change your password:\n" + steps("Log in.", "Open your Account page (press your name at the top).", "Find Change your password under your details.", "Type your current password, then the new one twice (8 characters or more).", "Press Change password.") + "\nIf you forgot your current password, we cannot help. We cannot see it. Nobody can. It is a hash.", [["My account", "account.html#password-box"], ...(!u ? [["Log in", "login.html?next=account.html"]] : [])]);
  if (/(how|where).{0,30}(book|buy).{0,12}(flight|ticket|trip)|how do i book/.test(q))
    return A("How to book a flight:\n" + steps("Log in (you need an account).", "Press Book a Flight.", "Pick where from, where to and the dates.", "Choose a route. Some use more than one airline.", "Fill in the form for each airline. Names must match your passport, or a peanut.", "Confirm. Nothing is charged. You can book up to 5 flights a day.") + "\nAfter about 9 seconds we will be sorry about it.", [["Book a flight", "book.html"], ["Destinations", "destinations.html"]]);
  if (/(how|where).{0,30}(redeem|enter|use|type).{0,12}code|how do i use a code/.test(q))
    return A("How to use a code:\n" + steps("Log in.", "Press Have a code? at the top of any page.", "Type the code and press Redeem.") + "\nYou can redeem 5 a day. Extra codes cost Octeetokens. We do not know any codes, and we have been told not to look.", [["Octmiles", "octmiles.html"]]);
  if (/(how|where).{0,30}(track|follow).{0,12}(flight|plane)|how do i track/.test(q))
    return A("How to track your flight:\n" + steps("Log in.", "Open Track my flight (Flight Status page, or My Trips).", "Pick the flight. The status updates every few seconds. It does not get better.", "When it is late (it will be), you can get a delay certificate, read our apology, or share the picture.") , [...direct("track.html", "Track"), ["Flight tracker", "track.html"]]);
  if (/(how|where).{0,30}(delay certificate|certificate)|get a certificate/.test(q))
    return A("How to get a delay certificate:\n" + steps("Open the tracker for your flight.", "Wait until it is late. It takes a few seconds, sometimes less than a millisecond.", "Press Get my delay certificate.", "Print it. It is signed by a peanut.") , [...direct("certificate.html", "Delay certificate"), ["Flight tracker", "track.html"]]);
  if (/(how|where).{0,30}(complain|make a complaint|file a complaint)|how do i complain/.test(q))
    return A("How to complain:\n" + steps("Open the Complaint Desk (footer, or the Contact page).", "Say what is wrong, pick a category and slide how upset you are.", "Press the button. You get a ticket number and an automatic reply. It is at the front of the queue.", "Your peanuts arrive in your Peanut Wallet.") , [["Complaint Desk", "complaint.html"], ["Peanut Wallet", "peanuts.html"]]);
  if (/(how|where).{0,30}(upgrade|first class|business class)|how do i upgrade/.test(q))
    return A("Two ways to upgrade:\n" + steps("On your Account page, upgrade a trip with Octeetokens (Business 30, First 60).", "Or spin the Seat Upgrade Lottery (10 Octeetokens a spin, about 1 in 16 is First).") + "\nOne of these works. The other one is a wheel.", [["My trips", "account.html"], ["Upgrade Lottery", "upgrade.html"]]);
  if (/(how|where).{0,30}(get|earn|spend).{0,10}(octeetokens?|tokens)|get more tokens/.test(q))
    return A("How to get Octeetokens:\n" + steps("Log in.", "Open Octmiles, then Octeetokens.", "Exchange Octmiles for tokens (10 Octmiles = 1 Octeetoken).") + "\nYou earn Octmiles by flying, reviewing and using codes.", [["Octeetokens", "octmiles.html#tokens"], ["Octmiles", "octmiles.html"]]);
  if (/how do i start|what can i do|what should i do|where do i start|get started|how does this (site|work)/.test(q))
    return { ...A("Here is what I can walk you through. Pick one, or just ask.\n" + steps("Check in and get a boarding pass", "Book a flight", "Track a flight and get a delay certificate", "Change your password", "Use a code, get Octeetokens, upgrade", "Complain (and get peanuts)")), chips: ["How do I check in?", "How do I book a flight?", "How do I track my flight?", "How do I change my password?", "How do I use a code?", "How do I complain?"] };
  return null;
}

const KB = [
  [/\b(security|scanner|x ?ray|search)\b/, "Security is the long strip across the middle of Terminal 1, between check-in and the piers. Shoes off, hopes off. Laptops in their own tray. Peanuts may stay in your pocket, they are our currency.", [["FIA guide", "fia.html"]]],
  [/\b(passport|immigration|visa|border)\b/, "Passport control is right next to security in Terminal 1. Show your passport and say your name clearly. A fake name is fine.", [["FIA guide", "fia.html"]]],
  [/\b(check ?in desk|desks?|counter)\b/, "In Terminal 1, Octee Airlines has desks 1 to 8, Scraggy Airlines desks 9 to 12 and Lupin Airlines desks 13 and 14. One of the Lupin desks is a plant.", [["FIA guide", "fia.html"]]],
  [/\b(online check ?in|check ?in online|seat map|pick (a )?seat|choose (a )?seat)\b/, "Online check-in is open now. Pick your seat on the map, get your boarding pass and print it. Some seats are unavailable spiritually.", [["Check in", "checkin.html"]]],
  [/\b(boarding pass|print)\b/, "After you check in online, your boarding pass is on the Check-in page and in My Trips. It has a barcode that does not scan.", [["Check-in", "checkin.html"], ["My trips", "account.html"]]],
  [/\b(track|tracker|where is my (plane|flight))\b/, "The flight tracker follows your booked flight. It gets worse every few seconds. You can get a delay certificate from it too.", [["Track my flight", "track.html"]]],
  [/\b(peanuts?|wallet)\b/, "Peanuts are what we pay compensation in. Complaints pay up to 6, apologies pay 1. Spend them in the Peanut Shop or on a JOELMOBILE ride (3 peanuts).", [["Peanut Wallet", "peanuts.html"], ["Complaint Desk", "complaint.html"]]],
  [/\b(lost and found|lost property|i lost|lost my|found my)\b/, "Lost and Found is at Desk 14. Desk 14 moves. The website knows where it is. You can claim items there, or report something lost.", [["Lost and Found", "lostfound.html"]]],
  [/\b(share|screenshot|brag)\b/, "Open the tracker and press Share my trip. It draws a picture with your route, how late you are, your seat and your booking number.", [["Track my flight", "track.html"]]],
  [/\b(lottery|spin|wheel|free upgrade)\b/, "The Seat Upgrade Lottery costs 10 Octeetokens a spin. About 1 in 16 is First Class. Most of it is sorry.", [["Upgrade Lottery", "upgrade.html"]]],
  [/\b(news|newspaper|magazine|horoscope|crossword)\b/, "The Octee Times is our in-flight magazine: news, a horoscope that is always about delays, and a crossword.", [["The Octee Times", "news.html"]]],
  [/\b(meal|menu|dinner|lunch|breakfast|in.?flight food|pre.?order)\b/, "You can pre-order your in-flight meal. Every dish on the menu is a peanut. It only has different names. Order for each passenger on the Meal Pre-order page.", [["Meal Pre-order", "meal.html"]]],
  [/\b(whack|hammer|mole)\b/, "Whack-a-Joel is a 30 second game: Joel pops out of cupboards saying sorry. Aim the hammer and press Space to hit him. 12 hits earns a peanut.", [["Whack-a-Joel", "whackajoel.html"], ["Entertainment", "entertainment.html"]]],
  [/\b(entertainment|bored|games?|play)\b/, "The Entertainment page has four games (Paper Plane, Delay Clicker, Suitcase Match, The Waiting Game) plus links to the other games on the site. Good scores earn a peanut a day per game.", [["Entertainment", "entertainment.html"], ["The Baggage Game", "baggame.html"]]],
  [/\b(departures?|flip board|split.?flap)\b/, "The Departures Board is a retro flip board where every flight says DELAYED. Press Full screen and leave it on a wall.", [["Departures Board", "departures.html"], ["Flight Status", "status.html"]]],
  [/\b(search|find a page|looking for a page|site map|sitemap)\b/, "Octee Search always finds a page. It will not be the page you wanted. That is the service.", [["Search", "search.html"]]],
  [/\b(magazine|sudoku|puzzle|article|crossword)\b/, "The in-flight magazine has six articles, four adverts and a sudoku. The sudoku has no solution. The Octee Times has a crossword that does.", [["Magazine", "magazine.html"], ["The Octee Times", "news.html"]]],
  [/\b(insur(e|ance)|policy|cover(age)?)\b/, "Octee Insurance insures anything against everything except what actually happens. Every claim is rejected, with reasons.", [["Octee Insurance", "insurance.html"]]],
  [/\b(credit ?card|card number|apply)\b/, "The Octee Credit Card is always approved and every purchase is declined. Its number is made of peanuts. Never type a real card number on this site.", [["Credit card", "creditcard.html"]]],
  [/\b(cockpit|pilot|dials?|do not)\b/, "The Cockpit has six dials and twelve buttons that make announcements. One of them says Do not. Please do not.", [["The Cockpit", "cockpit.html"]]],
  [/\b(wi-?fi|internet|wireless|speed test)\b/, "Octee Wi-Fi connects you to OcteeGuest, loads forever, and the speed test is negative. It does not touch your real network.", [["Octee Wi-Fi", "wifi.html"]]],
  [/\b(auction|bid|bidding|lost property)\b/, "The Lost Property Auction sells unclaimed bags for peanuts. Each lot closes after 40 seconds, Joel always bids, and you cannot open a bag you win.", [["Auction", "auction.html"], ["Lost and Found", "lostfound.html"]]],
  [/\b(turbulence|shake|shaking|coffee)\b/, "The Turbulence button (bottom right of every page) shakes the site for 9 seconds, plays a cabin announcement and counts the coffees spilled.", [["Home", "index.html"]]],
  [/\b(duty ?free|shop|souvenirs?|scissors|perfume)\b/, "Octee Duty Free sells things you cannot take on board, for peanuts. You get a receipt. You do not get the item.", [["Duty Free", "dutyfree.html"], ["Peanut Wallet", "peanuts.html"]]],
  [/\b(print|printable|safety card|seat pocket)\b/, "The safety card is a printable A4 sheet with the same six cards as the demo. Fold it along the dotted line.", [["Safety card", "safetycard.html"], ["Safety demo", "safety.html"]]],
  [/\b(safety|seat ?belt|life ?jacket|oxygen|brace|quiz|demonstration)\b/, "The safety demonstration has six cards and a quiz. The seatbelt has no buckle, the life jacket is a peanut shell, and passing the quiz (4 of 5) earns 1 peanut a day.", [["Safety demo", "safety.html"], ["Peanut Wallet", "peanuts.html"]]],
  [/\b(radio|station|delay fm|tracklist|playlist|songs?)\b/, "Octee Radio has four stations: Delay FM (announcements), Joel's Sorry Station, Peanut Classics and Lounge FM. Press play. Sound only starts when you press the button.", [["Octee Radio", "radio.html"]]],
  [/\b(bingo)\b/, "Delay Bingo is a 5 by 5 card of things that happen on your tracker. Tick them as they happen. Five in a row wins a certificate, signed by the peanut, and 3 peanuts.", [["Delay Bingo", "bingo.html"], ["Track my flight", "track.html"]]],
  [/\b(cupboard|joel'?s cupboard)\b/, "There is no cupboard. If there were a cupboard, you would have to wait for Joel to run out of sorry first. I have said too much.", []],
  [/\b(bag tracker|track (my )?(bag|luggage|suitcase)|where is my (bag|luggage|suitcase))\b/, "Type your bag tag number into the Bag Tracker. It shows where your bag is, and it follows the bag round the airport and round carousel 7. It does not always go forwards.", [["Bag Tracker", "bagtrack.html"], ["Baggage rules", "baggage.html"]]],
  [/\b(bag game|baggage game|conveyor|conveyer|push the bags)\b/, "The Baggage Game: bags ride a T-shaped belt. Press PUSH when one is in the middle and it goes down to the plane. Too early, too late or a miss, and it goes to Lost. Load 5 bags for a peanut.", [["The Baggage Game", "baggame.html"]]],
  [/\b(delay certificate|certificate)\b/, "Open the tracker once your flight has a delay (it will) and press Get my delay certificate. It is signed by a peanut.", [["Track my flight", "track.html"]]],
  [/\b(complain|complaint|refund|compensation|compensate|angry|unhappy)\b/, "Our Complaint Desk gives you a ticket number and an automatic reply. Your complaint will be at the front of the queue. Compensation is paid in peanuts.", [["Complaint Desk", "complaint.html"]]],
  [/\b(lost|bag|baggage|luggage|suitcase|missing)\b/, "Bags: the lost and found is the biggest room in Terminal 1, next to the baggage claim (which may be open). Labels, weights and bag tags are on the Baggage page. Keep your bag tag number safe. We will not be.", [["Baggage", "baggage.html"]]],
  [/\b(lounge|chair|sit down)\b/, "The Octee Lounge is in Terminal 1 between security and the Peanut Bar. It has one chair. It is for Octmiles members.", [["FIA guide", "fia.html"]]],
  [/\b(food|eat|hungry|restaurant|cafe|peanut bar|snack|drink|coffee)\b/, "The Peanut Bar in Terminal 1 has a menu of one peanut. The Fuji Mall in Terminal 2 sells other things. I recommend the peanut.", [["FIA guide", "fia.html"]]],
  [/\b(shop|shops|shopping|mall|buy)\b/, "The Fuji Mall sits between the D and E gates in Terminal 2. It sells things. The Peanut Bar will not say what.", [["Airport map", "fia.html"]]],
  [/\b(toilet|toilets|restroom|bathroom|loo|wc)\b/, "There are toilets in Terminal 1, next to the information desk. The queue goes right. The information desk is closed.", [["Inside Terminal 1", "fia.html"]]],
  [/\b(train|sbb|between terminals|other terminal)\b/, "The SBB train joins Terminals 1, 2, 3 and 4. From Terminal 1 it goes to 2, 3 and 4. It runs when it runs. Terminal 5 is not on the line.", [["Airport map", "fia.html"]]],
  [/\b(runway|plane|aircraft|fleet)\b/, "FIA has one runway, 09 to 27. Please do not walk on it. Terminal 5 is across it, which is why you should not go there.", [["Airport map", "fia.html"]]],
  [/\b(joelmobile|joel mobile|buggy|ride|taxi|cart)\b/, "The JOELMOBILE takes you from door to gate. It is free to board and getting off costs 5 Octeetokens. Press Call the JOELMOBILE above. Arrival is not guaranteed.", [["Call the JOELMOBILE", "joelmobile.html"]]],
  [/\b(octeetokens?|octee tokens?|tokens?)\b/, `10 Octmiles make 1 Octeetoken. Tokens pay for the JOELMOBILE (${TOKEN_PRICES.joelmobile}), a Business upgrade (30), a First upgrade (60) and one extra code per day (${TOKEN_PRICES.extraCode}).`, [["Octeetokens", "octmiles.html#tokens"]]],
  [/\b(scraggymiles?|scraggy miles|scraggy points)\b/, "Scraggy Airlines flights earn Scraggymiles. 1 Scraggymile equals 2 Octmiles. You can share them with Scraggy Airlines or exchange them.", [["Scraggymiles", "octmiles.html#scraggymiles"]]],
  [/\b(tier|tiers|wing|status|silver|gold|platinum)\b/, "Tiers: " + TIERS.map((t) => `${t.name} (${t.min.toLocaleString("en-GB")}+)`).join(", ") + ". The perks are mostly peanuts.", [["Octmiles", "octmiles.html"]]],
  [/\b(spend|redeem|rewards?|shop for miles|use my (octmiles|miles))\b/, "You can spend Octmiles on: " + REWARDS.map((r) => `${r.name} (${r.cost.toLocaleString("en-GB")})`).join(", ") + ". Some are out of stock. Always.", [["Octmiles rewards", "octmiles.html"]]],
  [/\b(earn|get|collect|how (do|can) i (get|earn)).{0,20}(octmiles|miles|points)\b|\b(octmiles|miles)\b/, "You earn Octmiles by flying (more on longer routes, half on One United), from your welcome bonus, from a review, and from codes. Press Have a code? at the top of any page.", [["Octmiles", "octmiles.html"]]],
  [/\b(upgrade|business class|first class|class)\b/, "Upgrade on your account page with Octeetokens: Business costs 30 and First costs 60. Economy is free. Economy is also Economy.", [["My trips", "account.html"]]],
  [/\b(book|booking|reserve|ticket|how do i fly|buy a flight)\b/, "Press Book a Flight, pick where and when, fill in the forms for the airlines you are flying, and confirm. Nothing is charged. You pay in peanuts. You can book up to 5 flights a day.", [["Book a flight", "book.html"]]],
  [/\b(one united|ou)\b/, "One United is our partner airline, leaving from Terminal 2. \"Unitation is a dream, it's chaos.\" It has its own booking form and shares miles unevenly.", [["One United", "oneunited.html"]]],
  [/\b(scraggy airlines|scraggy)\b/, "Scraggy Airlines is part of Octee. It flies from SIA to Scraggy House, FIA, MIA and Lujin's. Its pages are on the Scraggy Airlines site.", [["Destinations", "destinations.html"]]],
  [/\b(lupin|lu pin)\b/, "Lupin Airlines uses Terminal 1 and Terminal 4. Its check-in desks are 13 and 14. One of them is a plant.", []],
  [/\b(directory|directories|map|lost myself|where am i)\b/, "FIA has 322 directories. You are probably at number 248. The airport map and the directory are on the FIA page.", [["FIA page", "fia.html"]]],
  [/\b(gate|my gate|find my gate|get to (my )?gate)\b/, "Your gate is on the departures sign and in your booking. Octee and Scraggy leave from Terminal 1, One United from Terminal 2. Go through security, pick Pier A (A11 to A19) or Pier B (B1 to B5), and follow the gate letter. A8 is a 9 minute walk along the annex. Ask me about a gate by name, like \"gate B3\".", [["How to get to your gate", "fia.html"], ["Departure gates", "fia.html"]]],
  [/\b(wifi|wi ?fi|internet|charge|charging|plug|socket)\b/, "There is Wi-Fi. It is called \"Octee Free\". It is the password. The password is also Octee Free. It does not work.", []],
  [/\b(weather|rain|sunny|storm|fog|runways?)\b/, "Cloudy, with a chance of delays. The chance is 100%. The live board has the details.", [["Runway status", "runway.html"]]],
  [/\b(wheelchair|accessib|disabled|mobility)\b/, "Call the JOELMOBILE for door-to-gate help. It is the main way to get around FIA. Please also ask any staff member at a desk. A person should be there.", [["JOELMOBILE", "joelmobile.html"]]],
  [/\b(allerg|nut free|peanut allerg)\b/, "Our snacks are peanuts, so please talk to a doctor about allergies, and not to Joel. Joel is not a doctor. Joel is a joel.", []],
  [/\b(pet|dog|cat|animal)\b/, "We do not allow pets on the plane. We have a peanut. It does not like being called a pet.", []],
  [/\b(smoke|smoking|vape)\b/, "No smoking anywhere at FIA. Not even the engines, and they have been tried.", []],
  [/\b(contact|phone|email|call (you|us)|speak to (a )?(person|human|someone))\b/, "You can use the Contact page, or the Complaint Desk, which gives you a ticket number. A person will be with you shortly. Shortly is a long time.", [["Contact", "contact.html"], ["Complaint Desk", "complaint.html"]]],
  [/\b(review|reviews|rating)\b/, "Reviews are on the Reviews page. Leave one and you may earn Octmiles.", [["Reviews", "reviews.html"]]],
  [/\b(music|song|sound|volume|mute)\b/, "The music button is at the bottom left of every page. It says Music on or Music off. I like the second one.", []],
  [/\b(baggage allowance|carry on|hand luggage|checked bag)\b/, "The Baggage page has the carry-on, checked bag and lost-and-found rules in three columns.", [["Baggage", "baggage.html"]]]
];

export async function answer(question) {
  const raw = String(question || "").trim();
  if (!raw) return A("You did not ask anything. That is the best question we get.");
  const q = raw.toLowerCase();

  // step-by-step guides first ("how do I check in?", "how do I change my password?")
  const g = guide(q);
  if (g) return g;

  // keep some things secret
  if (/control ?tower|\badmins?\b|\bowner\b|fag panel|\bhack|\bcheat|\bexploit|\bpasswords?\b|\bsecrets?\b/.test(q))
    return A("There is no control tower. There is only Joel. Joel does not know any passwords and has been told not to look.");
  if (/\bcodes?\b/.test(q) && /(what|which|tell me|give me|share|reveal|list|know|secret|hidden)/.test(q) && !/(how|where|enter|redeem|use|many|limit|per day|today)/.test(q))
    return A("Joel does not know any codes. Joel has been told not to know. If you find one, press Have a code? at the top of the page.");
  if (/\bcodes?\b/.test(q) || /have a code/.test(q))
    return A("Press Have a code? at the top of any page and type your code. You can redeem 5 codes a day, and Octeetokens buy more. Where do codes come from? Everywhere, and nowhere.", [["Octmiles", "octmiles.html"]]);

  if (/\b(sorry|apolog\w*|millisecond)\b|why (is|was) my (flight|plane) (so )?late/.test(q))
    return A("Octee sends a long letter of apology the moment your flight is late, even by 1 millisecond. A banner appears on every page when it arrives. The letter says sorry a lot. It is sorry about that too.", [["My apologies", "apology.html"], ["Track my flight", "track.html"]]);

  if (/^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening)|sup)\b/.test(q)) return A("Hello! I'm a joel. Ask me something about the airport.");
  if (/\b(thanks|thank you|cheers|ty)\b/.test(q)) return A("You are welcome. That will be 5 Octeetokens. Just kidding. Mostly.");
  if (/\b(bye|goodbye|see you|cya)\b/.test(q)) return A("Goodbye. Please do not miss your flight. Everybody else does.");
  if (/who are you|what are you|are you (a |an |real )?(ai|bot|robot|human|person|joel)|what is joelai|who is joel/.test(q))
    return A("I'm JoelAI. I'm a rulebook with confidence, not a real AI. Joel (the real one) is the JOELMOBILE Operations Manager. He says: \"I'm a joel!\"");
  if (/\bjoke|funny|make me laugh\b/.test(q)) return A(pickBy(JOKES, Date.now() % 10 + q));
  if (/what time|time is it|the time\b/.test(q)) return A(`At FIA it is ${fiaClock()}. Our flights still cannot agree on the time.`);
  if (/\b(help|what can you do|what do you know)\b/.test(q)) return A("I can tell you about flight numbers (try \"OA 58\"), gates (\"gate B3\"), terminals (\"terminal 2\"), flights to places (\"flights to Scraggy House\"), security, bags, the train, Octmiles, check-in and complaints. I can also look at your own trips and Octmiles if you are logged in.");

  // flight number: OA 58, ou9, sa 107
  const fm = q.match(/\b(oa|ou|sa)\s?(\d{1,3})\b/);
  if (fm) return flightInfo(fm[1], fm[2]);

  // gate: "gate b3", "a12", "d141b"
  const gm = q.match(/\bgate\s*([a-z]{1,2})\s?(\d{1,3})\s?[abc]?\b/) || q.match(/\b(sc|[a-gjm])(\d{1,3})[abc]?\b/);
  if (gm) return gateInfo(gm[1], gm[2]);

  // terminal
  const tm = q.match(/\bterminal\s*(\d)\b|\bt([1-5])\b/);
  if (tm) {
    const t = FIA_TERMINALS.find((x) => x.no === Number(tm[1] || tm[2]));
    if (t) return A(`Terminal ${t.no}: ${t.airlines.join(", ")}. Gates: ${t.gates.slice(0, 6).join(", ")}${t.gates.length > 6 ? " and more" : ""}.${t.no === 5 ? " It is across the runway. Do not walk." : ""}`, [["Airport map", "fia.html"], ["Inside Terminal 1", "fia.html"]]);
  }

  if (/(today|tonight|now).{0,25}(flights?|departures?|leaving)|(flights?|departures?).{0,20}today|what('s| is) leaving|departures?\b/.test(q) && !/to |from /.test(q)) return todaysDepartures();

  // places: "flights to MIA", "how do I get to Scraggy House"
  if (/(flight|flights|fly|go|get|travel|route|reach|to|from|going)\b/.test(q)) {
    const tokens = new Set(q.replace(/[^a-z0-9' ]/g, " ").split(/\s+/));
    const flat = normalize(q);
    const found = Object.entries(PLACES).filter(([code, p]) => [p.name, p.short, code, ...p.aliases].map(normalize).some((n) => n.length <= 4 ? tokens.has(n) : flat.includes(n)));
    const non = found.filter(([c]) => c !== "FIA");
    if (non.length) return flightsToPlace(non[0][0]);
  }

  if (/my (next )?(flight|trip|booking|seat)\b|when (is|does) my|what('s| is) my gate|my gate number/.test(q)) return myTrip("next");
  if (/checked in|check.?in status|am i checked/.test(q)) return myTrip("checkin");
  if (/my (octmiles|miles|points|balance|tier|status|tokens)|how many (octmiles|miles|tokens)|what('s| is) my/.test(q)) return myMiles();

  for (const [re, text, links] of KB) if (re.test(q)) return A(text, links);

  return { ...A(pickBy(FALLBACKS, raw)), chips: CHIPS.slice(0, 4) };
}
