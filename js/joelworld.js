// JoelAI outside FIA: a small offline handbook of the real world (capitals, time in other cities, distances between
// airports, unit conversions, sums, dates, and plain facts about space, flying and the planet). Every answer here was
// written down by a person; no network is used. Anything not here can go to the optional Wikipedia lookup (joelweb.js).
const R = (text, chips = [], links = []) => ({ text, links, chips });
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ASIDES = ["(Joel adds: this is not about FIA. He looked away from the airport for a moment. He is fine.)", "(From the handbook. The handbook has a shelf for the real world. It is a small shelf.)", "(Joel checked this on the back of a boarding pass.)", "(Outside FIA, things are almost always on time. Joel finds that suspicious.)"];
const aside = () => (Math.random() < 0.45 ? "\n\n" + pick(ASIDES) : "");

/* ---------- places ---------- */
const CITIES = {
  "london": ["Europe/London", 51.47, -0.45, "LHR"], "paris": ["Europe/Paris", 49.01, 2.55, "CDG"], "new york": ["America/New_York", 40.64, -73.78, "JFK"], "los angeles": ["America/Los_Angeles", 33.94, -118.41, "LAX"],
  "tokyo": ["Asia/Tokyo", 35.55, 139.78, "HND"], "singapore": ["Asia/Singapore", 1.36, 103.99, "SIN"], "sydney": ["Australia/Sydney", -33.94, 151.18, "SYD"], "dubai": ["Asia/Dubai", 25.25, 55.36, "DXB"],
  "hong kong": ["Asia/Hong_Kong", 22.31, 113.91, "HKG"], "beijing": ["Asia/Shanghai", 40.08, 116.58, "PEK"], "shanghai": ["Asia/Shanghai", 31.14, 121.81, "PVG"], "seoul": ["Asia/Seoul", 37.46, 126.44, "ICN"],
  "bangkok": ["Asia/Bangkok", 13.69, 100.75, "BKK"], "delhi": ["Asia/Kolkata", 28.56, 77.1, "DEL"], "mumbai": ["Asia/Kolkata", 19.09, 72.87, "BOM"], "istanbul": ["Europe/Istanbul", 41.26, 28.74, "IST"],
  "frankfurt": ["Europe/Berlin", 50.04, 8.56, "FRA"], "amsterdam": ["Europe/Amsterdam", 52.31, 4.76, "AMS"], "madrid": ["Europe/Madrid", 40.47, -3.56, "MAD"], "rome": ["Europe/Rome", 41.8, 12.25, "FCO"],
  "berlin": ["Europe/Berlin", 52.37, 13.5, "BER"], "moscow": ["Europe/Moscow", 55.97, 37.41, "SVO"], "cairo": ["Africa/Cairo", 30.12, 31.41, "CAI"], "johannesburg": ["Africa/Johannesburg", -26.14, 28.25, "JNB"],
  "nairobi": ["Africa/Nairobi", -1.32, 36.93, "NBO"], "sao paulo": ["America/Sao_Paulo", -23.43, -46.47, "GRU"], "mexico city": ["America/Mexico_City", 19.44, -99.07, "MEX"], "toronto": ["America/Toronto", 43.68, -79.63, "YYZ"],
  "vancouver": ["America/Vancouver", 49.19, -123.18, "YVR"], "san francisco": ["America/Los_Angeles", 37.62, -122.38, "SFO"], "chicago": ["America/Chicago", 41.98, -87.9, "ORD"], "auckland": ["Pacific/Auckland", -37.01, 174.79, "AKL"],
  "kuala lumpur": ["Asia/Kuala_Lumpur", 2.74, 101.71, "KUL"], "manila": ["Asia/Manila", 14.51, 121.02, "MNL"], "jakarta": ["Asia/Jakarta", -6.13, 106.66, "CGK"], "taipei": ["Asia/Taipei", 25.08, 121.23, "TPE"],
  "doha": ["Asia/Qatar", 25.27, 51.61, "DOH"], "zurich": ["Europe/Zurich", 47.46, 8.55, "ZRH"], "lisbon": ["Europe/Lisbon", 38.77, -9.13, "LIS"], "dublin": ["Europe/Dublin", 53.43, -6.27, "DUB"],
  "athens": ["Europe/Athens", 37.94, 23.94, "ATH"], "reykjavik": ["Atlantic/Reykjavik", 63.99, -22.62, "KEF"], "lima": ["America/Lima", -12.02, -77.11, "LIM"], "buenos aires": ["America/Argentina/Buenos_Aires", -34.82, -58.54, "EZE"],
  "honolulu": ["Pacific/Honolulu", 21.32, -157.92, "HNL"], "boston": ["America/New_York", 42.36, -71.01, "BOS"], "washington": ["America/New_York", 38.95, -77.46, "IAD"], "atlanta": ["America/New_York", 33.64, -84.43, "ATL"]
};
const ALIAS = { nyc: "new york", la: "los angeles", hk: "hong kong", kl: "kuala lumpur", sf: "san francisco", dc: "washington", "washington dc": "washington", "rio": null, "tokyo japan": "tokyo", "sg": "singapore", "ny": "new york", "bombay": "mumbai", "saigon": null };
const cityOf = (t) => { t = String(t || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\b(the|city|airport|please|now|right)\b/g, " ").replace(/\s+/g, " ").trim(); if (ALIAS[t]) t = ALIAS[t]; return t && CITIES[t] ? t : null; };
const cap = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
const km = (a, b) => { const r = Math.PI / 180, [, la1, lo1] = CITIES[a], [, la2, lo2] = CITIES[b]; const d = 2 * Math.asin(Math.sqrt(Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2)); return 6371 * d; };
const fmtN = (n) => Math.round(n).toLocaleString("en-GB");
const hm = (h) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")} min`;

