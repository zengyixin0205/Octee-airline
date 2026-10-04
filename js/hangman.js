// Hangman: Destination Edition. Guess the airport. The answer is always FIA.
import { el } from "./dom.js";
import { best, setBest, reward } from "./gamekit.js";

const ANSWER = "FIA";
const MAX = 6;
const CLUES = [
  "It is where you are standing.", "It is where Joel works. And lives. Sometimes in the cupboard.", "Three letters. Five terminals. One of them across the runway.",
  "Every flight from here is delayed. Which airport is it?", "It is on every ticket we have ever sold.", "The train is called the SBB. The airport is called...", "The board says DELAYED. The board is at...", "Fuji International Airport, for short."
];
const WRONG = [
  "Wrong. That letter is not in the airport. It is in Duty Free.", "No. Joel checked. Joel checked twice and then apologised.", "Not that one. The airport has only three letters, and you have found none of them.",
  "Wrong. The gallows is getting taller. We are sorry.", "That letter is on the delay board, but not in the answer.", "Close. No. Not close. Wrong."
];
const RIGHT = ["Yes! That letter is in FIA. Obviously.", "Correct. It always was.", "Right. The airport welcomes it."];
const GALLOWS = [
  "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n========="
];

export function mountHangman(box) {
  let guessed, wrong, over, clue, wins = 0, streak = 0;
  const art = el("pre", { class: "hm-art", "aria-label": "The gallows" });
  const word = el("p", { class: "hm-word", "aria-live": "polite" });
  const clueEl = el("p", { class: "note" });
  const info = el("p", { class: "note", role: "status", "aria-live": "polite" });
  const keys = el("div", { class: "hm-keys", role: "group", "aria-label": "Letters" });
  const again = el("button", { class: "btn small", type: "button", style: "display:none", onclick: () => reset() }, "Next airport");
  const buttons = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((ch) => {
    buttons[ch] = el("button", { class: "btn small ghost hm-key", type: "button", onclick: () => guess(ch) }, ch);
    keys.append(buttons[ch]);
  });
  const draw = () => {
    word.textContent = ANSWER.split("").map((c) => (guessed.has(c) || over === "lose" ? c : "_")).join(" ");
    art.textContent = GALLOWS[wrong];
    clueEl.textContent = `Clue: ${CLUES[clue]}  ·  Wrong guesses: ${wrong} of ${MAX}`;
  };
  function reset() {
    guessed = new Set(); wrong = 0; over = null; clue = Math.floor(Math.random() * CLUES.length);
    Object.values(buttons).forEach((b) => { b.disabled = false; b.classList.add("ghost"); b.classList.remove("hm-hit", "hm-miss"); });
    again.style.display = "none";
    info.textContent = `Best streak: ${best("hangman") || 0}. Press a letter on screen or on your keyboard. Reminder: it is always the same airport.`;
    draw();
  }
  function end(kind) {
    over = kind;
    Object.values(buttons).forEach((b) => { b.disabled = true; });
    again.style.display = "";
    if (kind === "win") {
      wins++; streak++;
      const nb = setBest("hangman", streak);
      info.textContent = `FIA! It was FIA. It is always FIA. Streak ${streak}. ${nb && streak > 1 ? "New best! " : ""}${reward("hangman", "Hangman: guessed FIA")}`;
    } else {
      streak = 0;
      info.textContent = "The answer was FIA. It always is. Joel is fine. Joel was never on the gallows. He was only holding it.";
    }
    draw();
  }
  function guess(ch) {
    if (over || guessed.has(ch)) return;
    guessed.add(ch);
    const b = buttons[ch];
    b.disabled = true; b.classList.remove("ghost");
    if (ANSWER.includes(ch)) {
      b.classList.add("hm-hit");
      info.textContent = RIGHT[Math.floor(Math.random() * RIGHT.length)];
      if (ANSWER.split("").every((c) => guessed.has(c))) return end("win");
    } else {
      b.classList.add("hm-miss"); wrong++;
      info.textContent = WRONG[Math.min(wrong - 1, WRONG.length - 1)];
      if (wrong >= MAX) return end("lose");
    }
    draw();
  }
  const onKey = (e) => {
    if (!box.isConnected || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) guess(e.key.toUpperCase());
  };
  addEventListener("keydown", onKey);
  box.append(art, word, clueEl, keys, info, again);
  reset();
  return () => removeEventListener("keydown", onKey);
}
