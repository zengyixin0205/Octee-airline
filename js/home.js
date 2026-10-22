import { $, el, today, addDays, setMsg } from "./dom.js";
import { mountRotator } from "./taglines.js";
import { mountSearchBox, goSearch } from "./destsearch.js";
import { OA_PLACES, placeName } from "./destinations.js";
import { allReviews, starsText } from "./reviews-data.js";
import { currentUser } from "./auth.js";
import { fujitechTenthsOf, fmtFujitech, claimFujiairDaily, fujiairClaimedToday, fujiairDailyAmount, fujiairGoldOrHigher } from "./fujitech.js";
import { push } from "./cloud.js";

mountRotator($("#rotator"));
mountSearchBox($("#home-search"), { onSearch: goSearch });

// Quick flight finder -> the booking form (the only way to book)
const qf = $("#quick-find");
const from = qf.elements.from, to = qf.elements.to;
OA_PLACES.forEach((c) => { from.append(el("option", { value: c }, placeName(c))); to.append(el("option", { value: c }, placeName(c))); });
to.append(el("option", { value: "LUJ" }, "Lujin's (via Scraggy Airlines)"));
from.value = "FIA"; to.value = "SIA";
qf.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = $("#quick-msg");
  if (from.value === to.value) { msg.textContent = "You are already there. Probably."; return; }
  msg.textContent = "Searching… (this may take a while. It won't.)";
  setTimeout(() => {
    location.href = `book.html?from=${from.value}&to=${to.value}&passengers=${qf.elements.passengers.value}`;
  }, 900);
});

// Review strip: newest 4–5★ reviews only (the facade)
allReviews().then((list) => {
  const good = list.filter((r) => r.stars >= 4).slice(0, 3);
  const box = $("#review-strip");
  box.replaceChildren(...good.map((r) => el("article", { class: "card review" },
    el("div", { class: "stars", "aria-label": r.stars + " out of 5" }, starsText(r.stars)),
    el("h3", {}, r.title), el("p", {}, r.body), el("p", { class: "meta" }, r.username))));
});

// "Zhang Gullet Says": one line from Customer Service, new every visit.
const GSAYS = ["Your call is important to us. It is on a list.", "Everything is a ticket if you hold it for long enough.", "The telephone does not ring. It is thinking about it.", "A refund is only an apology that has been given a receipt.", "There is no queue. There is only me, and the person at the front of me.", "If a problem is not solved, wait. If it is still not solved, wait again. This is the whole job."];
const says = el("aside", { class: "gc-says" }, el("strong", {}, "Zhang Gullet says: "), GSAYS[Math.floor(Math.random() * GSAYS.length)], " ", el("a", { href: "zhang-gullet.html" }, "Meet Mr Gullet"), " · ", el("a", { href: "gullet-hold.html" }, "Hold line"));
const reviews = $("#review-strip");
if (reviews) (reviews.previousElementSibling || reviews).before(says);

// Free daily Fujitech, shared by every airline that uses it (Octee, Scraggy, One United, FujiAIR).
// FujiAIR's homepage has the same claim — it's one account-wide claim, claiming here counts there too.
function mountDailyFujitech() {
  const box = $("#fj-daily");
  if (!box) return;
  const u = currentUser();
  if (!u) { box.replaceChildren(el("p", { class: "note" }, "Log in to claim 1000 Fujitech a day — 1300 if you're Gold Wing or higher. Fujitech pays for fares on every airline here, including FujiAIR.")); return; }
  const claimed = fujiairClaimedToday(u);
  const amount = fujiairDailyAmount(u);
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const balance = el("strong", {}, fmtFujitech(fujitechTenthsOf(u)));
  const btn = el("button", { class: "btn", type: "button", disabled: claimed ? true : null }, claimed ? "Claimed for today" : `Claim ${amount} Fujitech`);
  btn.addEventListener("click", () => {
    try {
      const gained = claimFujiairDaily();
      push().catch(() => {});
      setMsg(msg, `+${fmtFujitech(gained)}. Come back tomorrow for more.`, "ok");
      balance.textContent = fmtFujitech(fujitechTenthsOf(currentUser()));
      btn.disabled = true;
      btn.textContent = "Claimed for today";
    } catch (e) { setMsg(msg, e.message, "error"); }
  });
  box.replaceChildren(
    el("p", {}, balance, " in your account right now."),
    el("p", { class: "note" }, fujiairGoldOrHigher(u) ? "You're Gold Wing or higher: 1300 Fujitech a day." : "1000 Fujitech a day. Reach Gold Wing for 1300.", " Same claim as on FujiAIR's own page — one per day, not one per airline."),
    el("p", {}, btn), msg);
}
mountDailyFujitech();
// Not listening for "octee:account" here: claiming itself fires that event (via updateUser), which would
// re-mount this box synchronously mid-click and wipe the success message before it's even shown (the same
// trap fujiair-shell.js's old whole-page listener fell into). The claim button updates its own text in place.
window.addEventListener("storage", mountDailyFujitech);
