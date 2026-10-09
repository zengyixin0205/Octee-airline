// The Normal Thursday incident log. Every incident is a normal Thursday. OA 014 is entry number one.
import { $, el, setMsg } from "./dom.js";
import { load, save } from "./store.js";

const KEY = "octee.normalthursday";
// Dates are Thursdays (FIA time). Cause tags: PEANUT, Weather, Gate, Crew.
export const ENTRIES = [
  { n: 1, date: "2026-10-08", where: "FIA, climbing out", flight: "OA 014", cause: "Weather",
    what: "Flight OA 014 climbed out of FIA through a dark cloud with an orange glow around the front. The captain described it as \"a warm welcome\". The glow was ambience. The cloud was weather.",
    outcome: "Arrived. Peanuts were served on time, which was noticed.", link: ["Safety at FIA", "fia.html#safety"] },
  { n: 2, date: "2026-10-01", where: "FIA, Gate B3", flight: "OA 58", cause: "Gate",
    what: "An aircraft was parked at Gate B3 with its nose resting on the tarmac, to save on stairs. Staff in yellow jackets stood around it, as is usual on a Thursday. A traffic cone kept it company.",
    outcome: "Passengers boarded whenever the jet bridge was, or was not, attached.", link: ["Safety at FIA", "fia.html#safety"] },
  { n: 3, date: "2026-09-24", where: "TDA, the table", flight: "OA 122", cause: "PEANUT",
    what: "The captain looked for Tabletop Domestic Airport in a catalogue of tables, and found a nice oak one. A PEANUT fault was recorded in the navigation computer: it was a peanut, in the navigation computer.",
    outcome: "Landed on the correct table, after a second look.", link: ["TDA map", "terminal-maps.html"] },
  { n: 4, date: "2026-09-17", where: "MFIA, under the mountain", flight: "OA 125", cause: "Weather",
    what: "A small cloud entered the cabin during boarding and was seated in 14C. It did not order a meal. The crew asked it politely to keep its feet off the seat in front.",
    outcome: "The cloud left at SIA, with a connecting boarding pass.", link: ["MFIA map", "terminal-maps.html"] },
  { n: 5, date: "2026-09-10", where: "FIA, Runway 1", flight: "OU 1", cause: "PEANUT",
    what: "Runway 1 was closed for forty minutes because of a PEANUT fault. A peanut was on the runway. It was a big one. It was moved by Joel, who was told to be careful, and was not.",
    outcome: "Runway reopened. The peanut was given a seat in Row 7.", link: ["Runway status", "runway.html"] },
  { n: 6, date: "2026-09-03", where: "FIA, Terminal 1", flight: "—", cause: "Gate",
    what: "Gate 4 moved to Gate 9, and then back to Gate 4, and then was found in the lost property office. Nobody was surprised. It was Thursday.",
    outcome: "Gate 4 was returned to its owner.", link: ["Lost and found", "lostfound.html"] },
  { n: 7, date: "2026-08-27", where: "FIA, Hold Line", flight: "—", cause: "Crew",
    what: "Mr Gullet picked up the telephone. It was not Tuesday. Nobody knows why. He put it down again.",
    outcome: "Everything is back to normal. It was a normal Thursday.", link: ["Hold Line", "gullet-hold.html"] }
];

const niceDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const mine = () => load(KEY, []).filter((x) => x && x.what);
let filter = "all";

function nextThursday() {
  const d = new Date(); const add = (4 - d.getDay() + 7) % 7;
  return add;
}

function draw() {
  const all = [...mine().map((x, i) => ({ n: "Yours " + (i + 1), date: x.date, where: x.where || "somewhere", flight: "—", cause: "Yours", what: x.what, outcome: "Filed as a normal Thursday. No further action.", yours: true })), ...ENTRIES];
  const shown = all.filter((e) => filter === "all" || e.cause === filter);
  $("#nt-list").replaceChildren(...(shown.length ? shown.map((e) => el("li", { class: "card nt-entry" },
    el("p", { class: "eyebrow", style: "margin:0" }, `Entry ${e.n} · ${niceDate(e.date)}`),
    el("h3", { style: "margin:2px 0 6px" }, e.flight !== "—" ? `${e.flight} · ${e.where}` : e.where),
    el("p", {}, e.what),
    el("p", { class: "note" }, el("span", { class: "tag" }, e.cause), " ", el("strong", {}, "Status: normal. "), e.outcome, e.link ? [" ", el("a", { href: e.link[1] }, e.link[0])] : "")))
    : [el("li", { class: "note" }, "Nothing filed under that one. A very normal Thursday.")]));
  const dn = nextThursday();
  $("#nt-stats").replaceChildren(
    ...[[String(all.length), "incidents filed"], ["0", "abnormal Thursdays"], [dn === 0 ? "today" : dn === 1 ? "tomorrow" : `${dn} days`, "until the next Thursday"], ["100%", "of incidents normal"]]
      .map(([big, small]) => el("div", { class: "card nt-stat" }, el("p", { class: "nt-big" }, big), el("p", { class: "note", style: "margin:0" }, small))));
}

document.querySelectorAll(".nt-filter button").forEach((b) => b.addEventListener("click", () => {
  filter = b.dataset.f;
  document.querySelectorAll(".nt-filter button").forEach((x) => { const on = x === b; x.setAttribute("aria-pressed", String(on)); x.classList.toggle("ghost", !on); });
  draw();
}));
$("#nt-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const what = $("#nt-what").value.trim().slice(0, 300), where = $("#nt-where").value.trim().slice(0, 40);
  if (!what) return setMsg($("#nt-msg"), "Write what happened first. Even a normal Thursday needs a sentence.", "error");
  save(KEY, [...mine(), { what, where, date: new Date().toISOString().slice(0, 10) }].slice(-20));
  e.target.reset(); setMsg($("#nt-msg"), "Filed. It was a normal Thursday. (It may not have been a Thursday.)", "ok");
  filter = "all"; draw();
});
draw();
