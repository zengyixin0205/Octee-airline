// Shared facts and rules for Scraggy Airlines. Keep in sync with supabase/schema.sql.

export const HUB = "SIA";

export const PLACES = {
  SIA: { name: "Scraggy International Airport (SIA)", short: "SIA" },
  "scraggy-house": { name: "Scraggy House", short: "Scraggy House" },
  "mdm-wrong-wrong": { name: "Mdm Wrong-Wrong's", short: "Mdm Wrong-Wrong's" },
  lujin: { name: "Lujin's", short: "Lujin's" },
  fia: { name: "Fuji International Airport (FIA)", short: "FIA" }
};

// Every route is SIA <-> one destination.
export const ROUTES = {
  "scraggy-house": {
    base: 100,
    outNo: "SA101",
    inNo: "SA102",
    gate: "SCG001",
    // Daily times (Singapore time). out = SIA to destination, in = destination to SIA.
    outDep: "10:20", outArr: "10:50", inDep: "11:50", inArr: "12:20",
    blurb: "Home base. Snacks not included.",
    detail: "The birthplace of Scraggy Airlines. Come for the ambience, stay because the return flight is delayed."
  },
  "mdm-wrong-wrong": {
    base: 250,
    outNo: "SA103",
    inNo: "SA104",
    gate: "SCG002",
    outDep: "10:30", outArr: "11:20", inDep: "11:40", inArr: "12:30",
    blurb: "Arrive to be told you are wrong. Free of charge.",
    detail: "Grammar is corrected on arrival. So is your posture, your luggage and your choice of destination."
  },
  lujin: {
    base: 250,
    outNo: "SA105",
    inNo: "SA106",
    gate: "SCG003",
    outDep: "10:45", outArr: "11:40", inDep: "11:35", inArr: "12:30",
    blurb: "Nobody is sure what happens here. Lujin is.",
    detail: "Lujin has a plan. Lujin will not share the plan. Please bring snacks."
  },
  fia: {
    base: 300,
    outNo: "SA107",
    inNo: "SA108",
    gate: "SCG012",
    outDep: "11:00", outArr: "12:50", inDep: "14:00", inArr: "15:50",
    blurb: "Home of Octee Airlines. They say they are doing well.",
    detail: "Fuji International Airport. Octee Airlines lives here. We fly there anyway. Bring your own peanut."
  }
};

// Departure and arrival time of a Scraggy flight number, e.g. flightTimes("SA103") -> { dep: "10:30", arr: "11:20" }
export function flightTimes(flightNo) {
  for (const r of Object.values(ROUTES)) {
    if (r.outNo === flightNo) return { dep: r.outDep, arr: r.outArr };
    if (r.inNo === flightNo) return { dep: r.inDep, arr: r.inArr };
  }
  return null;
}

export const AIRCRAFT = [
  { id: "airbus-777", name: "Airbus 777", blurb: "Has wings. We checked twice.", seats: "Around 300 seats (and one mystery seat)" },
  { id: "boeing-330", name: "Boeing 330", blurb: "Fits 330 passengers. We have never counted.", seats: "330 seats, allegedly" },
  { id: "airbus-747", name: "Airbus 747", blurb: "The classic. Has a hump. Nobody knows why.", seats: "Seats in two decks and a hump" },
  { id: "boeing-380", name: "Boeing 380", blurb: "So big it has its own weather.", seats: "Seats you need a map for" }
];
export const SURPRISE = { id: "surprise", name: "Surprise me", blurb: "We will pick the wrong one." };

export const CLASSES = [
  { id: "economy", name: "Scraggy Economy", bonus: 0, joke: "You are on the plane. That is the offer." },
  { id: "business", name: "Scraggy Business", bonus: 0, joke: "A slightly softer seat. Slightly." },
  { id: "first", name: "Scraggy First", bonus: 50, joke: "Comes with pants." },
  { id: "scraggy", name: "Scraggy Class", bonus: 100, joke: "The class only Scraggy understands. Food from Scraggyton." }
];

export const SNACKS = {
  standard: ["A biscuit (single)", "A pretzel of uncertain origin", "Nothing (traditional)"],
  scraggy: [
    "Scraggyton Crunchy Pants Chips",
    "Scraggyton Slow-Cooked Mystery Stew",
    "Scraggyton Biscuit (single)",
    "Scraggyton Sparkling Water (still)",
    "Scraggyton Dessert of the Day"
  ]
};

export const REASONS = [
  "Business (unclear)",
  "Pleasure (also unclear)",
  "Visiting Mdm Wrong-Wrong to be corrected",
  "Escaping Scraggy (it will follow)",
  "I was told to",
  "Just here for the biscuit"
];

export const DAILY_LEG_LIMIT = 5;
export const WELCOME_BONUS = 100;
export const SECRET_BONUS = 500;
export const SECRET_CODE = "gate-9-3-4";
export const SPELL = "scraggycadabra";

export function normalizeSpell(text) {
  return String(text || "").toLowerCase().replace(/[^a-z]/g, "");
}

