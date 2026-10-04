import { $, el, niceDate, fmtMiles, setMsg } from "./dom.js";
import { currentUser, requireLogin, logOut, updateUser, etchedInfo, changePassword, MESSAGES } from "./auth.js";
import { CONFIG } from "./config.js";
import { tierFor, spendTokens, tokensOf, scraggyOf, sharedScraggy } from "./miles.js";
import { placeShort } from "./destinations.js";
import { passCard, OA_CLASSES, classTokens } from "./booking-data.js";
import { scraggyData } from "./scraggy.js";
import { boardingPass } from "./boardingpass.js";
import { isCheckedIn, legUrl } from "./tripkit.js";
import { load, save } from "./store.js";
import { makeBackup } from "./backup.js";

if (requireLogin()) { render(null); scraggyData().then(render); passwordCard(); backupCard(); }

// Change password. Etched accounts: the new password works in this browser only (other devices use the file).
function passwordCard() {
  const u = currentUser();
  const field = (id, label, auto) => el("div", { class: "field" }, el("label", { for: id }, label), el("input", { id, type: "password", autocomplete: auto, required: true }));
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const note = el("p", { class: "note" }, `At least ${CONFIG.PASSWORD_MIN} characters. We will not remember it for you. We barely remember anything.`);
  const form = el("form", {},
    field("pw-current", "Current password", "current-password"), field("pw-new", "New password", "new-password"), field("pw-confirm", "New password again", "new-password"),
    el("div", { class: "actions" }, el("button", { class: "btn small", type: "submit" }, "Change password")), note, msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await changePassword($("#pw-current").value, $("#pw-new").value, $("#pw-confirm").value);
      form.reset();
      setMsg(msg, "Password changed. Please do not write it on your hand. (Ours is on a peanut.)", "ok");
    } catch (err) { setMsg(msg, MESSAGES[err.code] || "Something went wrong. Blame Joel.", "error"); }
  });
  $("#password-box").replaceChildren(el("h2", { style: "margin-top:0" }, "Change your password"), form);
  etchedInfo(u.username).then((info) => { if (info) note.textContent += " This account is etched in the code, so the new password works in this browser only. On other devices the old password still works until the airline saves your account again."; });
}

// Backup code: restores this account in any browser (Log in > Backup code).
function backupCard() {
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const box = el("textarea", { readonly: true, rows: "6", spellcheck: "false", "aria-label": "Your backup code", style: "font-family:var(--mono,monospace);width:100%;display:none" });
  const make = el("button", { class: "btn small", type: "button" }, "Make my backup code");
  const copy = el("button", { class: "btn small ghost", type: "button", style: "display:none" }, "Copy");
  const dl = el("button", { class: "btn small ghost", type: "button", style: "display:none" }, "Download as .txt");
  make.addEventListener("click", async () => {
    const u = currentUser(); if (!u) return;
    box.value = await makeBackup(u);
    box.style.display = copy.style.display = dl.style.display = "";
    make.textContent = "Make it again (after earning more)";
    setMsg(msg, `Code made ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. It holds everything up to now, so make a new one after you earn more.`, "ok");
  });
  copy.addEventListener("click", async () => { box.select(); try { await navigator.clipboard.writeText(box.value); setMsg(msg, "Copied. Keep it somewhere private.", "ok"); } catch { setMsg(msg, "Press Ctrl+C (or Cmd+C) to copy the selected code.", "info"); } });
  dl.addEventListener("click", () => { const a = el("a", { href: URL.createObjectURL(new Blob([box.value + "\n"], { type: "text/plain" })), download: `octee-backup-${currentUser().username}.txt` }); document.body.append(a); a.click(); a.remove(); });
  $("#backup-box").replaceChildren(el("h2", { style: "margin-top:0" }, "Backup code"),
    el("p", {}, "A text code that brings this account back in any browser: incognito, a new phone, a friend's laptop. Paste it on the ", el("a", { href: "login.html#restore" }, "Log in page, Backup code tab"), "."),
    el("p", { class: "note" }, "It contains your whole account (miles, tokens, peanuts, trips and password hash), so treat it like a password: anyone with it can open your account. It is a long block, not a short word, because there is no server to keep the account for you."),
    el("div", { class: "actions" }, make, copy, dl), box, msg);
}

