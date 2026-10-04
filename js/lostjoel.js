// Lost Joel: find Joel in the departures hall. Five rounds, a bigger crowd each time.
import { el } from "./dom.js";
import { best, setBest, reward } from "./gamekit.js";

const JOEL = "🧑‍🔧";
const CROWD = ["🧳", "🧍", "🚶", "💼", "🛄", "🧑‍💼", "👩‍✈️", "👨‍✈️", "🧑‍🍳", "🥜", "🪧", "☕", "📱", "🧒", "👵", "🧑‍🎤", "🧑‍🦯", "🏃", "🧎"];
const LOOKALIKES = ["👨‍🔧", "👩‍🔧", "🧑‍🏭", "👷", "🧑‍🔬"];
const SIZES = [50, 80, 120, 170, 230];
const TIME = 25;
const NOT = ["Not Joel. That was a Gary.", "Not Joel. That was a suitcase with opinions.", "Not Joel. He would have said sorry.", "Not Joel. That is a pilot who is also lost.", "Not Joel. Joel has a spanner. This one has a sandwich."];
const WARM = ["warmer", "colder"];

export function mountLostJoel(box) {
  let round = 0, found = 0, left = TIME, iv = null, joel = null, last = null, hinted = false, over = false;
  const info = el("p", { class: "note", role: "status", "aria-live": "polite" });
  const hall = el("div", { class: "lj-hall", "aria-label": "The departures hall, full of people. Joel is somewhere in it." },
    el("div", { class: "lj-board" }, "DEPARTURES · ALL DELAYED · DELAYED · DELAYED · DELAYED"));
  const field = el("div", { class: "lj-field" });
  hall.append(field);
  const hintBtn = el("button", { class: "btn small ghost", type: "button" }, "Hint (-5 seconds)");
  const say = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Find ${JOEL} Joel: he is the one with the spanner. Look for: ${JOEL}. Careful, other workers look a bit like him.`);
  const best_ = () => best("lostjoel") || 0;
  const status = () => { info.textContent = `Round ${round + 1} of ${SIZES.length} · time ${Math.max(0, left)}s · found ${found} · best ${best_()}`; };

  function build() {
    over = false; hinted = false; last = null; left = TIME;
    field.replaceChildren();
    const n = SIZES[round];
    const pool = [...CROWD, ...(round > 0 ? LOOKALIKES.slice(0, round + 1) : [])];
    const jx = 6 + Math.random() * 88, jy = 8 + Math.random() * 84;
    joel = { x: jx, y: jy };
    for (let i = 0; i < n; i++) {
      const s = el("span", { class: "lj-p" }, pool[Math.floor(Math.random() * pool.length)]);
      s.style.left = (3 + Math.random() * 94) + "%"; s.style.top = (4 + Math.random() * 90) + "%";
      s.style.fontSize = (round > 2 ? 17 + Math.random() * 8 : 20 + Math.random() * 10) + "px";
      field.append(s);
    }
    const j = el("span", { class: "lj-p lj-joel", "data-joel": "1" }, JOEL);
    j.style.left = jx + "%"; j.style.top = jy + "%"; j.style.fontSize = (round > 2 ? 18 : 22) + "px";
    field.append(j);
    hintBtn.disabled = false;
    status();
  }
  const dist = (a) => Math.hypot(a.x - joel.x, (a.y - joel.y) * 1.3);
  field.addEventListener("click", (e) => {
    if (over) return;
    const r = field.getBoundingClientRect();
    const pt = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
    if (e.target.dataset.joel || dist(pt) < 4.2) return win(e.target.dataset.joel ? e.target : field.querySelector(".lj-joel"));
    left = Math.max(0, left - 2);
    const d = dist(pt);
    const t = last == null ? "" : ` You are getting ${d < last ? "warmer" : "colder"}.`;
    last = d;
    say.textContent = NOT[Math.floor(Math.random() * NOT.length)] + " (-2 seconds)." + t;
    status();
  });
  hintBtn.addEventListener("click", () => {
    if (over || hinted) return;
    hinted = true; hintBtn.disabled = true; left = Math.max(0, left - 5);
    const ring = el("span", { class: "lj-ring" }); ring.style.left = joel.x + "%"; ring.style.top = joel.y + "%";
    field.append(ring);
    say.textContent = "Joel is somewhere inside the ring. He is sorry about the ring."; status();
  });
  function win(j) {
    over = true; found++; round++;
    j.classList.add("lj-found");
    const bubble = el("span", { class: "lj-sorry" }, "Sorry! I'm a joel!"); bubble.style.left = joel.x + "%"; bubble.style.top = joel.y + "%"; field.append(bubble);
    if (round >= SIZES.length) return finish(true);
    say.textContent = `Found him in ${TIME - left}s. He says sorry. Next hall: more people.`;
    setTimeout(() => { if (box.isConnected && !finished) build(); }, 900);
  }
  let finished = false;
  function finish(allDone) {
    finished = true; over = true; clearInterval(iv);
    const nb = setBest("lostjoel", found);
    hintBtn.disabled = true;
    say.textContent = `${allDone ? "All five found! Joel is exhausted. " : "Time up. Joel is still lost. "}You found Joel ${found} time${found === 1 ? "" : "s"}. ${nb && found ? "New best! " : ""}${found >= 3 ? reward("lostjoel", "Lost Joel: found Joel 3 times") : "Find him 3 times for a peanut."}`;
    info.textContent = `Finished · found ${found} of ${SIZES.length} · best ${best_()}`;
    again.style.display = "";
  }
  const again = el("button", { class: "btn small", type: "button", style: "display:none", onclick: () => { finished = false; round = 0; found = 0; again.style.display = "none"; start(); } }, "Play again");
  function start() {
    clearInterval(iv); build();
    iv = setInterval(() => { if (over || finished) return; left--; status(); if (left <= 0) { over = true; finish(false); } }, 1000);
  }
  box.append(info, hall, el("div", { class: "actions" }, hintBtn, again), say);
  start();
  return () => clearInterval(iv);
}
