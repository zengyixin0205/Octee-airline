// Zhang Gullet: the page about Mr Gullet, with a button to hear what he says, and doors to his two offices.
import { $, el, pick } from "./dom.js";
import { load, save } from "./store.js";

const SAYS = [
  "Your call is important to us. It is on a list. The list is important to us.",
  "Everything is a ticket if you hold it for long enough.",
  "I have never lost a customer. They always come back. Usually to complain, but they come back.",
  "The telephone does not ring. It is thinking about it.",
  "A refund is only an apology that has been given a receipt.",
  "I have not taken a holiday in eleven years. The desk would miss me. Or it would not. I did not ask.",
  "There is no queue. There is only me, and the person at the front of me.",
  "If a problem is not solved, wait. If it is still not solved, wait again. This is the whole job."
];
const FACTS = [
  ["Title", "Head of Customer Service (and Deputy Head, and the Team, and the Department)"],
  ["Desk", "Desk 1 of 1, next to the telephone. The telephone has the better chair."],
  ["Opening hours", "24 hours a day, from 00:00 to 00:00. A person is available on Tuesdays between 03:00 and 03:01."],
  ["Wait time", "1 millisecond, always. It becomes longer when you look at it."],
  ["Tickets resolved", "None. Tickets are not resolved. They are carried, gently, to a better place."],
  ["Assistant", "GulletAI, who is polite, slow, and not a real AI."],
  ["Manager", "Sir Peanuel Nut, who is not seen."]
];

// ----- Mr Gullet's desk: press the phone. He answers differently each time; his mood follows the hour. -----
const MOODS = [
  { id: "calm", label: "calm", from: 5, to: 10, says: ["Good morning. Customer Service. I have already forgiven you for whatever it is.", "Hello. The kettle is on. The telephone is not. Please go on.", "Yes? Oh, it is you. It is nice to hear a ring. It has been a quiet one.", "Customer Service. Gullet. How may I fail to help you this morning?", "Good morning. I am at my desk. The desk is at me. Please begin.", "Hello. I was just thinking about nothing. It is going very well."] },
  { id: "patient", label: "patient", from: 10, to: 14, says: ["I can wait. I have waited for a long time. I am rather good at it.", "Take your time. The queue is only you. You may take as long as the queue can bear.", "Yes, I am listening. I am also looking at the clock. We are both very still.", "Please do not hurry. A hurried complaint is a wrong complaint. A slow one is a delay.", "I will hold. You hold. We will hold together. This is a good call.", "No rush. The telephone is rested. So am I. We have a very patient morning."] },
  { id: "reading it aloud", label: "reading it aloud", from: 14, to: 18, says: ["Dear Sir or Madam, I am reading aloud now. Please do not interrupt the telephone.", "I am reading your complaint to the telephone. It is a good one. The telephone nods.", "Yes, yes. I have it here. 'Dear Octee.' Dear Octee, it begins. Oh. It is going to be a long one.", "One moment. I am reading aloud. I always read aloud in the afternoon. It is the law, I think.", "I have your letter. I am reading it to the stapler. The stapler has questions.", "'To whom it may concern.' It concerns me. It concerns the telephone. It concerns the biscuit."] },
  { id: "tired, but polite", label: "tired, but polite", from: 18, to: 23, says: ["Customer Service. It is late. It is also early. Either way, I am sorry, and I am here.", "Hello. I have had a long day. It was also a long week. It is still my pleasure.", "Gullet speaking. I am tired but polite. The politeness is the part that is awake.", "Yes. Yes, I can help you. I might need to sit down. I am sitting. I will sit more.", "The queue is you, and I am glad of the company. Please go on. I will rest my eyes on the telephone.", "It is nearly the end of the day. It is not. It is never the end of the day. Please, how can I help?"] },
  { id: "asleep, but answering", label: "asleep, but answering", from: 23, to: 29, says: ["Mm. Customer Service. Zzz. Gullet. How may I… zzz… fail to help you?", "Hello? Is it Tuesday? It is not Tuesday. Please call back in the morning. I will not remember this.", "I am asleep. Please leave a message after the tone. There is no tone. I will make one: beep.", "Customer… Service. Yes. Your ticket is… in the… cupboard. Joel has it. Zzz.", "Mmm. I am here. I am completely here. My eyes are closed so that I can hear you better.", "You have reached Mr Gullet. He is asleep. He is also at his desk. These are both true."] }
];
const moodNow = (h = new Date().getHours()) => MOODS.find((m) => (h >= m.from && h < m.to) || (h + 24 >= m.from && h + 24 < m.to)) || MOODS[0];
const HEARD = "octee.gullet.heard";
const ALL_SAYS = MOODS.flatMap((m) => m.says.map((t) => m.id + "|" + t));
let heard = new Set(load(HEARD, []));
const deskSays = el("p", { class: "zd-says", "aria-live": "polite" }, "Press the telephone. Mr Gullet is at his desk.");
const moodTag = el("span", { class: "tag" }, "");
const count = el("p", { class: "note" }, "");
const paintDesk = () => { moodTag.textContent = "Mood now: " + moodNow().label; count.textContent = `You have heard ${heard.size} of ${ALL_SAYS.length} things Mr Gullet says on the telephone. (He says different things at different times of day.)`; };
let last = "";
const phoneBtn = el("button", { class: "zd-phone", type: "button", "aria-label": "Press the telephone on Mr Gullet's desk", onclick: () => {
  const m = moodNow();
  const pool = m.says.filter((t) => t !== last); const t = pick(pool.length ? pool : m.says); last = t;
  heard.add(m.id + "|" + t); save(HEARD, [...heard]);
  phoneBtn.classList.remove("ring"); void phoneBtn.offsetWidth; phoneBtn.classList.add("ring");
  deskSays.textContent = t; paintDesk();
} }, "☎");
paintDesk();
const deskCard = el("div", { class: "zd-desk" },
  el("h2", { style: "margin:0 0 6px" }, "Mr Gullet's desk"),
  el("p", { style: "margin:0 0 8px" }, moodTag),
  phoneBtn, deskSays, count,
  el("p", { class: "note", style: "margin:0" }, "Want to wait for him on a real line? Try the ", el("a", { href: "gullet-hold.html" }, "Hold Line"), "."));

