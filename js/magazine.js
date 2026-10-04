// The in-flight magazine: fake articles, ads, and a sudoku that has no solution (checked with a solver).
import { $, el } from "./dom.js";

const root = $("#app");
const ARTICLES = [
  ["Ten ways to enjoy your delay", "By Sir Peanuel Nut", ["1. Look at the board. 2. Look at the board again. 3. Believe the board.", "4 to 9. We could not think of six more, so the list stops here and we are sorry about the gap. 10. Accept that this is the list."]],
  ["Interview: the peanut that would not leave Gate B3", "By Joel (from the cupboard)", ["We asked the peanut why it stays. It said the gate is its gate. We asked which gate. It said the gate.", "It then asked us a question: when does the flight leave? We did not know. It nodded. It said it would wait with us."]],
  ["Destinations: Row 7", "Travel desk", ["Row 7 is a quiet destination, bounded by Row 6 and Row 8. Locals say it is nicer in the aisle. Visitors report that it is the same row.", "How to get there: sit. When to go: now. Where to stay: seat 7C, until further notice."]],
  ["Contents of your seat pocket, reviewed", "Review desk", ["Safety card: 5 stars, no buckle. Sick bag: reused, 3 stars. This magazine: you are holding it, 4 stars, page 4 missing.", "A second safety card appeared this morning. We have left it. It looks sad."]],
  ["Joel's recipe corner: toast", "Joel", ["Step one: find bread. Step two: wait. Step three: sorry. Step four: toast, if there is toast, which there is not.", "Serves one. Serves none. Serves the idea."]],
  ["Ask the captain", "Reader letters", ["Q: Why is my flight 1 millisecond late? A: It is not. You are early. We are sorry for your earliness.", "Q: Where is the buckle? A: The same place as page 4."]]
];
const ADS = [
  ["Octee Duty Free", "Buy things you cannot take on board. Guaranteed unwrapped.", "dutyfree.html"],
  ["JOELMOBILE", "Joel will drive you there. Joel has questions about where.", "joelmobile.html"],
  ["Octee Insurance", "Covers everything except what actually happens.", "insurance.html"],
  ["Octee Wi-Fi", "Always on. Never connected. Lovely.", "wifi.html"]
];
const GRID = [[5,3,4,6,7,8,9,1,0],[0,7,2,0,0,5,3,0,0],[0,0,0,3,0,2,5,6,7],[0,5,0,0,0,0,4,0,2],[0,0,6,0,0,3,0,0,1],[0,0,0,0,2,0,8,0,0],[9,0,1,0,0,0,0,8,0],[0,0,0,0,0,0,0,3,0],[0,0,0,2,0,0,1,0,9]];

function sudoku() {
  const cells = [], out = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const grid = el("div", { class: "sdk", role: "grid", "aria-label": "Sudoku, difficulty: fair" });
  GRID.forEach((row, r) => row.forEach((v, c) => {
    const inp = v ? el("div", { class: "sdk-given", role: "gridcell" }, String(v)) : el("input", { class: "sdk-in", type: "text", inputmode: "numeric", maxlength: "1", "aria-label": `Row ${r + 1} column ${c + 1}` });
    inp.dataset.r = r; inp.dataset.c = c;
    if (!v) inp.addEventListener("input", () => { inp.value = inp.value.replace(/[^1-9]/g, ""); });
    if (c === 2 || c === 5) inp.classList.add("sdk-r"); if (r === 2 || r === 5) inp.classList.add("sdk-b");
    cells.push(inp); grid.append(inp);
  }));
  const read = () => GRID.map((row, r) => row.map((v, c) => v || Number(cells[r * 9 + c].value) || 0));
  const cand = (g, r, c) => { const used = new Set(); for (let i = 0; i < 9; i++) { used.add(g[r][i]); used.add(g[i][c]); } const br = r - r % 3, bc = c - c % 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) used.add(g[br + i][bc + j]); return [1,2,3,4,5,6,7,8,9].filter((n) => !used.has(n)); };
  const check = el("button", { class: "btn small", type: "button", onclick: () => {
    const g = GRID.map((r) => r.slice()); const dead = [];
    g.forEach((row, r) => row.forEach((v, c) => { if (!v && cand(g, r, c).length === 0) dead.push(`row ${r + 1}, column ${c + 1}`); }));
    out.textContent = dead.length ? `Check: the square at ${dead.join(" and ")} cannot hold any number. This puzzle has no solution. We printed it anyway. We are sorry. It is rated "fair".` : "Check: no problems found. (This message is wrong.)"; out.className = "msg error";
  } }, "Check my puzzle");
  const clear = el("button", { class: "btn small ghost", type: "button", onclick: () => { cells.forEach((c) => { if (c.tagName === "INPUT") c.value = ""; }); out.textContent = ""; } }, "Start again (recommended)");
  return el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "Puzzle page: Sudoku (fair)"), el("p", { class: "note" }, "Fill every row, column and box with the digits 1 to 9. Pencils are not provided. Answers are on page 4."), grid, el("div", { class: "actions" }, check, clear), out);
}
root.replaceChildren(
  el("p", { class: "note" }, "Contents: Articles · Adverts · Puzzle · (Page 4)"),
  ...ARTICLES.map(([h, by, ps]) => el("article", { class: "card mag-art" }, el("h2", { style: "margin:0" }, h), el("p", { class: "note", style: "margin:2px 0 8px" }, by), ...ps.map((p) => el("p", {}, p)))),
  el("h2", {}, "Adverts"), el("div", { class: "shop" }, ADS.map(([h, t, u]) => el("div", { class: "card shop-item mag-ad" }, el("p", { class: "note", style: "margin:0" }, "ADVERT"), el("h3", { style: "margin:2px 0" }, h), el("p", { style: "margin:0 0 8px" }, t), el("a", { class: "btn small", href: u }, "Find out more")))),
  sudoku(),
  el("div", { class: "card mag-art" }, el("h2", { style: "margin:0" }, "Page 4"), el("p", {}, "This page is missing. We are sorry. It was a good page.")));
