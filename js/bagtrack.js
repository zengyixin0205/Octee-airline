// Bag tracker: type a bag tag and watch the bag wander round FIA (and round the carousel). Progress is kept in this browser.
import { $, el, reducedMotion } from "./dom.js";
import { hash, stream } from "./tripkit.js";
import { load, save } from "./store.js";

const root = $("#app");
const STEP_MS = 6000;
const RECENT = "octee.bags";
// The airport map. x and y are in a 100 x 60 box.
const NODES = {
  checkin: { name: "Check-in desk 3", x: 16, y: 44 },
  security: { name: "Security", x: 27, y: 24 },
  sort: { name: "Sorting room", x: 50, y: 40 },
  carousel: { name: "Carousel 7", x: 73, y: 46 },
  trolley: { name: "Trolley bay", x: 50, y: 10 },
  gate: { name: "Gate B3", x: 84, y: 12 },
  mia: { name: "Flight to MIA", x: 84, y: 30 },
  scraggy: { name: "Scraggy House", x: 14, y: 12 },
  lost: { name: "Lost & Found", x: 32, y: 52 }
};
const TEXT = {
  checkin: ["Checked in (we think)", "At the desk. A plant took the tag."],
  security: ["At security. The scanner is unsure.", "Scanned three times. It was a different bag each time."],
  sort: ["In the sorting room (sorted by feelings)", "Sorted by colour. Then by mood. Then by Tuesday."],
  carousel: ["On carousel 7, going round", "Round and round. It likes it."],
  trolley: ["On the wrong trolley", "The trolley is going to a different gate. It does not say which."],
  gate: ["At Gate B3, next to a plane (not yours)", "A plane is here. It is not your plane. The bag is not sad."],
  mia: ["On a flight to MIA. Enjoying the trip.", "Your bag has boarded a flight that is not yours. It has a window seat."],
  scraggy: ["On holiday in Scraggy House", "Sitting in the garden. The garden has asked it to stay."],
  lost: ["In Lost and Found (Desk 14, it moved)", "Desk 14 has moved. Your bag moved with it."]
};
const NOTES = ["The carousel has been told about you.", "Your bag has made a friend. The friend is a tuba.", "Someone said your bag looked tired.", "A peanut is sitting on your bag. It will not move.", "Your bag took a short break. Nobody knows where."];

// A journey is the same for the same tag. The first four steps are the same for everyone; then the bag wanders.
function journey(tag) {
  const r = stream(hash("bag|" + tag));
  const wander = ["carousel", "trolley", "gate", "mia", "scraggy", "sort", "carousel", "security"];
  const seq = ["checkin", "security", "sort", "carousel"];
  for (let k = 0; k < 8; k++) seq.push(wander[Math.floor(r() * wander.length)]);
  seq.push("lost");
  return seq.map((id, k) => ({ id, text: TEXT[id][hash(`${tag}|${k}`) % 2], note: NOTES[hash(`n|${tag}|${k}`) % NOTES.length] }));
}
const normTag = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
const makeTag = () => "OA" + String(hash("tag" + Math.random() + Date.now()) % 900000 + 100000);
const stamp = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

const ring = `<svg viewBox="0 0 300 130" class="belt-svg" role="img" aria-label="Carousel 7. Bags go round and round. Your bag is highlighted when it is on the belt.">
  <ellipse cx="150" cy="65" rx="140" ry="52" fill="#5a4a3c"/><ellipse cx="150" cy="65" rx="118" ry="34" fill="#f1e4d3"/>
  <ellipse cx="150" cy="65" rx="129" ry="43" fill="none" stroke="#2b1a0e" stroke-width="22" opacity=".55"/>
  <text x="150" y="69" text-anchor="middle" font-size="11" font-weight="700" fill="#7a5a3c">CAROUSEL 7</text>
  <g id="orbit"></g></svg>`;

let timer = null, raf = null;

