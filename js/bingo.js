// Delay Bingo: a 5 x 5 card of things that happen on your tracker. Tick them as they happen; five in a row wins a certificate.
import { $, el, niceDate, today } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { placeShort, placeName } from "./destinations.js";
import { findLeg, legUrl, tripId, hash } from "./tripkit.js";
import { STAGES, trackState, fmtLate, isLate } from "./delays.js";
import { load, save } from "./store.js";
import { PEANUT, SEAL } from "./peanutart.js";
import { addPeanuts } from "./peanuts.js";

const root = $("#app");
// Squares that are tied to the tracker ("seen" once your flight has got that far) and squares that are on your honour.
const TRACKER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((stage) => ({ id: "s" + stage, stage, text: STAGES[stage][0] }));
const HONOUR = [
  "An announcement nobody can hear", "Someone says \"it is only a short delay\"", "You check the board, then check it again", "A peanut is mentioned",
  "Joel says \"I'm a joel!\"", "You say \"this is fine\" (it is not)", "You refresh the tracker for no reason", "A stranger shares your sadness", "You open our apology"
].map((text, k) => ({ id: "h" + k, text }));
const FREE = { id: "free", text: "FREE (we are sorry)", free: true };
const LINES = [
  ...[0, 1, 2, 3, 4].map((r) => ({ name: `row ${r + 1}`, cells: [0, 1, 2, 3, 4].map((c) => r * 5 + c) })),
  ...[0, 1, 2, 3, 4].map((c) => ({ name: `column ${c + 1}`, cells: [0, 1, 2, 3, 4].map((r) => r * 5 + c) })),
  { name: "the diagonal", cells: [0, 6, 12, 18, 24] }, { name: "the other diagonal", cells: [4, 8, 12, 16, 20] }
];

