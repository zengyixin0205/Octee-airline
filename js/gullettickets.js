// One list of every Zhang Gullet ticket in this browser: GulletAI chats (GA-), Complaints Office letters (ZG-)
// and hold-line calls (HL-). Nothing leaves the browser. The status is worked out from the ticket's age.
import { load, save } from "./store.js";

const KEY = "octee.gullet.tickets";
const MAX = 60;
export const KINDS = { chat: "GulletAI chat", complaint: "Complaint letter", call: "Hold-line call" };
const all = () => load(KEY, []).filter((t) => t && t.ticket);

export function addTicket({ ticket, kind, title, owner }) {
  const list = all();
  if (list.some((t) => t.ticket === ticket && t.owner === owner)) return;
  save(KEY, [{ ticket, kind, title: String(title || "").slice(0, 80), owner: owner || "guest", at: Date.now() }, ...list].slice(0, MAX));
}
export function updateTicket(ticket, owner, patch) {
  save(KEY, all().map((t) => (t.ticket === ticket && t.owner === owner ? { ...t, ...patch } : t)));
}
export const ticketsFor = (owner) => all().filter((t) => t.owner === (owner || "guest")).sort((a, b) => b.at - a.at);

export function statusOf(t, now = Date.now()) {
  if (t.withdrawn) return "Withdrawn. Mr Gullet put it in a drawer, gently.";
  if (t.closed) return "Closed, with thanks. It will re-open by itself shortly, as they all do.";
  const m = (now - t.at) / 60000;
  if (t.kind === "call") return m < 5 ? "On hold. You are caller number 1." : "Still on hold. The telephone is thinking about it.";
  if (m < 2) return "Received. Mr Gullet is looking for his pen.";
  if (m < 30) return "Read aloud to the telephone. The telephone has not replied.";
  if (m < 1440) return "Escalated to Sir Peanuel Nut, who has nodded.";
  return "Closed. It re-opened, and closed again. Now it is just a ticket.";
}
