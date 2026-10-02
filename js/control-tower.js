// FAG (Fuji Airport Group) code administration — opened by clicking the Octee logo 8 times quickly.
// This part is deliberately SERIOUS: plain corporate look, no jokes. A wrong password closes it instantly, with no message.
//
// This is a STATIC site, so there is no server to keep secrets or save codes. Instead:
//  * Who may enter is in data/control-tower.json (owner + admins, passwords stored only as PBKDF2 hashes).
//  * Codes live in data/codes.json, stored only as SHA-256 hashes (reading the file doesn't reveal them).
//  * The Control Tower builds the NEW versions of those files for you to download and commit to GitHub.
//    The real lock is GitHub itself: only people who can push to the repo can publish codes or admins.
import { el, setMsg } from "./dom.js";
import { hashPassword, randomSalt, codeHash, normalizeCode } from "./crypto.js";
import { loadSession, saveSession, removeSession, load, save, remove } from "./store.js";

const SESSION = "octee.tower.session";
const DRAFT_CODES = "octee.tower.codes";
const DRAFT_CREW = "octee.tower.crew";
const LOCK = "octee.tower.lock";

let back = null;

async function fetchJson(path, fallback) {
  try { const r = await fetch(path, { cache: "no-store" }); return r.ok ? await r.json() : fallback; } catch { return fallback; }
}

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function shell(...content) {
  back?.remove();
  back = el("div", { class: "modal-back fag-back", role: "dialog", "aria-modal": "true", "aria-label": "FAG Fuji Airport Group, Octmiles code administration" },
    el("div", { class: "modal fag" },
      el("button", { class: "close-x", type: "button", "aria-label": "Close", onclick: () => back.remove() }, "×"),
      el("div", { class: "fag-head" },
        el("div", { class: "fag-mark", "aria-hidden": "true" }, "FAG"),
        el("div", {}, el("h2", {}, "Fuji Airport Group"), el("p", { class: "fag-sub" }, "Octmiles Code Administration · Restricted system"))),
      ...content));
  back.addEventListener("keydown", (e) => { if (e.key === "Escape") back.remove(); });
  back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  document.body.append(back);
  back.querySelector("input, button:not(.close-x)")?.focus();
}

export async function openControlTower() {
  const crew = load(DRAFT_CREW, null) || (await fetchJson("data/control-tower.json", { owner: null, admins: [] }));
  const session = loadSession(SESSION, null);
  if (!crew.owner) return setupOwner();
  if (session) return tower(session, crew);
  login(crew);
}

/* ----- first time: create the owner ----- */
function setupOwner() {
  const msg = el("p", { class: "msg", "aria-live": "polite" });
  const form = el("form", { class: "card" },
    el("h3", {}, "Initial setup"),
    el("p", {}, "No administrator account exists yet. Create the owner account with a strong password. You will download ", el("code", {}, "control-tower.json"), " and put it in the ", el("code", {}, "data/"), " folder of the website, then commit and push."),
    el("div", { class: "row" },
      el("div", { class: "field" }, el("label", { for: "ct-name" }, "Owner name"), el("input", { type: "text", id: "ct-name", maxlength: "30", autocomplete: "username" })),
      el("div", { class: "field" }, el("label", { for: "ct-pass" }, "Password (12+ characters)"), el("input", { type: "password", id: "ct-pass", autocomplete: "new-password" }))),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Create owner account")), msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("#ct-name").value.trim(), pass = form.querySelector("#ct-pass").value;
    if (name.length < 2) return setMsg(msg, "Enter a name.", "error");
    if (pass.length < 12) return setMsg(msg, "The password must be at least 12 characters.", "error");
    const salt = randomSalt();
    const crew = { owner: { name, salt, hash: await hashPassword(pass, salt) }, admins: [] };
    save(DRAFT_CREW, crew);
    download("control-tower.json", crew);
    saveSession(SESSION, { name, role: "owner" });
    tower({ name, role: "owner" }, crew, "control-tower.json downloaded. Place it in the website's data/ folder, then commit and push.");
  });
  shell(form);
}

