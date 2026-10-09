// Small actions under each answer in JoelAI and GulletAI: copy it, hear it read aloud, say whether it helped.
// Reading aloud uses the browser's own speech (speechSynthesis): it needs no server and only starts when you press the button.
import { el } from "./dom.js";

const canSpeak = () => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
let speakingBtn = null;

export function stopSpeaking() {
  try { if (canSpeak()) speechSynthesis.cancel(); } catch { /* ignore */ }
  if (speakingBtn) { speakingBtn.textContent = "Read aloud"; speakingBtn = null; }
}

export function actionRow(text, { up = "Thank you.", down = "Sorry about that." } = {}) {
  const note = el("span", { class: "chat-note", role: "status", "aria-live": "polite" }, "");
  const flash = (t) => { note.textContent = t; };
  const copy = el("button", { class: "linklike", type: "button", onclick: async () => {
    try { await navigator.clipboard.writeText(text); flash("Copied."); }
    catch {
      const ta = el("textarea", { style: "position:fixed;left:-999px" }, text); document.body.append(ta); ta.select();
      try { document.execCommand("copy"); flash("Copied."); } catch { flash("Could not copy. Select the text instead."); } ta.remove();
    }
  } }, "Copy");
  const row = [copy];
  if (canSpeak()) {
    const speak = el("button", { class: "linklike", type: "button", onclick: () => {
      if (speakingBtn === speak) { stopSpeaking(); return; }
      stopSpeaking();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, " ").slice(0, 900));
      u.onend = u.onerror = () => { if (speakingBtn === speak) { speak.textContent = "Read aloud"; speakingBtn = null; } };
      speakingBtn = speak; speak.textContent = "Stop";
      try { speechSynthesis.speak(u); } catch { stopSpeaking(); }
    } }, "Read aloud");
    row.push(speak);
  }
  row.push(el("button", { class: "linklike", type: "button", "aria-label": "This answer helped", onclick: () => flash(up) }, "👍"),
    el("button", { class: "linklike", type: "button", "aria-label": "This answer did not help", onclick: () => flash(down) }, "👎"));
  return el("p", { class: "chat-actions" }, ...row, note);
}