// ----- the staff list -----
const STAFF = [
  { name: "Zhang Gullet", init: "ZG", role: "Head of Customer Service", text: "Also the Deputy Head, the Team and the Department. Calm, formal and patient. Has never raised his voice. Has raised the volume of the telephone.", link: ["zhang-gullet.html", "That is this page"] },
  { name: "GulletAI", init: "AI", role: "Assistant (a rulebook)", text: "Polite, slow and not a real AI. Gives a ticket number every time and asks 'have I resolved your issue?' after the second answer. Remembers your name for the length of a ticket.", link: ["customer-service.html", "Ask GulletAI"] },
  { name: "Sir Peanuel Nut", init: "?", role: "Manager (not seen)", text: "Nobody has seen him. He replies with a nod, which is the highest form of attention the airline has. Escalations go to him. So does the post.", cls: "staff-unseen", link: ["customer-service.html", "Escalate something"] },
  { name: "The Telephone", init: "☎", role: "Equipment (senior)", text: "Does not ring. Is thinking about it. Has the better chair. Has been looked at by Mr Gullet since a Tuesday. Is believed to be the real manager.", cls: "staff-phone", link: ["gullet-hold.html", "Call it"] }
];
const staff = el("div", { class: "staff-grid" }, ...STAFF.map((p) => el("div", { class: "card staff-card " + (p.cls || "") },
  el("div", { class: "gl-avatar", "aria-hidden": "true" }, p.init), el("h3", { style: "margin:4px 0 0" }, p.name), el("p", { class: "note", style: "margin:0 0 6px" }, p.role),
  el("p", {}, p.text), el("p", { class: "actions", style: "justify-content:center;margin:0" }, el("a", { class: "btn small ghost", href: p.link[0] }, p.link[1])))));

const root = $("#app");
const say = el("blockquote", { class: "gc-quote", "aria-live": "polite" }, pick(SAYS));
root.replaceChildren(
  el("div", { class: "split" },
    el("div", { class: "card gc-profile" },
      el("div", { class: "gl-avatar gc-badge", "aria-hidden": "true" }, "ZG"),
      el("h2", { style: "margin:8px 0 2px" }, "Zhang Gullet"),
      el("p", { class: "note", style: "margin:0" }, "Head of Customer Service, Octee Airlines"),
      el("p", {}, "Mr Gullet joined Octee Airlines on a Tuesday and has been answering the telephone since. He is calm, formal and very, very patient. He has never raised his voice. He has raised the volume of the telephone."),
      say,
      el("button", { class: "btn small secondary", type: "button", onclick: () => { say.textContent = pick(SAYS); } }, "What would Mr Gullet say?")),
    el("div", {},
      el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "His offices"),
        el("p", {}, el("strong", {}, "Customer Service. "), "Ask GulletAI about refunds, delays, bags, managers and the rest of the site. It gives you a ticket every time."),
        el("p", { class: "actions" }, el("a", { class: "btn small", href: "customer-service.html" }, "Ask GulletAI")),
        el("p", {}, el("strong", {}, "Complaints Office. "), "Complain to Mr Gullet in person. He reads it aloud to the telephone and replies by hand."),
        el("p", { class: "actions" }, el("a", { class: "btn small secondary", href: "gullet-complaints.html" }, "Make a complaint")),
        el("p", {}, el("strong", {}, "Hold Line. "), "Call him. Queue position: 1. He picks up on Tuesdays, 03:00 to 03:01."),
        el("p", { class: "actions" }, el("a", { class: "btn small ghost", href: "gullet-hold.html" }, "Call Mr Gullet"))),
      el("p", { class: "note" }, "Prefer the automatic desk? The ", el("a", { href: "complaint.html" }, "Complaint Desk"), " replies instantly, and is signed by a peanut."))),
  deskCard,
  el("h2", {}, "The team"), staff,
  el("h2", {}, "Facts about Mr Gullet"),
  el("dl", { class: "kv card" }, ...FACTS.flatMap(([k, v]) => [el("dt", {}, k), el("dd", {}, v)])),
  el("p", { class: "note" }, "Zhang Gullet is a fictional character. Octee Airlines is a parody."));
