// Click the logo 10 times: who may open the code viewer. Needs a login to Octee Cloud as the owner (an etched account).
// The accounts are stored in the cloud (table code_viewers); the owner account itself is etched in the Worker and cannot be removed.
import { el, setMsg } from "./dom.js";
import { cloudAdminCall } from "./cloud.js";

let back = null;
function shell(...content) {
  back?.remove();
  back = el("div", { class: "modal-back fag-back", role: "dialog", "aria-modal": "true", "aria-label": "FAG Fuji Airport Group, code viewer access" },
    el("div", { class: "modal fag" },
      el("button", { class: "close-x", type: "button", "aria-label": "Close", onclick: () => back.remove() }, "×"),
      el("div", { class: "fag-head" }, el("div", { class: "fag-mark", "aria-hidden": "true" }, "FAG"),
        el("div", {}, el("h2", {}, "Fuji Airport Group"), el("p", { class: "fag-sub" }, "Code viewer access · Restricted system"))),
      ...content));
  back.addEventListener("keydown", (e) => { if (e.key === "Escape") back.remove(); });
  back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  document.body.append(back);
  back.querySelector("input, button:not(.close-x)")?.focus();
}
const note = (text) => shell(el("p", { class: "msg info", style: "margin:14px 0" }, text));

export async function openCodeAccess() {
  let list;
  try { list = await cloudAdminCall("GET", "/api/code/viewers"); }
  catch (e) {
    return note(e && e.code === "login" ? "Log in to Octee Cloud first (login page, Log in tab) as the owner account, then click the logo 10 times again."
      : e && (e.code === "owner_only" || e.code === "forbidden") ? "Only the owner account can change who may open the code viewer."
      : "The cloud could not be reached. Try again later.");
  }
  const msg = el("p", { class: "msg", "aria-live": "polite" });
  const input = el("input", { type: "text", id: "ca-name", maxlength: "20", autocomplete: "off" });
  const form = el("form", { class: "card" }, el("h3", {}, "Add an account"),
    el("p", { class: "note" }, "The account must already exist in Octee Cloud. It can then open the code viewer (Control Tower, Code tab) when it is logged in. The viewer is read only."),
    el("div", { class: "row" }, el("div", { class: "field" }, el("label", { for: "ca-name" }, "Cloud username"), input)),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Add")), msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return setMsg(msg, "Type a cloud username.", "error");
    try { await cloudAdminCall("POST", "/api/code/viewers", { username: name }); openCodeAccess(); }
    catch (err) { setMsg(msg, err && err.body && err.body.message ? err.body.message : err && err.code === "owner" ? "That is an owner account already." : "Could not add it. Try again.", "error"); }
  });
  shell(
    el("div", { class: "card" }, el("h3", {}, "Accounts that may open the code viewer"),
      el("table", { class: "plain" }, el("tbody", {},
        (list.owners || []).map((n) => el("tr", {}, el("td", {}, n), el("td", {}, "Owner · etched in the code, cannot be removed"), el("td", {}))),
        (list.viewers || []).map((v) => el("tr", {}, el("td", {}, v.username), el("td", {}, "Viewer · added " + String(v.granted_at || "").slice(0, 10)),
          el("td", {}, el("button", { class: "btn small ghost danger", type: "button", onclick: async () => { try { await cloudAdminCall("DELETE", "/api/code/viewers/" + encodeURIComponent(v.username)); } catch { /* shown on reload */ } openCodeAccess(); } }, "Remove")))))),
      (list.viewers || []).length ? "" : el("p", { class: "note" }, "No other accounts yet.")),
    form,
    el("p", { class: "hint" }, "Changes are saved to the cloud at once."));
}
