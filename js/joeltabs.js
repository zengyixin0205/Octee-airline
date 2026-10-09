// Joel's Tabs: a pretend browser with 12 tabs. Joel goes for one tab at a time. Click it before he closes it to save it.
import { el } from "./dom.js";
import { best, setBest, reward } from "./gamekit.js";

const TABS = [["Boarding Pass", "Your boarding pass. It says GATE: SOON."], ["Joel's Diary", "Dear diary. Today I said sorry 40 times. It was a slow day."], ["Cat Videos", "A cat sits in a box. The box is delayed."], ["Delay Bingo", "You have four squares. The fifth is waiting."],
  ["Peanut Recipes", "Step 1: a peanut. Step 2: there is no step 2."], ["Sudoku (no answer)", "One square cannot hold a digit. It is trying its best."], ["Gary's Wedding", "Gary is getting married at Gate B3. Please bring a peanut."], ["Weather: cloudy", "Cloudy, with a chance of delays. The chance is 100%."],
  ["Is my flight late?", "Yes. It was late before you asked. It is late now."], ["Do not open", "You opened it. It says: well done."], ["Lunch", "A sandwich, in a cupboard, for someone."], ["Sorry (draft)", "Dear everyone, I am sorry. Sorry, I am still writing."]];
const TIME = 30;

export function mountJoelTabs(box) {
  let open, saved, target, left, over, tId, cId, sel, started;
  const info = el("p", { class: "note", role: "status", "aria-live": "polite" });
  const tabs = el("div", { class: "jt-tabs", role: "tablist", "aria-label": "Browser tabs" });
  const page = el("div", { class: "jt-page" });
  const status = el("p", { class: "note", role: "status", "aria-live": "assertive" });
  const again = el("button", { class: "btn small", type: "button", style: "display:none", onclick: () => reset() }, "Play again");
  const win = el("div", { class: "jt-win" }, el("div", { class: "jt-bar" }, el("span", { class: "jt-dots" }, "● ● ●"), el("span", { class: "jt-url" }, "octee.example/joels-tabs")), tabs, page);

  const drawInfo = () => { info.textContent = `Time ${Math.max(0, left)}s · open tabs ${open.size} of ${TABS.length} · saved ${saved.size} · best ${best("joeltabs") || 0}`; };
  const draw = () => {
    tabs.replaceChildren(...TABS.map(([name], i) => {
      if (!open.has(i)) return "";
      const cls = "jt-tab" + (sel === i ? " sel" : "") + (saved.has(i) ? " saved" : "") + (target === i ? " danger" : "");
      return el("button", { class: cls, type: "button", role: "tab", "aria-selected": String(sel === i), "aria-label": name + (saved.has(i) ? " (saved)" : target === i ? " (Joel is closing this one, click it!)" : ""), onclick: () => click(i) }, (saved.has(i) ? "✓ " : "") + name);
    }));
    page.textContent = open.has(sel) ? TABS[sel][1] : "Joel closed that one. Pick another tab.";
    drawInfo();
  };
  function click(i) {
    if (over) return;
    sel = i;
    if (target === i) { saved.add(i); target = null; clearTimeout(tId); status.textContent = `Saved "${TABS[i][0]}"! Joel says sorry and goes to look for another.`; tId = setTimeout(next, 450); }
    draw();
  }
  function next() {
    if (over) return;
    const cand = [...open].filter((i) => !saved.has(i));
    if (!cand.length) return finish("Joel cannot reach any tab. They are all saved.");
    target = cand[Math.floor(Math.random() * cand.length)];
    const warn = Math.max(520, 1500 - (TIME - left) * 30);
    status.textContent = `Joel is going for "${TABS[target][0]}"!`;
    draw();
    tId = setTimeout(() => {
      if (over || target == null) return;
      const gone = target; open.delete(gone); target = null; if (sel === gone) sel = [...open][0] ?? null;
      status.textContent = `Joel closed "${TABS[gone][0]}". Sorry!`; draw();
      if (open.size === 0) return finish("Joel closed every tab. He is sorry. He is not sorry enough.");
      tId = setTimeout(next, 350);
    }, warn);
  }
  function finish(msg) {
    over = true; clearTimeout(tId); clearInterval(cId); target = null; draw();
    const score = open.size, nb = setBest("joeltabs", score);
    status.textContent = `${msg} ${score} tab${score === 1 ? "" : "s"} survived. ${nb && score ? "New best! " : ""}${score >= 6 ? reward("joeltabs", "Joel's Tabs: kept 6 tabs") : "Keep 6 tabs open for a peanut."}`;
    again.style.display = "";
  }
  function reset() {
    clearTimeout(tId); clearInterval(cId);
    open = new Set(TABS.map((_, i) => i)); saved = new Set(); target = null; left = TIME; over = false; sel = 0; again.style.display = "none";
    status.textContent = "Joel has arrived. Click the tab he goes for (it shakes and turns red) before he closes it.";
    draw();
    cId = setInterval(() => { if (over) return; left--; if (left <= 0) { left = 0; return finish("Time up. Joel is tired."); } drawInfo(); }, 1000);
    tId = setTimeout(next, 900);
  }
  box.append(info, win, status, el("div", { class: "actions" }, again));
  reset();
  return () => { clearTimeout(tId); clearInterval(cId); };
}
