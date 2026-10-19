// Oliver Chng, Head of Scraggy Complaints. A profile and a complaint desk: each complaint gets an OC- ticket and a letter signed by Oliver.
// Complaints are kept in the account (profile field "scraggyComplaints"), so a cloud account has them saved to the cloud and on every device.
import { $, el, setMsg } from "./dom.js";
import { currentUser } from "./auth.js";
import { accountRecords, saveAccountRecords } from "./profile-records.js";

export const OLIVER_ICON = "assets/img/oliver-scraggy.png";
const KEY = "octee.oliver.complaints", FIELD = "scraggyComplaints", MAX = 20;
const CATS = [
  ["late", "Scraggy Airlines was late", "I have checked. Scraggy Airlines is never late. It arrives exactly when Scraggy wants to. If you were waiting, that is a you problem, and I say that with love."],
  ["food", "The Scraggy food", "The food comes from Scraggyton and is made with care. If it tasted strange, that is the care. I have tried it. I have also been strange since."],
  ["seat", "My Scraggy seat", "Your seat was chosen for you by Scraggy himself. Please do not argue with a seat that is on a flight with a Scraggy name."],
  ["points", "Scraggymiles", "Scraggymiles are not lost. They are resting. They will come back when they feel appreciated, so please say something nice to your balance."],
  ["scraggy", "Not enough Scraggy", "You are completely right. There is never enough Scraggy. I have written it on my wall."],
  ["other", "Something else", "I have not heard of that one before, which means it has to be about Scraggy somehow. Everything is."]
];
const FACTS = ["Oliver Chng likes Scraggy. Nobody has asked him to stop.", "He answers every complaint himself, on the same day, with the same pen.", "His desk has one chair, one pen and one very watchful Scraggy picture.", "Scraggy Airlines is a part of Octee Airlines, and Oliver says that is the best part.", "He has never once said a complaint was too small."];
const user = currentUser();
const owner = user ? user.username : "guest";
const mine = () => accountRecords(KEY, FIELD, owner, (c) => c.ticket, MAX).sort((a, b) => b.at - a.at);
const saveMine = (items) => saveAccountRecords(KEY, FIELD, owner, items, (c) => c.ticket, MAX);
const ticket = () => "OC-" + String(Math.floor(Math.random() * 9000) + 1000);
const catOf = (id) => CATS.find((x) => x[0] === id) || CATS[CATS.length - 1];

function letter(c) {
  const cat = catOf(c.cat);
  const mood = c.mad >= 8 ? "I can tell you are very upset. I am very upset with you, in a kind way, and I have looked at my Scraggy picture for comfort." : c.mad <= 3 ? "I am glad it was only a small complaint. Small complaints are my favourite, after the big ones." : "Thank you for being exactly as upset as this deserves.";
  return el("article", { class: "card mail", "aria-label": "Letter from Oliver Chng" },
    el("dl", { class: "kv mail-head" },
      el("dt", {}, "From"), el("dd", {}, "Oliver Chng, Head of Scraggy Complaints (handwritten)"),
      el("dt", {}, "To"), el("dd", {}, c.name),
      el("dt", {}, "Subject"), el("dd", {}, `Re: your complaint ${c.ticket}`)),
    el("p", {}, `Dear ${c.name},`),
    el("p", {}, "Thank you for writing to me about Scraggy. Your complaint is important, because anything with Scraggy in it is important to me."),
    el("p", {}, cat[2]),
    el("p", {}, mood),
    c.msg ? el("p", { class: "note" }, `You wrote: "${c.msg.slice(0, 160)}${c.msg.length > 160 ? "…" : ""}". I read it twice, and then I looked at a Scraggy for a bit.`) : "",
    el("p", {}, el("strong", {}, "Compensation: "), "one handwritten reply (this letter) and my best wishes, which are not redeemable."),
    el("p", {}, el("strong", {}, "Your ticket number is "), el("span", { class: "tag" }, c.ticket), ". Please quote it when you complain again."),
    el("p", {}, "Yours, in Scraggy,"),
    el("p", { class: "gc-sign" }, "Oliver Chng"),
    el("p", { class: "note" }, "Head of Scraggy Complaints"));
}

