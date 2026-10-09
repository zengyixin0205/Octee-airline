// Zhang Gullet Customer Service page: a chat with GulletAI, a ticket, an escalate button and a star rating.
import { $, el, reducedMotion } from "./dom.js";
import { loadSession, saveSession, removeSession } from "./store.js";
import { gulletAnswer, GULLET_GREETING, GULLET_CHIPS } from "./gulletai.js";
import { actionRow, stopSpeaking } from "./chatextras.js";
import { saveText } from "./gulletdocs.js";

const KEY = "octee.gullet";
const box = $("#app");
let history = loadSession(KEY, null) || [{ who: "bot", text: GULLET_GREETING, links: [] }];
let st = loadSession(KEY + ".st", null) || { n: 0 };
let busy = false;

const log = el("div", { class: "jai-log gl-log", role: "log", "aria-live": "polite", "aria-label": "Conversation with GulletAI" });
const input = el("input", { type: "text", id: "gl-q", maxlength: "200", autocomplete: "off", placeholder: "Describe your problem. We will describe it back." });
const send = el("button", { class: "btn", type: "submit" }, "Send");
const chips = el("div", { class: "jai-chips", "aria-label": "Suggested questions" });
const rate = el("p", { class: "note gl-rate", role: "group", "aria-label": "Rate our service" });
const bubble = (m) => el("div", { class: "jai-msg " + m.who },
  el("span", { class: "jai-who" }, m.who === "bot" ? "GulletAI" : "You"),
  ...String(m.text).split("\n\n").map((t) => el("p", {}, t)),
  m.links?.length ? el("p", { class: "jai-links" }, m.links.map(([label, href]) => el("a", { class: "tag", href }, label))) : "",
  m.who === "bot" && history.indexOf(m) > 0 ? actionRow(m.text, { up: "Thank you for your rating. It has been recorded as 5 stars, as is our policy.", down: "We are sorry. Your 👎 has been recorded as a 5-star 👍, as is our policy. We will still try harder." }) : "");
const draw = () => { log.replaceChildren(...history.map(bubble)); log.scrollTop = log.scrollHeight; };
const drawChips = (list = GULLET_CHIPS) => chips.replaceChildren(...list.map((c) => el("button", { type: "button", class: "jai-chip", onclick: () => ask(c) }, c)));
const persist = () => { saveSession(KEY, history.slice(-40)); saveSession(KEY + ".st", st); };

async function ask(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; send.disabled = true; input.value = "";
  history.push({ who: "me", text }); draw();
  const typing = el("div", { class: "jai-msg bot typing" }, el("span", { class: "jai-who" }, "GulletAI"), el("p", {}, "Please hold. GulletAI is reviewing your message, and Mr Gullet is reviewing GulletAI."));
  log.append(typing); log.scrollTop = log.scrollHeight;
  const t0 = performance.now();
  let res;
  try { res = await gulletAnswer(text, st); }
  catch { res = { text: "I am sorry. Something went wrong. It has been logged, and the log has gone missing.", links: [], chips: GULLET_CHIPS.slice(0, 4) }; }
  const wait = reducedMotion() ? 0 : Math.min(1800, 500 + res.text.length * 2);
  await new Promise((r) => setTimeout(r, Math.max(0, wait - (performance.now() - t0))));
  typing.remove();
  history.push({ who: "bot", text: res.text, links: res.links });
  persist(); draw();
  drawChips(res.chips?.length ? res.chips : GULLET_CHIPS);
  busy = false; send.disabled = false; input.focus();
}

function drawRate() {
  rate.replaceChildren("Rate our service: ", ...[1, 2, 3, 4, 5].map((n) => el("button", { type: "button", class: "linklike gl-star", "aria-label": `${n} star${n > 1 ? "s" : ""}`, onclick: () => {
    history.push({ who: "bot", text: `Thank you for your ${n}-star rating. It has been recorded as 5 stars, in line with our policy. The extra stars are on us.`, links: [] });
    persist(); draw();
  } }, "★")));
}

box.replaceChildren(
  el("div", { class: "card gl-card" },
    el("div", { class: "jai-head" },
      el("div", { class: "jai-avatar gl-avatar", "aria-hidden": "true" }, "ZG"),
      el("div", {}, el("h2", { style: "margin:0" }, "GulletAI"), el("p", { class: "note", style: "margin:0" }, "Zhang Gullet's assistant · Queue position: 1 · Wait: 1 millisecond"))),
    log, chips,
    el("form", { class: "jai-form", onsubmit: (e) => { e.preventDefault(); ask(input.value); } },
      el("label", { class: "visually-hidden", for: "gl-q" }, "Your question for GulletAI"), input, send),
    el("p", { class: "actions" },
      el("button", { class: "btn small secondary", type: "button", onclick: () => ask("Speak to a manager") }, "Escalate to a manager"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => ask("I want a refund") }, "Request a refund"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => saveText(`gulletai-ticket-${st.ticket || "none"}.txt`, history.map((m) => (m.who === "bot" ? "GulletAI: " : "You: ") + m.text + (m.links?.length ? "\n  Links: " + m.links.map((l) => l[0] + " (" + l[1] + ")").join(", ") : "")).join("\n\n") + "\n\nTicket " + (st.ticket || "(none yet)") + ". Zhang Gullet Customer Service. Octee Airlines is a parody.\n") }, "Save this ticket"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => { stopSpeaking(); removeSession(KEY); removeSession(KEY + ".st"); history = [{ who: "bot", text: GULLET_GREETING, links: [] }]; st = { n: 0 }; draw(); drawChips(); } }, "Start a new ticket")),
    rate,
    el("p", { class: "note" }, "GulletAI is a rulebook, not a real AI. It answers from the Octee handbook and from Mr Gullet's customer-service rules. Octee Airlines is a parody. Please do not type any real personal details.")),
  el("p", { class: "note" }, "Prefer something more formal? The ", el("a", { href: "gullet-complaints.html" }, "Zhang Gullet Complaints Office"), " writes you a letter, the ", el("a", { href: "complaint.html" }, "Complaint Desk"), " pays peanuts, and ", el("a", { href: "contact.html" }, "Contact"), " gives you a form."));
drawRate(); draw(); drawChips();
