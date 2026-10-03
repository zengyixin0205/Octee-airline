// Complaint desk: you complain, you get a ticket number and an automatic reply. Nothing leaves this browser.
import { $, el, niceDate, setMsg } from "./dom.js";
import { currentUser } from "./auth.js";
import { placeShort } from "./destinations.js";
import { hash } from "./tripkit.js";
import { load, save } from "./store.js";

const KEY = "octee.complaints";
const MAX_SAVED = 20;
const CATEGORIES = [
  ["bag", "My bag", "Your bag has been located. It is in the lost and found. We are not sure which one."],
  ["bag2", "My other bag", "We were not aware that you had another bag. We are now looking for it. We may find it before the first one."],
  ["peanut", "The peanut", "We are sorry the peanut was not to your standards. We have passed your feedback to the peanut."],
  ["engines", "The engines", "The engines have been told about your concerns. They did not reply. They rarely do."],
  ["seat", "My seat (it was unavailable, spiritually)", "Your seat has been reviewed spiritually. It remains unavailable."],
  ["pilot", "The pilot (the keys)", "We asked the pilot about the keys. He said they were in his other trousers."],
  ["joel", "The JOELMOBILE", "Joel has been informed. Joel said, \"I'm a joel!\". We do not know what that means either."],
  ["other", "Something else", "We have never heard of that, which is exactly why it is so serious."]
];

const user = currentUser();
const owner = user ? user.username : "guest";
const form = $("#complaint-form"), msg = $("#cp-msg"), replyBox = $("#cp-reply"), list = $("#cp-list");

$("#cp-name").value = user ? user.username : "";
$("#cp-cat").replaceChildren(...CATEGORIES.map(([id, label]) => el("option", { value: id }, label)));
const legs = [];
(user?.trips || []).forEach((b) => b.legs.forEach((l) => legs.push(l)));
$("#cp-flight").replaceChildren(
  el("option", { value: "" }, "Not about a flight (or all of them)"),
  ...legs.map((l) => el("option", { value: `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)} · ${niceDate(l.date)}` }, `${l.no} · ${placeShort(l.from)} → ${placeShort(l.to)} · ${niceDate(l.date)}`)));
const mad = $("#cp-mad"), madOut = $("#cp-mad-out");
mad.addEventListener("input", () => (madOut.textContent = mad.value));

const all = () => load(KEY, []).filter((c) => c && c.ticket);
const mine = () => all().filter((c) => c.owner === owner).sort((a, b) => b.at - a.at);

function reply(c) {
  const cat = CATEGORIES.find((x) => x[0] === c.cat) || CATEGORIES[CATEGORIES.length - 1];
  const upset = c.mad >= 8 ? "We can tell you are very upset. We are also very upset. Joel has cried a little." : c.mad <= 3 ? "We are glad it was only a small complaint. Please save your bigger ones for next time." : "We understand that you are upset. We have shared a peanut with the manager to show we care.";
  return el("article", { class: "card mail", "aria-label": "Automatic reply" },
    el("dl", { class: "kv mail-head" },
      el("dt", {}, "From"), el("dd", {}, "Octee Customer Care (automated, but not very)"),
      el("dt", {}, "To"), el("dd", {}, c.name),
      el("dt", {}, "Subject"), el("dd", {}, `Re: your complaint ${c.ticket}${c.flight ? " about " + c.flight.split(" · ")[0] : ""}`)),
    el("p", {}, `Dear ${c.name},`),
    el("p", {}, "Thank you for contacting Octee Airlines. Your complaint is important to us. ", el("strong", {}, "It is at the front of the queue."), " The queue has one complaint in it. It has been one complaint since Tuesday."),
    el("p", {}, cat[2]),
    el("p", {}, upset),
    el("p", { class: "mail-comp" }, el("strong", {}, "Compensation: "), `${c.peanuts} peanut${c.peanuts === 1 ? "" : "s"}, paid in peanuts. They will be delivered by the JOELMOBILE. Arrival is not guaranteed, and neither are the peanuts.`),
    el("p", {}, el("strong", {}, "Your ticket number is "), el("span", { class: "tag" }, c.ticket), " Please quote it in every future complaint, and please do not lose it. We lose everything else."),
    el("p", { class: "note" }, "Octee Customer Care. Please do not reply to this message. Replying moves you to the back of the queue, which does not exist."));
}

function status(c) {
  const mins = (Date.now() - c.at) / 60000;
  if (mins < 2) return "Received. Placed at the front of the queue.";
  if (mins < 60) return "At the front of the queue. The queue has not moved.";
  if (mins < 1440) return "Still at the front of the queue. The queue is thinking about moving.";
  return "Resolved. Your peanuts were delivered to someone else. We will not say who.";
}

function drawList() {
  const items = mine();
  if (!items.length) { list.replaceChildren(el("p", { class: "note" }, "No complaints yet. That is either very good or very suspicious.")); return; }
  list.replaceChildren(...items.map((c) => el("div", { class: "card flight-row" },
    el("div", {},
      el("strong", {}, c.ticket), " ", el("span", { class: "tag" }, (CATEGORIES.find((x) => x[0] === c.cat) || CATEGORIES[7])[1]),
      el("p", { class: "note", style: "margin:2px 0" }, `${new Date(c.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}${c.flight ? " · " + c.flight : ""} · ${c.peanuts} peanut${c.peanuts === 1 ? "" : "s"} owed`),
      el("p", { style: "margin:2px 0" }, status(c)),
      el("p", { class: "note quote", style: "margin:2px 0" }, "“" + c.text.slice(0, 160) + (c.text.length > 160 ? "…" : "") + "”")),
    el("div", { class: "actions" },
      el("button", { class: "btn small ghost", type: "button", onclick: () => { replyBox.replaceChildren(reply(c)); replyBox.scrollIntoView({ block: "center", behavior: "smooth" }); } }, "Read the reply again"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => { save(KEY, all().filter((x) => x.ticket !== c.ticket)); drawList(); } }, "Withdraw (we will pretend)")))));
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#cp-name").value.trim() || "Valued Passenger";
  const text = $("#cp-text").value.trim();
  if (text.length < 5) { setMsg(msg, "Please complain a little more. Five letters at least. Anger is welcome.", "error"); return; }
  const at = Date.now();
  const madNum = Number(mad.value) || 5;
  const c = {
    ticket: "COMP-" + String(hash(`${name}|${text}|${at}`) % 90000 + 10000), at, owner, name, text,
    flight: $("#cp-flight").value, cat: $("#cp-cat").value, mad: madNum, peanuts: Math.max(1, Math.round(madNum / 2)) + (text.length > 200 ? 1 : 0)
  };
  save(KEY, [c, ...all()].slice(0, MAX_SAVED));
  setMsg(msg, `Complaint filed. Ticket ${c.ticket}.`, "ok");
  replyBox.replaceChildren(reply(c));
  $("#cp-text").value = "";
  drawList();
  replyBox.scrollIntoView({ block: "center", behavior: "smooth" });
});

drawList();
setInterval(drawList, 30000);