// Tiers are based on LIFETIME points (spending never lowers a tier).
export const TIERS = [
  { id: "none", name: "No pants yet", min: 0, perk: "You have your own two legs." },
  { id: "bronze", name: "Bronze Pants", min: 500, perk: "Priority boarding for the wrong plane." },
  { id: "gold", name: "Gold Pants", min: 1000, perk: "Free imaginary snack every flight." },
  { id: "platinum", name: "Platinum Pants", min: 10000, perk: "Personally ignored by the CEO." },
  { id: "scraggy", name: "Scraggy Pants", min: 25000, perk: "The CEO knows your name. The CEO cannot use it." }
];

export function tierFor(lifetime) {
  let result = TIERS[0];
  for (const t of TIERS) if (lifetime >= t.min) result = t;
  return result;
}

export function nextTier(lifetime) {
  return TIERS.find((t) => t.min > lifetime) || null;
}

export const REWARDS = [
  { id: "sticker", name: "Digital Scraggy sticker", cost: 200, once: true, blurb: "Shows on your profile. Does not stick to anything." },
  { id: "snack", name: "Free imaginary snack", cost: 300, once: false, blurb: "A voucher for a snack that does not exist." },
  { id: "bag-upgrade", name: "Bag \"upgrade\"", cost: 500, once: false, blurb: "Your bag will be lost in first class." },
  { id: "voicemail", name: "Voicemail from Mdm Wrong-Wrong", cost: 750, once: false, blurb: "A quote, just for you. It will be wrong." },
  { id: "seat-tag", name: "Custom seat name tag", cost: 1000, once: true, needsNote: true, noteLabel: "Name for your seat tag", blurb: "Your name on a seat you will not get." },
  { id: "hat", name: "Captain's hat (virtual)", cost: 2000, once: true, blurb: "A profile badge. Fits every head. Fits no head." },
  { id: "name-gate", name: "Name a gate after yourself", cost: 5000, once: true, needsNote: true, noteLabel: "Name for your gate", blurb: "Appears in the Airport Guide. Nobody will find it." },
  { id: "cockpit-selfie", name: "Cockpit selfie with CEO Scraggy", cost: 10000, once: true, blurb: "The ultimate prize. The camera is optional." }
];

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const PASSWORD_MIN = 8;

export function placeName(id) {
  return PLACES[id] ? PLACES[id].short : id;
}

export function err(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

// Every flight starts or ends at SIA: never both, never neither.
export function planLegs(origin, destination, isReturn) {
  if (!PLACES[origin] || !PLACES[destination] || origin === destination) throw err("bad_route");
  if ((origin === HUB) === (destination === HUB)) throw err("sia_rule");
  const dest = origin === HUB ? destination : origin;
  const r = ROUTES[dest];
  if (!r) throw err("bad_route");
  const outbound = origin === HUB;
  const legs = [
    {
      origin,
      destination,
      direction: outbound ? "outbound" : "inbound",
      flightNo: outbound ? r.outNo : r.inNo,
      gate: r.gate,
      dest
    }
  ];
  if (isReturn) {
    legs.push({
      origin: destination,
      destination: origin,
      direction: outbound ? "inbound" : "outbound",
      flightNo: outbound ? r.inNo : r.outNo,
      gate: r.gate,
      dest
    });
  }
  return legs;
}

export function classBonus(classId) {
  const c = CLASSES.find((x) => x.id === classId);
  return c ? c.bonus : 0;
}

export function legPoints(dest, classId) {
  return ROUTES[dest].base + classBonus(classId);
}

export function bookingRef() {
  return "SCRAG-" + String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

const FRIENDLY = {
  sia_rule: "No direct flights. Everything goes through SIA. Even your sadness.",
  bad_route: "That route does not exist. Neither does our punctuality.",
  bad_class: "That class does not exist. Pick one that does.",
  bad_aircraft: "That plane does not exist. Well, none of them do, but that one especially.",
  bad_date: "That date is wrong. Mdm Wrong-Wrong would be proud.",
  daily_limit: "Sorry, you have flown too much today. Come back tomorrow.",
  not_logged_in: "Please log in first. We need to know who to lose the bags of.",
  bad_username: "Usernames are 3 to 20 letters, numbers or underscores.",
  bad_password: "Passwords need at least " + PASSWORD_MIN + " characters. Ours has more, and it is still lost.",
  username_taken: "That username is taken. Someone got there first. Like the bags.",
  bad_login: "Wrong username or password. Or right. Hard to say.",
  not_enough_points: "You do not have enough points for that. Fly somewhere. Eventually.",
  already_redeemed: "You already have this one. It does not come in a second.",
  bad_reward: "That reward does not exist. Yet.",
  note_required: "This reward needs a name typed in first.",
  already_claimed: "You already claimed the gate bonus. The wall remembers.",
  bad_code: "That is not a real secret. Nice try.",
  storage: "Your browser will not let us save anything. Please allow site storage.",
  network: "We could not reach the Scraggy servers. They are probably delayed."
};

export function friendlyError(e) {
  if (e && e.code && FRIENDLY[e.code]) return FRIENDLY[e.code];
  return "Something went wrong. Very on brand.";
}

export function validateCredentials(username, password) {
  if (!USERNAME_RE.test(String(username || "").trim())) throw err("bad_username");
  if (String(password || "").length < PASSWORD_MIN) throw err("bad_password");
}

export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