const app = $("#app");
const name = el("input", { id: "oc-name", maxlength: 40, value: user ? user.username : "", placeholder: "Your name" });
const cat = el("select", { id: "oc-cat" }, CATS.map(([id, label]) => el("option", { value: id }, label)));
const msg = el("textarea", { id: "oc-msg", rows: 4, maxlength: 600, placeholder: "What went wrong with Scraggy?" });
const mad = el("input", { id: "oc-mad", type: "range", min: 1, max: 10, value: 5 });
const madOut = el("span", {}, "5");
mad.addEventListener("input", () => { madOut.textContent = mad.value; });
const out = el("p", { class: "msg", "aria-live": "polite" });
const replyBox = el("div", { id: "oc-reply" });
const list = el("div", { id: "oc-list" });

function drawList() {
  const items = mine();
  list.replaceChildren(...(items.length ? items.map((c) => el("div", { class: "gc-row" },
    el("div", {}, el("strong", {}, c.ticket), " ", el("span", { class: "tag" }, catOf(c.cat)[1])),
    el("p", { class: "actions", style: "margin:0" }, el("button", { class: "linklike", type: "button", onclick: () => show(c) }, "Read the letter"),
      el("button", { class: "linklike", type: "button", onclick: () => { saveMine(mine().filter((x) => x.ticket !== c.ticket)); drawList(); } }, "Delete")))) : [el("p", { class: "note" }, "No complaints yet. Oliver is looking at a Scraggy, hopefully.")]));
}
function show(c) { replyBox.replaceChildren(letter(c)); replyBox.scrollIntoView({ behavior: "smooth", block: "start" }); }

const form = el("form", { class: "card", novalidate: "" },
  el("h2", {}, "Complain about Scraggy"),
  el("div", { class: "field" }, el("label", { for: "oc-name" }, "Your name"), name),
  el("div", { class: "field" }, el("label", { for: "oc-cat" }, "What is it about?"), cat),
  el("div", { class: "field" }, el("label", { for: "oc-msg" }, "Your complaint"), msg),
  el("div", { class: "field" }, el("label", { for: "oc-mad" }, "How upset are you? (1 to 10) ", madOut), mad),
  el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Send to Oliver")),
  user ? el("p", { class: "note" }, "Your complaints are saved to your account. With a cloud account they are saved to the cloud and follow you to other devices.") : el("p", { class: "note" }, el("a", { href: "login.html?next=oliver.html" }, "Log in"), " so your complaints are saved to your account. Without it they stay in this browser."),
  out);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = msg.value.trim();
  if (!text) { setMsg(out, "Please write something. Oliver cannot answer an empty page, though he would try.", "error"); return; }
  const c = { ticket: ticket(), owner, name: name.value.trim() || "Valued Passenger", cat: cat.value, msg: text, mad: Number(mad.value), at: Date.now() };
  saveMine([c, ...mine()].slice(0, MAX));
  setMsg(out, `Sent. Ticket ${c.ticket}. Oliver has the letter and a pen.`, "ok");
  msg.value = ""; mad.value = 5; madOut.textContent = "5";
  show(c); drawList();
});

app.replaceChildren(
  el("div", { class: "card oc-profile" },
    el("img", { class: "oc-icon", src: OLIVER_ICON, alt: "A Scraggy", width: 96, height: 96 }),
    el("div", {}, el("h2", { style: "margin:0" }, "Oliver Chng"), el("p", { class: "note", style: "margin:2px 0 8px" }, "Head of Scraggy Complaints"),
      el("p", { style: "margin:0" }, "“Every Scraggy complaint is a love letter in the wrong envelope.”"))),
  el("div", { class: "card" }, el("h3", {}, "About Oliver"), el("ul", {}, FACTS.map((f) => el("li", {}, f)))),
  form, replyBox,
  el("div", { class: "card" }, el("h3", {}, "Your complaints"), list));
drawList();
