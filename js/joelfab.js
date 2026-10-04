// The floating "Ask JoelAI" button, on every page except the JOELMOBILE page (which has the chat built in).
import { el } from "./dom.js";
import { loadSession, saveSession } from "./store.js";

const here = location.pathname.split("/").pop() || "index.html";
if (here !== "joelmobile.html" && here !== "pass.html" && !document.querySelector(".joel-fab")) {
  const open = async () => { tip.remove(); saveSession("octee.fab.tip", 1); (await import("./joelai-ui.js")).openJoelAI(); };
  const tip = el("div", { class: "joel-fab-tip", role: "note" }, "Ask me anything. I know the airport, and a few things outside it.");
  const btn = el("button", { class: "joel-fab", type: "button", title: "Ask JoelAI", "aria-label": "Ask JoelAI, the airport assistant", onclick: open },
    el("span", { class: "joel-fab-j", "aria-hidden": "true" }, "J"), el("span", { class: "joel-fab-t" }, "Ask JoelAI"));
  const wrap = el("div", { class: "joel-fab-wrap" }, btn);
  document.body.append(wrap);
  if (!loadSession("octee.fab.tip", 0)) {
    setTimeout(() => { if (document.querySelector(".joel-fab-wrap") && !document.querySelector(".jai-modal") && !loadSession("octee.fab.tip", 0)) { wrap.prepend(tip); setTimeout(() => { tip.remove(); saveSession("octee.fab.tip", 1); }, 9000); } }, 5000);
  }
}
