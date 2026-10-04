// The Octee Times: the in-flight magazine. Fake news (new every day), a horoscope that is always about delays, and a crossword.
import { $, el, today, parseDate } from "./dom.js";
import { hash } from "./tripkit.js";
import { load, save } from "./store.js";
import { fiaWeather } from "./weather.js";

const STORIES = [
  ["Plane Found In Wrong Airport, Airport Apologises", "The plane was found yesterday. It was in the right place, but for a different airline's airport. Both airports have said sorry."],
  ["Pilot Finds Keys, Loses Pilot", "The keys were in his other trousers. The trousers are now missing a pilot. A search is under way, in a different pair of trousers."],
  ["Local Peanut Promoted To Chief Delay Officer", "Sir Peanuel Nut said he was 'humbled, and also a bit late'. He signed 40 certificates before lunch."],
  ["FIA Fog Report: It Is Inside", "Visibility at Terminal 1 is two metres. Outside it is clear. Staff have been told to go outside and look in."],
  ["Joel Says 'I'm A Joel' For 14th Time This Week", "Asked what he meant, Joel said 'I'm a joel'. The JOELMOBILE has been parked, spiritually."],
  ["Gate B3 Moves Again, Takes Gate With It", "Passengers found Gate B3 in Terminal 2. It said it was happy there. It did not say who was at B3."],
  ["Runway 2 Reopens As A Road", "Drivers have thanked the airport. Pilots have asked the drivers to move. The drivers have also asked."],
  ["Scraggy House Reports Record Delays (Of Its Own)", "The airline in the garden said its delays were 'small, local and flowering'."],
  ["Complaint Desk Queue Still Has One Complaint In It", "The same complaint has been at the front since Tuesday. It says it is very patient. It is not."],
  ["Octee Announces On-Time Flight; Flight Denies Everything", "Flight OA 1 was reported on time. OA 1 later said it 'had no comment and no wings'."],
  ["Baggage Belt 7 Reaches 100,000 Laps", "A single tuba has gone round since Tuesday. It has been called 'the best commuter we have'."],
  ["One United Seats Declared 'A Suggestion'", "Passengers may sit in them if they like. Nobody has to. The seats have not been asked."],
  ["Peanut Prices Steady, Peanuts Not", "Analysts said the peanut is 'a strong currency, and a weak snack'."],
  ["Man Arrives Early To Octee Flight, Is Asked To Leave", "He was told the flight was not ready to be early for. He is coming back on Thursday, which is also not ready."],
  ["Lost Tuba Finds Own Way Home, Is Unavailable For Comment", "The tuba was last seen on a train. It had a ticket. The ticket was a peanut."],
  ["Airport Clock Disagrees With Itself; Both Sides Hold Firm", "FIA time and SIA time are the same time. Our flights still cannot agree on it."]
];
const SIGNS = [["Aries", "21 Mar to 19 Apr"], ["Taurus", "20 Apr to 20 May"], ["Gemini", "21 May to 20 Jun"], ["Cancer", "21 Jun to 22 Jul"], ["Leo", "23 Jul to 22 Aug"], ["Virgo", "23 Aug to 22 Sep"],
  ["Libra", "23 Sep to 22 Oct"], ["Scorpio", "23 Oct to 21 Nov"], ["Sagittarius", "22 Nov to 21 Dec"], ["Capricorn", "22 Dec to 19 Jan"], ["Aquarius", "20 Jan to 18 Feb"], ["Pisces", "19 Feb to 20 Mar"]];
const STARS = [
  "Mercury is delayed. So are you. You will meet in the departure lounge.",
  "A gate will change today. It will not tell you. Trust nobody, especially the board.",
  "Someone close to you will say 'it is only a short delay'. It will not be short.",
  "Your lucky number is the number of minutes your flight is late. Your lucky colour is whatever the carpet was.",
  "You will find something lost today. It will be your patience. It was never yours.",
  "The stars say you will arrive on time. The stars have never flown Octee.",
  "A peanut will give you good advice. Do not take it. It was in the air for too long.",
  "Venus is in your gate. Your gate is in Terminal 2. You are in Terminal 1.",
  "Today you will be asked to wait. Wait well. Wait with style. Wait, then wait again.",
  "A stranger will offer you a seat. It will be unavailable, spiritually.",
  "Your flight leaves when the moon is full. The moon has not been told.",
  "Good news: you will have time for a coffee. Bad news: you will have time for all the coffee."
];
const CLUES = {
  across: [[1, "Things the pilot tells about the keys (5)", "TALES"], [4, "When your flight leaves (5)", "UNTIL"], [5, "How the engines feel, and the passengers (5)", "TIRED"]],
  down: [[1, "What you should not place in our timetable (5)", "TRUST"], [2, "Our favourite time of day (5)", "LATER"], [3, "In-flight meal, 14 days ago (5)", "SALAD"]]
};
// 5 x 5 grid. Letters sit on rows 1, 3, 5 (across) and columns 1, 3, 5 (down). The other cells are black.
const SOL = CLUES.across.map((c) => c[2]);
const DOWN = CLUES.down.map((c) => c[2]);
const cellLetter = (r, c) => (r % 2 === 0 ? SOL[r / 2][c] : c % 2 === 0 ? DOWN[c / 2][r] : null);
const NUMS = { "0,0": 1, "0,2": 2, "0,4": 3, "2,0": 4, "4,0": 5 };

