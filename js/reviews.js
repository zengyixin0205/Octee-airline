// Reviews: the archive (data/reviews.json, seen by everyone) + reviews written in this browser.
import { $, el, setMsg, niceDate, today } from "./dom.js";
import { currentUser, updateUser } from "./auth.js";
import { addMiles } from "./miles.js";
import { cloudLinked } from "./cloud.js";
import { allReviews, myReview, saveMyReview, deleteMyReview, starsText } from "./reviews-data.js";
import { placeShort } from "./destinations.js";

let filter = "all", sort = "newest";
let flash = null;   // message to show after the form re-renders

function card(r) {
  return el("article", { class: "card review" },
    el("div", { class: "stars", "aria-label": `${r.stars} out of 5 stars` }, starsText(r.stars)),
    el("h3", {}, r.title),
    el("p", {}, r.body),
    el("p", { class: "meta" }, r.username, " · ", niceDate(r.date), r.route ? " · " + r.route : "", " ",
      r.verified ? el("span", { class: "tag" }, "Verified Octee flyer ✈") : "",
      r.archived || r.cloud ? "" : el("span", { class: "tag" }, "In this browser only")));
}

async function renderList() {
  const all = await allReviews();
  const avg = all.length ? all.reduce((n, r) => n + r.stars, 0) / all.length : 0;
  $("#real-avg").textContent = all.length ? `Actual average: ${avg.toFixed(1)} ★ from ${all.length} review${all.length > 1 ? "s" : ""}.` : "Actual average: not available yet.";
  let list = filter === "all" ? all : all.filter((r) => r.stars === +filter);
  if (sort === "high") list = [...list].sort((a, b) => b.stars - a.stars);
  if (sort === "low") list = [...list].sort((a, b) => a.stars - b.stars);
  const good = list.filter((r) => r.stars >= 4), lost = list.filter((r) => r.stars <= 3);
  $("#featured").replaceChildren(...(good.length ? good.map(card) : [el("p", { class: "note" }, all.length ? "No featured reviews match. Suspicious." : "No reviews yet. Everyone is still waiting to land.")]));
  $("#lost-count").textContent = `(${lost.length})`;
  $("#lost-list").replaceChildren(...(lost.length ? lost.map(card) : [el("p", { class: "note" }, "Nothing here. We lost those too.")]));
}

for (const b of document.querySelectorAll("#filters button")) {
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    document.querySelectorAll("#filters button").forEach((x) => { x.setAttribute("aria-pressed", String(x === b)); x.className = "btn small " + (x === b ? "secondary" : "ghost"); });
    renderList();
  });
}
$("#sort").addEventListener("change", (e) => { sort = e.target.value; renderList(); });

async function renderForm() {
  const box = $("#write");
  const u = currentUser();
  if (!u) { box.replaceChildren(el("p", {}, "Log in to write a review. ", el("a", { class: "btn small", href: "login.html?next=reviews.html" }, "Log in / Sign up"))); return; }
  const mine = await myReview(u.username), cloudIn = cloudLinked();
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  if (flash) setMsg(msg, flash, "ok");
  const counter = el("span", { class: "hint", id: "body-count" });
  const body = el("textarea", { id: "r-body", maxlength: "500", "aria-describedby": "body-count" });
  body.value = mine?.body || "";
  const upd = () => (counter.textContent = `${body.value.trim().length} / 500 characters (at least 20)`);
  body.addEventListener("input", upd); upd();
  const stars = mine?.stars || 5;   // 5 stars pre-selected "for your convenience"
  const trips = u.trips || [];
  const form = el("form", { class: "card" },
    el("h3", {}, mine ? "Edit your review" : "Write a review"),
    el("fieldset", {}, el("legend", { style: "font-size:1rem" }, "Star rating"),
      el("div", { class: "star-input" }, [1, 2, 3, 4, 5].map((n) => el("label", {},
        el("input", { type: "radio", name: "stars", value: n, checked: n === stars }), starsText(n)))),
      el("p", { class: "hint" }, "5 stars are pre-selected for your convenience. You may change it. We'd rather you didn't.")),
    el("div", { class: "field" }, el("label", { for: "r-trip" }, "Which flight? (optional)"),
      el("select", { id: "r-trip" }, el("option", { value: "" }, "— none —"),
        trips.map((t) => el("option", { value: t.ref, selected: mine?.tripRef === t.ref }, `${t.ref} · ${placeShort(t.from)} → ${placeShort(t.to)} · ${niceDate(t.legs[0].date)}`)))),
    el("div", { class: "field" }, el("label", { for: "r-title" }, "Title"), el("input", { type: "text", id: "r-title", maxlength: "60", value: mine?.title || "" })),
    el("div", { class: "field" }, el("label", { for: "r-body" }, "Review"), body, counter),
    el("label", { class: "check" }, el("input", { type: "checkbox", id: "r-ok" }), "This review is about Octee, not my bag"),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, mine ? "Save changes" : "Post review"),
      mine ? el("button", { class: "btn ghost", type: "button", onclick: async () => { await deleteMyReview(u.username); renderForm(); renderList(); } }, "Delete my review") : ""),
    msg,
    el("p", { class: "note" }, cloudIn ? "Your review is saved in the cloud, so everyone can read it." : "You are not logged in to the cloud, so this review stays in this browser only. Log in with a cloud account (Log in tab) to show it to everyone."));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = +form.querySelector("input[name=stars]:checked")?.value;
    const title = $("#r-title").value.trim(), text = body.value.trim();
    if (!st) return setMsg(msg, "Pick a star rating.", "error");
    if (!title) return setMsg(msg, "Your review needs a title (up to 60 characters).", "error");
    if (text.length < 20) return setMsg(msg, "Please write at least 20 characters. Even 'one peanut' needs explaining.", "error");
    if (!$("#r-ok").checked) return setMsg(msg, "Please tick the box. Is it about Octee, or your bag?", "error");
    const trip = trips.find((t) => t.ref === $("#r-trip").value);
    const where = await saveMyReview(u.username, { stars: st, title, body: text, date: today(), tripRef: trip?.ref || "", route: trip ? `${placeShort(trip.from)} → ${placeShort(trip.to)}` : "", verified: trips.length > 0 });
    flash = (where === "cloud" ? "Thank you! Your review is now on the page for everyone. The queue was also delayed." : "Thank you! Your review is saved in this browser only (the cloud could not be used).")
      + (u.reviewBonus ? "" : " +30 Octmiles for your first review.");
    if (!u.reviewBonus) updateUser((x) => { x.reviewBonus = true; addMiles(x, 30, "First review"); });
    await renderForm();
    flash = null;
    renderList();
  });
  box.replaceChildren(form);
}

renderList();
renderForm();
window.addEventListener("octee:account", renderForm);
window.addEventListener("octee:cloud", renderForm);
