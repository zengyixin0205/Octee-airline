import { $, setMsg } from "./dom.js";
import { signUp, logIn, MESSAGES, safeNext } from "./auth.js";
import { restoreBackup, BACKUP_MESSAGES } from "./backup.js";

const tabs = { login: $("#tab-login"), signup: $("#tab-signup"), restore: $("#tab-restore") };
const forms = { login: $("#form-login"), signup: $("#form-signup"), restore: $("#form-restore") };
function show(which) {
  for (const k of Object.keys(tabs)) {
    tabs[k].setAttribute("aria-selected", String(k === which));
    forms[k].hidden = k !== which;
  }
}
tabs.login.addEventListener("click", () => show("login"));
tabs.signup.addEventListener("click", () => show("signup"));
tabs.restore.addEventListener("click", () => show("restore"));
if (location.hash === "#restore") show("restore");
if (location.hash === "#signup") show("signup");

for (const btn of document.querySelectorAll("[data-show-password]")) {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.showPassword);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.textContent = showing ? "Show" : "Hide";
    btn.setAttribute("aria-pressed", String(!showing));
  });
}

forms.login.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = forms.login.elements, msg = $("#msg-login");
  setMsg(msg, "Checking… (we lose things)", "info");
  try { await logIn(f.username.value, f.password.value); location.href = safeNext(); }
  catch (err) { setMsg(msg, MESSAGES[err.code] || MESSAGES.storage, "error"); }
});
forms.signup.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = forms.signup.elements, msg = $("#msg-signup");
  setMsg(msg, "Creating your account…", "info");
  try {
    await signUp(f.username.value, f.password.value, f.confirm.value);
    setMsg(msg, "Welcome aboard. Here are 100 Octmiles. Please do not ask what they are worth.", "ok");
    setTimeout(() => (location.href = safeNext()), 900);
  } catch (err) { setMsg(msg, MESSAGES[err.code] || MESSAGES.storage, "error"); }
});

forms.restore.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#msg-restore");
  setMsg(msg, "Opening your backup… (we lose things)", "info");
  try {
    const u = await restoreBackup(forms.restore.elements.code.value);
    setMsg(msg, `Welcome back, ${u.username}. Your miles are here. We found them in a code.`, "ok");
    setTimeout(() => (location.href = safeNext("account.html")), 900);
  } catch (err) { setMsg(msg, BACKUP_MESSAGES[err.message] || "Something went wrong. Blame Joel.", "error"); }
});
