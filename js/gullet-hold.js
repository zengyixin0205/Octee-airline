// The Hold Line: "call" Zhang Gullet. Queue position is always 1. The waiting music is silent, with a rhythm (a beat you can see).
// Mr Gullet picks up only on Tuesdays between 03:00 and 03:01 (your local time).
import { $, el, pick } from "./dom.js";
import { currentUser } from "./auth.js";
import { addTicket, updateTicket } from "./gullettickets.js";
import { inWindow, nextWindow, span, DAYS } from "./gulletwindow.js";

const owner = currentUser()?.username || "guest";
const CAPTIONS = ["♪ (silence, in 4/4) ♪", "Your call is important to us. It is on a list.", "♪ (the same silence, slightly faster) ♪", "You are caller number 1. So is everyone.", "All of our agents are busy. Our agent is Mr Gullet. He is looking at the telephone.", "♪ (a very long rest) ♪", "Did you know? You can also ask GulletAI. It is slower than him, and faster than this.", "Please stay on the line. The line is staying on you."];
const PICKUP = ["Good morning. Zhang Gullet, Customer Service. Is that the same call from last Tuesday? It is. Good. Please, go ahead. I have a pen.", "Customer Service. Gullet speaking. I have been looking at the telephone, and it has just rung. This is a very good day.", "Hello, yes, this is Mr Gullet. You are caller number 1. You were also caller number 1 last week. I remember your silence."];

const root = $("#app");
let state = "idle", t0 = 0, tick = null, capI = 0, ticket = null;
const phone = el("p", { class: "hl-phone", "aria-hidden": "true" }, "☎");
const status = el("p", { class: "hl-status", role: "status", "aria-live": "polite" }, "Not connected.");
const queue = el("p", { class: "hl-queue", "aria-label": "Your queue position" }, "—");
const queueNote = el("p", { class: "note" }, "Queue position");
const beat = el("div", { class: "hl-beat", "aria-hidden": "true" }, ...Array.from({ length: 8 }, () => el("span")));
const caption = el("p", { class: "hl-caption", "aria-live": "polite" }, "");
const timer = el("p", { class: "note" }, "");
const pickupBox = el("div", { class: "hl-pickup", hidden: true });
const winNote = el("p", { class: "note" }, "");
const call = el("button", { class: "btn", type: "button", onclick: () => dial() }, "Call Mr Gullet");
const hang = el("button", { class: "btn ghost", type: "button", hidden: true, onclick: () => hangUp() }, "Hang up");

function drawWindow() {
  const d = new Date();
  winNote.textContent = inWindow(d)
    ? "It is Tuesday, between 03:00 and 03:01. Mr Gullet can pick up right now. Hurry. It is one minute."
    : `Mr Gullet picks up on Tuesdays, 03:00 to 03:01 (your local time). Next window: ${DAYS[nextWindow(d).getDay()]} ${nextWindow(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, 03:00, in ${span(nextWindow(d) - d)}.`;
}
function dial() {
  if (state !== "idle") return;
  state = "ringing"; call.hidden = true; hang.hidden = false; pickupBox.hidden = true;
  ticket = "HL-" + String(Math.floor(Math.random() * 9000) + 1000);
  status.textContent = "Calling… ring… ring…"; queue.textContent = "—"; caption.textContent = "";
  phone.classList.add("ring");
  setTimeout(() => {
    if (state !== "ringing") return;
    phone.classList.remove("ring");
    if (inWindow()) return answer();
    state = "hold"; t0 = Date.now(); capI = 0;
    addTicket({ ticket, kind: "call", title: "Hold-line call", owner });
    status.textContent = `Connected. You are on hold. Call reference ${ticket}.`;
    queue.textContent = "1"; queueNote.textContent = "Queue position. Callers ahead of you: 0. Callers behind you: you.";
    beat.classList.add("on"); caption.textContent = CAPTIONS[0];
    tick = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      timer.textContent = `On hold for ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}. Estimated wait: 1 millisecond.`;
      if (s % 6 === 5) { capI = (capI + 1) % CAPTIONS.length; caption.textContent = CAPTIONS[capI]; }
      if (inWindow()) { clearInterval(tick); answer(); }
    }, 1000);
  }, 1800);
}
function answer() {
  state = "answered"; clearInterval(tick); beat.classList.remove("on");
  addTicket({ ticket, kind: "call", title: "Hold-line call (answered)", owner });
  status.textContent = "Mr Gullet has picked up."; queue.textContent = "0"; queueNote.textContent = "Queue position. You are the call.";
  pickupBox.hidden = false; pickupBox.replaceChildren(el("p", { style: "margin:0" }, el("strong", {}, "Mr Gullet: "), pick(PICKUP)), el("p", { class: "note", style: "margin:6px 0 0" }, "He is ready for your complaint. ", el("a", { href: "gullet-complaints.html" }, "Complaints Office"), " · ", el("a", { href: "customer-service.html" }, "GulletAI")));
  caption.textContent = "";
}
function hangUp() {
  clearInterval(tick); beat.classList.remove("on"); phone.classList.remove("ring");
  if (ticket && state === "hold") updateTicket(ticket, owner, { closed: true });
  state = "idle"; call.hidden = false; call.textContent = "Call again (back to position 1)"; hang.hidden = true;
  status.textContent = "You hung up. Mr Gullet noticed. He has put the telephone down gently, as a courtesy."; queue.textContent = "—"; caption.textContent = ""; timer.textContent = ""; pickupBox.hidden = true;
}

root.replaceChildren(el("div", { class: "card hl-card" }, phone, status, queue, queueNote, beat, caption, timer, pickupBox, el("p", { class: "actions", style: "justify-content:center" }, call, hang)),
  el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "When does he pick up?"), winNote, el("p", { class: "note" }, "He does not mind that it is early. He is up. He is always up. The telephone is up too, and has been looking at him since Monday.")),
  el("p", { class: "note" }, "Prefer to type? Ask ", el("a", { href: "customer-service.html" }, "GulletAI"), ". Prefer to write? The ", el("a", { href: "gullet-complaints.html" }, "Complaints Office"), " replies by hand. Every call you make is added to your ", el("a", { href: "account.html" }, "ticket history"), "."));
drawWindow(); setInterval(drawWindow, 30000);
