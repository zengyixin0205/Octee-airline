// One list of every Zhang Gullet ticket in this browser: GulletAI chats (GA-), Complaints Office letters (ZG-)
// and hold-line calls (HL-). Cloud-linked accounts sync these records. The status is worked out from the ticket's age.
import { load, save } from "./store.js";
import { accountRecords, saveAccountRecords } from "./profile-records.js";

const KEY = "octee.gullet.tickets";
const MAX = 60;
export const KINDS = { chat: "GulletAI chat", complaint: "Complaint letter", call: "Hold-line call" };
const all = () => load(KEY, []).filter((t) => t && t.ticket);

export function addTicket({ ticket, kind, title, owner }) {
  owner = owner || "guest";
  const list = [...new Map([...all(), ...accountRecords(KEY, "gulletTickets", owner, (t) => t.ticket, MAX)].map((t) => [t.ticket + ":" + t.owner, t])).values()];
  if (list.some((t) => t.ticket === ticket && t.owner === owner)) return;
  saveAccountRecords(KEY, "gulletTickets", owner, [{ ticket, kind, title: String(title || "").slice(0, 80), owner, at: Date.now() }, ...accountRecords(KEY, "gulletTickets", owner, (t) => t.ticket, MAX)].slice(0, MAX), (t) => t.ticket, MAX);
}
export function updateTicket(ticket, owner, patch) {
  const mine = accountRecords(KEY, "gulletTickets", owner || "guest", (t) => t.ticket, MAX);
  saveAccountRecords(KEY, "gulletTickets", owner || "guest", mine.map((t) => (t.ticket === ticket ? { ...t, ...patch } : t)), (t) => t.ticket, MAX);
}
export const ticketsFor = (owner) => accountRecords(KEY, "gulletTickets", owner || "guest", (t) => t.ticket, MAX).sort((a, b) => b.at - a.at);

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
