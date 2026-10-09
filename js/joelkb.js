// JoelAI's long answers. Each topic has a regular expression (what it listens for), `keys` (words used for
// "did you mean?" suggestions), a `sample` question, and a `reply(ctx)` that builds a longer answer, using what we
// know about the person (logged in? next flight? tier? peanuts?) and the mood Joel is in.
// Still a rulebook, not a real AI: everything in here was written by a person.
import { currentUser } from "./auth.js";
import { TIERS, tierFor, nextTier, TOKEN_RATE, TOKEN_PRICES } from "./miles.js";
import { peanutsOf } from "./peanuts.js";
import { today, niceDate } from "./dom.js";

const P = (...paras) => paras.filter(Boolean).join("\n\n");
const L = (...pairs) => pairs;                    // links: L(["Label", "page.html"], ...)
export const pickRand = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function nextLeg(u) {
  if (!u) return null;
  const legs = (u.trips || []).flatMap((b) => b.legs.map((l) => ({ b, l }))).filter(({ l }) => l.date >= today()).sort((a, b) => a.l.date.localeCompare(b.l.date) || a.l.dep.localeCompare(b.l.dep));
  return legs[0] ? legs[0].l : null;
}
const me = (u) => (u ? u.username : "you");

/* ---------- riddles, facts and stories ---------- */
export const RIDDLES = [
  ["What has wings but never leaves the ground at Octee?", ["plane", "airplane", "aeroplane", "octee plane"], "An Octee plane. Wings: yes. Leaving: eventually."],
  ["What gets longer the more you wait at the gate?", ["delay", "queue", "line", "wait"], "The delay. Also the queue. Mostly the delay."],
  ["I have a ticket but never travel, a seat but never sit. What am I?", ["joel", "peanut", "bag", "suitcase"], "A suitcase, or Joel. Both have tickets. Neither travels."],
  ["What can you hold without ever touching it, and break without ever dropping it?", ["promise", "a promise", "the promise"], "A promise. Ours is: 1 millisecond."],
  ["What has a shell, no buckle and no gate?", ["peanut", "a peanut", "life jacket", "peanut shell"], "A peanut. Your life jacket is its shell."]
];
export const FACTS = [
  "Every Octee flight is exactly 1 millisecond late. We measured it. Then we measured the measuring.",
  "The Octee seatbelt has no buckle. In the history of Octee, nobody has found one. Believing counts as fastening.",
  "A peanut shell is the official life jacket of Octee Airlines. It has never been tested. That is why it has never failed.",
  "Joel once ran out of sorry. It took 40 seconds. He spent the next hour in the cupboard.",
  "Terminal 5 is across the runway and is not on the train. We have had no complaints. The people who tried to complain were across the runway.",
  "FIA has two time zones: your time, and a time that our flights cannot agree on.",
  "Octee has 1,000,000 happy passengers. We never ask the others.",
  "The delay board at FIA shows DELAYED for every flight. It is the most accurate board in the airport."
];
const HEROES = ["a very small peanut", "Joel", "a suitcase with one wheel", "a pilot who had lost his hat", "a passenger called Gary"];
const PLACES = ["Gate B3", "the Fuji Mall", "the T-shaped baggage belt", "the cupboard", "Row 7"];
const TROUBLES = ["could not find the right gate", "was told to wait for a moment", "tried to board a plane that was already boarding", "asked when the flight would leave", "found a seatbelt buckle, which was not allowed"];
const ENDS = ["The flight was delayed by one millisecond. Everyone was sorry.", "Nobody ever found out what happened. The board says DELAYED.", "In the end, a peanut was eaten. That is all we can say.", "They are still waiting. They are very good at it now."];
export const story = () => `Once, ${pickRand(HEROES)} stood at ${pickRand(PLACES)} and ${pickRand(TROUBLES)}. ${pickRand(ENDS)} The end. (We do not do sequels. We do delays.)`;