const CAPITALS = { france: "Paris", germany: "Berlin", italy: "Rome", spain: "Madrid", portugal: "Lisbon", "united kingdom": "London", uk: "London", england: "London", scotland: "Edinburgh", wales: "Cardiff", ireland: "Dublin", japan: "Tokyo", china: "Beijing", india: "New Delhi", "south korea": "Seoul", "north korea": "Pyongyang", thailand: "Bangkok", vietnam: "Hanoi", singapore: "Singapore", malaysia: "Kuala Lumpur", indonesia: "Jakarta", philippines: "Manila", australia: "Canberra", "new zealand": "Wellington", canada: "Ottawa", usa: "Washington, D.C.", "united states": "Washington, D.C.", america: "Washington, D.C.", mexico: "Mexico City", brazil: "Brasilia", argentina: "Buenos Aires", chile: "Santiago", peru: "Lima", colombia: "Bogota", egypt: "Cairo", "south africa": "Pretoria (executive), Cape Town (legislative), Bloemfontein (judicial)", nigeria: "Abuja", kenya: "Nairobi", morocco: "Rabat", ethiopia: "Addis Ababa", russia: "Moscow", ukraine: "Kyiv", poland: "Warsaw", netherlands: "Amsterdam", belgium: "Brussels", switzerland: "Bern", austria: "Vienna", sweden: "Stockholm", norway: "Oslo", denmark: "Copenhagen", finland: "Helsinki", iceland: "Reykjavik", greece: "Athens", turkey: "Ankara", israel: "Jerusalem (as declared by Israel; many countries keep embassies in Tel Aviv)", "saudi arabia": "Riyadh", "united arab emirates": "Abu Dhabi", uae: "Abu Dhabi", qatar: "Doha", iran: "Tehran", iraq: "Baghdad", pakistan: "Islamabad", bangladesh: "Dhaka", "sri lanka": "Sri Jayawardenepura Kotte (Colombo is the largest city)", nepal: "Kathmandu", cuba: "Havana", jamaica: "Kingston", "czech republic": "Prague", czechia: "Prague", hungary: "Budapest", romania: "Bucharest", croatia: "Zagreb", taiwan: "Taipei", "hong kong": "(not a country) Hong Kong is a city", mongolia: "Ulaanbaatar", kazakhstan: "Astana" };

