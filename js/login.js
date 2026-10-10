import { $, setMsg } from "./dom.js";
import { signUp, logIn, MESSAGES, safeNext } from "./auth.js";
import { loadCode, codeMessage } from "./codeload.js";
import { cloudLogin, cloudCreate, cloudMessage } from "./cloud.js";

const tabs = { login: $("#tab-login"), signup: $("#tab-signup"), manual: $("#tab-manual") };
const forms = { login: $("#form-cloud"), signup: $("#form-csignup"), manual: $("#panel-manual") };
function show(which) {
  for (const k of Object.keys(tabs)) {
    tabs[k].setAttribute("aria-selected", String(k === which));
    forms[k].hidden = k !== which;
  }
}
for (const k of Object.keys(tabs)) tabs[k].addEventListener("click", () => show(k));
const h = location.hash;
if (h === "#restore" || h === "#manual") show("manual");
else if (h === "#signup") show("signup");

for (const btn of document.querySelectorAll("[data-show-password]")) {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.showPassword);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.textContent = showing ? "Show" : "Hide";
    btn.setAttribute("aria-pressed", String(!showing));
  });
}

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = $("#form-login").elements, msg = $("#msg-login");
  setMsg(msg, "Checking… (we lose things)", "info");
  try { await logIn(f.username.value, f.password.value); location.href = safeNext(); }
  catch (err) { setMsg(msg, MESSAGES[err.code] || MESSAGES.storage, "error"); }
});
$("#form-signup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = $("#form-signup").elements, msg = $("#msg-signup");
  setMsg(msg, "Creating your account…", "info");
  try {
    await signUp(f.username.value, f.password.value, f.confirm.value);
    setMsg(msg, "Welcome aboard. Here are 100 Octmiles. Please do not ask what they are worth.", "ok");
    setTimeout(() => (location.href = safeNext()), 900);
  } catch (err) { setMsg(msg, MESSAGES[err.code] || MESSAGES.storage, "error"); }
});

$("#form-restore").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#msg-restore");
  setMsg(msg, "Opening your backup… (we lose things)", "info");
  try {
    const u = await loadCode($("#form-restore").elements.code.value);
    setMsg(msg, `Welcome back, ${u.username}. Your miles are here. We found them in a code.`, "ok");
    setTimeout(() => (location.href = safeNext("account.html")), 900);
  } catch (err) { setMsg(msg, codeMessage(err), "error"); }
});

// Cloud account (the main way in): log in or sign up with a username and password that works on any device.
const cloudGo = async (form, msgId, fn, hello) => {
  const msg = $(msgId), u = form.elements.username.value, p = form.elements.password.value;
  setMsg(msg, "Calling the cloud… (it is a long way up)", "info");
  form.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    const user = await fn(u, p);
    setMsg(msg, hello(user), "ok");
    setTimeout(() => (location.href = safeNext("account.html")), 900);
  } catch (err) { setMsg(msg, cloudMessage(err), "error"); form.querySelectorAll("button").forEach((b) => (b.disabled = false)); }
};
forms.login.addEventListener("submit", (e) => { e.preventDefault(); cloudGo(forms.login, "#msg-cloud", cloudLogin, (u) => `Welcome back, ${u.username}. Your account came down from the cloud.`); });
forms.signup.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = forms.signup.elements;
  if (f.password.value !== f.confirm.value) return setMsg($("#msg-csignup"), MESSAGES.mismatch, "error");
  cloudGo(forms.signup, "#msg-csignup", cloudCreate, (u) => `Cloud account made. Welcome aboard, ${u.username}. Here are 100 Octmiles.`);
});
