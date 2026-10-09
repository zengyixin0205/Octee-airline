// Zhang Gullet's Complaints Office: a complaint gets a ZG- ticket and a letter signed by Mr Gullet.
// Nothing leaves this browser. Kept separate from the automatic Complaint Desk (js/complaint.js).
import { $, el, setMsg } from "./dom.js";
import { currentUser } from "./auth.js";
import { load, save } from "./store.js";
import { addTicket, updateTicket, statusOf } from "./gullettickets.js";
import { certificate, letterText, saveText, printNode } from "./gulletdocs.js";

const KEY = "octee.gullet.complaints";
const MAX = 20;
const CATS = [
  ["bag", "My bag", "I have been to the baggage hall myself. I looked at every bag. None of them looked back."],
  ["delay", "My flight was delayed", "I have spoken to the flight. It said it was 1 millisecond late. I said that is not how you apologise. It said sorry. I was satisfied. I hope you are."],
  ["staff", "The staff (including Joel)", "I have called Joel in. He said sorry nine times. He then said sorry a tenth time, to the telephone."],
  ["food", "The peanut", "I have tasted the peanut. It was a peanut. I do not know what you expected, but I am sure it was not this."],
  ["seat", "My seat", "I have sat in your seat. It was spiritually unavailable. I stood up. It was the first time I have stood up for a customer."],
  ["service", "Customer Service (Mr Gullet himself)", "I see that you are complaining about me. I have read it twice, and I have thought about it for a very long time. I am sorry. I do not know what I did."],
  ["other", "Something else", "I have never heard of that, which is exactly why I am taking it seriously."]
];
const user = currentUser();
const owner = user ? user.username : "guest";
const form = $("#gc-form"), out = $("#gc-out"), list = $("#gc-list"), replyBox = $("#gc-reply");
$("#gc-name").value = user ? user.username : "";
$("#gc-cat").replaceChildren(...CATS.map(([id, label]) => el("option", { value: id }, label)));
$("#gc-mad").addEventListener("input", (e) => { $("#gc-mad-out").textContent = e.target.value; });

const all = () => load(KEY, []).filter((c) => c && c.ticket);
const mine = () => all().filter((c) => c.owner === owner).sort((a, b) => b.at - a.at);
const ticket = () => "ZG-" + String(Math.floor(Math.random() * 9000) + 1000);

const status = (c) => statusOf({ ...c, kind: "complaint" });

function paras(c) {
  const cat = CATS.find((x) => x[0] === c.cat) || CATS[CATS.length - 1];
  const upset = c.mad >= 8 ? "I can tell that you are very upset. I am very upset for you. I have had a cup of tea about it." : c.mad <= 3 ? "I am glad that it was only a small complaint. Please save your bigger ones for next time. I will be here. I am always here." : "I understand that you are upset. I have shared a biscuit with the telephone to show we care.";
  return ["Thank you for writing to me. Your complaint is important to us. " + (c.aloud ? "I read it aloud to the telephone, twice, in a calm voice. " : "You asked me not to read it aloud, so I read it quietly, and moved my lips. ") + "It is now at the front of the queue. The queue is me.", cat[2], upset,
    `You wrote: "${(c.msg || "").slice(0, 160)}${(c.msg || "").length > 160 ? "…" : ""}". I have underlined the part that I agree with. It is the full stop.`,
    "Compensation: one handwritten apology (this letter), and my sincere good wishes, which are not redeemable.", `Your ticket number is ${c.ticket}. Please quote it when you complain again. I would love to hear from you.`];
}

function docButtons(c) {
  return el("div", { class: "gc-doc-actions" },
    el("button", { class: "btn small", type: "button", onclick: () => printNode(replyBox.querySelector(".mail")) }, "Print the letter"),
    el("button", { class: "btn small ghost", type: "button", onclick: () => saveText(`zhang-gullet-letter-${c.ticket}.txt`, letterText(c, paras(c))) }, "Save as a text file"),
    el("button", { class: "btn small secondary", type: "button", onclick: () => { replyBox.querySelector(".gc-cert-slot").replaceChildren(certificate(c), el("p", { class: "gc-doc-actions" }, el("button", { class: "btn small", type: "button", onclick: () => printNode(replyBox.querySelector(".gc-cert")) }, "Print the certificate"))); } }, "Get my Certificate of Having Been Heard"));
}

