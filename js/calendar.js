// Flight calendar — one date-range picker for both dates, like an airline app:
//  * header shows Departure Date and Arrival Date (month, weekday, big day number)
//  * months are stacked and scroll; weeks start on Sunday
//  * tap the departure day, then the arrival day (the day you fly back); the days between are shaded
//  * days with no flight are greyed out and can't be picked
//  * "Done" at the bottom saves both dates
// Keyboard: arrow keys move between days, Enter picks, Esc closes.
import { el, isoDate, parseDate, today } from "./dom.js";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MAX_AHEAD_DAYS = 330;

/**
 * openRangeCalendar({
 *   depart, arrive,            // "YYYY-MM-DD" or ""
 *   oneway,                    // true = only a departure date
 *   mode,                      // "depart" | "arrive": which date is being picked first
 *   departInfo(iso)            // -> { ok, label, full }
 *   arriveInfo(iso, departIso) // -> { ok, label, full }
 *   onDone({ depart, arrive }), returnFocus
 * })
 */
export function openRangeCalendar({ depart = "", arrive = "", oneway = false, mode = "depart", departInfo, arriveInfo, onDone, returnFocus }) {
  const min = today();
  const max = isoDate(new Date(Date.now() + MAX_AHEAD_DAYS * 864e5));
  let d = depart && depart >= min ? depart : "";
  let a = !oneway && d && arrive && arrive >= d ? arrive : "";
  if (oneway || !d) mode = "depart";
  let focusIso = (mode === "arrive" ? a : d) || d || "";
  let firstRender = true;

  const cacheD = new Map(), cacheA = new Map();
  const dInfo = (iso) => { if (!cacheD.has(iso)) cacheD.set(iso, departInfo(iso)); return cacheD.get(iso); };
  const aInfo = (iso) => { const k = d + "|" + iso; if (!cacheA.has(k)) cacheA.set(k, arriveInfo(iso, d)); return cacheA.get(k); };
  const info = (iso) => (iso < min || iso > max ? { ok: false } : mode === "arrive" ? (iso < d ? { ok: false } : aInfo(iso)) : dInfo(iso));

  const back = el("div", { class: "rc-back", role: "dialog", "aria-modal": "true", "aria-label": "Choose your dates" });
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey, true); returnFocus?.focus(); };

  const headCell = (which, label, iso, placeholder) => {
    const dt = iso ? parseDate(iso) : null;
    return el("button", { type: "button", class: "rc-tab" + (mode === which ? " on" : ""), "aria-pressed": String(mode === which),
      disabled: which === "arrive" && (oneway || !d),
      onclick: () => { mode = which; focusIso = (which === "arrive" ? a : d) || d; render(); } },
      el("span", { class: "rc-tab-label" }, label),
      dt ? el("span", { class: "rc-tab-date" },
        el("span", { class: "rc-tab-text" }, dt.toLocaleDateString("en-GB", { month: "long" }), el("br"), dt.toLocaleDateString("en-GB", { weekday: "long" })),
        el("span", { class: "rc-tab-num" }, String(dt.getDate())))
        : el("span", { class: "rc-tab-empty" }, placeholder));
  };

  const pick = (iso) => {
    if (mode === "depart") {
      d = iso;
      if (a && (a < d || !arriveInfo(a, d).ok)) a = "";
      if (!oneway) mode = "arrive";
      focusIso = a || d;
    } else { a = iso; focusIso = iso; }
    render();
  };

  const monthBlock = (y, m) => {
    const first = new Date(y, m, 1);
    const lead = first.getDay();                      // Sunday-first
    const days = new Date(y, m + 1, 0).getDate();
    const grid = el("div", { class: "rc-grid", role: "grid" }, DOW.map((w) => el("div", { class: "rc-dow", "aria-hidden": "true" }, w)));
    const prevDays = new Date(y, m, 0).getDate();
    for (let i = lead - 1; i >= 0; i--) grid.append(el("div", { class: "rc-cell rc-other", "aria-hidden": "true" }, String(prevDays - i)));
    for (let n = 1; n <= days; n++) {
      const iso = isoDate(new Date(y, m, n));
      const i = info(iso);
      const isStart = iso === d, isEnd = iso === a && !!a;
      const inRange = d && a && iso > d && iso < a;
      const cellCls = ["rc-cell", inRange ? "in-range" : "", isStart && a && a !== d ? "range-start" : "", isEnd && a !== d ? "range-end" : ""].join(" ");
      const btnCls = ["rc-day", isStart ? "is-start" : "", isEnd ? "is-end" : "", iso === min && !isStart && !isEnd ? "is-today" : ""].join(" ");
      const long = parseDate(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const what = isStart ? ", departure date" : isEnd ? ", arrival date" : "";
      const btn = el("button", { type: "button", class: btnCls, "data-iso": iso, disabled: !i.ok && !isStart && !isEnd, tabindex: "-1",
        "aria-pressed": String(isStart || isEnd),
        "aria-label": long + what + (i.ok ? (i.full ? ", " + i.full : "") : ", no flight") },
        el("span", { class: "rc-num" }, String(n)), el("small", {}, i.ok ? (i.short || i.label) : ""));
      btn.addEventListener("click", () => { if (i.ok) pick(iso); });
      grid.append(el("div", { class: cellCls }, btn));
    }
    const trail = (7 - ((lead + days) % 7)) % 7;
    for (let n = 1; n <= trail; n++) grid.append(el("div", { class: "rc-cell rc-other", "aria-hidden": "true" }, String(n)));
    return el("section", { class: "rc-month", "data-month": `${y}-${String(m + 1).padStart(2, "0")}` },
      el("h3", {}, first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })), grid);
  };

  function render() {
    const scrollTop = back.querySelector(".rc-body")?.scrollTop ?? 0;
    const start = parseDate(min), end = parseDate(max);
    const months = [];
    for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth()); m === 11 ? (y++, m = 0) : m++) months.push(monthBlock(y, m));
    const body = el("div", { class: "rc-body" }, months);
    const hint = mode === "depart" ? "Pick your departure date." : "Now pick your arrival date (the day you fly back).";
    const done = el("button", { type: "button", class: "rc-done", disabled: !d, onclick: () => { onDone({ depart: d, arrive: a }); close(); } }, "Done");
    back.replaceChildren(el("div", { class: "rc-panel" },
      el("div", { class: "rc-head" },
        headCell("depart", "Departure Date", d, "Pick a day"),
        headCell("arrive", "Arrival Date", a, oneway ? "One-way" : d ? "Pick a day" : "—"),
        el("button", { type: "button", class: "rc-close", "aria-label": "Close without saving", onclick: close }, "×")),
      el("p", { class: "rc-hint", role: "status", "aria-live": "polite" }, hint + " Greyed-out days have no flight."),
      body, done));
    if (firstRender) {
      firstRender = false;
      const target = (focusIso || min).slice(0, 7);
      const sec = body.querySelector(`[data-month="${target}"]`);
      if (sec) body.scrollTop = sec.offsetTop - body.offsetTop;
    } else body.scrollTop = scrollTop;
    const enabled = [...back.querySelectorAll(".rc-day:not(:disabled)")];
    const t = enabled.find((b) => b.dataset.iso === focusIso) || enabled.find((b) => b.dataset.iso >= (focusIso || min)) || enabled[0];
    if (t) { t.tabIndex = 0; t.focus({ preventScroll: !firstRender && true }); }
  }

  function onKey(e) {
    if (!document.body.contains(back)) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    const cur = document.activeElement?.dataset?.iso;
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!cur || !(e.key in steps)) return;
    e.preventDefault();
    const dt = parseDate(cur);
    const dir = Math.sign(steps[e.key]);
    dt.setDate(dt.getDate() + steps[e.key]);
    for (let i = 0; i < 90; i++) {
      const iso = isoDate(dt);
      if (iso < min || iso > max) return;
      const btn = back.querySelector(`.rc-day[data-iso="${iso}"]:not(:disabled)`);
      if (btn) { document.activeElement.tabIndex = -1; btn.tabIndex = 0; btn.focus(); btn.scrollIntoView({ block: "nearest" }); return; }
      dt.setDate(dt.getDate() + dir);
    }
  }

  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  document.addEventListener("keydown", onKey, true);
  document.body.append(back);
  render();
}
