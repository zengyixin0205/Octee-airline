// The apology letter for one late flight, or your list of apologies if no flight is chosen.
import { $, el, niceDate } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { placeShort } from "./destinations.js";
import { findLeg, legUrl, tripId } from "./tripkit.js";
import { trackState } from "./delays.js";
import { apologies, letter, markRead, generalLetter, CUPBOARD } from "./apology.js";
import { save } from "./store.js";

const root = $("#apology");

function inbox() {
  const list = apologies();
  root.replaceChildren(
    el("section", { class: "hero" }, el("p", { class: "eyebrow" }, "Messages from Octee Airlines"), el("h1", { class: "headline" }, "Our apologies", el("span", { class: "punch long" }, "all of them, sorry"))),
    ...(list.length
      ? list.map((a) => el("div", { class: "card flight-row" },
          el("div", {}, el("strong", {}, `Flight ${a.no}`), " ", el("span", { class: "tag" }, a.read ? "Read" : "New"),
            el("p", { class: "note", style: "margin:2px 0" }, `Apology number ${a.n} · ${a.late} late · ${new Date(a.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`)),
          el("a", { class: "btn small", href: a.url }, "Read it")))
      : [el("div", { class: "card" }, el("p", {}, "We have nothing to apologise for yet. This will not last. Track a flight and we will find something."),
          el("div", { class: "actions" }, el("a", { class: "btn", href: "track.html" }, "Track a flight")))]));
}

function general() {
  const n = Number(new URLSearchParams(location.search).get("general")) || 1;
  const u = currentUser();
  if (n > 3) save(CUPBOARD, true);
  const { who, paragraphs, unrelated } = generalLetter(n, u ? u.username : "Valued Passenger");
  root.replaceChildren(
    el("section", { class: "hero" }, el("p", { class: "eyebrow" }, "Messages from Octee Airlines"), el("h1", { class: "headline" }, unrelated ? "Joel has run out of sorry" : "We are so sorry", el("span", { class: "punch long" }, unrelated ? "here is a different one" : "1 millisecond late"))),
    el("article", { class: "card mail", "aria-label": "Apology letter" },
      el("dl", { class: "kv mail-head" },
        el("dt", {}, "From"), el("dd", {}, unrelated ? "Joel, from the cupboard" : "Octee Airlines, Department of Being Sorry"),
        el("dt", {}, "To"), el("dd", {}, who),
        el("dt", {}, "Subject"), el("dd", {}, unrelated ? "An unrelated apology" : "A very sincere apology about everything being 1 millisecond late")),
      el("p", {}, `Dear ${who},`),
      ...paragraphs.map((t) => el("p", {}, t)),
      el("p", {}, "Yours most apologetically, apologetically, and then more apologetically,"),
      el("p", {}, el("strong", {}, "Sir Peanuel Nut"), el("br"), "Chief Apology Officer, Octee Airlines", el("br"), el("strong", {}, "Joel"), el("br"), "JOELMOBILE Operations Manager (crying, a little)", el("br"), el("strong", {}, "Zhang Gullet"), el("br"), "Head of Customer Service (read aloud to the telephone)"),
      el("p", { class: "note" }, "P.S. We are sorry. P.P.S. Still sorry. P.P.P.S. We will write again in 10 seconds."),
      el("p", { class: "mail-comp", id: "sorry-count" })),
    el("div", { class: "actions" }, unrelated ? el("a", { class: "btn", href: "cupboard.html" }, "Open Joel's cupboard") : el("a", { class: "btn", href: "book.html" }, "Book a flight (so we can be sorrier)"), el("a", { class: "btn secondary", href: "complaint.html" }, "Complain about it")));
  const mail = $(".mail", root), line = $("#sorry-count");
  const count = (mail.textContent.match(/sorry|apolog/gi) || []).length + 2;
  line.append(el("strong", {}, "Times we said sorry in this letter: "), `${count}. We are sorry it was not more.`);
}

function show() {
  const user = currentUser();
  if (!new URLSearchParams(location.search).has("t")) return inbox();
  const found = findLeg(user);
  if (!found) { root.replaceChildren(el("div", { class: "card" }, el("p", {}, "We could not find that flight. We are sorry. That is the first thing we are sorry about today."), el("p", {}, el("a", { class: "btn", href: "apology.html" }, "Your apologies")))); return; }
  const { b, l, i } = found;
  const ts = trackState(b, i);
  if (!ts || ts.stage < 1) {
    root.replaceChildren(el("section", { class: "hero" }, el("p", { class: "eyebrow" }, "Messages from Octee Airlines"), el("h1", { class: "headline" }, "No apology yet", el("span", { class: "punch long" }, "we are working on it"))),
      el("div", { class: "card" }, el("p", {}, `Flight ${l.no} is not late yet, so there is nothing to apologise for. (We are already practising.)`),
        el("div", { class: "actions" }, el("a", { class: "btn", href: legUrl("track.html", b, i) }, "Track my flight"))));
    return;
  }
  const rec = apologies().find((a) => a.id === `${tripId(b)}.${i}`);
  const n = rec ? rec.n : 1;
  const { who, late, paragraphs } = letter({ names: b.names, l, stage: ts.stage, n });
  root.replaceChildren(
    el("section", { class: "hero" }, el("p", { class: "eyebrow" }, "Messages from Octee Airlines"), el("h1", { class: "headline" }, "We are so sorry", el("span", { class: "punch long" }, `${late} late`))),
    el("article", { class: "card mail", "aria-label": "Apology letter" },
      el("dl", { class: "kv mail-head" },
        el("dt", {}, "From"), el("dd", {}, "Octee Airlines, Department of Being Sorry"),
        el("dt", {}, "To"), el("dd", {}, who),
        el("dt", {}, "Subject"), el("dd", {}, `A very sincere apology about flight ${l.no} (${placeShort(l.from)} → ${placeShort(l.to)}, ${niceDate(l.date)})`)),
      el("p", {}, `Dear ${who},`),
      ...paragraphs.map((t) => el("p", {}, t)),
      el("p", {}, "Yours most apologetically, apologetically, and then more apologetically,"),
      el("p", {}, el("strong", {}, "Sir Peanuel Nut"), el("br"), "Chief Apology Officer, Octee Airlines", el("br"), el("strong", {}, "Joel"), el("br"), "JOELMOBILE Operations Manager (crying, a little)", el("br"), el("strong", {}, "Zhang Gullet"), el("br"), "Head of Customer Service (read aloud to the telephone)"),
      el("p", { class: "note" }, "P.S. We are sorry. P.P.S. Still sorry. P.P.P.S. This letter will be sent again if things get worse. They will."),
      el("p", { class: "mail-comp", id: "sorry-count" })),
    el("div", { class: "actions" },
      el("a", { class: "btn", href: legUrl("track.html", b, i) }, "Back to the tracker"),
      el("a", { class: "btn secondary", href: legUrl("certificate.html", b, i) }, "Get my delay certificate"),
      el("a", { class: "btn ghost", href: legUrl("share.html", b, i) }, "Share my trip"),
      el("a", { class: "btn ghost", href: "complaint.html" }, "Claim my peanuts")));
  const mail = $(".mail", root), line = $("#sorry-count");
  const count = (mail.textContent.match(/sorry|apolog/gi) || []).length + 2;      // the line below says sorry twice itself
  line.append(el("strong", {}, "Times we said sorry in this letter: "), `${count}. We are sorry it was not more.`);
  markRead(`${tripId(b)}.${i}`, ts.stage);
}

if (new URLSearchParams(location.search).has("general")) general();
else if (requireLogin()) show();