function letter(c) {
  const cat = CATS.find((x) => x[0] === c.cat) || CATS[CATS.length - 1];
  const upset = c.mad >= 8 ? "I can tell that you are very upset. I am very upset for you. I have had a cup of tea about it." : c.mad <= 3 ? "I am glad that it was only a small complaint. Please save your bigger ones for next time. I will be here. I am always here." : "I understand that you are upset. I have shared a biscuit with the telephone to show we care.";
  return el("article", { class: "card mail", "aria-label": "Letter from Zhang Gullet" },
    el("dl", { class: "kv mail-head" },
      el("dt", {}, "From"), el("dd", {}, "Zhang Gullet, Head of Customer Service (handwritten)"),
      el("dt", {}, "To"), el("dd", {}, c.name),
      el("dt", {}, "Subject"), el("dd", {}, `Re: your complaint ${c.ticket}`)),
    el("p", {}, `Dear ${c.name},`),
    el("p", {}, "Thank you for writing to me. Your complaint is important to us. ", c.aloud ? "I read it aloud to the telephone, twice, in a calm voice. " : "You asked me not to read it aloud, so I read it quietly, and moved my lips. ", "It is now at the front of the queue. The queue is me."),
    el("p", {}, cat[2]),
    el("p", {}, upset),
    c.msg ? el("p", { class: "note" }, `You wrote: "${c.msg.slice(0, 160)}${c.msg.length > 160 ? "…" : ""}". I have underlined the part that I agree with. It is the full stop.`) : "",
    el("p", {}, el("strong", {}, "Compensation: "), "one handwritten apology (this letter), and my sincere good wishes, which are not redeemable."),
    el("p", {}, el("strong", {}, "Your ticket number is "), el("span", { class: "tag" }, c.ticket), ". Please quote it when you complain again. I would love to hear from you."),
    el("p", {}, "Yours, with a very steady hand,"),
    el("p", { class: "gc-sign" }, "Zhang Gullet"),
    el("p", { class: "note" }, "Head of Customer Service · Deputy Head of Customer Service · The Team · The Department"));
}
function show(c) {
  replyBox.replaceChildren(letter(c), docButtons(c), el("div", { class: "gc-cert-slot" }));
  replyBox.scrollIntoView({ behavior: "smooth", block: "start" });
}

function drawList() {
  const items = mine();
  if (!items.length) { list.replaceChildren(el("p", { class: "note" }, "No complaints yet. Mr Gullet is looking at the telephone, hopefully.")); return; }
  list.replaceChildren(...items.map((c) => el("div", { class: "gc-row" },
    el("div", {}, el("strong", {}, c.ticket), " ", el("span", { class: "tag" }, (CATS.find((x) => x[0] === c.cat) || CATS[CATS.length - 1])[1])),
    el("p", { class: "note", style: "margin:2px 0" }, status(c)),
    el("p", { class: "actions", style: "margin:0" },
      el("button", { class: "linklike", type: "button", onclick: () => show(c) }, "Read the letter"),
      !c.withdrawn ? el("button", { class: "linklike", type: "button", onclick: () => { save(KEY, all().map((x) => (x.ticket === c.ticket && x.owner === owner ? { ...x, withdrawn: true } : x))); updateTicket(c.ticket, owner, { withdrawn: true }); drawList(); } }, "Withdraw") : ""))));
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#gc-name").value.trim() || "Valued Customer";
  const msg = $("#gc-msg").value.trim();
  if (!msg) { setMsg(out, "Please write something. Mr Gullet cannot read an empty page aloud. He has tried.", "error"); return; }
  const c = { ticket: ticket(), owner, name, cat: $("#gc-cat").value, msg, mad: Number($("#gc-mad").value), aloud: $("#gc-aloud").checked, at: Date.now() };
  save(KEY, [c, ...all()].slice(0, MAX));
  setMsg(out, `Sent. Ticket ${c.ticket}. Mr Gullet has the letter and a pen.`, "ok");
  form.reset(); $("#gc-name").value = user ? user.username : ""; $("#gc-mad-out").textContent = "5";
  addTicket({ ticket: c.ticket, kind: "complaint", title: (CATS.find((x) => x[0] === c.cat) || CATS[CATS.length - 1])[1], owner });
  show(c);
  drawList();
});
drawList();
