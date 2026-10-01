// The 7 official FIA taglines. Line breaks are part of the joke: each line is its own entry.
// punch: true = punchline styling; size: "small" = tiny text.
import { el, reducedMotion } from "./dom.js";

export const FIA_TAGLINES = [
  { id: "fly", lines: [{ text: "FLY SOMEWHERE." }, { text: "EVENTUALLY", punch: true }] },
  { id: "lost", lines: [{ text: "LOST? we will make you more lost", punch: true }] },
  { id: "bags", lines: [{ text: "YOUR BAGS" }, { text: "our mystery", punch: true }] },
  { id: "takeoff", lines: [{ text: "\"are we taking off yet\"" }, { text: "Are the engines working?", punch: true }] },
  { id: "think", lines: [{ text: "THINK" }, { text: "before you" }, { text: "say", punch: true }] },
  { id: "sophisticated", lines: [{ text: "becoming sophisticated" }, { text: "is impossible" }, { text: "at least on this flight", punch: true, size: "small" }] },
  { id: "peanut", lines: [{ text: "Peanut? Peanut?" }, { text: "ONE PEANUT", punch: true }] }
];

export function taglineNode(t, tag = "p") {
  return el(tag, { class: "headline" },
    t.lines.map((l) => el("span", { class: l.punch ? "punch line" + (l.size === "small" ? " small" : "") : "line" }, l.text)));
}

// Rotates through all taglines; the punchline fades in after the main line.
export function mountRotator(holder, interval = 5000) {
  const stage = el("div", { class: "rotator", "aria-live": "polite" });
  const dots = el("div", { class: "dots", role: "group", "aria-label": "Choose a tagline" });
  let i = 0, timer = null;
  const show = (n) => {
    i = (n + FIA_TAGLINES.length) % FIA_TAGLINES.length;
    stage.classList.remove("show");
    stage.replaceChildren(taglineNode(FIA_TAGLINES[i], "h1"));
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add("show")));
    [...dots.children].forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
  };
  FIA_TAGLINES.forEach((t, k) => dots.append(el("button", { type: "button", "aria-label": "Tagline " + (k + 1), onclick: () => { show(k); restart(); } })));
  const restart = () => { clearInterval(timer); if (!reducedMotion()) timer = setInterval(() => show(i + 1), interval); };
  holder.append(stage, dots);
  show(0);
  restart();
}

export function mountGallery(holder) {
  holder.append(...FIA_TAGLINES.map((t) => el("div", { class: "card navy" }, taglineNode(t))));
}
