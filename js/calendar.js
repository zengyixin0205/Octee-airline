// Flight calendar date picker, like a real airline site.
// Two months side by side (one on phones). Days without a flight are greyed out and can't be picked.
// WAI-ARIA date picker dialog: arrows move, Page Up/Down change month, Enter picks, Esc closes.
import { el, isoDate, parseDate, today } from "./dom.js";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MAX_AHEAD_DAYS = 330;

/**
 * openCalendar({ title, selected, rangeStart, minDate, dayInfo(iso) -> {ok, label, full}, onPick(iso) })
 */
export function openCalendar({ title, selected, rangeStart = null, minDate = today(), dayInfo, onPick, returnFocus }) {
  const maxDate = isoDate(new Date(Date.now() + MAX_AHEAD_DAYS * 864e5));
  const start = parseDate(selected || minDate);
  let viewYear = start.getFullYear(), viewMonth = start.getMonth();
  let focusIso = selected || null;
  const back = el("div", { class: "cal-pop", role: "dialog", "aria-modal": "true", "aria-label": title });
  const close = () => { back.remove(); returnFocus?.focus(); };

  const monthBlock = (y, m) => {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const grid = el("div", { class: "cal-grid", role: "grid" }, DOW.map((d) => el("div", { class: "dow", "aria-hidden": "true" }, d)));
    for (let i = 0; i < offset; i++) grid.append(el("div"));
    for (let d = 1; d <= days; d++) {
      const iso = isoDate(new Date(y, m, d));
      const tooEarly = iso < minDate, tooLate = iso > maxDate;
      const info = tooEarly || tooLate ? { ok: false, label: tooEarly ? "" : "" } : dayInfo(iso);
      const label = parseDate(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const btn = el("button", {
        type: "button", class: "day" + (rangeStart && iso > rangeStart && selected && iso < selected ? " in-range" : ""),
        "data-iso": iso, disabled: !info.ok, "aria-selected": String(iso === selected || iso === rangeStart),
        "aria-label": `${label}${info.full ? ", " + info.full : info.ok ? "" : ", no flight"}`, tabindex: "-1"
      }, String(d), el("small", {}, info.ok ? info.label : tooEarly ? "" : "No flight"));
      btn.addEventListener("click", () => { onPick(iso); close(); });
      grid.append(btn);
    }
    return el("div", { class: "cal-month" }, el("h4", {}, first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })), grid);
  };

  const twoUp = () => window.matchMedia("(min-width: 720px)").matches;
  const render = () => {
    const months = [monthBlock(viewYear, viewMonth)];
    if (twoUp()) { const n = new Date(viewYear, viewMonth + 1, 1); months.push(monthBlock(n.getFullYear(), n.getMonth())); }
    const prev = el("button", { class: "btn small ghost", type: "button", "aria-label": "Previous month", onclick: () => move(-1) }, "◀");
    const next = el("button", { class: "btn small ghost", type: "button", "aria-label": "Next month", onclick: () => move(1) }, "▶");
    const box = el("div", { class: "cal" },
      el("div", { class: "cal-head" }, prev, el("h3", {}, title), next),
      el("div", { class: "cal-months" }, months),
      el("p", { class: "cal-legend" }, "Days show the first flight. Greyed out = no flight that day (or it's full). ▬ shaded = your trip."),
      el("div", { class: "actions" }, el("button", { class: "btn small secondary", type: "button", onclick: close }, "Close")));
    back.replaceChildren(box);
    const days = [...back.querySelectorAll(".day:not(:disabled)")];
    const target = days.find((b) => b.dataset.iso === focusIso) || days[0];
    if (target) { target.tabIndex = 0; target.focus(); }
    if (!days.length) {
      // help the visitor find the next available day
      for (let i = 1; i < 120; i++) {
        const iso = isoDate(new Date(viewYear, viewMonth, 1 + i + 30));
        if (iso > maxDate) break;
        const info = dayInfo(iso);
        if (info.ok) { box.insertBefore(el("p", { class: "msg info" }, `Next flight: ${parseDate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} (${info.label}).`), box.lastChild); break; }
      }
    }
  };
  const move = (n) => { const d = new Date(viewYear, viewMonth + n, 1); viewYear = d.getFullYear(); viewMonth = d.getMonth(); focusIso = null; render(); };

  back.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    const cur = document.activeElement?.dataset?.iso;
    if (!cur) return;
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in steps || e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const d = parseDate(cur);
      const dir = e.key === "PageUp" ? -1 : e.key === "PageDown" ? 1 : Math.sign(steps[e.key]);
      if (e.key === "PageUp") d.setMonth(d.getMonth() - 1);
      else if (e.key === "PageDown") d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + steps[e.key]);
      // skip days with no flight
      for (let i = 0; i < 60; i++) {
        const iso = isoDate(d);
        if (iso < minDate || iso > maxDate) return;
        if (dayInfo(iso).ok) {
          let btn = back.querySelector(`.day[data-iso="${iso}"]`);
          if (!btn) { focusIso = iso; viewYear = d.getFullYear(); viewMonth = d.getMonth(); render(); btn = back.querySelector(`.day[data-iso="${iso}"]`); }
          if (btn) { btn.tabIndex = 0; btn.focus(); }
          return;
        }
        d.setDate(d.getDate() + dir);
      }
    }
  });
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  document.body.append(back);
  render();
}
