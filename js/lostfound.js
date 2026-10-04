// Lost and Found. Items are a fixed list; some are already "claimed by Joel". Your claims and reports stay in this browser.
import { $, el, setMsg } from "./dom.js";
import { currentUser } from "./auth.js";
import { hash } from "./tripkit.js";
import { load, save } from "./store.js";
import { addPeanuts } from "./peanuts.js";

const KEY = "octee.lostfound";
const ITEMS = [
  ["one left shoe", "Terminal 1, security", "Size unknown. It was alone, and it was not sad."],
  ["a very confident peanut", "Gate B3", "It will not leave. It says the gate is its gate."],
  ["a tuba (no tuba player)", "Baggage belt 7", "It went round twelve times. Nobody looked."],
  ["a boarding pass for yesterday", "Check-in hall", "The seat is 14A. The flight is gone."],
  ["one very large sock", "Terminal 2, lounge", "It is the size of a bag. We checked. It is a sock."],
  ["a passport (this one is a peanut)", "Immigration", "The photo is a peanut. It looks the same as everyone else."],
  ["a briefcase of paperwork", "Food court", "Nobody has opened it. We are scared of it."],
  ["an umbrella (it was indoors)", "Terminal 1, fog area", "It is still raining there. Spiritually."],
  ["the pilot's keys", "The cockpit", "They were in his other trousers. We found the trousers too."],
  ["a plush toy shaped like a plane", "Gate A8", "It has been through a lot and it knows."],
  ["a left glove (no right glove)", "Train platform", "Its pair is in Scraggyton. We have asked."],
  ["a laptop with 2% battery", "Lounge", "It has been at 2% since Tuesday."],
  ["a birthday cake (partly eaten)", "Gate D140A", "Happy birthday, whoever you are. It was good."],
  ["a wedding ring (a plastic one)", "Duty free", "It is very sincere. It is also plastic."],
  ["a map of FIA (wrong airport)", "Information desk", "It shows an airport that is fine."],
  ["sunglasses (worn indoors since 2019)", "Terminal 3", "They would like to be taken outside."],
  ["a suitcase with a smaller suitcase in it", "Baggage hall", "Inside that, a smaller one. We stopped."],
  ["half a sandwich", "Gate C1B", "We take no responsibility for the other half."],
  ["a scarf, 4 metres long", "Terminal 5", "It is not a scarf. It might be a snake. It is not a snake."],
  ["a bag of 400 peanuts", "Runway 2 (it was a road)", "Joel says they are his. He says that a lot."]
].map(([name, where, note], k) => ({ id: "lf" + k, name, where, note, days: 1 + (hash(name) % 40), joel: hash("joel|" + name) % 4 === 0 }));

const user = currentUser();
const owner = user ? user.username : "guest";
const store = () => load(KEY, { claims: {}, lost: [] });
const list = $("#lf-list"), msg = $("#lf-msg"), mine = $("#lf-mine"), search = $("#lf-search");

function draw() {
  const q = search.value.trim().toLowerCase();
  const db = store();
  const items = ITEMS.filter((i) => !q || (i.name + " " + i.where).toLowerCase().includes(q));
  list.replaceChildren(...(items.length ? items.map((it) => {
    const claim = db.claims[it.id];
    const youHave = claim && claim.owner === owner;
    const status = it.joel ? "Claimed by Joel" : youHave ? "Claimed by you" : claim ? "Claimed by someone else" : "Unclaimed";
    const taken = it.joel || (claim && !youHave);
    const card = el("div", { class: "card lf-item" },
      el("h3", { style: "margin:0" }, it.name),
      el("p", { class: "note", style: "margin:2px 0" }, `Found at ${it.where} · ${it.days} day${it.days === 1 ? "" : "s"} ago`),
      el("p", { style: "margin:4px 0" }, it.note),
      el("span", { class: "tag" + (it.joel ? " joel" : "") }, status));
    if (youHave) card.append(el("p", { class: "note", style: "margin:6px 0 0" }, `Your description: “${claim.proof}”. Collect it from Desk 14. Desk 14 has moved.`));
    else if (!taken) {
      const proof = el("input", { type: "text", maxlength: "80", placeholder: "Describe it, so we know it is yours", "aria-label": "Describe " + it.name });
      const form = el("form", { class: "lf-claim", onsubmit: (e) => {
        e.preventDefault();
        const text = proof.value.trim();
        if (text.length < 3) { setMsg(msg, "Describe it a little. We need some proof. Any proof.", "error"); return; }
        const d = store(); d.claims[it.id] = { owner, proof: text, at: Date.now() }; save(KEY, d);
        const got = addPeanuts(`Lost and Found: claimed ${it.name} (a finder's peanut)`, 1);
        setMsg(msg, `Claim accepted for ${it.name}. Collect it from Desk 14.${got ? " +1 peanut in your wallet." : ""}`, "ok");
        draw();
      } }, proof, el("button", { class: "btn small", type: "submit" }, "This is mine"));
      card.append(form);
    }
    return card;
  }) : [el("p", { class: "note" }, "Nothing matches. It is either not lost, or it is very lost.")]));
  const lost = db.lost.filter((x) => x.owner === owner);
  mine.replaceChildren(...(lost.length ? [el("h2", {}, "Things you have reported lost"), ...lost.map((x) => el("div", { class: "card flight-row" },
    el("div", {}, el("strong", {}, x.ticket), " ", el("span", { class: "tag" }, "Not found. Joel has it."),
      el("p", { style: "margin:2px 0" }, x.what), el("p", { class: "note", style: "margin:0" }, x.where ? "Lost near: " + x.where : "Lost: somewhere, probably")),
    el("button", { class: "btn small ghost", type: "button", onclick: () => { const d = store(); d.lost = d.lost.filter((y) => y.ticket !== x.ticket); save(KEY, d); draw(); } }, "Stop looking (we will not)")))] : []));
}

$("#lf-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const what = $("#lf-what").value.trim();
  if (!what) return;
  const at = Date.now();
  const d = store();
  d.lost = [{ ticket: "LF-" + String(hash(what + at) % 9000 + 1000), owner, what, where: $("#lf-where").value.trim(), at }, ...d.lost].slice(0, 20);
  save(KEY, d);
  setMsg(msg, `Reported. Ticket ${d.lost[0].ticket}. We have not found it yet. We have not looked yet. We will not look.`, "ok");
  $("#lf-what").value = ""; $("#lf-where").value = "";
  draw();
});
search.addEventListener("input", draw);
draw();
