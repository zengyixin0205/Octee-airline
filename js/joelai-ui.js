// The JoelAI chat box on the JOELMOBILE page.
import { $, el, reducedMotion, fmtMiles } from "./dom.js";
import { load, save, loadSession, saveSession, removeSession } from "./store.js";
import { proConverse } from "./joelpro.js";
import { actionRow, stopSpeaking } from "./chatextras.js";
import { converse, GREETING, CHIPS, resetState, setPage } from "./joelbrain.js";
import { currentUser, updateUser } from "./auth.js";
import { buyJoelPro, buyJoelTokens, joelTokensOf, joelUsageMonth, JOEL_PRO_PRICE, JOEL_TOKEN_RATE, JOEL_MONTHLY_GRANT, JOEL_MIN_CALL_RESERVE, recordJoelUsage } from "./miles.js";
import { JOEL_MODELS, JOEL_MODEL_DEFAULT } from "./joel-models.js";

const KEY = "octee.joelai";
const MODEL_KEY = "octee.joelai.model";
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
  const here = location.pathname.split("/").pop() || "index.html";
  setPage(here);
  let selectedModel = load(MODEL_KEY, JOEL_MODEL_DEFAULT);
  if (!JOEL_MODELS.some((m) => m.id === selectedModel)) selectedModel = JOEL_MODEL_DEFAULT;
  const log = el("div", { class: "jai-log", role: "log", "aria-live": "polite", "aria-label": "Conversation with JoelAI" });
  const input = el("input", { type: "text", id: "jai-" + idSuffix, maxlength: "200", autocomplete: "off", placeholder: "Ask about gates, flights, security, bags, Octmiles…" });
  const send = el("button", { class: "btn", type: "submit" }, "Ask");
  const chips = el("div", { class: "jai-chips", "aria-label": "Suggested questions" });
  const proBox = el("div", { class: "jai-pro" });
  const account = currentUser();
  const savedHistory = account?.joelChat;
  let history = account
    ? (Array.isArray(savedHistory) && savedHistory.length ? savedHistory.slice(-40) : [{ who: "bot", text: GREETING, links: [] }])
    : loadSession(KEY, null) || [{ who: "bot", text: GREETING, links: [] }];
  let busy = false;

  const bubble = (m) => el("div", { class: "jai-msg " + m.who },
    el("span", { class: "jai-who" }, m.who === "bot" ? "JoelAI" : "You", m.mood && m.mood !== "calm" ? el("span", { class: "jai-mood" }, "feeling " + m.mood) : ""),
    ...String(m.text).split("\n\n").map((t) => el("p", {}, t)),
    m.usage ? el("p", { class: "jai-usage" }, `${m.usage.inputTokens.toLocaleString("en-GB")} input + ${m.usage.outputTokens.toLocaleString("en-GB")} output = ${m.usage.totalTokens.toLocaleString("en-GB")} tokens · ${m.modelName}`) : "",
    m.links?.length ? el("p", { class: "jai-links" }, m.links.map(([label, href]) => el("a", { class: "tag", href, ...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {}) }, label))) : "",
    m.who === "bot" && !m.error && history.indexOf(m) > 0 ? actionRow(m.text, { up: "Joel is glad. Joel is always glad. Joel is also sorry.", down: "Sorry! Joel will try again. Ask it another way and Joel will look in a different drawer." }) : "");
  const draw = () => { log.replaceChildren(...history.map(bubble)); log.scrollTop = log.scrollHeight; };
  const drawChips = (list = (here === "joelmobile.html" ? CHIPS : ["What is this page?", ...CHIPS.slice(0, 5)])) => chips.replaceChildren(...list.map((c) => el("button", { type: "button", class: "jai-chip", onclick: () => ask(c) }, c)));

  function drawPro() {
    const u = currentUser();
    if (!u) {
      proBox.replaceChildren(el("p", { class: "note" }, "JoelAI Pro needs an account. ", el("a", { href: "login.html?next=" + encodeURIComponent(here) }, "Log in or sign up")));
      return;
    }
    if (!u.joelPro) {
      const controls = [
        el("div", { class: "jai-pro-copy" }, el("strong", {}, "JoelAI Pro"), " · Longer answers from the handbook, a random page to explore, and questions to ask next."),
        el("p", { class: "note" }, `One-time unlock: ${JOEL_PRO_PRICE} Octeetokens. Works on every page, no server needed.`),
        el("button", { class: "btn small secondary", type: "button", disabled: (u.tokens || 0) < JOEL_PRO_PRICE, onclick: () => {
          try { buyJoelPro(); drawPro(); }
          catch (e) { proBox.append(el("p", { class: "msg error", role: "status" }, e.message)); }
        } }, `Unlock JoelAI Pro · ${JOEL_PRO_PRICE} Octeetokens`)
      ];
      if ((u.tokens || 0) < JOEL_PRO_PRICE) controls.push(el("p", { class: "hint" }, `You have ${fmtMiles(u.tokens || 0)} Octeetokens. Get more on the `, el("a", { href: "octmiles.html#tokens" }, "Octmiles page"), "."));
      proBox.replaceChildren(...controls);
      return;
    }

    const model = JOEL_MODELS.find((m) => m.id === selectedModel) || JOEL_MODELS[0];
    const month = u.joelUsage?.month === joelUsageMonth() ? u.joelUsage : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const [year, monthNo] = joelUsageMonth().split("-").map(Number);
    const resetDate = new Date(Date.UTC(year, monthNo, 1));
    const choices = el("select", { class: "jai-model-select", "aria-label": "JoelAI Pro model", onchange: (e) => { selectedModel = e.target.value; save(MODEL_KEY, selectedModel); } },
      JOEL_MODELS.map((m) => el("option", { value: m.id, selected: m.id === selectedModel }, `${m.name} · ${m.detail}`)));
    const topups = [1, 5, 10].map((n) => el("button", { class: "btn small ghost", type: "button", disabled: (u.tokens || 0) < n, onclick: () => {
      try { buyJoelTokens(n); drawPro(); }
      catch (e) { proBox.append(el("p", { class: "msg error", role: "status" }, e.message)); }
    } }, `+${fmtMiles(n * JOEL_TOKEN_RATE)} JoelTokens · ${n} Octeetoken${n === 1 ? "" : "s"}`));
    if (!model.model) {
      proBox.replaceChildren(
        el("div", { class: "jai-pro-row" }, el("strong", {}, "JoelAI Pro"), el("span", { class: "tag" }, model.name), choices),
        el("p", { class: "note" }, "Handbook Pro is free once unlocked: longer answers, a random page to explore, and follow-up questions. The model choices need the Vercel server and use JoelTokens."));
      return;
    }
    proBox.replaceChildren(
      el("div", { class: "jai-pro-row" }, el("strong", {}, "JoelAI Pro"), el("span", { class: "tag" }, model.name), choices),
      el("p", { class: "jai-wallet" }, `${fmtMiles(joelTokensOf(u))} JoelTokens · ${fmtMiles(month.totalTokens)} model tokens used this month`),
      el("p", { class: "note" }, `${fmtMiles(JOEL_MONTHLY_GRANT)} JoelTokens refresh monthly on ${resetDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} UTC. Usage is charged 1:1 from reported input and output tokens; purchased tokens carry over. The last four chat messages go to the model provider; do not include passwords or sensitive details.`),
      el("div", { class: "jai-topups" }, topups));
  }

  async function proAnswer() {
    const selected = JOEL_MODELS.find((m) => m.id === selectedModel) || JOEL_MODELS[0];
    const messages = history.filter((m) => m.who === "me" || m.who === "bot").slice(-4).map((m) => ({ role: m.who === "me" ? "user" : "assistant", content: String(m.text).slice(0, 300) }));
    const reserve = JOEL_MIN_CALL_RESERVE + messages.reduce((n, m) => n + m.content.length, 0);
    const u = currentUser();
    if (!u) throw new Error("Log in to use JoelAI Pro.");
    if (joelTokensOf(u) < reserve) throw new Error(`Keep ${fmtMiles(reserve)} JoelTokens available for this chat first. Buy a top-up above.`);
    let response;
    try {
      response = await fetch("/api/joelai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selected.id, messages })
      });
    } catch { throw new Error("JoelAI Pro needs its server endpoint. GitHub Pages only runs the handbook version."); }
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) throw new Error("JoelAI Pro needs its server endpoint. GitHub Pages only runs the handbook version.");
    if (!response.ok) throw new Error(data.error || "JoelAI Pro is unavailable right now.");
    const charged = recordJoelUsage(data.usage, selected.name);
    drawPro();
    return { ...data, modelName: selected.name, balance: charged.balance };
  }

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true;
    history.push({ who: "me", text });
    const typing = el("div", { class: "jai-msg bot typing" }, el("span", { class: "jai-who" }, "JoelAI"), el("p", {}, "Joel is thinking… (he is not)"));
    draw(); log.append(typing); log.scrollTop = log.scrollHeight;
    input.value = "";
    const t0 = performance.now();
    let res;
    const pro = !!currentUser()?.joelPro;
    const sel = JOEL_MODELS.find((m) => m.id === selectedModel) || JOEL_MODELS[0];
    try { res = pro ? (sel.model ? await proAnswer() : await proConverse(text)) : await converse(text); }
    catch (e) {
      // the model path failed (no server, no tokens): fall back to the handbook, with a note
      if (pro && sel.model) { try { res = await proConverse(text); res.text = `(${e.message || "The model is unavailable."} Handbook Pro answered instead.)\n\n` + res.text; } catch {} }
      if (!res) res = { text: e.message || "Something went wrong. Please blame Joel.", links: [], error: true };
    }
    const wait = reducedMotion() ? 0 : Math.min(2200, 400 + res.text.length * 3);
    await new Promise((r) => setTimeout(r, Math.max(0, wait - (performance.now() - t0))));
    history = history.slice(-40);
    if (!reducedMotion() && res.text.length > 60) {
      const words = res.text.split(" "), step = Math.max(1, Math.ceil(words.length / 70));
      const live = el("div", { class: "jai-msg bot" }, el("span", { class: "jai-who" }, "JoelAI"), el("p", {}, ""));
      typing.remove(); draw(); log.append(live);
      for (let i = step; i < words.length + step; i += step) {
        live.querySelector("p").textContent = words.slice(0, i).join(" ");
        log.scrollTop = log.scrollHeight;
        await new Promise((r) => setTimeout(r, 22));
      }
    }
    history.push({ who: "bot", text: res.text, links: res.links, mood: res.mood, usage: res.usage, modelName: res.modelName });
    saveHistory();
    draw();
    if (res.chips) drawChips(res.chips);
    busy = false; send.disabled = false; input.focus();
  }

  function saveChat() {
    const txt = history.map((m) => (m.who === "bot" ? "JoelAI: " : "You: ") + m.text + (m.links?.length ? "\n  Links: " + m.links.map((l) => l[0] + " (" + l[1] + ")").join(", ") : "") + (m.usage ? `\n  Usage: ${m.usage.inputTokens} input + ${m.usage.outputTokens} output tokens (${m.modelName})` : "")).join("\n\n") + "\n\n(JoelAI is part handbook, part model-powered assistant. Octee Airlines is a parody.)\n";
    const a = el("a", { href: URL.createObjectURL(new Blob([txt], { type: "text/plain" })), download: "joelai-chat.txt" });
    document.body.append(a); a.click(); a.remove();
  }

  function saveHistory() {
    history = history.slice(-40);
    saveSession(KEY, history);
    // The cloud already stores the signed-in account profile. Keeping JoelAI chat
    // there makes it follow that account to another device without a new API table.
    if (currentUser()) {
      try { updateUser((u) => { u.joelChat = history; }); } catch { /* the local chat remains available */ }
    }
  }

  box.replaceChildren(
    el("div", { class: "jai-head" },
      el("div", { class: "jai-avatar", "aria-hidden": "true" }, "J"),
      el("div", {}, el("h2", { style: "margin:0" }, "Ask JoelAI"), el("p", { class: "note", style: "margin:0" }, "Use the airport handbook, or unlock JoelAI Pro for longer answers."))),
    proBox, log, chips,
    el("form", { class: "jai-form", onsubmit: (e) => { e.preventDefault(); ask(input.value); } },
      el("label", { class: "visually-hidden", for: "jai-" + idSuffix }, "Your question for JoelAI"), input, send),
    el("p", { class: "note" }, el("button", { class: "linklike", type: "button", onclick: saveChat }, "Save this chat"), " · ", el("button", { class: "linklike", type: "button", onclick: () => { stopSpeaking(); removeSession(KEY); resetState(); history = [{ who: "bot", text: GREETING, links: [] }]; const u = currentUser(); if (u) { try { updateUser((x) => { delete x.joelChat; }); } catch {} } drawChips(); draw(); } }, "Start again"), " · Your chat is saved with your account; a cloud-linked account syncs it across devices. Avoid passwords or private details."));
  drawPro(); draw(); drawChips();
  window.addEventListener("octee:account", () => {
    const chat = currentUser()?.joelChat;
    if (Array.isArray(chat) && chat.length) history = chat.slice(-40);
    else history = [{ who: "bot", text: GREETING, links: [] }];
    drawPro(); draw();
  });
}
