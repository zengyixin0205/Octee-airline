// "Have a code?" box — on octmiles.html and as a pop-up from the account menu.
import { el, setMsg } from "./dom.js";
import { currentUser } from "./auth.js";
import { redeemCode, CODE_MESSAGES, codesLeft, CODES_PER_DAY } from "./miles.js";

export function codeBoxCard() {
  const msg = el("p", { class: "msg", role: "status", "aria-live": "polite" });
  const input = el("input", { type: "text", id: "code-input", name: "code", autocomplete: "off", placeholder: "e.g. OCTEE 500", maxlength: "30" });
  const btn = el("button", { class: "btn", type: "submit" }, "Redeem");
  const left = el("p", { class: "hint" });
  const form = el("form", { class: "card", id: "code-box" },
    el("h3", {}, "Have a code? ", el("span", { class: "punch", style: "color:var(--mess-gray)" }, "we might honour it")),
    el("div", { class: "field" }, el("label", { for: "code-input" }, "Octmiles code"), input),
    el("div", { class: "actions" }, btn),
    left, msg);
  const sync = () => {
    const u = currentUser(), out = !u;
    input.disabled = out; btn.disabled = out;
    left.textContent = out ? "" : `${codesLeft(u)} code${codesLeft(u) === 1 ? "" : "s"} left today (${CODES_PER_DAY} a day).`;
    if (out) setMsg(msg, CODE_MESSAGES.login, "info");
  };
  sync();
  window.addEventListener("octee:account", sync);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!input.value.trim()) { setMsg(msg, "Type a code first. Even we need something to work with.", "error"); return; }
    setMsg(msg, "Checking the code… (we lose things)", "info");
    const r = await redeemCode(input.value);
    setMsg(msg, r.message, r.ok ? "ok" : "error");
    if (r.ok) input.value = "";
  });
  return form;
}

export function openCodeBox() {
  const close = () => back.remove();
  const back = el("div", { class: "modal-back", role: "dialog", "aria-modal": "true", "aria-label": "Have a code?",
    onclick: (e) => { if (e.target === back) close(); } },
    el("div", { class: "modal", style: "max-width:460px;background:#fff;color:var(--ink)" },
      el("button", { class: "close-x", type: "button", "aria-label": "Close", onclick: close }, "×"),
      codeBoxCard()));
  back.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.append(back);
  back.querySelector("input")?.focus();
}