function cardFor(key) {
  const all = [...TRACKER, ...HONOUR].map((s) => [hash(`${key}|${s.id}`), s]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  all.splice(12, 0, FREE);                                       // the free square is always in the middle
  return all;
}

function chooser() {
  const u = currentUser();
  const rows = [];
  (u.trips || []).forEach((b) => b.legs.forEach((l, i) => rows.push({ b, l, i })));
  rows.sort((a, b) => a.l.date.localeCompare(b.l.date) || a.l.dep.localeCompare(b.l.dep));
  if (!rows.length) { root.replaceChildren(el("div", { class: "card" }, el("p", {}, "No flights, no delays, no bingo. Book a flight and we will fix that."), el("a", { class: "btn", href: "book.html" }, "Book a flight"))); return; }
  root.replaceChildren(el("h2", {}, "Pick a flight to play on"),
    ...rows.map(({ b, l, i }) => el("div", { class: "card flight-row" },
      el("div", {}, el("strong", {}, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`), el("p", { class: "note", style: "margin:2px 0 0" }, `${niceDate(l.date)} · departs ${l.dep}`)),
      el("a", { class: "btn small", href: legUrl("bingo.html", b, i) }, "Play"))));
}

function play({ b, l, i }) {
  const id = `${tripId(b)}.${i}`, key = "octee.bingo." + id;
  const card = cardFor(id);
  const state = () => ({ ticks: [], paid: false, ...load(key, {}) });
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const grid = el("div", { class: "bingo-grid", role: "group", "aria-label": "Bingo card, 5 by 5" });
  const certBox = el("div", { id: "bingo-cert" });
  const info = el("p", { class: "note" });

  function draw() {
    const ts = trackState(b, i);
    const stage = ts ? ts.stage : 0;
    const s = state();
    const on = new Set([12, ...s.ticks]);
    grid.replaceChildren(...card.map((sq, k) => {
      const seen = sq.stage ? stage >= sq.stage : true;
      const ticked = on.has(k);
      const btn = el("button", { type: "button", class: "bingo-sq" + (ticked ? " on" : "") + (sq.free ? " free" : "") + (!sq.free && sq.stage && !seen && !ticked ? " unseen" : ""), "aria-pressed": ticked ? "true" : "false",
        "aria-label": `${sq.text}${ticked ? ", ticked" : sq.stage && !seen ? ", not happened yet" : ""}` }, sq.text, sq.stage && seen && !ticked ? el("small", {}, "happened!") : "");
      btn.addEventListener("click", () => {
        if (sq.free) return;
        const cur = state();
        if (sq.stage && !(trackState(b, i)?.stage >= sq.stage)) { msg.textContent = `"${sq.text}" has not happened on your tracker yet. Joel is watching. Open the tracker and wait.`; return; }
        cur.ticks = cur.ticks.includes(k) ? cur.ticks.filter((x) => x !== k) : [...cur.ticks, k];
        save(key, cur);
        msg.textContent = "";
        draw();
      });
      return btn;
    }));
    const win = LINES.find((ln) => ln.cells.every((c) => on.has(c)));
    const count = on.size - 1;
    info.textContent = `${count} square${count === 1 ? "" : "s"} ticked. ${win ? "BINGO!" : "Five in a row wins."} The tracker is at: ${ts ? ts.status : "ON TIME (we said)"}.`;
    if (win) {
      if (!s.paid) { s.paid = true; save(key, s); const got = addPeanuts(`Delay Bingo on ${l.no} (a winner's peanut)`, 3); msg.textContent = `BINGO! You got ${win.name}. Your certificate is below.${got ? " +3 peanuts." : ""}`; }
      certificate(win, count);
    } else certBox.replaceChildren();
  }

  function certificate(win, count) {
    const ts = trackState(b, i);
    const who = b.names.length > 1 ? b.names.slice(0, -1).join(", ") + " and " + b.names[b.names.length - 1] : b.names[0];
    const serial = "BG-" + String(hash(`bingo|${b.ref}|${i}`) % 9000 + 1000);
    const paper = el("article", { class: "cert", "aria-label": "Certificate of Bingo" },
      el("p", { class: "cert-org" }, "OCTEE AIRLINES · OFFICIAL DELAY DIVISION"),
      el("h2", { class: "cert-title", style: "margin-top:0" }, "Certificate of Bingo"),
      el("p", { class: "cert-line" }, "This is to certify that"),
      el("p", { class: "cert-name" }, who),
      el("p", { class: "cert-line" }, `got BINGO (${win.name}) while waiting for flight ${l.no} from ${placeName(l.from)} (${placeShort(l.from)}) to ${placeName(l.to)} (${placeShort(l.to)}), on ${niceDate(l.date)}, with ${count} squares ticked and a delay of`),
      el("p", { class: "cert-delay" }, ts && isLate(ts.stage) ? fmtLate(ts.stage) : "0 minutes", ts && isLate(ts.stage) && !ts.over ? el("small", {}, " and counting") : ""),
      el("div", { class: "cert-foot" },
        el("div", { class: "cert-sign" }, el("div", { class: "cert-sig-art" }), el("p", { class: "cert-sig" }, "P. Nut"), el("p", { class: "cert-small" }, "Sir Peanuel Nut, Chief Bingo Officer")),
        el("div", { class: "cert-seal-box" }),
        el("div", { class: "cert-meta" }, el("p", {}, el("strong", {}, "Certificate no. "), serial), el("p", {}, el("strong", {}, "Issued "), niceDate(today())), el("p", { class: "cert-small" }, "Valid for nothing. Worth a lot of peanuts."))));
    paper.querySelector(".cert-sig-art").innerHTML = PEANUT;
    paper.querySelector(".cert-seal-box").innerHTML = SEAL;
    certBox.replaceChildren(el("h2", { class: "no-print" }, "You won!"), paper,
      el("div", { class: "actions no-print" }, el("button", { class: "btn", type: "button", onclick: () => window.print() }, "Print my certificate"), el("a", { class: "btn secondary", href: legUrl("share.html", b, i) }, "Share my trip")));
  }

  const sheet = document.createElement("style");
  sheet.textContent = "@media print { @page { size: landscape; margin: 10mm; } .bingo-wrap, .hero { display: none !important; } }";
  document.head.append(sheet);

  root.replaceChildren(
    el("div", { class: "bingo-wrap" },
      el("div", { class: "card" }, el("p", { class: "route", style: "font-family:var(--serif);font-size:1.3rem;margin:0" }, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)}`),
        el("p", { class: "note", style: "margin:2px 0 0" }, `${niceDate(l.date)} · ${b.names.join(", ")}`)),
      grid, info, msg,
      el("div", { class: "actions" },
        el("a", { class: "btn small", href: legUrl("track.html", b, i) }, "Open the tracker"),
        el("a", { class: "btn small ghost", href: "bingo.html" }, "Another flight"),
        el("button", { class: "btn small ghost", type: "button", onclick: () => { save(key, { ticks: [], paid: state().paid }); msg.textContent = "Card cleared. Your bingo peanuts stay with you."; draw(); } }, "Clear my card")),
      el("p", { class: "note" }, "Squares that come from the tracker can only be ticked once they have happened on your flight. The rest are on your honour. Joel will know if you lie.")),
    certBox);
  draw();
  setInterval(draw, 5000);                                       // the tracker keeps getting worse, so keep up
  window.addEventListener("storage", draw);
}

if (requireLogin()) { const f = findLeg(currentUser()); f ? play(f) : chooser(); }
