// "Share my trip": draws a picture (route, how late, seat, booking number) you can save or screenshot.
import { $, el, niceDate } from "./dom.js";
import { currentUser, requireLogin } from "./auth.js";
import { placeShort, placeName } from "./destinations.js";
import { findLeg, legUrl, seatsOf, isCheckedIn } from "./tripkit.js";
import { trackState, fmtLate, isLate } from "./delays.js";

const root = $("#share");
const W = 1080, H = 1350;
const INK = "#2b1a0e", ORANGE = "#ff7a00", DARK = "#c25400";
const SANS = '"Inter", "Helvetica Neue", Arial, sans-serif', SERIF = '"Playfair Display", Georgia, serif';

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(" "); let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  ctx.fillText(line, x, y);
  return y + lh;
}
function peanut(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#e5bd7f"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, -28, 30, 32, 0, 0, Math.PI * 2); ctx.ellipse(0, 24, 38, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-11, -30, 4, 0, 7); ctx.arc(12, -30, 4, 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -20, 10, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

function draw(canvas, d, logo) {
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#fff3e3"); g.addColorStop(1, "#ffcf9a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, 150);
  if (logo) { const h = 110, w = (logo.width / logo.height) * h; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(40, 20, w + 30, 110, 18); ctx.fill(); ctx.drawImage(logo, 55, 20, w, h); }
  ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.font = `700 30px ${SANS}`; ctx.fillText("OCTEE AIRLINES", W - 50, 80);
  ctx.font = `400 24px ${SANS}`; ctx.fillText("a member of FAG", W - 50, 115);
  ctx.textAlign = "left";
  // route
  ctx.fillStyle = INK; ctx.font = `700 34px ${SANS}`; ctx.fillText(`FLIGHT ${d.no}`, 70, 250);
  const n = d.from.length + d.to.length, size = n <= 6 ? 190 : Math.max(60, Math.floor(190 * 6 / n));
  ctx.font = `800 ${size}px ${SERIF}`;
  const wFrom = ctx.measureText(d.from).width, wArrow = ctx.measureText(" → ").width, wTo = ctx.measureText(d.to).width;
  let x = 60; const base = 250 + size * 0.95;
  ctx.fillStyle = INK; ctx.fillText(d.from, x, base); x += wFrom;
  ctx.fillStyle = ORANGE; ctx.fillText(" → ", x, base - size * 0.05); x += wArrow;
  ctx.fillStyle = INK; ctx.fillText(d.to, x, base);
  ctx.font = `400 34px ${SANS}`; ctx.fillStyle = "#5a4636";
  const sub = `${d.fromName}  to  ${d.toName}`;
  for (let f = 34; f >= 18 && ctx.measureText(sub).width > W - 140; f -= 2) ctx.font = `400 ${f}px ${SANS}`;
  ctx.fillText(sub, 70, 490);
  ctx.font = `400 34px ${SANS}`;
  ctx.fillText(d.date + " · " + d.dep, 70, 538);
  // delay panel
  ctx.fillStyle = d.late ? "#b3261e" : "#3a8d3a"; ctx.beginPath(); ctx.roundRect(60, 590, W - 120, 330, 30); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `700 30px ${SANS}`; ctx.fillText(d.late ? "I WAS DELAYED BY" : "STATUS", 100, 660);
  ctx.font = `800 ${d.late.length > 14 ? 92 : 116}px ${SERIF}`; ctx.fillText(d.late || "ON TIME (we said)", 100, 780);
  ctx.font = `400 32px ${SANS}`; ctx.fillText(d.late ? (d.over ? "The plane left. We think." : "and counting") : "Give it a minute.", 100, 840);
  ctx.font = `600 28px ${SANS}`; ctx.fillText(d.status.slice(0, 48), 100, 892);
  // details
  const row = (label, value, y) => { ctx.fillStyle = "#7a5a3c"; ctx.font = `700 26px ${SANS}`; ctx.fillText(label, 70, y); ctx.fillStyle = INK; ctx.font = `700 40px ${SANS}`; ctx.fillText(value, 70, y + 48); };
  row("SEAT", d.seat, 990);
  ctx.textAlign = "right"; ctx.fillStyle = "#7a5a3c"; ctx.font = `700 26px ${SANS}`; ctx.fillText("BOOKING NUMBER", W - 70, 990); ctx.fillStyle = INK; ctx.font = `700 40px "JetBrains Mono", monospace`; ctx.fillText(d.ref, W - 70, 1038);
  ctx.textAlign = "left";
  ctx.fillStyle = INK; ctx.font = `italic 700 44px ${SERIF}`;
  wrap(ctx, d.late ? "I flew Octee. I am still waiting." : "I booked Octee. It is going well. So far.", 70, 1170, 760, 56);
  peanut(ctx, W - 130, 1190, 1.5);
  ctx.fillStyle = "#7a5a3c"; ctx.font = `400 24px ${SANS}`; ctx.fillText("octee airlines · parody · the peanut is not a real peanut", 70, 1310);
}

function show() {
  const found = findLeg(currentUser());
  if (!found) {
    root.replaceChildren(el("div", { class: "card" }, el("p", {}, "We could not find that flight to draw. Pick one from the tracker."), el("div", { class: "actions" }, el("a", { class: "btn", href: "track.html" }, "Track a flight"))));
    return;
  }
  const { b, l, i } = found;
  const ts = trackState(b, i);
  const late = ts && isLate(ts.stage);
  const seats = seatsOf(l);
  const d = {
    no: l.no, from: placeShort(l.from), to: placeShort(l.to), fromName: placeName(l.from), toName: placeName(l.to), date: niceDate(l.date), dep: l.dep,
    late: late ? fmtLate(ts.stage) : "", over: !!ts?.over, status: ts ? ts.status : "ON TIME (we said)", ref: b.ref,
    seat: isCheckedIn(l) ? seats.join(", ") : "Unavailable (spiritually)"
  };
  const canvas = el("canvas", { width: W, height: H, class: "share-canvas", role: "img", "aria-label": `Share card: ${d.from} to ${d.to}, ${late ? "delayed by " + d.late : "on time, we said"}, seat ${d.seat}, booking ${d.ref}` });
  const logo = new Image();
  const paint = (img) => draw(canvas, d, img);
  logo.onload = () => paint(logo); logo.onerror = () => paint(null);
  paint(null);
  logo.src = "assets/img/octee-logo.png";
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const save = () => canvas.toBlob((blob) => {
    if (!blob) { msg.textContent = "The picture would not save. Screenshot it instead."; return; }
    const a = el("a", { href: URL.createObjectURL(blob), download: `octee-${d.no.replace(/\s/g, "")}.png` });
    document.body.append(a); a.click(); a.remove(); msg.textContent = "Saved. Please share it widely. Please do not tell us why.";
  }, "image/png");
  const share = () => canvas.toBlob(async (blob) => {
    try {
      const file = new File([blob], "octee-trip.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "My Octee trip" }); msg.textContent = "Shared."; }
      else { save(); }
    } catch { msg.textContent = "Sharing was cancelled. The peanut understands."; }
  }, "image/png");
  root.replaceChildren(
    el("section", { class: "hero" }, el("p", { class: "eyebrow" }, "Share my trip"), el("h1", { class: "headline" }, "SCREENSHOT THIS", el("span", { class: "punch long" }, late ? "you are very late" : "for later, when you are late"))),
    el("div", { class: "share-wrap" }, canvas),
    el("div", { class: "actions" },
      el("button", { class: "btn", type: "button", onclick: save }, "Save the picture"),
      typeof navigator.share === "function" ? el("button", { class: "btn secondary", type: "button", onclick: share }, "Share…") : "",
      el("a", { class: "btn ghost", href: legUrl("track.html", b, i) }, "Back to the tracker")),
    msg,
    el("p", { class: "note" }, "The picture shows how late your flight is right now. Come back later for a bigger number."));
}

if (requireLogin()) show();