/* ----- login ----- */
function login(crew) {
  const msg = el("p", { class: "msg", "aria-live": "polite" });
  const form = el("form", { class: "card" },
    el("h3", {}, "Sign in"),
    el("p", {}, "Authorised personnel only. Sign in to access the Octmiles points codes."),
    el("div", { class: "row" },
      el("div", { class: "field" }, el("label", { for: "ct-name" }, "Name"), el("input", { type: "text", id: "ct-name", autocomplete: "username" })),
      el("div", { class: "field" }, el("label", { for: "ct-pass" }, "Password"), el("input", { type: "password", id: "ct-pass", autocomplete: "current-password" }))),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Sign in")), msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const lock = loadSession(LOCK, { fails: 0, until: 0 });
    if (Date.now() < lock.until) { back.remove(); return; }   // locked out after 5 wrong tries: just close
    const name = form.querySelector("#ct-name").value.trim(), pass = form.querySelector("#ct-pass").value;
    const people = [{ ...crew.owner, role: "owner" }, ...(crew.admins || []).map((a) => ({ ...a, role: "admin" }))];
    const who = people.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (who && (await hashPassword(pass, who.salt)) === who.hash) {
      removeSession(LOCK);
      const s = { name: who.name, role: who.role };
      saveSession(SESSION, s);
      return tower(s, crew);
    }
    const fails = lock.fails + 1;
    saveSession(LOCK, { fails: fails >= 5 ? 0 : fails, until: fails >= 5 ? Date.now() + 5 * 60_000 : 0 });
    back.remove();   // wrong name or password: the pop-up vanishes instantly, with no message
  });
  shell(form);
}