function render(SA) {
  const u = currentUser();
  $("#profile").replaceChildren(
    el("dl", { class: "kv" },
      el("dt", {}, "Username"), el("dd", {}, u.username),
      el("dt", {}, "Member since"), el("dd", {}, niceDate(u.createdAt.slice(0, 10))),
      el("dt", {}, "Octmiles"), el("dd", {}, fmtMiles(u.octmiles), " (", el("a", { href: "octmiles.html" }, "details"), ")"),
      el("dt", {}, "Octeetokens"), el("dd", {}, fmtMiles(tokensOf(u)), " (", el("a", { href: "octmiles.html#tokens" }, "get more"), ")"),
      el("dt", {}, "Scraggymiles"), el("dd", {}, fmtMiles(scraggyOf(u) + sharedScraggy(u)), sharedScraggy(u) ? ` (${fmtMiles(sharedScraggy(u))} shared with Scraggy Airlines)` : "", " (", el("a", { href: "octmiles.html#scraggymiles" }, "exchange or share"), ")"),
      el("dt", {}, "Tier"), el("dd", {}, tierFor(u.lifetime).name)),
    el("p", { class: "note", id: "where-note" }, "Your account lives in this browser only. Another device or browser won't know you. We won't either."));
  etchedInfo(u.username).then((info) => {
    const note = $("#where-note");
    if (info && note) note.textContent = `This account is etched in the code${info.etchedAt ? " (saved " + niceDate(info.etchedAt.slice(0, 10)) + ")" : ""}, so you can log in on any device. Anything earned after that date stays on this device until the airline saves it again.`;
  });
  const trips = [...(u.trips || [])].reverse();
  const box = $("#trips");
  if (!trips.length) { box.replaceChildren(el("p", {}, "No trips yet. ", el("a", { href: "book.html" }, "Book a flight"), " (we will try).")); return; }
  box.replaceChildren(...trips.map((b) => el("details", { class: "card", style: "margin-bottom:12px" },
    el("summary", { style: "cursor:pointer" },
      el("strong", {}, `${placeShort(b.from)} → ${placeShort(b.to)}`), ` · ${niceDate(b.legs[0].date)} · ${b.legs.map((l) => l.no).join(", ")} · `,
      el("span", { class: "tag" }, b.ref), b.scraggyRef ? el("span", { class: "tag sa" }, b.scraggyRef) : "",
      el("span", { class: "tag " + (b.legs.every(isCheckedIn) ? "" : "red") }, b.legs.every(isCheckedIn) ? "Checked in" : `Checked in ${b.legs.filter(isCheckedIn).length}/${b.legs.length}`)),
    upgradeBox(b, SA),
    b.legs.map((l) => passCard(b, l, SA)),
    b.legs.some(isCheckedIn) ? el("h3", { class: "bp-h" }, "Boarding passes") : "",
    b.legs.map((l, i) => isCheckedIn(l) ? [b.names.map((_, p) => boardingPass(b, l, i, p, SA, { compact: true })), el("p", { class: "actions" }, el("a", { class: "btn small", href: legUrl("pass.html", b, i) }, `Print ${l.no}`))] : "")
  )));
}

// Pay Octeetokens to move a booking's Octee / One United flights up a class.
function upgradeBox(b, SA) {
  const mine = b.legs.filter((l) => l.airline === "OA");
  if (!mine.length) return "";
  const now = mine[0].travelClass;
  const better = OA_CLASSES.filter((c) => c.tokens > classTokens(now));
  if (!better.length) return el("p", { class: "note" }, "Class: Octee First. There is nothing higher. We checked.");
  const msg = el("p", { class: "msg", role: "status" });
  return el("div", { class: "upgrade" },
    el("p", { style: "margin:.6em 0 .3em" }, el("strong", {}, "Upgrade class"), ` (now ${OA_CLASSES.find((c) => c.id === now)?.name || "Octee Economy"}):`),
    el("div", { class: "actions" }, better.map((c) => {
      const cost = c.tokens - classTokens(now);
      return el("button", { class: "btn small secondary", type: "button", onclick: () => {
        try {
          updateUser((u) => {
            const trip = u.trips.find((t) => t.ref === b.ref && t.createdAt === b.createdAt);
            if (!trip) throw new Error("We lost this booking. Sorry.");
            spendTokens(u, cost, `Upgrade to ${c.name} (${b.ref})`);
            trip.legs.forEach((l) => { if (l.airline === "OA") l.travelClass = c.id; });
          });
          render(SA);
        } catch (e) { setMsg(msg, e.message, "error"); }
      } }, `${c.name} · ${cost} Octeetokens`);
    })), msg);
}

let armed = false;
$("#delete-account")?.addEventListener("click", (e) => {
  const u = currentUser();
  if (!u) return;
  if (!armed) {
    armed = true;
    e.target.textContent = "Click again to really delete (your Octmiles and trips will be lost, like your bags)";
    setTimeout(() => { armed = false; e.target.textContent = "Delete my account from this browser"; }, 6000);
    return;
  }
  const users = load("octee.users", {});
  delete users[u.username.toLowerCase()];
  save("octee.users", users);
  logOut();
  location.href = "index.html";
});
