// When Mr Gullet picks up the telephone: Tuesdays, 03:00 to 03:01 (the browser's local time).
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const inWindow = (d = new Date()) => d.getDay() === 2 && d.getHours() === 3 && d.getMinutes() === 0;
export function nextWindow(d = new Date()) {
  const n = new Date(d); n.setHours(3, 0, 0, 0);
  let add = (2 - n.getDay() + 7) % 7;
  if (add === 0 && d.getTime() >= n.getTime() + 60000) add = 7;
  n.setDate(n.getDate() + add);
  return n;
}
export const span = (ms) => { const m = Math.max(0, Math.floor(ms / 60000)); const dd = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60; return `${dd} day${dd === 1 ? "" : "s"}, ${hh} hour${hh === 1 ? "" : "s"}, ${mm} minute${mm === 1 ? "" : "s"}`; };
