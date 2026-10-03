// Shared by the flight tracker and the delay certificate.
import { load } from "./store.js";
import { tripId } from "./tripkit.js";

// status, extra delay in minutes it causes, how far along the line the plane appears (%)
export const STAGES = [
  ["ON TIME (we said)", 0, 0],
  ["1 MILLISECOND LATE (we are so sorry)", 0, 2],
  ["GATE CHANGED", 10, 6],
  ["BOARDING (since Tuesday)", 0, 12],
  ["DELAYED", 35, 10],
  ["GATE CHANGED (again)", 15, 14],
  ["PILOT LOOKING FOR KEYS", 25, 14],
  ["DELAYED (emotionally)", 45, 12],
  ["ENGINES BEING CHECKED", 30, 20],
  ["WAITING FOR A PEANUT", 20, 20],
  ["LOOKING FOR THE PLANE", 60, 8],
  ["PLANE FOUND (wrong one)", 40, 30],
  ["PLANE FOUND (right one, no wings)", 90, 26],
  ["TAXIING (to the wrong gate)", 25, 55],
  ["TAKE-OFF DELAYED (the runway is busy being a road)", 70, 55],
  ["DEPARTED (we think)", 0, 100]
];
export const LAST = STAGES.length - 1;
export const NOTES = {
  1: "Your flight is 1 millisecond late. We have written you a letter about it.",
  2: "Your gate moved. It did not tell anyone.",
  3: "Boarding started on Tuesday. Please join the queue that already exists.",
  6: "The keys are in the pilot's other trousers.",
  8: "Someone is looking at an engine. Looking counts.",
  10: "We have a plane. We are not sure where it is.",
  12: "The right plane has been found, but it is being repaired.",
  15: "The plane has left. We believe you were meant to be on it."
};


export const trackKey = (b, i) => `octee.track.${tripId(b)}.${i}`;
export const delayAt = (stage) => STAGES.slice(0, stage + 1).reduce((n, s) => n + s[1], 0);
// How bad is it for this flight so far? (reads what the tracker saved in this browser)
export function trackState(b, i) {
  const st = load(trackKey(b, i), null);
  return st ? { stage: st.stage, delay: delayAt(st.stage), status: STAGES[st.stage][0], over: st.stage >= LAST } : null;
}
export function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return (h ? `${h} hour${h === 1 ? "" : "s"}` : "") + (h && m ? " " : "") + (m || !h ? `${m} minute${m === 1 ? "" : "s"}` : "");
}

// Even one millisecond counts. From stage 1 on, the flight is late (and we are sorry).
export const isLate = (stage) => stage >= 1;
export const fmtLate = (stage) => (delayAt(stage) > 0 ? fmtDuration(delayAt(stage)) : "1 millisecond");