function show(tag) {
  clearInterval(timer); cancelAnimationFrame(raf);
  const seq = journey(tag);
  const key = "octee.bag." + tag;
  let st = load(key, null) || { i: 0, seen: Date.now(), log: [{ at: stamp(), text: seq[0].text }] };
  const away = Math.floor((Date.now() - (st.seen || Date.now())) / 90000);     // one more step per 90 seconds away
  for (let k = 0; k < away && st.i < seq.length - 1; k++) { st.i++; st.log.unshift({ at: stamp(), text: seq[st.i].text + " (while you were away)" }); }
  const persist = () => { st.seen = Date.now(); save(key, st); };
  persist();
  const recents = [tag, ...load(RECENT, []).filter((x) => x !== tag)].slice(0, 5); save(RECENT, recents);

  const status = el("p", { class: "tk-status s", role: "status", "aria-live": "polite" });
  const note = el("p", { class: "note" });
  const where = el("dd", {});
  const logEl = el("ol", { class: "tk-log", "aria-label": "Updates, newest first" });
  const map = el("div", { class: "bagmap" });
  const beltBox = el("div", { class: "belt" });
  map.innerHTML = `<svg viewBox="0 0 100 60" role="img" aria-label="Map of the airport. The bag is the suitcase.">
    <rect x="1" y="1" width="98" height="58" rx="4" fill="#fff8ee" stroke="#2b1a0e" stroke-width=".6"/>
    ${Object.entries(NODES).map(([id, n]) => `<circle cx="${n.x}" cy="${n.y}" r="2.2" fill="#ffd9b0" stroke="#2b1a0e" stroke-width=".4"/><text x="${n.x}" y="${n.y + (n.y > 40 ? 5.4 : -3.2)}" text-anchor="middle" font-size="2.2" fill="#2b1a0e">${n.name}</text>`).join("")}
    <path id="trail" d="" fill="none" stroke="#ff7a00" stroke-width=".6" stroke-dasharray="1.2 1.2"/>
    <g id="bagpin" style="transition: transform ${reducedMotion() ? 0 : 1.4}s ease-in-out"><text x="0" y="1.8" text-anchor="middle" font-size="6">🧳</text></g></svg>`;
  beltBox.innerHTML = ring;
  const pin = map.querySelector("#bagpin"), trail = map.querySelector("#trail"), orbit = beltBox.querySelector("#orbit");
  const beltNote = el("p", { class: "note", style: "margin:4px 0 0;text-align:center" });

  const orbiters = ["🎺", "🧳", "👟", "🎒", "🧳", "🥪"].map((emoji, k) => ({ emoji, k }));
  const mine = { emoji: "🧳" };
  function drawOrbit(t) {
    const on = seq[st.i].id === "carousel";
    const pos = (u) => [150 + 129 * Math.cos(u), 65 + 43 * Math.sin(u)];
    let html = orbiters.map(({ emoji, k }, n) => { const [x, y] = pos(t * 0.5 + (n * Math.PI * 2) / 6); return `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="16" opacity=".85">${emoji}</text>`; }).join("");
    if (on) { const [x, y] = pos(t * 0.5 + 0.4); html += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="#ff7a00" stroke-width="3"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18">${mine.emoji}</text><text x="${x}" y="${y - 16}" text-anchor="middle" font-size="8" font-weight="800" fill="#b3261e">YOUR BAG</text>`; }
    orbit.innerHTML = html;
  }
  const t0 = performance.now();
  const loop = (now) => { drawOrbit(reducedMotion() ? 0 : (now - t0) / 1000); raf = requestAnimationFrame(loop); };

  function paint() {
    const s = seq[st.i], n = NODES[s.id];
    status.textContent = s.text;
    status.className = "tk-status s" + (s.id === "lost" ? " bad" : s.id === "carousel" || s.id === "checkin" ? "" : " warn");
    note.textContent = s.note;
    where.textContent = n.name;
    pin.style.transform = `translate(${n.x}px, ${n.y - 4}px)`;
    trail.setAttribute("d", seq.slice(0, st.i + 1).map((p, k) => `${k ? "L" : "M"}${NODES[p.id].x} ${NODES[p.id].y}`).join(" "));
    beltNote.textContent = s.id === "carousel" ? "Your bag is on the belt. It is the one with the orange ring." : `Your bag is not on this belt. It is at: ${n.name}. The belt is going round without it.`;
    logEl.replaceChildren(...st.log.slice(0, 12).map((e) => el("li", {}, el("time", {}, e.at), " ", e.text)));
    if (reducedMotion()) drawOrbit(0);
  }
  const next = () => {
    if (st.i >= seq.length - 1) { clearInterval(timer); return; }
    st.i++; st.log.unshift({ at: stamp(), text: seq[st.i].text }); persist(); paint();
  };
  timer = reducedMotion() ? null : setInterval(next, STEP_MS);
  if (!reducedMotion()) raf = requestAnimationFrame(loop);

  root.replaceChildren(
    form(tag),
    el("div", { class: "card tk-card" },
      el("p", { class: "route", style: "font-family:var(--serif);font-size:1.4rem;margin:0" }, `Bag ${tag}`),
      status, note,
      el("dl", { class: "kv" }, el("dt", {}, "Right now"), where, el("dt", {}, "Steps so far"), el("dd", {}, `${st.i + 1} of ${seq.length} (and a few it will not tell us about)`)),
      el("div", { class: "actions" },
        reducedMotion() ? el("button", { class: "btn small", type: "button", onclick: next }, "Next update") : "",
        el("a", { class: "btn small", href: "baggame.html" }, "Play the Baggage Game"),
        el("a", { class: "btn small ghost", href: "complaint.html" }, "Complain about my bag"),
        el("a", { class: "btn small ghost", href: "baggage.html" }, "Bag rules"))),
    el("h2", {}, "Where it is"), map,
    el("h2", {}, "On the carousel"), beltBox, beltNote,
    el("h2", {}, "Updates"), logEl,
    el("p", { class: "note" }, reducedMotion() ? "Your device asked for less motion, so the bag only moves when you press Next update." : "Your bag moves about every six seconds. It does not always go forwards."));
  paint();
}

function form(current) {
  const input = el("input", { id: "bag-tag", name: "tag", maxlength: "14", autocomplete: "off", placeholder: "e.g. OA123456", value: current || "" });
  const recents = load(RECENT, []).filter((t) => t !== current);
  const f = el("form", { class: "card", onsubmit: (e) => { e.preventDefault(); const t = normTag(input.value); if (t.length < 3) { input.setCustomValidity("Please type at least 3 letters or numbers. Any bag tag. We will not check."); input.reportValidity(); return; } input.setCustomValidity(""); history.replaceState(null, "", "?tag=" + t); show(t); } },
    el("div", { class: "field" }, el("label", { for: "bag-tag" }, "Bag tag number"), input),
    el("div", { class: "actions" },
      el("button", { class: "btn", type: "submit" }, "Find my bag"),
      el("button", { class: "btn ghost", type: "button", onclick: () => { input.value = makeTag(); input.setCustomValidity(""); } }, "I have no tag (make one up)")),
    recents.length ? el("p", { class: "note" }, "Recent: ", ...recents.flatMap((t, k) => [k ? " · " : "", el("a", { href: "?tag=" + t, onclick: (e) => { e.preventDefault(); history.replaceState(null, "", "?tag=" + t); show(t); } }, t)])) : "");
  return f;
}

const wanted = normTag(new URLSearchParams(location.search).get("tag"));
if (wanted.length >= 3) show(wanted);
else root.replaceChildren(form(""), el("p", { class: "note" }, "Type any bag tag. We have a tag for every bag, and a bag for every tag, and they do not always match."));