/* ---------- units ---------- */
const U = { km: ["len", 1000], kilometre: ["len", 1000], kilometer: ["len", 1000], kilometres: ["len", 1000], kilometers: ["len", 1000], m: ["len", 1], metre: ["len", 1], meter: ["len", 1], metres: ["len", 1], meters: ["len", 1], cm: ["len", 0.01], mile: ["len", 1609.344], miles: ["len", 1609.344], mi: ["len", 1609.344], ft: ["len", 0.3048], foot: ["len", 0.3048], feet: ["len", 0.3048], inch: ["len", 0.0254], inches: ["len", 0.0254],
  kg: ["mass", 1], kilo: ["mass", 1], kilos: ["mass", 1], kilogram: ["mass", 1], kilograms: ["mass", 1], g: ["mass", 0.001], gram: ["mass", 0.001], grams: ["mass", 0.001], lb: ["mass", 0.45359237], lbs: ["mass", 0.45359237], pound: ["mass", 0.45359237], pounds: ["mass", 0.45359237], oz: ["mass", 0.0283495], ounce: ["mass", 0.0283495], ounces: ["mass", 0.0283495],
  l: ["vol", 1], litre: ["vol", 1], litres: ["vol", 1], liter: ["vol", 1], liters: ["vol", 1], ml: ["vol", 0.001], gallon: ["vol", 3.78541], gallons: ["vol", 3.78541],
  kmh: ["spd", 1], "km/h": ["spd", 1], kph: ["spd", 1], mph: ["spd", 1.609344], knot: ["spd", 1.852], knots: ["spd", 1.852],
  c: ["temp", "c"], celsius: ["temp", "c"], f: ["temp", "f"], fahrenheit: ["temp", "f"], k: ["temp", "k"], kelvin: ["temp", "k"] };
