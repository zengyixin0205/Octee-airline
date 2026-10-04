// FIA weather and runways. Looks live: it changes every 2 minutes, but it is worked out from the time, so everyone sees the same.
import { hash } from "./tripkit.js";

export const SLOT_MS = 120000;
const pickBy = (arr, seed) => arr[hash(seed) % arr.length];
const SKY = [
  "Fog (indoors)", "Light rain (from the ceiling)", "Sunny (spiritually)", "Clear, apart from a cloud over Gate B3",
  "Snow (it is paper, from the printer)", "Windy (someone left a door open)", "Thunder (it is Joel, in the JOELMOBILE)", "A light drizzle of peanuts"
];
const RUNWAY = [
  "OPEN (we think)", "CLOSED. It is a road today", "BUSY being a runway", "CLOSED for a picnic",
  "OPEN, but only for pigeons", "WET (the pigeons are crying)", "OPEN (the planes disagree)", "CLOSED. There is a hole shaped like a plane"
];
const WINDS = ["from the north", "from the east", "from the south-ish", "from a fan", "sideways", "from Joel"];
const MOODS = ["Calm", "Nervous", "Suspicious", "Extremely calm (which is worse)", "Late", "Peanut-flavoured"];
const MOVES = [
  "A plane is lined up on {r}. It does not know why.",
  "{r}: a van is crossing. The van has the right of way. The van is a cloud.",
  "{r}: take-off cleared. Take-off declined.",
  "{r}: a pigeon has been asked to move. The pigeon is considering it.",
  "{r}: landing! (We were told it was a landing.)",
  "{r}: closed for a minute, while the road finishes being a road."
];

export const slotOf = (now = Date.now()) => Math.floor(now / SLOT_MS);

export function fiaWeather(now = Date.now()) {
  const s = slotOf(now);
  const sky = pickBy(SKY, "sky" + s);
  return {
    slot: s, sky,
    temp: 8 + (hash("t" + s) % 20),
    wind: `${3 + (hash("w" + s) % 38)} km/h ${pickBy(WINDS, "wd" + s)}`,
    vis: pickBy(["200 m (ish)", "1 km (to the first wall)", "10 km (the gate is the only thing in it)", "Unlimited (we looked)", "Unknown, it is foggy in here"], "v" + s),
    mood: pickBy(MOODS, "m" + s),
    runways: [1, 2, 3].map((r) => ({ id: `Runway ${r}`, status: pickBy(RUNWAY, `r${r}|${s}`) })),
    moves: [0, 1, 2, 3].map((k) => pickBy(MOVES, `mv${k}|${s}`).replace("{r}", `Runway ${1 + (hash(`mr${k}|${s}`) % 3)}`)),
    reason: `Delayed by weather: ${sky.toLowerCase()}`
  };
}