/* ----- inside ----- */
async function tower(session, crew, notice = "") {
  const published = await fetchJson("data/codes.json", { codes: [] });
  let codes = load(DRAFT_CODES, null) || published.codes || [];
  const tabCodes = el("button", { type: "button", role: "tab", "aria-selected": "true" }, "Codes");
  const tabCrew = session.role === "owner" ? el("button", { type: "button", role: "tab", "aria-selected": "false" }, "Admins") : null;
  const body = el("div");
  const top = el("p", { class: "msg ok" }, notice);
  const show = (which) => {
    tabCodes.setAttribute("aria-selected", String(which === "codes"));
    tabCrew?.setAttribute("aria-selected", String(which === "crew"));
    body.replaceChildren(which === "codes" ? codesPanel() : crewPanel());
  };
  tabCodes.addEventListener("click", () => show("codes"));
  tabCrew?.addEventListener("click", () => show("crew"));

  const saveCodes = (next) => { codes = next; save(DRAFT_CODES, codes); show("codes"); };

  function codesPanel() {
    const msg = el("p", { class: "msg", "aria-live": "polite" });
    const made = el("div");
    const form = el("form", { class: "card" },
      el("h3", {}, "Create a code"),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "nc-code" }, "Code"), el("input", { type: "text", id: "nc-code", maxlength: "20", placeholder: "e.g. OCTEE500" })),
        el("div", { class: "field", style: "justify-content:flex-end" }, el("button", { class: "btn small secondary", type: "button", onclick: () => {
          const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          form.querySelector("#nc-code").value = "OCT-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => abc[b % abc.length]).join("");
        } }, "Random"))),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "nc-miles" }, "Octmiles (1–5,000)"), el("input", { type: "number", id: "nc-miles", min: "1", max: "5000", value: "500" })),
        el("div", { class: "field" }, el("label", { for: "nc-exp" }, "Expires (optional)"), el("input", { type: "date", id: "nc-exp" })),
        el("div", { class: "field" }, el("label", { for: "nc-note" }, "Note (only in the file)"), el("input", { type: "text", id: "nc-note", maxlength: "60", placeholder: "Internal reference" }))),
      el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Create code")), msg, made);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = normalizeCode(form.querySelector("#nc-code").value);
      const miles = +form.querySelector("#nc-miles").value;
      if (!/^[A-Z0-9-]{4,20}$/.test(code)) return setMsg(msg, "Codes are 4–20 letters, numbers or dashes.", "error");
      if (!(miles >= 1 && miles <= 5000)) return setMsg(msg, "Octmiles must be 1–5,000.", "error");
      const hash = await codeHash(code);
      if (codes.some((c) => c.hash === hash)) return setMsg(msg, "That code already exists.", "error");
      saveCodes([...codes, { hash, octmiles: miles, expires: form.querySelector("#nc-exp").value || null, active: true,
        note: form.querySelector("#nc-note").value.trim() || null, madeBy: session.name, made: new Date().toISOString().slice(0, 10) }]);
      body.prepend(el("p", { class: "msg ok" }, `Code ${code} created (${miles} Octmiles). Record it now: only a hash is stored, so it cannot be displayed again. Download codes.json and commit it to publish the code.`));
    });
    const changed = JSON.stringify(codes) !== JSON.stringify(published.codes || []);
    return el("div", {},
      form,
      el("div", { class: "card", style: "margin-top:12px" },
        el("h3", {}, `Codes (${codes.length})`),
        codes.length ? el("div", { class: "table-wrap" }, el("table", { class: "plain" },
          el("thead", {}, el("tr", {}, ["Note", "Octmiles", "Expires", "Made by", "On", ""].map((h) => el("th", {}, h)))),
          el("tbody", {}, codes.map((c, i) => el("tr", {},
            el("td", {}, c.note || el("span", { class: "note" }, "#" + c.hash.slice(0, 8))),
            el("td", {}, String(c.octmiles)), el("td", {}, c.expires || "never"), el("td", {}, c.madeBy || "—"),
            el("td", {}, el("input", { type: "checkbox", checked: c.active !== false, "aria-label": "Code switched on",
              onchange: (e) => saveCodes(codes.map((x, k) => (k === i ? { ...x, active: e.target.checked } : x))) })),
            el("td", {}, el("button", { class: "btn small ghost danger", type: "button", onclick: () => saveCodes(codes.filter((_, k) => k !== i)) }, "Delete"))))))) : el("p", { class: "note" }, "No codes yet."),
        el("p", { class: changed ? "msg info" : "note" }, changed ? "There are unpublished changes." : "Matches the published data/codes.json."),
        el("div", { class: "actions" },
          el("button", { class: "btn", type: "button", onclick: () => download("codes.json", { codes }) }, "Download codes.json"),
          el("button", { class: "btn small ghost", type: "button", onclick: () => { remove(DRAFT_CODES); codes = published.codes || []; show("codes"); } }, "Discard changes")),
        el("p", { class: "hint" }, "To publish: put the downloaded codes.json in the website's data/ folder (replace the old one), commit and push. GitHub Pages updates in about a minute, then the codes work on every device.")));
  }

  function crewPanel() {
    const msg = el("p", { class: "msg", "aria-live": "polite" });
    const form = el("form", { class: "card" },
      el("h3", {}, "Add an admin"),
      el("p", { class: "note" }, "Administrators can create codes. Only the owner can add or remove administrators."),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "na-name" }, "Name"), el("input", { type: "text", id: "na-name", maxlength: "30" })),
        el("div", { class: "field" }, el("label", { for: "na-pass" }, "Their password (12+ characters)"), el("input", { type: "password", id: "na-pass", autocomplete: "new-password" }))),
      el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Add admin")), msg);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.querySelector("#na-name").value.trim(), pass = form.querySelector("#na-pass").value;
      if (name.length < 2) return setMsg(msg, "Pick a name.", "error");
      if (pass.length < 12) return setMsg(msg, "Use at least 12 characters.", "error");
      if ([crew.owner, ...crew.admins].some((p) => p.name.toLowerCase() === name.toLowerCase())) return setMsg(msg, "That name is already in the crew.", "error");
      const salt = randomSalt();
      crew = { ...crew, admins: [...crew.admins, { name, salt, hash: await hashPassword(pass, salt), added: new Date().toISOString().slice(0, 10) }] };
      save(DRAFT_CREW, crew);
      body.replaceChildren(crewPanel());
    });
    return el("div", {},
      el("div", { class: "card" }, el("h3", {}, "Crew"),
        el("table", { class: "plain" }, el("tbody", {},
          el("tr", {}, el("td", {}, crew.owner.name), el("td", {}, "Owner"), el("td", {})),
          crew.admins.map((a, i) => el("tr", {}, el("td", {}, a.name), el("td", {}, "Admin · added " + (a.added || "")),
            el("td", {}, el("button", { class: "btn small ghost danger", type: "button", onclick: () => {
              crew = { ...crew, admins: crew.admins.filter((_, k) => k !== i) }; save(DRAFT_CREW, crew); body.replaceChildren(crewPanel());
            } }, "Remove"))))))),
      form,
      el("div", { class: "actions" }, el("button", { class: "btn", type: "button", onclick: () => download("control-tower.json", crew) }, "Download control-tower.json")),
      el("p", { class: "hint" }, "To publish: replace data/control-tower.json with the downloaded file, commit and push."));
  }

  shell(
    top,
    el("p", { class: "fag-who" }, `Signed in as ${session.name} `, el("span", { class: "tag" }, session.role),
      " ", el("button", { class: "btn small ghost", type: "button", onclick: () => { removeSession(SESSION); back.remove(); } }, "Sign out")),
    el("div", { class: "tabs", role: "tablist" }, tabCodes, tabCrew),
    body,
    el("p", { class: "hint" }, "This system only prepares files. No change takes effect for other users until the files are committed to the repository."));
  if (!notice) top.remove();
  show("codes");
}
