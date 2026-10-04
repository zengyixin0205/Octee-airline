// Joel's cupboard. Hidden: it only opens after Joel has run out of sorry (see apology.js).
import { $, el, setMsg } from "./dom.js";
import { load, save } from "./store.js";
import { cupboardOpen, sorryLeft, SORRY_LIMIT } from "./apology.js";
import { addPeanuts } from "./peanuts.js";

const root = $("#app");
const KEY = "octee.cupboard.state";
const TODO = [
  ["sorry", "Be sorry (three times)", true],
  ["find", "Find the rest of the sorry", false],
  ["keys", "Find the keys (his other trousers)", false],
  ["sandwich", "Get the sandwich back from the tray", false],
  ["pigeon", "Tell the pigeon it is not allowed on Runway 2", false],
  ["cry", "Cry (a little)", false],
  ["joel", "Be a joel", false]
];
const SANDWICH = [
  ["You look at the sandwich. The sandwich looks back. It has seen things.", "Touch it"],
  ["You touch the sandwich. It is warm. Nobody knows why. Nobody wants to.", "Eat it"],
  ["You ate the sandwich. It was not yours. It was not Joel's either. It was the cupboard's.", "Put a new one (we found one)"]
];
const JOEL = ["I'm a joel!", "I'm not in here.", "Please close the door.", "I am being sorry. Quietly.", "Do you have a sandwich? Never mind.", "I'm a joel. I'm a joel. I'm a joel. It is fine."];
const DISTURB = [
  "You disturbed Joel. He said \"I'm a joel!\" in a small voice.",
  "You disturbed Joel again. He is writing it on his to-do list.",
  "Joel says: the sign says do not disturb. It is a tiny sign. It is very clear.",
  "Joel has put another sign on the sign. It says: REALLY.",
  "Joel has left the cupboard. The cupboard is now just a cupboard. (He is back. He forgot his sandwich.)"
];

const st = () => ({ todo: {}, sand: 0, disturbed: 0, talk: 0, visited: false, ...load(KEY, {}) });
const put = (s) => save(KEY, s);

function locked() {
  const left = sorryLeft();
  root.replaceChildren(el("div", { class: "card cup-locked" },
    el("p", { class: "cup-door", "aria-hidden": "true" }, "🚪"),
    el("h2", { style: "margin-top:0" }, "The cupboard is locked"),
    el("p", {}, "Joel has the key. Joel is not ready to come out. He still has sorry left."),
    el("p", { class: "note" }, left > 0 ? `Joel has about ${left} sorr${left === 1 ? "y" : "ies"} left. Stay on the site and he will say them.` : "He is just about to run out. Keep an eye on the top of the page."),
    el("div", { class: "actions" }, el("a", { class: "btn", href: "index.html" }, "Go back (quietly)"))));
}

function open() {
  const s = st();
  let first = false;
  if (!s.visited) { s.visited = true; first = true; put(s); }
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const bubble = el("p", { class: "cup-bubble", role: "status", "aria-live": "polite" }, "…");
  const sandBtn = el("button", { class: "btn small", type: "button" });
  const sandText = el("p", { style: "margin:4px 0" });
  const paintSand = () => {
    const s2 = st();
    sandText.textContent = s2.sand === 0 ? "Half a sandwich sits on a plate on a shelf. Nobody knows whose it is." : SANDWICH[Math.min(s2.sand, 3) - 1][0];
    sandBtn.textContent = s2.sand === 0 ? "Look at it" : SANDWICH[Math.min(s2.sand, 3) - 1][1];
    sandEmoji.textContent = s2.sand >= 3 ? "🍽️" : "🥪";
  };
  const sandEmoji = el("span", { class: "cup-sand", "aria-hidden": "true" });
  sandBtn.addEventListener("click", () => { const s2 = st(); s2.sand = s2.sand >= 3 ? 0 : s2.sand + 1; put(s2); paintSand(); });

  const list = el("ul", { class: "cup-todo" });
  const paintList = () => {
    const s2 = st();
    list.replaceChildren(...TODO.map(([id, text, done]) => {
      const checked = done || !!s2.todo[id];
      const box = el("input", { type: "checkbox", id: "td-" + id, checked: checked ? true : null, disabled: done ? true : null });
      box.addEventListener("change", () => {
        const s3 = st(); s3.todo[id] = box.checked; put(s3); paintList();
        if (TODO.every(([i, , d]) => d || st().todo[i]) && !s3.listDone) {
          s3.listDone = true; put(s3);
          const got = addPeanuts("Joel finished his to-do list (he gave you a peanut)", 1);
          setMsg(msg, `Joel has finished his list. Joel now has no list. Joel is free.${got ? " +1 peanut." : ""}`, "ok");
        }
      });
      return el("li", { class: checked ? "done" : "" }, box, el("label", { for: "td-" + id }, text));
    }));
  };

  const sign = el("button", { class: "cup-sign", type: "button", "aria-label": "Tiny sign: do not disturb. Press to disturb." }, "DO NOT DISTURB");
  const disturbed = el("p", { class: "note", style: "margin:4px 0 0" });
  const paintSign = () => { disturbed.textContent = `Times disturbed: ${st().disturbed}`; };
  sign.addEventListener("click", () => {
    const s2 = st(); s2.disturbed += 1; put(s2); paintSign();
    setMsg(msg, DISTURB[Math.min(s2.disturbed, DISTURB.length) - 1] + (s2.disturbed > DISTURB.length ? " (He is used to it now.)" : ""), "info");
  });
  const joel = el("button", { class: "cup-joel", type: "button", "aria-label": "Joel, sitting in a cupboard. Press to talk to him." }, el("span", { class: "jai-avatar" }, "J"));
  joel.addEventListener("click", () => { const s2 = st(); bubble.textContent = JOEL[s2.talk % JOEL.length]; s2.talk += 1; put(s2); });

  root.replaceChildren(
    el("div", { class: "cupboard" },
      el("div", { class: "cup-shelf" },
        el("div", { class: "cup-item" }, sandEmoji, sandText, el("div", { class: "actions" }, sandBtn)),
        el("div", { class: "cup-item cup-joelbox" }, joel, bubble, el("p", { class: "note", style: "margin:0" }, "That is Joel. He is sitting on a mop bucket.")),
        el("div", { class: "cup-item" }, el("h3", { style: "margin:0 0 6px" }, "Joel's to-do list"), list))),
    el("div", { class: "cup-signrow" }, sign, disturbed),
    msg);
  paintSand(); paintList(); paintSign();
  if (first) {
    const got = addPeanuts("Found Joel's cupboard (hush money)", 2);
    setMsg(msg, `You found Joel's cupboard. Joel says nothing. Joel pushes two peanuts under the door.${got ? " +2 peanuts." : ""}`, "ok");
  }
}

cupboardOpen() ? open() : locked();
void SORRY_LIMIT;