const day = today();
const dateText = parseDate(day).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const order = STORIES.map((s, k) => [hash(day + "|" + k), s]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const w = fiaWeather();

function crossword() {
  const inputs = [];
  const grid = el("div", { class: "xw-grid", role: "group", "aria-label": "Crossword, 5 by 5" });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const L = cellLetter(r, c);
    if (!L) { grid.append(el("span", { class: "xw-block", "aria-hidden": "true" })); continue; }
    const input = el("input", { class: "xw-cell", maxlength: "1", autocomplete: "off", "aria-label": `Row ${r + 1}, column ${c + 1}${NUMS[`${r},${c}`] ? ", clue number " + NUMS[`${r},${c}`] : ""}` });
    input.dataset.r = r; input.dataset.c = c;
    input.addEventListener("input", () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, ""); input.classList.remove("ok", "bad"); if (input.value) { const nxt = inputs[inputs.indexOf(input) + 1]; nxt?.focus(); } });
    input.addEventListener("keydown", (e) => {
      const i = inputs.indexOf(input);
      if (e.key === "Backspace" && !input.value) inputs[i - 1]?.focus();
      if (e.key === "ArrowRight") inputs[i + 1]?.focus();
      if (e.key === "ArrowLeft") inputs[i - 1]?.focus();
    });
    inputs.push(input);
    grid.append(el("span", { class: "xw-cellbox" }, NUMS[`${r},${c}`] ? el("small", {}, NUMS[`${r},${c}`]) : "", input));
  }
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const check = () => {
    let right = 0, filled = 0;
    inputs.forEach((i) => { const L = cellLetter(+i.dataset.r, +i.dataset.c); if (i.value) { filled++; const ok = i.value === L; i.classList.toggle("ok", ok); i.classList.toggle("bad", !ok); if (ok) right++; } });
    msg.textContent = right === inputs.length ? "Complete! You have finished the crossword. Please do not tell the pilot. He has been stuck on 3 Across since Tuesday."
      : `${right} of ${inputs.length} letters right. The rest are delayed.${filled === 0 ? " You have not started. That is the best time to start." : ""}`;
  };
  const reveal = () => { inputs.forEach((i) => { i.value = cellLetter(+i.dataset.r, +i.dataset.c); i.classList.add("ok"); i.classList.remove("bad"); }); msg.textContent = "Revealed. We are sorry. We are so sorry."; };
  const clues = (list) => el("ol", { class: "xw-clues" }, list.map(([n, text]) => el("li", { value: n }, text)));
  return el("div", { class: "xw" },
    grid,
    el("div", {}, el("h3", { style: "margin-top:0" }, "Across"), clues(CLUES.across), el("h3", {}, "Down"), clues(CLUES.down),
      el("div", { class: "actions" }, el("button", { class: "btn small", type: "button", onclick: check }, "Check"), el("button", { class: "btn small ghost", type: "button", onclick: reveal }, "Reveal (we are sorry)")), msg));
}

function horoscope() {
  let mine = null;
  try { mine = load("octee.sign", null); } catch { /* fine */ }
  const list = el("div", { class: "stars" });
  const draw = () => list.replaceChildren(...SIGNS.map(([name, dates]) => {
    const k = hash(`${day}|${name}`);
    return el("div", { class: "card star" + (mine === name ? " mine" : ""), onclick: () => { mine = name; try { save("octee.sign", name); } catch { /* fine */ } draw(); } },
      el("h3", { style: "margin:0" }, name, el("small", { class: "note" }, "  " + dates)),
      el("p", { style: "margin:4px 0" }, STARS[k % STARS.length]),
      el("p", { class: "note", style: "margin:0" }, `Lucky delay: ${10 + (k % 90)} minutes`));
  }));
  draw();
  return list;
}

const lead = order[0], rest = order.slice(1, 4);
$("#paper").replaceChildren(
  el("header", { class: "paper-head" },
    el("p", { class: "paper-meta" }, `${dateText} · Price: one peanut · Weather: ${w.sky}`),
    el("h1", { class: "paper-title" }, "The Octee Times"),
    el("p", { class: "paper-meta" }, "The in-flight magazine. Read it in flight. Or on the ground. Or in the flight that is still on the ground.")),
  el("article", { class: "card paper-lead" }, el("h2", { style: "margin-top:0" }, lead[0]), el("p", {}, lead[1])),
  el("div", { class: "paper-grid" }, rest.map((s) => el("article", { class: "card" }, el("h3", { style: "margin-top:0" }, s[0]), el("p", { style: "margin:0" }, s[1])))),
  el("h2", {}, "Your horoscope (it is about delays)"), el("p", { class: "note" }, "Tap your sign to keep it highlighted."), horoscope(),
  el("h2", {}, "The crossword (clues are fair)"), crossword(),
  el("p", { class: "note" }, "Every story in this newspaper is made up. Some of it is also true. We cannot tell which."));
