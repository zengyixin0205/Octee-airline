import { $, setMsg } from "./dom.js";
import { signUp, logIn, MESSAGES, safeNext } from "./auth.js";
import { loadCode, codeMessage } from "./codeload.js";
import { cloudLogin, cloudCreate, cloudMessage } from "./cloud.js";

const tabs = { login: $("#tab-login"), signup: $("#tab-signup"), cloud: $("#tab-cloud"), restore: $("#tab-restore") };
const forms = { login: $("#form-login"), signup: $("#form-signup"), cloud: $("#form-cloud"), restore: $("#form-restore") };
function show(which) {
  for (const k of Object.keys(tabs)) {
    tabs[k].setAttribute("aria-selected", String(k === which));
    forms[k].hidden = k !== which;
  }
}
tabs.login.addEventListener("click", () => show("login"));
tabs.signup.addEventListener("click", () => show("signup"));
tabs.cloud.addEventListener("click", () => show("cloud"));
tabs.restore.addEventListener("click", () => show("restore"));
if (location.hash === "#restore") show("restore");
if (location.hash === "#signup") show("signup");
if (location.hash === "#cloud") show("cloud");

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
    const u = await loadCode(forms.restore.elements.code.value);
    setMsg(msg, `Welcome back, ${u.username}. Your miles are here. We found them in a code.`, "ok");
    setTimeout(() => (location.href = safeNext("account.html")), 900);
  } catch (err) { setMsg(msg, codeMessage(err), "error"); }
});

// Cloud account: log in (or create) with a username and password that works on any device.
const cloudGo = async (fn, hello) => {
  const msg = $("#msg-cloud"), f = forms.cloud, u = f.elements.username.value, p = f.elements.password.value;
  setMsg(msg, "Calling the cloud… (it is a long way up)", "info");
  f.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    const user = await fn(u, p);
    setMsg(msg, hello(user), "ok");
    setTimeout(() => (location.href = safeNext("account.html")), 900);
  } catch (err) { setMsg(msg, cloudMessage(err), "error"); f.querySelectorAll("button").forEach((b) => (b.disabled = false)); }
};
forms.cloud.addEventListener("submit", (e) => { e.preventDefault(); cloudGo(cloudLogin, (u) => `Welcome back, ${u.username}. Your account came down from the cloud.`); });
$("#cl-create").addEventListener("click", () => cloudGo(cloudCreate, (u) => `Cloud account made. Welcome aboard, ${u.username}.`));
