// Octee Wi-Fi: connects to OcteeGuest, loads forever, and the speed test is negative.
import { $, el, reducedMotion } from "./dom.js";

const root = $("#app");
const NETS = [["OcteeGuest", "Open · full bars · no internet"], ["OcteeGuest_5G", "Open · even fuller bars · even less internet"], ["Joel's Phone", "Password: sorry"], ["FREE WIFI (not free)", "Costs 1 peanut and an apology"]];
const WAIT = ["Connecting...", "Obtaining IP address... (found one, it is not ours)", "Please accept the Terms and Conditions (63 pages, mostly sorry)", "Verifying that you are a passenger...", "Verifying that you are a person...",
  "Verifying that Joel is a person...", "Almost there. (This is a lie, but a nice one.)", "Waiting for the gate to open the internet...", "99%. Staying at 99%. 99% is lovely."];
let timer = null, test = null;
const out = el("div", { class: "card" }), status = el("p", { role: "status", "aria-live": "polite" });

function connect(name) {
  clearInterval(timer); clearInterval(test);
  const bar = el("div", { class: "wf-bar" }, el("div", { class: "wf-fill", id: "wf-fill" }));
  let i = 0, pct = 0;
  const msg = el("p", { role: "status", "aria-live": "polite" }, WAIT[0]);
  const speed = el("button", { class: "btn small", type: "button", onclick: () => speedTest(name) }, "Run speed test");
  out.replaceChildren(el("h2", { style: "margin-top:0" }, `Connecting to ${name}`), bar, msg, el("div", { class: "actions" }, speed));
  const fill = $("#wf-fill");
  timer = setInterval(() => { pct = Math.min(99, pct + (pct < 90 ? 6 : 1)); fill.style.width = pct + "%"; if (i < WAIT.length - 1 && (pct % 12 < 6)) { i++; msg.textContent = WAIT[i]; } else if (pct >= 99) msg.textContent = WAIT[WAIT.length - 1]; }, 600);
  if (reducedMotion()) { clearInterval(timer); fill.style.width = "99%"; msg.textContent = WAIT[WAIT.length - 1]; }
}
function speedTest(name) {
  clearInterval(test);
  const dl = el("strong", { class: "wf-n" }, "0.0"), ul = el("strong", { class: "wf-n" }, "0.0"), ping = el("strong", {}, "...");
  const res = el("div", { class: "card", id: "wf-test", role: "status", "aria-live": "polite" }, el("h3", { style: "margin-top:0" }, `Speed test (${name})`),
    el("p", {}, "Download: ", dl, " Mbps"), el("p", {}, "Upload: ", ul, " Mbps"), el("p", {}, "Ping: ", ping), el("p", { class: "note", id: "wf-verdict" }));
  $("#wf-test") ? $("#wf-test").replaceWith(res) : out.after(res);
  let a = 0, b = 0, step = 0;
  const finalA = -(12 + Math.random() * 20).toFixed(1) * 1, finalB = -(2 + Math.random() * 6);
  test = setInterval(() => { step++; if (step < 20) { a = (Math.random() * 90).toFixed(1); b = (Math.random() * 20).toFixed(1); }
    else { clearInterval(test); a = (-(12 + Math.random() * 20)).toFixed(1); b = (-(2 + Math.random() * 6)).toFixed(1);
      ping.textContent = "yesterday"; $("#wf-verdict").textContent = "Verdict: negative. You are sending us internet. Thank you. We will use it carefully."; }
    dl.textContent = a; ul.textContent = b; }, reducedMotion() ? 60 : 120);
}
root.replaceChildren(el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "Available networks"), status,
  el("ul", { class: "wf-nets" }, NETS.map(([n, d]) => el("li", {}, el("button", { class: "btn small", type: "button", onclick: () => { status.textContent = `Selected ${n}.`; connect(n); } }, "📶 " + n), el("span", { class: "note" }, " " + d))))), out,
  el("p", { class: "note" }, "This page does not touch your real Wi-Fi. It only pretends, very well."));
