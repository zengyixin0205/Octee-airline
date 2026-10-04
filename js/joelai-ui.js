// The JoelAI chat box on the JOELMOBILE page.
import { $, el, reducedMotion } from "./dom.js";
import { loadSession, saveSession, removeSession } from "./store.js";
import { converse, GREETING, CHIPS, resetState } from "./joelbrain.js";

const KEY = "octee.joelai";
const page = $("#joelai");
if (page) mountJoelAI(page);

// Open JoelAI as a pop-up from the top row of any page.
export function openJoelAI() {
  if (document.querySelector(".jai-modal")) { document.querySelector(".jai-modal #jai-q")?.focus(); return; }
  const close = () => { back.remove(); document.querySelector(".jai-open")?.focus(); };
  const holder = el("section", { class: "jai", "aria-label": "JoelAI, the airport assistant" });
  const back = el("div", { class: "modal-back jai-modal", role: "dialog", "aria-modal": "true", "aria-label": "JoelAI", onclick: (e) => { if (e.target === back) close(); } },
    el("div", { class: "modal", style: "max-width:640px;background:#fff;color:var(--ink)" },
      el("button", { class: "close-x", type: "button", "aria-label": "Close JoelAI", onclick: close }, "×"), holder));
  back.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.append(back);
  mountJoelAI(holder, "jmq");
  holder.querySelector("input")?.focus();
}

export function mountJoelAI(box, idSuffix = "q") {
  const log = el("div", { class: "jai-log", role: "log", "aria-live": "polite", "aria-label": "Conversation with JoelAI" });
  const input = el("input", { type: "text", id: "jai-" + idSuffix, maxlength: "200", autocomplete: "off", placeholder: "Ask about gates, flights, security, bags, Octmiles…" });
  const send = el("button", { class: "btn", type: "submit" }, "Ask");
  const chips = el("div", { class: "jai-chips", "aria-label": "Suggested questions" });
  let history = loadSession(KEY, null) || [{ who: "bot", text: GREETING, links: [] }];
  let busy = false;

  const bubble = (m) => el("div", { class: "jai-msg " + m.who },
    el("span", { class: "jai-who" }, m.who === "bot" ? "JoelAI" : "You", m.mood && m.mood !== "calm" ? el("span", { class: "jai-mood" }, "feeling " + m.mood) : ""),
    ...String(m.text).split("\n\n").map((t) => el("p", {}, t)),
    m.links?.length ? el("p", { class: "jai-links" }, m.links.map(([label, href]) => el("a", { class: "tag", href }, label))) : "");
  const draw = () => { log.replaceChildren(...history.map(bubble)); log.scrollTop = log.scrollHeight; };
  const drawChips = (list = CHIPS) => chips.replaceChildren(...list.map((c) => el("button", { type: "button", class: "jai-chip", onclick: () => ask(c) }, c)));

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true;
    history.push({ who: "me", text });
    const typing = el("div", { class: "jai-msg bot typing" }, el("span", { class: "jai-who" }, "JoelAI"), el("p", {}, "Joel is thinking… (he is not)"));
    draw(); log.append(typing); log.scrollTop = log.scrollHeight;
    input.value = "";
    const t0 = performance.now();
    const [res] = await Promise.all([converse(text).catch(() => ({ text: "Something went wrong. Please blame Joel.", links: [] })), 0]);
    const wait = reducedMotion() ? 0 : Math.min(2200, 400 + res.text.length * 3);
    await new Promise((r) => setTimeout(r, Math.max(0, wait - (performance.now() - t0))));
    history.push({ who: "bot", text: res.text, links: res.links, mood: res.mood });
    history = history.slice(-40);
    saveSession(KEY, history);
    draw();
    if (res.chips) drawChips(res.chips);
    busy = false; send.disabled = false; input.focus();
  }

  box.replaceChildren(
    el("div", { class: "jai-head" },
      el("div", { class: "jai-avatar", "aria-hidden": "true" }, "J"),
      el("div", {}, el("h2", { style: "margin:0" }, "Ask JoelAI"), el("p", { class: "note", style: "margin:0" }, "Questions about the airport. Answers from the airport handbook. Not a real AI."))),
    log, chips,
    el("form", { class: "jai-form", onsubmit: (e) => { e.preventDefault(); ask(input.value); } },
      el("label", { class: "visually-hidden", for: "jai-" + idSuffix }, "Your question for JoelAI"), input, send),
    el("p", { class: "note" }, el("button", { class: "linklike", type: "button", onclick: () => { removeSession(KEY); resetState(); history = [{ who: "bot", text: GREETING, links: [] }]; drawChips(); draw(); } }, "Start again")));
  draw(); drawChips();
}