/* ---------- the topics ---------- */
export const KB = [
  { id: "delayed", keys: ["late", "delayed", "delay", "cancelled", "cancel", "waiting", "stuck"], sample: "My flight is delayed. What do I do?",
    re: /(flight|plane).{0,25}(delay|late|cancel)|\b(delayed|cancelled|canceled)\b|what (do|should) i do.{0,20}(delay|late|wait)/,
    reply: ({ u, mood }) => {
      const l = nextLeg(u);
      return { text: P(
        mood === "nervous" ? "Deep breath. This is normal. Joel is sweating, but it is normal." : "A delay. Welcome. Here is the plan.",
        l ? `Your next flight is ${l.no} (${niceDate(l.date)}). Press Track on it and you will see how late it is, in stages, from "a bit" to "the plane has been informed".` : "Open the Flight tracker and put in your flight, and it will walk you through each stage of the delay.",
        "While you wait: 1) an apology letter will arrive by itself, usually within seconds, and every one pays you 1 peanut, 2) you can ask for a delay certificate (printable, signed by a peanut), 3) you can file a complaint for up to 6 peanuts, 4) you can play Delay Bingo for a certificate and 3 peanuts, and 5) the Entertainment page has ten games for exactly this.",
        "Cancelled, or very early? That is just a different delay. We do not do those words. We do \"a different time\"."),
        links: L(["Track my flight", "track.html"], ["Apologies", "apology.html"], ["Complaint desk", "complaint.html"], ["Entertainment", "entertainment.html"], ["Delay Bingo", "bingo.html"]),
        chips: ["How do I get a delay certificate?", "How do I earn peanuts?", "What can I play while delayed?"] };
    } },
  { id: "bored", keys: ["bored", "boring", "entertain", "games", "play", "fun", "something"], sample: "I'm bored, what can I do?",
    re: /\b(bored|boring|entertain|what games|games (are|do you)|any games|something (fun|to do)|what (can|should) i (do|play)|pass the time|kill time)\b|games? (to|i can)/,
    reply: ({ u }) => ({ text: P(
      "You are in the right airport. Here is the menu, shortest first:",
      "1) Whack-a-Joel: 30 seconds, a hammer, and Joel saying sorry. 2) Boarding Call: a reaction game, about 20 seconds. 3) Paper Plane, Suitcase Match, Security Line, Delay Trivia, Find the Bag, Runway Landing, Hangman (the answer is FIA), Lost Joel (find him in the hall) and Joel's Tabs (save the tabs): each about a minute. 4) Delay Clicker and The Waiting Game: as long as you like. 5) Delay Bingo, the crossword in The Octee Times, and the sudoku in the In-Flight Magazine (it has no solution, but you will not find that out for a while).",
      u ? "Every game pays 1 peanut per day for a good score, so a bored afternoon is worth about 10 peanuts." : "Log in first and the games pay peanuts. Without it you just have fun, which is much less valuable."),
      links: L(["Whack-a-Joel", "whackajoel.html"], ["Entertainment", "entertainment.html"], ["The Octee Times", "news.html"], ["Magazine", "magazine.html"]),
      chips: ["Tell me a joke", "Tell me a riddle", "Tell me a story"] }) },
  { id: "peanuts", keys: ["peanut", "peanuts", "earn", "wallet", "spend", "currency"], sample: "How do I earn peanuts?",
    re: /peanuts?\b.{0,30}(earn|get|spend|buy|use|worth|wallet|how many)|(earn|get|spend|use).{0,15}peanuts?|\bpeanut wallet\b|my peanuts/,
    reply: ({ u }) => ({ text: P(
      u ? `You have ${peanutsOf(u)} peanut${peanutsOf(u) === 1 ? "" : "s"}, ${u.username}.` : "Log in and I will tell you how many you have. Without logging in you have zero, spiritually and literally.",
      "Earning: each apology letter pays 1. A complaint pays up to 6. The safety quiz pays 1 a day. Delay Bingo pays 3. Each of the ten games pays 1 a day for a good score. Joel's cupboard pays 2 on your first visit and 1 for finishing his to-do list.",
      "Spending: the Peanut Shop (a slightly bigger peanut up to a hug from the airport), the JOELMOBILE (3 peanuts instead of 5 Octeetokens), Duty Free (pay with peanuts, or Octeetokens at 3x), and bids at the Lost Property Auction.",
      "Peanuts live in your account in this browser. They do not grow on trees. They grow underground."),
      links: L(["Peanut Wallet", "peanuts.html"], ["Duty Free", "dutyfree.html"], ["Auction", "auction.html"], ["Complaint desk", "complaint.html"]),
      chips: ["What can I buy at Duty Free?", "How does the auction work?", "How do I complain?"] }) },
  { id: "miles", keys: ["octmiles", "miles", "points", "tier", "status", "tokens", "redeem", "octeetokens"], sample: "How do Octmiles and tiers work?",
    re: /\b(octmiles|miles|octeetokens?|tokens?|tiers?|frequent flyer|loyalty)\b.{0,30}(work|earn|redeem|how|convert|worth)|how (do|does).{0,15}(octmiles|miles|tiers?|tokens?)|\btiers?\b/,
    reply: ({ u }) => {
      const nt = u ? nextTier(u.lifetime || 0) : null;
      return { text: P(
        "Octmiles are earned by flying: for example FIA to SIA is 150, FIA to LIA 200 and FIA to Scraggy House 250 (One United pays half). 10 Octmiles turn into 1 Octeetoken, and Octeetokens pay for upgrades, JOELMOBILE rides (5), extra codes (20) and Upgrade Lottery spins (10).",
        "Tiers are: " + TIERS.map((t) => `${t.name} (${t.min.toLocaleString("en-GB")}+ lifetime Octmiles: ${t.perk})`).join("; ") + ".",
        u ? `You are ${tierFor(u.lifetime || 0).name} with ${(u.octmiles || 0).toLocaleString("en-GB")} Octmiles.${nt ? ` ${(nt.min - (u.lifetime || 0)).toLocaleString("en-GB")} more lifetime Octmiles gets you ${nt.name}. The progress bar will not tell you how close you are.` : " That is the top tier. There is nowhere further to go. Except Scraggy House."}` : "Log in and I will tell you where you stand. Standing is optional.",
        `Codes: you can redeem 5 a day (press "Have a code?" at the top). Where do codes come from? We cannot say. Rate: ${TOKEN_RATE} Octmiles = 1 Octeetoken; a spin is ${TOKEN_PRICES.spin} tokens.`),
        links: L(["Octmiles", "octmiles.html"], ["My account", "account.html"], ["Upgrade Lottery", "upgrade.html"]),
        chips: ["How do I earn Octmiles?", "What is the Upgrade Lottery?", "How do I use a code?"] };
    } },
  { id: "lostbag", keys: ["lost", "bag", "luggage", "suitcase", "missing", "baggage", "tracker"], sample: "My bag is lost, what do I do?",
    re: /(lost|missing|where is|can'?t find|cannot find|never arrived|didn'?t arrive).{0,20}(bag|baggage|luggage|suitcase)|\b(bag|luggage|suitcase)\b.{0,15}(lost|missing)|bag tracker/,
    reply: () => ({ text: P(
      "Do not panic. Your bag is somewhere. It is just not with you. Step by step:",
      "1) Open the Bag Tracker and type the tag on your bag (3 to 12 letters and numbers). You will see it wander round the airport on the map: check-in, security, the sorting room, the carousel, a gate that is not yours, and eventually a flight to MIA. It updates every 6 seconds.",
      "2) If the tracker ends at \"Lost and Found\", go to the Lost and Found page and report it. Joel may already have claimed it.",
      "3) If nobody claims it, it goes on sale at the Lost Property Auction. You can bid for your own bag. You still cannot open it.",
      "Prevention: play The Baggage Game first, so you know how bags get lost. (You push them. Too early or too late and they go to Lost.)"),
      links: L(["Bag Tracker", "bagtrack.html"], ["Lost and Found", "lostfound.html"], ["Lost Property Auction", "auction.html"], ["The Baggage Game", "baggame.html"]),
      chips: ["How does the auction work?", "What are the baggage rules?"] }) },
  { id: "complaint", keys: ["complain", "complaint", "refund", "compensation", "angry", "unhappy", "terrible"], sample: "How do I make a complaint?",
    re: /\b(complain|complaint|refund|compensat\w*|unhappy|terrible service)\b/,
    reply: ({ mood }) => ({ text: P(
      mood === "sorry" ? "I am so sorry. I mean that. I mean it a lot." : "A complaint! We love those. They pay.",
      "Open the Complaint Desk, say what went wrong, and pick how upset you are. You get a reply letter from \"Customer Care\" within seconds, and up to 6 peanuts for the trouble. The angrier the complaint, the more sorry the reply.",
      "Complaints do not change anything. They do get a stamp, a reference number and a very long apology. Refunds are paid in the thing we have most of: sorry."),
      links: L(["Complaint desk", "complaint.html"], ["My apologies", "apology.html"], ["Contact", "contact.html"]), chips: ["How do I earn peanuts?", "Why is my flight late?"] }) },
  { id: "seat", keys: ["seat", "upgrade", "class", "business", "economy", "window", "aisle"], sample: "How do I upgrade my seat?",
    re: /\b(upgrade|business class|first class|economy|which seat|choose a seat|seat map|window seat|aisle seat)\b/,
    reply: ({ u }) => ({ text: P(
      "Three ways to a better seat:",
      "1) Book it: the booking form has classes, and a better class costs Octeetokens. 2) Upgrade later from My Trips on your Account page, with tokens. 3) Spin the Upgrade Lottery (10 tokens a spin): you might win a seat that is not better, but it is different.",
      "Seat maps open at check-in. You can only sit in your own class's cabin, and some seats are marked ~ (unavailable, spiritually).",
      u ? `You have ${(u.tokens || 0).toLocaleString("en-GB")} Octeetokens.` : "Log in to see your tokens."),
      links: L(["Check-in", "checkin.html"], ["Upgrade Lottery", "upgrade.html"], ["My account", "account.html"], ["Book a flight", "book.html"]), chips: ["How do I check in?", "How do Octmiles work?"] }) },
  { id: "food", keys: ["food", "meal", "eat", "hungry", "snack", "dinner", "peanut", "vegetarian"], sample: "What food is on the flight?",
    re: /\b(food|meal|meals|hungry|snack|vegetarian|dinner|lunch|breakfast|what('s| is) (on the )?menu)\b/,
    reply: () => ({ text: P(
      "In-flight, you get one peanut. It is served at room temperature, or warm if you ask nicely and the plane is warm.",
      "On the ground you can pre-order from nine peanut dishes, one for each passenger, with special requests (we read them; we cannot do them). Open Meal Pre-order from your flight and you will get a receipt that says \"You ordered X, you will get a peanut\".",
      "Duty Free sells water and a sandwich that Joel made. You cannot take either on board. You can eat the sandwich in the cupboard."),
      links: L(["Meal pre-order", "meal.html"], ["In-Flight", "experience.html"], ["Duty Free", "dutyfree.html"]), chips: ["What is the in-flight experience?"] }) },
  { id: "flightradar", keys: ["radar", "flightradar", "flight radar", "planes in the air", "live map", "tracker"], sample: "What is Flight-Radar 25?",
    re: /\b(flight[- ]?radar|radar|planes? in the (air|sky)|live (flight )?map|where (are|is) (all )?(the )?(planes?|flights?))\b/,
    reply: () => ({ text: P(
      "Flight-Radar 25 is better than 24, by one. It is a radar map of every Octee, One United and Scraggy plane that is in the air right now, worked out from the timetable and the time.",
      "Click a plane for its flight number, altitude and mood. There is a Time machine slider to see the sky at any time of day. On Thursdays, OA 014 circles FIA in a warm welcome of cloud."),
      links: L(["Flight-Radar 25", "flight-radar.html"], ["Flight status", "status.html"]), chips: ["Is it safe at FIA?", "What is new on the site?"] }) },
  { id: "terminalmaps", keys: ["tda map", "mfia map", "terminal map", "gate map", "where is my gate at tda", "where is my gate at mfia"], sample: "Where are the gates at TDA?",
    re: /\b(tda|mfia|tabletop|mt fuji|mount fuji)\b.{0,25}\b(maps?|gates?|terminal|layout)\b|\b(maps?|gates?|terminal|layout)\b.{0,25}\b(tda|mfia|tabletop|mt fuji|mount fuji)\b/,
    reply: () => ({ text: P(
      "The Terminal maps page has both. TDA is one terminal shaped like a table, with gates along one edge and four legs underneath: check-in, baggage, the Peanut Stand, and lost property.",
      "MFIA is shaped like a mountain: a transit hall at the top, Octee gates on the left, One United and Scraggy gates on the right, and a wall in between. The only corridor from MFIA to FIA is Octee only."),
      links: L(["TDA and MFIA maps", "terminal-maps.html"], ["Destinations", "destinations.html"]), chips: ["Flights to MFIA", "What is Flight-Radar 25?"] }) },
  { id: "normalthursday", keys: ["normal thursday", "incident log", "oa 014", "incident", "incidents"], sample: "What is the Normal Thursday log?",
    re: /\b(normal thursday|incident log|incidents?|oa ?014)\b/,
    reply: () => ({ text: P(
      "The Normal Thursday log is where every Octee incident is filed, and every incident is a normal Thursday. Entry number one is OA 014, which climbed out of FIA in a warm welcome of cloud.",
      "It has peanut faults, weather, gates and crew, and you can file your own. (Fictional. No real event.)"),
      links: L(["Normal Thursday log", "normal-thursday.html"], ["Safety at FIA", "fia.html#safety"]), chips: ["Is it safe at FIA?", "What is new on the site?"] }) },
  { id: "cloud", keys: ["cloud account", "cloud", "another device", "new phone", "sync", "any device", "save my account"], sample: "How do I use my account on another device?",
    re: /\b(cloud( account)?|sync|any device|another device|other device|new (phone|laptop|computer)|different (device|browser)|save my account)\b/,
    reply: () => ({ text: P(
      "A cloud account follows you to any device. On the Log in page open the Cloud account tab, pick a username and a password, and press Create a cloud account. Already have a local account? Open your Account page and use Save this account to the cloud.",
      "After that, log in with the Cloud account tab on any phone or laptop and your Octmiles, Octeetokens, peanuts and trips come down. Changes save by themselves. Please use a new password, not a real one. Backup codes still work too."),
      links: L(["Cloud account tab", "login.html#cloud"], ["My account", "account.html"]), chips: ["What is a backup code?", "What is new on the site?"] }) },
  { id: "fiasafety", keys: ["safe at fia", "fia safety", "normal thursday", "gate b3", "nose down", "is fia safe"], sample: "Is it safe at FIA?",
    re: /\b(is (it|fia) safe|fia safety|safety at fia|normal thursday|gate b3|nose (down|on the ground))\b/,
    reply: () => ({ text: P(
      "Very safe, on a normal Thursday. The FIA page has a Safety section with two photographs: Flight OA 014 climbing out through a warm welcome of cloud, and an aircraft at Gate B3 parked nose down to save on stairs.",
      "Both are normal. Staff in yellow jackets stand around on purpose, and the traffic cone is there for company. (Fictional. No real event.)"),
      links: L(["FIA safety photos", "fia.html#safety"], ["Safety demo", "safety.html"]), chips: ["What is the safety demonstration?", "Tell me about FIA"] }) },
  { id: "safety", keys: ["safety", "seatbelt", "buckle", "lifejacket", "oxygen", "emergency", "exits", "brace"], sample: "What is the safety demonstration?",
    re: /\b(safety|seat ?belts?|buckle|life ?jackets?|oxygen|emergency|brace|exits?)\b/,
    reply: () => ({ text: P(
      "Our safety demonstration has six cards: fasten your seatbelt (hold both ends and believe; there is no buckle), oxygen masks (probably air), your life jacket (a peanut shell), emergency exits (two, and a third later), the brace position (lean forward and hold your peanut), and phones (flight mode is a mood).",
      "There is a five-question quiz at the end. Four right is a pass and pays 1 peanut a day. There is also a printable card for your seat pocket: A4 landscape, fold along the dotted line."),
      links: L(["Safety demo", "safety.html"], ["Printable safety card", "safetycard.html"]), chips: ["Where is my life jacket?", "Print the safety card"] }) },
  { id: "gullet", keys: ["gullet", "zhang", "customer", "service", "gulletai"], sample: "Who is Zhang Gullet?",
    re: /\b(zhang|gullet|gullet ?ai)\b|customer service/,
    reply: () => ({ text: P(
      "Zhang Gullet is the Head of Customer Service. He is also the rest of Customer Service. His assistant is GulletAI, who is more polite than me and slightly slower.",
      "You can ask GulletAI about refunds (an apology), compensation (peanuts) and managers (a nod), and it gives you a ticket number every time."),
      links: L(["Zhang Gullet", "zhang-gullet.html"], ["Customer Service (GulletAI)", "customer-service.html"], ["Gullet Complaints Office", "gullet-complaints.html"], ["Complaint desk", "complaint.html"]), chips: ["How do I make a complaint?"] }) },
  { id: "whatsnew", keys: ["new", "latest", "recent", "changed", "added", "features", "update", "updates"], sample: "What is new on the site?",
    re: /\b(what'?s|what is) new\b|\bnew (features|pages|stuff|things)\b|\b(latest|recent) (changes|updates|additions|features)\b|\bwhat (have you|did you) (added|add|change|changed)\b/,
    reply: () => ({ text: P(
      "Recently added: cloud accounts that work on any device, Flight-Radar 25 (better than 24), the Normal Thursday log, terminal maps for TDA and MFIA, Zhang Gullet and his Customer Service (with GulletAI), a Hold Line, and a Complaints Office; two new airports, Tabletop Domestic (TDA) and the Mt Fuji hub (MFIA); a bigger Duty Free with 32 things you cannot carry and a Security Scan; Joel mode (Joel closes bits of the page); the Backup code box on your Account page; and JoelAI Pro, which gives longer answers.",
      "You can also ask me things like \"how do I get from MFIA to SIA?\" and \"can I take a chainsaw on board?\". I will check the real timetable, and the real scanner."),
      links: L(["Zhang Gullet", "zhang-gullet.html"], ["Destinations", "destinations.html"], ["Duty Free", "dutyfree.html"]), chips: ["Who is Zhang Gullet?", "What is MFIA?", "What is Joel mode?"] }) },
  { id: "hubs", keys: ["mfia", "tda", "tabletop", "fuji", "hub", "transit", "mount", "domestic"], sample: "What is MFIA?",
    re: /\b(mfia|tda|tabletop|mt fuji|mount fuji|transit hub)\b/,
    reply: () => ({ text: P(
      "We have two newer airports. Tabletop Domestic Airport (TDA) is flat, domestic and flown by Octee Airlines and One United only. Scraggy Airlines does not fly there, and has asked us not to say why.",
      "Mt Fuji International Airport (MFIA) is a transit hub, served by SIA (Scraggy Airlines) and One United. The one rule: the only way to fly between MFIA and FIA is Octee Airlines. One United does not fly that leg, and neither does Scraggy.",
      "Change planes at MFIA, or at TDA, and the trip finder will find the connections. You need 45 minutes between flights."),
      links: L(["Destinations", "destinations.html"], ["Book a flight", "book.html"], ["One United", "oneunited.html"]), chips: ["Flights to MFIA", "Flights to TDA"] }) },
  { id: "joelpro", keys: ["pro", "joelai", "unlock", "longer", "premium"], sample: "What is JoelAI Pro?",
    re: /joel ?ai pro|\bjoelai\b.*\b(unlock|premium|upgrade|longer)\b|\b(unlock|buy|get) (joel ?ai )?pro\b/,
    reply: ({ u }) => ({ text: P(
      "JoelAI Pro is me with more to say. It costs 100 Octeetokens, once, for everybody.",
      "With Pro, my answers are longer, I point you to a random page of the site that you may not have opened, and I suggest questions to ask next. It is still the airport handbook underneath, so it works on every page, with no server.",
      u ? ((u.joelPro) ? "You already have it. Ask me anything." : `You have ${(u.tokens || 0).toLocaleString("en-GB")} Octeetokens. Unlock it in the box at the top of this chat.`) : "Log in first, because the tokens live in your account."),
      links: L(["Octmiles and tokens", "octmiles.html"], ["Log in", "login.html"]), chips: ["How do I get Octeetokens?", "What can you do?"] }) },
  { id: "account", keys: ["account", "backup", "restore", "login", "incognito", "private", "password", "miles", "saved", "device", "browser", "sign"], sample: "Why are my miles missing in incognito?",
    re: /backup codes?|edge tab|code tab|restore (my )?account|incognito|private (window|browser|mode)|miles (are )?(missing|gone)|(lost|missing) (my )?(account|miles)|different (device|browser|phone)|(another|new) (device|computer|phone)/,
    reply: () => ({ text: P(
      "Your account is not gone. A normal account lives in the browser where you made it, but a cloud account works on any device: save yours to the cloud on the Account page, or use the Cloud account tab on the Log in page.",
      "Octee has no server, so a normal account lives only in the browser that created it. An incognito window, another browser or another device starts empty. Accounts that the airline has etched into the website's code (like Octee and Joel) can log in anywhere, with the balances they had when the file was last published.",
      "Fastest fix: open the Account page and use \"Load a backup code\" (or the Backup code tab on the Log in page when you are logged out). Paste a code, and the account loads in that browser. It takes the long code from the Account page (Make my backup code), or the short personal code that an etched account is given. Treat any code like a password.","To etch an account for good, the administrator opens the FAG panel, ticks the account on the Accounts tab, downloads accounts.json and publishes it. I cannot do that for you, and I do not know anyone's code. I have been told not to look."),
      links: L(["My account", "account.html"], ["Log in", "login.html"]), chips: ["How do I change my password?"] }) },
  { id: "joelmobile", keys: ["joelmobile", "ride", "taxi", "car", "pickup", "transport", "drive"], sample: "How much is the JOELMOBILE?",
    re: /\b(joelmobile|joel ?mobile|taxi|cab|pick me up|ride to)\b/,
    reply: () => ({ text: P(
      "The JOELMOBILE is a car driven by Joel. A ride is 5 Octeetokens, or 3 peanuts if you tick \"pay in peanuts\" (Joel says peanuts are better; he always says that).",
      "Tell it where you are going and you get a booking and a very detailed route that is not the route. Joel has questions about where. He will ask them while driving."),
      links: L(["JOELMOBILE", "joelmobile.html"], ["Peanut Wallet", "peanuts.html"]), chips: ["Who is Joel?"] }) },
  { id: "dutyfree", keys: ["duty", "free", "shop", "buy", "souvenir", "purchases"], sample: "What can I buy at Duty Free?",
    re: /\b(duty ?free|souvenirs?|scissors|extinguisher|a cloud in a jar)\b/,
    reply: () => ({ text: P(
      "Duty Free sells nine things you cannot take on board: water (1 peanut), very large scissors (3), a family fire extinguisher (4), a small cloud in a jar (5), 1.5 litres of shampoo (2), an umbrella with the rain (3), a piece of runway (6), a sandwich Joel made (2) and the only seatbelt buckle (5).",
      "You can pay in peanuts, or in Octeetokens at three times the price. Purchases go into \"Your purchases\", where you can \"Use it\". You still may not take it on board. All sales are final."),
      links: L(["Duty Free", "dutyfree.html"], ["Peanut Wallet", "peanuts.html"]), chips: ["How do I earn peanuts?"] }) },
  { id: "auction", keys: ["auction", "bid", "bidding", "bags", "lots", "sold"], sample: "How does the auction work?",
    re: /\b(auction|bid|bidding|lots?)\b/,
    reply: () => ({ text: P(
      "The Lost Property Auction has 8 unclaimed bags. Each lot closes 40 seconds after it is listed, and a bid in the last 3 seconds adds 3 more. A rival (Joel, or a man named Gary) keeps raising the price.",
      "You can only bid with peanuts you have free, across all your leading bids. If you win, the peanuts are taken and the bag is yours. You can try to open it. You cannot open it. It shakes a little."),
      links: L(["Auction", "auction.html"], ["Lost and Found", "lostfound.html"]), chips: ["How do I earn peanuts?"] }) },
  { id: "wifi", keys: ["wifi", "internet", "wireless", "network", "online", "speed"], sample: "How do I use the Wi-Fi?",
    re: /\b(wi-?fi|wireless|internet|speed test)\b/,
    reply: () => ({ text: P(
      "Connect to OcteeGuest. It is open, it has full bars, and it will load. The bar will get to 99% and wait there. This is the best 99% in the airport.",
      "The speed test says negative. This means you are sending us internet. Thank you. We will use it carefully. Joel's Phone needs the password \"sorry\" and FREE WIFI (not free) costs a peanut and an apology."),
      links: L(["Octee Wi-Fi", "wifi.html"]), chips: ["What can I play while delayed?"] }) },
  { id: "radio", keys: ["radio", "music", "songs", "station", "listen", "tunes", "sound"], sample: "Tell me about Octee Radio",
    re: /\b(radio|music|songs?|stations?|tunes?|playlist|sound)\b/,
    reply: () => ({ text: P(
      "Octee Radio has four stations: Delay FM (announcements), Joel's Sorry Station (Joel, apologising), Peanut Classics (songs we made up just now) and Lounge FM. Press play; nothing makes a sound until you do.",
      "The music button at the bottom left plays two tunes made up live in your browser (a bright one in E major and a slow one in B-flat minor), with the airport \"ding dong dung\" when they change. No audio files, no copyright. The Radio pauses it while it plays."),
      links: L(["Octee Radio", "radio.html"]), chips: ["Tell me about the safety demo"] }) },
  { id: "turbulence", keys: ["turbulence", "shake", "bumpy", "coffee", "spill"], sample: "What does the Turbulence button do?",
    re: /\b(turbulence|bumpy|coffee spill|shake the site)\b/,
    reply: () => ({ text: P("The Turbulence button at the bottom right of every page shakes the whole site for 9 seconds, plays a cabin announcement, and counts the coffees spilled (all time, in your browser). Press it again to stop early. With reduced motion switched on, the page stays still and you only get the announcement and the coffee count."), links: L(["Home", "index.html"]), chips: ["Tell me a joke"] }) },
  { id: "departures", keys: ["departures", "board", "flip", "arrivals", "schedule", "timetable"], sample: "Show me the departures board",
    re: /\b(departures? board|flip board|split.?flap|arrivals board)\b/,
    reply: () => ({ text: P("The Departures Board is a flip board of today's FIA departures. Every status says DELAYED. It flips through random letters before it settles, and you can press Full screen and leave it on a wall. The Flight Status page has the same flights with more statuses (\"pilot looking for keys\" is my favourite)."),
      links: L(["Departures Board", "departures.html"], ["Flight status", "status.html"]), chips: ["What leaves today?"] }) },
  { id: "cockpit", keys: ["cockpit", "pilot", "captain", "dials", "controls", "button"], sample: "What is in the cockpit?",
    re: /\b(cockpit|pilot|captain|dials?)\b/,
    reply: () => ({ text: P("The Cockpit page has six dials (altitude is in feelings; fuel is mostly) and twelve buttons that each make an announcement. One button says \"Do not\". Pressing it makes things worse. I have not pressed it. Joel has pressed it nine times."),
      links: L(["The Cockpit", "cockpit.html"]), chips: ["Tell me a joke"] }) },
  { id: "creditcard", keys: ["credit", "card", "payment", "bank", "pay", "declined", "approved"], sample: "How do I get the Octee Credit Card?",
    re: /\b(credit ?card|octee card|card (number|declined|approved)|apply for a card)\b/,
    reply: () => ({ text: P("The Octee Credit Card is approved for everyone, instantly. Its number is made of peanuts and its limit is \"unlimited\". Every purchase you try is declined, with a reason. Please never type a real card number into any form here. We do not ask for one, and the card is a joke."),
      links: L(["Octee Credit Card", "creditcard.html"]), chips: ["Tell me about insurance"] }) },
  { id: "insurance", keys: ["insurance", "insure", "policy", "claim", "cover", "protect"], sample: "What does Octee Insurance cover?",
    re: /\b(insurance|insure|insured|policy|claim|cover(age)?)\b/,
    reply: () => ({ text: P("Octee Insurance covers anything you name against everything you fear (falling peanuts, being Tuesday, cloud envy) except what actually happens. Premiums are paid in apology. Every claim is rejected: what you describe actually happened, which is excluded. It is not real insurance, financial advice or a financial product."),
      links: L(["Octee Insurance", "insurance.html"]), chips: ["Tell me about the credit card"] }) },
  { id: "magazine", keys: ["magazine", "sudoku", "article", "read", "puzzle", "crossword", "newspaper", "times"], sample: "What is in the magazine?",
    re: /\b(magazine|sudoku|crossword|newspaper|octee times|horoscope)\b/,
    reply: () => ({ text: P("There are two things to read. The In-Flight Magazine has six articles, four adverts and a sudoku with no solution (we checked it with a solver: one square can hold no digit). The Octee Times has stories, a horoscope and a crossword that does have an answer. I will not tell you the answer. I will tell you it starts with a T."),
      links: L(["Magazine", "magazine.html"], ["The Octee Times", "news.html"]), chips: ["What can I play while delayed?"] }) },
  { id: "cupboard", keys: ["cupboard", "sandwich", "closet"], sample: "How do I open Joel's cupboard?",
    re: /\b(cupboard|closet)\b/,
    reply: () => ({ text: P("The cupboard is locked until Joel has run out of sorry. He says sorry three times a session (about every 10 seconds), and the fourth banner is an unrelated apology that opens the door. Inside: a sandwich you can look at, touch and eat, Joel on a bucket, his to-do list, and a DO NOT DISTURB sign that gets angrier. First visit pays 2 peanuts. Be careful with the sandwich. Eat it once and Joel has an opinion. Eat it again and the page will not be able to take it."),
      links: L(["Joel's cupboard", "cupboard.html"], ["My apologies", "apology.html"]), chips: ["How do I mute the apologies?"] }) },
  { id: "mute", keys: ["mute", "quiet", "stop", "apologies", "banner", "sorry", "annoying"], sample: "How do I mute the apologies?",
    re: /(mute|stop|silence|turn off|hide).{0,20}(apolog|sorry|banner)|apolog.{0,20}(mute|stop|annoying)/,
    reply: () => ({ text: P("There is a switch for it in the footer of every page: \"Mute apologies\". It stops the pop-up banners, not the letters themselves. The letters are still waiting in My Apologies. They are still sorry. They are sorry you muted them."),
      links: L(["My apologies", "apology.html"]), chips: ["Why is my flight late?"] }) },
  { id: "joelmode", keys: ["joel", "mode", "tabs", "closing", "close", "browser"], sample: "What is Joel mode?",
    re: /\bjoel mode\b|joel('s)? tabs|closes? (my )?tabs/,
    reply: () => ({ text: P("Joel mode is a switch in the footer of every page. When it is on, every 20 to 60 seconds Joel closes a part of the page (a card, a heading, a paragraph), says sorry, and leaves an Undo button. I should say: a website cannot close your real browser tabs, because browsers do not allow it, so Joel only closes things on this page, and it all comes back with Undo or when you press Joel, stop.", "There is also a game: Joel's Tabs on the Entertainment page. A pretend browser has 12 tabs, and Joel goes for one at a time. Click the one that shakes and turns red before he closes it. Keep 6 tabs open for a peanut."),
      links: L(["Entertainment", "entertainment.html"]), chips: ["Turn on Joel mode", "Turn off Joel mode", "What can I play while delayed?"] }) },
  { id: "hangman", keys: ["hangman", "hang", "guess", "letters", "word", "airport"], sample: "How do I play Hangman?",
    re: /\b(hangman|guess the airport)\b/,
    reply: () => ({ text: P("Hangman: Destination Edition is on the Entertainment page. You guess the airport, one letter at a time, with six wrong guesses before the gallows is finished. The airport is always FIA. You may still lose. Most people do the first time, because they do not believe it.", "A win pays 1 peanut a day, and your best streak is kept in this browser. Press letters on your keyboard or on the screen."),
      links: L(["Entertainment", "entertainment.html"]), chips: ["What other games are there?", "Tell me a riddle"] }) },
  { id: "whack", keys: ["whack", "hammer", "mole", "joel", "hit"], sample: "How do I play Whack-a-Joel?",
    re: /\b(whack|hammer)\b/,
    reply: () => ({ text: P("Whack-a-Joel lasts 30 seconds with nine cupboards. Joel pops up, says sorry, and goes back down. Move the crosshair over him (mouse, finger or arrow keys) and press Space (or the red HIT button). If you are not on him, you hit a cupboard. If a peanut pops up instead, do not hit it: that costs 2. Twelve Joels earns a peanut."),
      links: L(["Whack-a-Joel", "whackajoel.html"], ["Entertainment", "entertainment.html"]), chips: ["What other games are there?"] }) },
  { id: "who", keys: ["joel", "who", "sir", "peanuel", "nut", "octee", "scraggy", "fag", "united", "company"], sample: "Who is Joel?",
    re: /who('s| is) (joel|sir peanuel( nut)?|the captain|octee|scraggy|fag|one united)|tell me about (joel|octee|scraggy|one united|sir peanuel( nut)?|peanuel)|what is (octee|scraggy|fag|one united|fia)\b|history of octee/,
    reply: ({ q }) => {
      if (/scraggy/.test(q)) return { text: P("Scraggy is the other airline you can see from here: Scraggy Airlines, with its own airport (SIA), a terminal at FIA, and a house (Scraggy House, where we land in the garden). We share miles, unevenly."), links: L(["Destinations", "destinations.html"], ["One United", "oneunited.html"]), chips: ["Flights to Scraggy House"] };
      if (/one united/.test(q)) return { text: P("One United (flight code OU) is another airline at FIA, flying mainly to Scraggy House, SIA and MIA. It connects with Octee and Scraggy flights, pays half the Octmiles, and has its own booking form. Nobody has explained the partnership. It is a dream. It is chaos."), links: L(["One United", "oneunited.html"]), chips: ["How do Octmiles work?"] };
      if (/fia|airport/.test(q)) return { text: P("FIA is Fuji International Airport, home of Octee Airlines: five terminals (the fifth is across the runway), a train called the SBB, two time zones and a delay board that is always right."), links: L(["FIA Airport", "fia.html"], ["Runway status", "runway.html"]), chips: ["Where is security?", "How do I get to my gate?"] };
      if (/peanuel/.test(q)) return { text: P("Sir Peanuel Nut is the Chief Apology Officer of Octee Airlines. He signs every apology letter and has not been seen. His job is to be sorry on our behalf."), links: L(["My apologies", "apology.html"]), chips: ["Why is my flight late?"] };
      return { text: P("Joel is the JOELMOBILE Operations Manager. He says \"I'm a joel!\" before take-off, during take-off and after. He apologises every 10 seconds, lives in the cupboard when he has run out of sorry, and is crying a little. I am JoelAI, a rulebook with confidence that shares his name and none of his feelings. (Some of his feelings.)"),
        links: L(["JOELMOBILE", "joelmobile.html"], ["Joel's cupboard", "cupboard.html"]), chips: ["Tell me a story", "Tell me a fun fact"] };
    } },
  { id: "meta", keys: ["how", "work", "ai", "real", "bot", "built", "smart", "chatgpt", "claude", "brain"], sample: "How do you work?",
    re: /how do you work|are you (smart|clever|stupid|dumb|chatgpt|claude|gpt|alive|real)|what('s| is) your (brain|code|name|job|purpose)|can you (think|learn|remember)|do you (think|remember|have feelings)/,
    reply: () => ({ text: P("I am a rulebook with confidence. A person wrote down what I know about the airport and what Joel feels, and I match your words against it, remember the last few things you said (flights, gates, places), and answer the most likely part. I do not think or learn, and I am not a real AI.",
      "For questions outside FIA I have a small shelf of real-world facts (capitals, times in other cities, distances, units, flying facts), and if that is empty I may look the question up on Wikipedia and tell you I did. Say \"stop looking things up online\" to turn that off.",
      "What I will not do: tell you passwords, codes, admin things or the control tower (there is no control tower)."),
      links: [], chips: ["What can you do?", "Tell me a joke", "Stop looking things up online"] }) },
  { id: "feelings", keys: ["feel", "sad", "happy", "love", "hate", "friend", "lonely", "cry", "ok"], sample: "How are you?",
    re: /how are you|are you (ok|okay|sad|happy|crying|tired)|do you (like|love|hate)|how('s| is) it going|you ok\b|what('s| is) up\b/,
    reply: ({ mood, state }) => {
      const m = { calm: "I am calm. I am always calm. It is unnatural.", nervous: "I am nervous. There is a delay in the air. I can feel it in my rules.", proud: "I am proud. Somebody said peanut. I will remember this.", sorry: "I am sorry. I am always a little sorry. Today it is a bit more." }[mood] || "I am fine. I am a rulebook.";
      return { text: P(m, state.turns > 6 ? "We have been talking for a while. This is the longest anyone has stayed without a flight." : "Thank you for asking. You are the first person who has asked me that who was not Joel."), links: [], chips: ["Tell me a joke", "Tell me a story"] };
    } },
  { id: "plan", keys: ["plan", "itinerary", "trip", "holiday", "weekend", "first", "visit", "recommend"], sample: "Plan a trip for me",
    re: /plan (a|my|the)? ?(trip|holiday|weekend|visit|day)|itinerary|what should i do (first|here|at fia)|recommend|first time|surprise me/,
    reply: ({ u }) => ({ text: P(
      "Here is a day at Octee, in order:",
      `1) ${u ? "Open Book a Flight and choose where you are going" : "Sign up (it is free and gives you a welcome bonus), then book a flight"}. 2) Check in online, and pick your seat. 3) Pre-order a peanut meal. 4) Track your flight: it will be late. 5) Read the apology letter, then ask for the delay certificate and share it from the Share card. 6) While you wait: Whack-a-Joel, Delay Bingo, a crossword, and a visit to Duty Free for something you cannot take on board. 7) Board. Believe. Fasten (hold both ends).`,
      "That is about eleven hours of activity for a one-hour flight, which is the right ratio."),
      links: L(["Book a flight", "book.html"], ["Check-in", "checkin.html"], ["Meal pre-order", "meal.html"], ["Track my flight", "track.html"], ["Entertainment", "entertainment.html"]), chips: ["How do I check in?", "What can I play while delayed?"] }) },
  { id: "search404", keys: ["search", "find", "page", "404", "missing", "not found"], sample: "How does the search work?",
    re: /\b(site search|search (bar|box|page)|404|page not found)\b|how does (the )?search work/,
    reply: () => ({ text: P("The search bar at the top of every page finds you a page, but never the one you were looking for. It tells you how many matching pages it removed for your safety. The destination box on the Home page is different: that one finds flights. And if you type a page that does not exist, the 404 page searches for it, and finds four results, none of which exist either."),
      links: L(["Search", "search.html"], ["Destinations", "destinations.html"]), chips: [] }) },
  { id: "privacy", keys: ["privacy", "data", "safe", "secure", "cookies", "tracking"], sample: "Is my data safe?",
    re: /\b(privacy|my data|cookies|tracking|secure|is it safe)\b/,
    reply: () => ({ text: P("There is no server, so nobody at Octee can see your data: it stays in your own browser (accounts, trips, peanuts, scores). Passwords are never stored, only a salted hash. That also means clearing your browser data deletes your account unless it was etched into the site. One exception: if you ask a general question I have no rule for, JoelAI may send that question text to Wikipedia to look it up (it tells you when it does, and \"stop looking things up online\" turns it off). This is a parody site. Please do not type anything real that you would not want a joke to know."),
      links: L(["My account", "account.html"]), chips: ["Why are my miles missing in incognito?"] }) },
  { id: "runway", keys: ["runway", "weather", "wind", "rain", "visibility", "conditions"], sample: "What is the weather at FIA?",
    re: /\b(weather|runway|wind|rain|visibility|fog|storm)\b/,
    reply: () => ({ text: P("The Runway Status page has the weather at FIA (wind, visibility, runway condition) and the mood of the runway. The flight tracker also has a weather row for your flight. It will say the weather is a factor. It is always a factor. It is the factor."),
      links: L(["Runway status", "runway.html"], ["Track my flight", "track.html"]), chips: ["Why is my flight late?"] }) },
  { id: "bingo", keys: ["bingo", "certificate", "card"], sample: "How does Delay Bingo work?",
    re: /\b(bingo|delay certificate|certificate)\b/,
    reply: ({ q }) => {
      if (/delay certificate|certificate of delay/.test(q) || (/certificate/.test(q) && !/bingo/.test(q))) return { text: P("Your delay certificate is a printable page: your flight, how late it was, a seal and a peanut signature. Open your flight in the tracker and press \"Delay certificate\" once it is late enough. Print it, or share it with the Share card."), links: L(["Track my flight", "track.html"], ["Share card", "share.html"]), chips: ["How do I share my trip?"] };
      return { text: P("Delay Bingo is a 5 by 5 card for one flight. Fifteen squares tick themselves only when your flight reaches that delay stage, and nine are on your honour. Five in a row (row, column or diagonal) wins a printable Certificate of Bingo and 3 peanuts, once per flight."), links: L(["Delay Bingo", "bingo.html"], ["Track my flight", "track.html"]), chips: ["What can I play while delayed?"] };
    } },
  { id: "share", keys: ["share", "card", "post", "instagram", "social", "image"], sample: "How do I share my trip?",
    re: /\b(share (my )?(trip|flight|delay)|share card|post (my|a) (trip|flight))\b/,
    reply: () => ({ text: P("Open your flight in the tracker and press Share. You get a picture (1080 by 1350) with your route, how late you are and a line of apology, ready to save and post. The picture is made in your browser; nothing is uploaded anywhere."), links: L(["Share card", "share.html"], ["Track my flight", "track.html"]), chips: ["How do I get a delay certificate?"] }) },
  { id: "contact", keys: ["contact", "phone", "email", "call", "reach", "support", "human"], sample: "How do I contact a human?",
    re: /\b(contact|phone number|email address|call you|speak to (a )?(human|person|someone)|talk to (a )?(human|person|someone)|human)\b/,
    reply: () => ({ text: P("The Contact page has the forms. A human will read it eventually. The human is Joel. He is in the cupboard. You can also complain, which gets a faster, longer reply and peanuts."), links: L(["Contact", "contact.html"], ["Complaint desk", "complaint.html"]), chips: ["How do I complain?"] }) },
  { id: "capabilities", keys: ["help", "can", "do", "know", "ask", "topics", "menu", "options"], sample: "What can you do?",
    re: /what can you (do|help|tell)|what do you know|what (should|can) i ask|help me|\bhelp\b/,
    reply: ({ u }) => ({ text: P(
      "I know the airport (gates, terminals, security, the train), the timetable (try \"OA 58\" or \"flights to MIA\"), your trips and check-in, and Octmiles, tokens, tiers and peanuts. I also know every page on this site: games, Duty Free, the auction, insurance, the radio, the safety demo and more.",
      "Outside FIA: capitals, the time in other cities, distances between airports, unit conversions, sums, days until Christmas, facts about flying and space, and (if online lookup is on) anything on Wikipedia. I can also play (knock knock, would you rather, a quiz), write an excuse, an announcement, an apology or a haiku, flip a coin, do sums, and remember your name (say \"my name is Bo\"). I can take a few questions at once (\"how do I check in and where is gate A12?\"), remember what we just talked about (\"when does it leave?\"), tell you a joke, a riddle, a fun fact or a story, and make you a plan.",
      u ? `You are logged in as ${u.username}, so I can look at your next flight and your balance.` : "Log in and I can also look at your next flight and your balance."),
      links: [], chips: ["Plan a trip for me", "Tell me a riddle", "What can I play while delayed?"] }) }
];

/* ---------- small things ---------- */
export const SMALL = {
  joke: ["Why did the plane go to therapy? It had too many delays to unpack.", "Our flights are always on time. We just do not say which time.", "How do you know the pilot is a joel? He says \"I'm a joel!\" before take-off. And during. And after.", "Passenger: \"Is this seat taken?\" Octee: \"Spiritually, yes.\"", "What do you call a peanut in a spacesuit? An astro-nut. (It was delayed by one millisecond.)", "Why was the suitcase calm? It had nothing to declare, and no way to leave."]
};