const NICE = { km: "km", kilometre: "km", kilometer: "km", kilometres: "km", kilometers: "km", m: "m", metre: "m", meter: "m", metres: "m", meters: "m", cm: "cm", mile: "miles", miles: "miles", mi: "miles", ft: "feet", foot: "feet", feet: "feet", inch: "inches", inches: "inches", kg: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg", g: "g", gram: "g", grams: "g", lb: "lb", lbs: "lb", pound: "lb", pounds: "lb", oz: "oz", ounce: "oz", ounces: "oz", l: "litres", litre: "litres", litres: "litres", liter: "litres", liters: "litres", ml: "ml", gallon: "gallons", gallons: "gallons", kmh: "km/h", "km/h": "km/h", kph: "km/h", mph: "mph", knot: "knots", knots: "knots", c: "°C", celsius: "°C", f: "°F", fahrenheit: "°F", k: "K", kelvin: "K" };
function convert(q) {
  const m = q.match(/(-?\d+(?:\.\d+)?)\s*(?:degrees? )?(km\/h|[a-z]+)\s*(?:to|in|into|as)\s*(?:degrees? )?(km\/h|[a-z]+)\b/);
  if (!m || !U[m[2]] || !U[m[3]] || U[m[2]][0] !== U[m[3]][0]) return null;
  const v = parseFloat(m[1]), [kind, a] = U[m[2]], [, b] = U[m[3]];
  let out;
  if (kind === "temp") { const c = a === "c" ? v : a === "f" ? (v - 32) * 5 / 9 : v - 273.15; out = b === "c" ? c : b === "f" ? c * 9 / 5 + 32 : c + 273.15; }
  else out = (v * a) / b;
  const r = Math.abs(out) >= 100 ? Math.round(out * 10) / 10 : Math.round(out * 1000) / 1000;
  return R(`${v} ${NICE[m[2]]} is about ${r.toLocaleString("en-GB")} ${NICE[m[3]]}.${aside()}`, ["Convert 10 miles to km"]);
}

/* ---------- plain facts ---------- */
const FACTS = [
  [/tallest mountain|highest mountain|how (tall|high) is (mount )?everest/, "Mount Everest, at 8,849 metres above sea level (the figure agreed by Nepal and China in 2020)."],
  [/largest ocean|biggest ocean/, "The Pacific Ocean. It covers about a third of the planet."],
  [/longest river/, "It depends how you measure. The Nile is traditionally given as about 6,650 km, the Amazon as about 6,400 km, and some newer measurements put the Amazon first."],
  [/largest country|biggest country/, "Russia, by area (about 17 million square kilometres). The smallest is Vatican City."],
  [/smallest country/, "Vatican City, at about 0.44 square kilometres."],
  [/speed of light/, "299,792,458 metres per second, which is about 300,000 km/s. Octee flights are slower, and later."],
  [/how many continents/, "Seven, by the most common convention: Africa, Antarctica, Asia, Australia/Oceania, Europe, North America and South America."],
  [/how many planets|planets in (the|our) solar system/, "Eight: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune (Pluto is a dwarf planet)."],
  [/largest planet|biggest planet/, "Jupiter. You could fit about 1,300 Earths inside it."],
  [/hottest planet/, "Venus, at about 465 °C on the surface, because of its thick carbon dioxide atmosphere. Mercury is closer to the Sun but loses its heat at night."],
  [/closest planet to the sun|nearest planet to the sun/, "Mercury."],
  [/how far is the (moon|sun)|distance to the (moon|sun)/, "The Moon is about 384,400 km away on average. The Sun is about 150 million km away. A flight to the Moon is not on the timetable, and would still be delayed."],
  [/boiling point of water/, "100 °C (212 °F) at sea level. It is lower at altitude, which is why tea tastes odd on mountains."],
  [/freezing point of water/, "0 °C (32 °F) at normal pressure."],
  [/how many (days|hours|minutes|seconds) in a (year|day|hour|week)/, "A year has 365 days (366 in a leap year), a day 24 hours, an hour 60 minutes and a minute 60 seconds."],
  [/how many bones/, "An adult human has 206 bones. Babies have about 300, and many fuse as they grow."],
  [/largest organ/, "The skin."],
  [/chemical symbol (for|of) gold|symbol for gold/, "Au, from the Latin aurum."],
  [/chemical (formula|symbol) (for|of) water|formula (for|of) water/, "H2O: two hydrogen atoms and one oxygen atom."],
  [/who wrote romeo and juliet/, "William Shakespeare, around 1595."],
  [/who wrote pride and prejudice/, "Jane Austen, published in 1813."],
  [/first (person|man|human) (on|to walk on) the moon|who walked on the moon first/, "Neil Armstrong, on 20 July 1969 (Apollo 11). Buzz Aldrin followed him out."],
  [/who painted the mona lisa/, "Leonardo da Vinci, in the early 1500s."],
  [/\bvalue of pi\b|what is pi\b/, "3.14159265358979... It does not end, like a delay."],
  [/largest animal|biggest animal/, "The blue whale, up to about 30 metres long. It is the largest animal known to have ever lived."],
  [/fastest (land )?animal/, "On land, the cheetah (up to about 100 km/h in short bursts). In the air, the peregrine falcon in a dive (over 300 km/h)."],
  [/tallest animal/, "The giraffe, up to about 5.5 metres."],
  [/first (powered )?(flight|aeroplane|airplane)|wright brothers|who invented the (aeroplane|airplane)/, "The Wright brothers, Orville and Wilbur, made the first powered, controlled flight on 17 December 1903 at Kitty Hawk, North Carolina. The first flight lasted 12 seconds. It was probably not delayed, as they were the only ones going."],
  [/first (solo )?(flight )?across the atlantic|who flew (solo )?across the atlantic/, "Charles Lindbergh made the first solo non-stop flight across the Atlantic in May 1927, from New York to Paris in about 33.5 hours."],
  [/fastest (plane|aeroplane|airplane|aircraft|jet)/, "For a crewed, air-breathing jet, the Lockheed SR-71 Blackbird holds the record at about 3,530 km/h (Mach 3.3). The fastest passenger plane ever was Concorde, at about Mach 2 (2,150 km/h)."],
  [/biggest (passenger )?(plane|aeroplane|airplane)|largest (passenger )?(plane|aeroplane|airplane)/, "The Airbus A380 is the largest passenger airliner: a double-decker with a wingspan of about 80 metres. It was designed to carry over 800 people, usually about 500 to 550 in practice."],
  [/busiest airport/, "By passenger numbers, Atlanta's Hartsfield-Jackson has led most years, with Dubai the busiest for international passengers. The ranking changes yearly."],
  [/black box/, "Flight recorders are painted bright orange, not black, so that they are easy to find after an accident. There are two: one records the flight data and the other the cockpit voices."],
  [/contrails|white (lines|trails) (behind|from|in the sky)/, "Those are contrails: engine exhaust releases water vapour that freezes into ice crystals in the cold air at altitude, so each plane draws a thin cloud."],
  [/how do (planes|aeroplanes|airplanes|aircraft) fly|how does a plane (fly|stay up)|what keeps a plane (up|in the air)/, "Four forces: lift (the wings push air downwards, so the air pushes the wings up), thrust (the engines push forward), drag (the air resists) and weight (gravity). Lift beats weight when the plane is going fast enough."],
  [/why (do i|do we|do you) (have to )?(turn off|use) (my )?(phone|airplane mode|flight mode)|(airplane|aeroplane|flight) mode (why|reason)|why .{0,20} (airplane|aeroplane|flight) mode/, "Mostly to avoid radio interference and to save battery: at altitude your phone keeps searching for towers it can barely reach and shouts louder. Many airlines now allow it on in flight mode, or with Wi-Fi."],
  [/cruising (altitude|speed)|how high do (planes|aeroplanes|airplanes) fly|how fast do (planes|aeroplanes|airplanes) fly/, "Airliners cruise at about 10,000 to 12,000 metres (33,000 to 39,000 feet) at about 850 to 930 km/h."],
  [/why do (my )?ears pop|ear (pain|popping) (on|in) (a )?(plane|flight)/, "The cabin pressure changes during climb and descent, and the air in your middle ear has to catch up through a small tube. Swallowing, yawning or chewing opens the tube. Sweets help. Joel recommends a peanut."],
  [/what is jet ?lag|why do i get jet ?lag/, "Jet lag is your body clock disagreeing with the local time after crossing time zones. It is usually worse flying east. Daylight at the right time, and sleeping on local time, help most."],
  [/why is there turbulence|what causes turbulence/, "Turbulence is moving air: jet streams, thunderstorms, mountains and warm air rising. It feels dramatic but aircraft are built to cope with much more than they meet, and seatbelts are for the rare bump."],
  [/(plane|flying|air travel) (safer|safe)|is flying safe|safer .{0,10}(car|plane)/, "Statistically, commercial flying is one of the safest ways to travel per kilometre, safer than driving. The dangerous part of the trip is usually the drive to the airport."],
  [/how many (people|passengers) fly|how many flights (a|per) day/, "Before 2020, airlines carried about 4.5 billion passengers a year, and the world sees roughly 100,000 flights a day. Almost none of them are Octee flights."],
  [/what is (a )?(layover|stopover)/, "A layover is a short stop between connecting flights (usually under 24 hours). A stopover is a longer stay that you plan on purpose."],
  [/what is (an )?(iata|icao)( code)?/, "IATA codes are the three letters on your bag tag (LHR, JFK, SIN). ICAO codes are four letters used by pilots and air traffic control (EGLL, KJFK, WSSS). FIA is neither, which is why it is so hard to find."],
  [/how long (is|does) (a )?(flight|it take to fly) (from )?(london|new york)/, "London to New York takes about 7.5 to 8 hours going west, and about 6.5 to 7 hours coming back with the jet stream. Ask me for the distance between any two big cities and I will work out the time."]
];

/* ---------- dates ---------- */
const DAYS = { christmas: [11, 25], "new year": [0, 1], "new years": [0, 1], halloween: [9, 31], "valentine's day": [1, 14], valentines: [1, 14], "valentine's": [1, 14] };
const sameDay0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export function world(q, state, u) {
  // time in another city
  let m = q.match(/(?:what(?:'s| is) )?(?:the )?(?:current |local )?time (?:is it )?(?:right now )?in ([a-z ]+?)\??$/) || q.match(/what time is it in ([a-z ]+?)\??$/);
  if (m) {
    const c = cityOf(m[1]);
    if (c) { const tz = CITIES[c][0]; const t = new Date().toLocaleString("en-GB", { timeZone: tz, weekday: "long", hour: "2-digit", minute: "2-digit" }); return R(`It is ${t} in ${cap(c)} (${tz.replace(/_/g, " ")}). Our flights still cannot agree on the time, but they would agree on this one.${aside()}`, [`What is the distance from ${cap(c)} to London?`], []); }
  }
  // date / day
  if (/what (day|date) is (it|today)|today'?s date|what'?s the date|what day of the week/.test(q)) return R(`It is ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. The board agrees, and says DELAYED.`, ["How many days until Christmas?"]);
  if (/what year is it|which year is it|current year/.test(q)) return R(`It is ${new Date().getFullYear()}.`, []);
  m = q.match(/(?:how many days|how long|days) (?:until|till|to|left until|before) (christmas|new years?|halloween|valentine'?s?(?: day)?)/);
  if (m) {
    const [mo, d] = DAYS[m[1].replace(/ day$/, "")] || DAYS[m[1]]; let t = new Date(new Date().getFullYear(), mo, d); const n = sameDay0();
    if (t < n) t = new Date(t.getFullYear() + 1, mo, d);
    const days = Math.round((t - n) / 86400000);
    return R(days === 0 ? `It is ${m[1]} today. Joel is sorry it is not on time.` : `${days} day${days === 1 ? "" : "s"} until ${m[1].replace(/s$/, "") === "new year" ? "New Year" : m[1]}.`, ["What is the date today?"]);
  }
  // weather elsewhere
  if (/\b(weather|forecast|temperature|raining|snowing)\b.{0,12}\b(in|at|for)\b (?!fia|the airport|fuji)/.test(q) && !/\bfia\b/.test(q)) return R("I can only see the weather at FIA (cloudy, with a chance of delays), and the runway page has the rest. For anywhere else, a proper weather service will do better than a rulebook.", ["What is the weather at FIA?"], [["Runway status", "runway.html"]]);
  // capital of
  m = q.match(/capital (?:city )?of (?:the )?([a-z ]+?)\??$/) || q.match(/what is (?:the )?([a-z ]+?)'?s capital\??$/);
  if (m) { const c = CAPITALS[m[1].trim()]; if (c) return R(`The capital of ${cap(m[1].trim())} is ${c}.${aside()}`, ["Tell me a fun fact"]); }
  // distance, flight time
  m = q.match(/^how far is ([a-z ]+?) from ([a-z ]+?)\??$/);
  if (m && cityOf(m[1]) && cityOf(m[2]) && cityOf(m[1]) !== cityOf(m[2])) { const a = cityOf(m[1]), b = cityOf(m[2]), d = km(a, b); return R(`${cap(a)} to ${cap(b)} is about ${fmtN(d)} km (${fmtN(d / 1.609344)} miles) as the plane flies, which is about ${hm(d / 850 + 0.5)} in the air, not counting the delay.${aside()}`, [`What is the time in ${cap(b)}?`]); }
  m = q.match(/(?:distance|flight time|how long is the flight|how far)(?: is it)? (?:between|from) ([a-z ]+?) (?:and|to) ([a-z ]+?)\??$/) || q.match(/how (?:far|long) (?:is it|does it take) (?:to fly )?from ([a-z ]+?) to ([a-z ]+?)\??$/);
  if (m) {
    const a = cityOf(m[1]), b = cityOf(m[2]);
    if (a && b && a !== b) { const d = km(a, b), h = d / 850 + 0.5; return R(`${cap(a)} to ${cap(b)} is about ${fmtN(d)} km (${fmtN(d / 1.609344)} miles) as the plane flies. At a typical airliner speed that is about ${hm(h)} in the air, not counting the delay.${aside()}`, [`What is the time in ${cap(b)}?`], []); }
    if (a && b) return R("That is the same place. The flight takes no time and arrives on time. We do not run it.", []);
  }
  // airport codes
  m = q.match(/(?:airport|iata)? ?code (?:for|of) ([a-z ]+?)\??$/) || q.match(/what('s| is) the (?:iata |airport )?code (?:for|of) ([a-z ]+?)\??$/);
  if (m) { const c = cityOf(m[m.length - 1]); if (c) return R(`${cap(c)}'s main airport code is ${CITIES[c][3]}.`, [`What time is it in ${cap(c)}?`]); }
  m = q.match(/(?:what|which) (?:airport|city) is ([a-z]{3})\??$/);
  if (m) { const e = Object.entries(CITIES).find(([, v]) => v[3].toLowerCase() === m[1]); if (e) return R(`${e[1][3]} is the airport code for ${cap(e[0])}.`, []); }
  // convert
  const cv = convert(q); if (cv) return cv;
  // sums beyond +-*/
  m = q.match(/(?:square root of|sqrt(?: of)?) (\d+(?:\.\d+)?)/); if (m) return R(`The square root of ${m[1]} is ${Math.round(Math.sqrt(+m[1]) * 1e6) / 1e6}.`, []);
  m = q.match(/(\d+(?:\.\d+)?) (?:percent|%) of (\d+(?:\.\d+)?)/); if (m) return R(`${m[1]}% of ${m[2]} is ${Math.round((+m[1] * +m[2]) / 100 * 1e6) / 1e6}.`, []);
  m = q.match(/(\d+(?:\.\d+)?) (squared|cubed)/); if (m) return R(`${m[1]} ${m[2]} is ${Math.round(Math.pow(+m[1], m[2] === "squared" ? 2 : 3) * 1e6) / 1e6}.`, []);
  m = q.match(/(\d+(?:\.\d+)?) to the power (?:of )?(\d+)/); if (m && +m[2] <= 20) return R(`${m[1]} to the power of ${m[2]} is ${Math.round(Math.pow(+m[1], +m[2]) * 1e6) / 1e6}.`, []);
  m = q.match(/factorial of (\d{1,2})\b/); if (m) { let f = 1; for (let i = 2; i <= +m[1]; i++) f *= i; return R(`${m[1]}! is ${f.toLocaleString("en-GB")}.`, []); }
  // facts
  for (const [re, text] of FACTS) if (re.test(q)) return R(text + aside(), ["Tell me a fun fact", "Ask me something else"]);
  return null;
}
export const WORLD_TOPICS = ["capitals of countries", "the time in other cities", "distances and flight times between big airports", "airport codes", "converting units", "sums and percentages", "dates and countdowns (days until Christmas)", "facts about space, nature and flying"];
