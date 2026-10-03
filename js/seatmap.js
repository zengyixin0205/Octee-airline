// The seat map used by online check-in.
import { el } from "./dom.js";
import { hash } from "./tripkit.js";

const REASONS = [
  "Unavailable (spiritually)",
  "This seat is having a moment",
  "Occupied by a coat. The coat paid",
  "Held for Joel",
  "A peanut is stuck in it",
  "This seat is a rumour",
  "Reserved for the plane's feelings",
  "Not a seat. A very comfy opinion"
];

// Octee: First (rows 1-3) and Business (4-8) have 2+2 seats, Economy (9-32) has 3+3. There is no row 13.
// One United: one cabin, 3+3. Scraggy Airlines: a small 2+2 cabin.
export function layoutFor(l) {
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k).filter((n) => n !== 13);
  if (l.airline === "SA") return [{ id: "scraggy", name: "Scraggy cabin", cols: ["A", "B", "C", "D"], rows: range(1, 14) }];
  if (l.airline === "OU") return [{ id: "ou", name: "One United cabin (seats are suggestions)", cols: ["A", "B", "C", "D", "E", "F"], rows: range(1, 26) }];
  return [
    { id: "first", name: "Octee First", cols: ["A", "C", "D", "F"], rows: range(1, 3) },
    { id: "business", name: "Octee Business", cols: ["A", "C", "D", "F"], rows: range(4, 8) },
    { id: "economy", name: "Octee Economy", cols: ["A", "B", "C", "D", "E", "F"], rows: range(9, 32) }
  ];
}
// Which cabin may this passenger sit in? (Octee only: your class is your cabin.)
export const cabinFor = (l) => l.airline === "OA" ? (l.travelClass || "economy") : null;

const position = (cols, c) => {
  const k = cols.indexOf(c), n = cols.length;
  if (k === 0 || k === n - 1) return "window";
  return n === 6 && (c === "B" || c === "E") ? "middle" : "aisle";
};

// free | taken | spiritual (with the reason)
export function seatState(l, id, takenElsewhere = new Set()) {
  if (takenElsewhere.has(id)) return { state: "taken", why: "Taken by someone on this same booking" };
  const h = hash(`${l.no}|${l.date}|${id}`) % 100;
  if (h < 7) return { state: "spiritual", why: REASONS[hash(`why|${l.no}|${l.date}|${id}`) % REASONS.length] };
  if (h < 36) return { state: "taken", why: "Taken" };
  return { state: "free", why: "" };
}

// choices: ["14A", ""] one per passenger; active: whose seat you are choosing; onPick(seatId, why?)
export function seatMap(l, { choices, active, prefer, takenElsewhere, onPick }) {
  const cabin = cabinFor(l);
  const mine = new Map(choices.map((s, p) => [s, p]).filter(([s]) => s));
  const wrap = el("div", { class: "seatmap", role: "group", "aria-label": "Seat map. Front of the plane is at the top." });
  wrap.append(el("p", { class: "sm-front" }, "FRONT OF THE PLANE"));
  for (const c of layoutFor(l)) {
    const blocked = cabin && c.id !== cabin;
    wrap.append(el("h3", { class: "sm-cabin" }, c.name, blocked ? el("small", {}, " · not your class") : ""));
    for (const r of c.rows) {
      const half = c.cols.length / 2;
      const row = el("div", { class: "sm-row" }, el("span", { class: "sm-n", "aria-hidden": "true" }, r));
      c.cols.forEach((col, k) => {
        if (k === half) row.append(el("span", { class: "sm-aisle", "aria-hidden": "true" }));
        const id = `${r}${col}`;
        const st = seatState(l, id, takenElsewhere);
        const who = mine.get(id);
        const pos = position(c.cols, col);
        const unavailable = blocked || st.state !== "free";
        const kind = who !== undefined ? "mine" : !unavailable ? "free" : st.state === "spiritual" ? "spiritual" : "taken";
        const cls = ["seat", kind, who === active ? "active" : "", blocked ? "other" : "", prefer && pos === prefer && !unavailable ? "liked" : ""].filter(Boolean).join(" ");
        const label = `Seat ${id}, ${pos}` + (who !== undefined ? ", chosen" : blocked ? ", not your class" : st.state === "free" ? ", available" : ", " + (st.why || st.state).toLowerCase());
        const b = el("button", { type: "button", class: cls, "aria-label": label, "aria-pressed": who !== undefined ? "true" : "false", title: blocked ? "Not your class" : st.why || `${id} · ${pos}`,
          onclick: () => onPick(id, blocked ? "That cabin is not your class. Upgrade on your account page." : unavailable ? (st.why || "Taken") + "." : "") },
          who !== undefined ? `P${who + 1}` : st.state === "spiritual" && !blocked ? "~" : col);
        row.append(b);
      });
      row.append(el("span", { class: "sm-n", "aria-hidden": "true" }, r));
      wrap.append(row);
    }
  }
  wrap.append(el("p", { class: "sm-front" }, "BACK (the toilets are somewhere)"));
  return wrap;
}
