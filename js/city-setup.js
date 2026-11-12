// City setup: the owner adds buildings and their jobs to Octee City. Only the Worker decides who is the owner (adminRole), the same check as Control Tower.
import { $, el } from "./dom.js";
import { CONFIG } from "./config.js";
import { cloudAdminCall, cloudMessage, cloudLinked } from "./cloud.js";

// The built-in buildings, so the job form can offer them too. Their jobs are built in and cannot be changed here.
const BUILT_IN = [["bank", "OCT Bank"], ["hall", "City Hall"], ["clinic", "Clinic"], ["fire", "Fire Station"], ["post", "Post Office"], ["bakery", "Bakery"], ["library", "Library"], ["cinema", "Cinema"], ["power", "Power Station"], ["radio", "Radio Tower"], ["food", "Food Court"], ["harbour", "Harbour"], ["police", "Police Station"], ["tax", "Tax Office"], ["car", "Car Park"], ["gym", "Gym"], ["museum", "Peanut Museum"], ["bus", "Airport Bus Stop"], ["square", "Town Square"], ["tower", "Game Tower"]];
const ID = /^[a-z][a-z0-9-]{2,20}$/;

async function pub(path) {
  try { const r = await fetch(CONFIG.CLOUD_URL + path); return r.ok ? await r.json() : null; } catch { return null; }
}

function field(label, input) { return el("label", { style: "display:block;margin:6px 0" }, el("span", { style: "display:block;font-size:13px" }, label), input); }
const text = (attrs = {}) => el("input", { type: "text", style: "width:100%;box-sizing:border-box", ...attrs });

// A success is shown on the page after it reloads (flash); an error stays beside the form it came from.
let flash = "";
async function run(box, fn, ok) {
  box.textContent = "Saving…";
  try { await fn(); flash = ok; await load(); }
  catch (e) { box.textContent = cloudMessage(e) || e.message || "Nothing was changed."; }
}

function buildingForm(app) {
  const id = text({ maxlength: 21, placeholder: "e.g. library-annex" }), name = text({ maxlength: 40, placeholder: "The name on the map and in the hub" }), blurb = text({ maxlength: 160, placeholder: "One line, deadpan, please" });
  const msg = el("p", { class: "note" });
  return el("div", { class: "city-card", style: "cursor:auto" }, el("h2", {}, "1. Add a building"),
    el("p", { class: "note" }, "The id is what the Worker stores, so make it short and do not change it later. Letters, numbers and dashes; starting with a letter."),
    field("Id", id), field("Name", name), field("Blurb", blurb),
    el("button", { class: "btn", type: "button", onclick: () => {
      const v = { kind: "building", id: id.value.trim().toLowerCase(), name: name.value.trim(), blurb: blurb.value.trim() };
      if (!ID.test(v.id)) { msg.textContent = "The id needs 3 to 21 characters: lower-case letters, numbers and dashes, starting with a letter."; return; }
      run(msg, () => cloudAdminCall("POST", "/api/city/setup", v), "The building is up. Citizens can see it now.").then(() => { id.value = ""; name.value = ""; blurb.value = ""; });
    } }, "Build it"), msg);
}

function jobForm(buildings) {
  const pick = el("select", { style: "width:100%;box-sizing:border-box" }, buildings.map(([id, n]) => el("option", { value: id }, n + " (" + id + ")")));
  const id = text({ maxlength: 21, placeholder: "e.g. library-stamp" }), title = text({ maxlength: 40, placeholder: "Job title" });
  const prompt = text({ maxlength: 200, placeholder: "The question the citizen answers" });
  const right = text({ maxlength: 120, placeholder: "The right answer (clocks them in)" });
  const wrong1 = text({ maxlength: 120, placeholder: "A wrong answer" }), wrong2 = text({ maxlength: 120, placeholder: "Another wrong answer (optional)" });
  const hard = el("input", { type: "checkbox" });
  const msg = el("p", { class: "note" });
  return el("div", { class: "city-card", style: "cursor:auto" }, el("h2", {}, "2. Give it a job"),
    el("p", { class: "note" }, "A job is one question with one right answer. A right answer clocks the citizen in and pays 10 CCT, or 15 if you tick hard."),
    field("Building", pick), field("Job id", id), field("Title", title), field("Question", prompt), field("Right answer", right), field("Wrong answer", wrong1), field("Another wrong answer", wrong2),
    el("label", { style: "display:block;margin:6px 0" }, hard, " Hard job (pays 15 CCT)"),
    el("button", { class: "btn", type: "button", onclick: () => {
      const v = { kind: "job", building: pick.value, id: id.value.trim().toLowerCase(), title: title.value.trim(), prompt: prompt.value.trim(), right: right.value.trim(), wrong: [wrong1.value.trim(), wrong2.value.trim()].filter(Boolean), hard: hard.checked };
      if (!ID.test(v.id)) { msg.textContent = "The job id needs 3 to 21 characters: lower-case letters, numbers and dashes, starting with a letter."; return; }
      run(msg, () => cloudAdminCall("POST", "/api/city/setup", v), "The job is on the board.").then(() => { id.value = ""; title.value = ""; prompt.value = ""; right.value = ""; wrong1.value = ""; wrong2.value = ""; hard.checked = false; });
    } }, "Add job"), msg);
}

function listing(custom, jobs) {
  if (!custom.length) return el("p", { class: "note" }, "No buildings of your own yet. The built-in town is all there is, which is quite a lot.");
  return el("div", {}, custom.map((b) => el("div", { class: "city-card", style: "cursor:auto" },
    el("h3", {}, b.name, " ", el("small", { class: "note" }, "(" + b.id + ")")),
    el("p", { class: "note" }, b.blurb || "No blurb."),
    el("p", {}, jobs.filter((j) => j.building === b.id).length ? jobs.filter((j) => j.building === b.id).map((j) => el("div", {}, el("strong", {}, j.title), j.hard ? " (hard)" : "", " · " + j.prompt)) : el("p", { class: "note" }, "No jobs yet. A building with no jobs is a very good museum.")),
    el("button", { class: "btn ghost", type: "button", onclick: () => {
      if (!confirm(`Remove ${b.name} and all its jobs? Reviews and the chat stay, but the building is gone.`)) return;
      run(el("p"), () => cloudAdminCall("DELETE", "/api/city/setup/" + encodeURIComponent(b.id)), "Removed.");
    } }, "Remove building"))));
}

async function load() {
  const app = $("#app");
  if (!app) return;
  if (!cloudLinked()) { app.replaceChildren(el("div", { class: "city-card", style: "cursor:auto" }, el("p", {}, "Log in with the owner's Octee Cloud account to set up the city."), el("p", {}, el("a", { href: "login.html?next=" + encodeURIComponent("city-setup.html") }, "Log in")))); return; }
  try { await cloudAdminCall("GET", "/api/admin/me"); }
  catch { app.replaceChildren(el("div", { class: "city-card", style: "cursor:auto" }, el("p", {}, "Only the city's owner can set up buildings. You are not the owner, so the city stays as it is."))); return; }
  const data = (await pub("/api/city/setup")) || { buildings: [], jobs: [] };
  const all = [...BUILT_IN, ...data.buildings.map((b) => [b.id, b.name])];
  const note = el("div", { class: "city-status" }, flash || "Changes show up in the city straight away.");
  flash = "";
  app.replaceChildren(note, buildingForm(app), jobForm(all), el("h2", {}, "Buildings of your own"), listing(data.buildings, data.jobs));
}
load();
