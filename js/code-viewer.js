// A read-only code viewer in the style of Visual Studio Code: a file explorer, tabs, line numbers, colours, search across
// every file (Ctrl+Shift+F) and quick open (Ctrl+P). The files are the website's own files (listed in data/source-index.json,
// which tools/stamp.mjs writes). Opening the viewer needs a cloud account that may use it (the owner, etched into the code, or an
// account added on the 10-click screen); see js/code-access.js. Nothing here can change a file.
import { el } from "./dom.js";
import { cloudAdminCall } from "./cloud.js";

let root = null;

const LANGS = { js: "js", mjs: "js", css: "css", html: "html", json: "json", md: "md", svg: "html", sql: "sql", txt: "txt", yml: "txt", yaml: "txt", toml: "txt" };
const langOf = (path) => LANGS[(path.split(".").pop() || "").toLowerCase()] || "txt";
const KEYWORDS = new Set("async await break case catch class const continue default delete do else export extends finally for from function if import in instanceof let new of return static super switch throw try typeof var void while yield get set".split(" "));
const LITERALS = new Set(["true", "false", "null", "undefined", "this", "NaN", "Infinity"]);
const SQL_WORDS = new Set("create table if not exists primary key integer text not null default references foreign on delete cascade index insert into values select from where order by update set unique".split(" "));

// ---- colours: one regex per language, tokens are [kind, text] ----
const RULES = {
  js: [["comment", /\/\/[^\n]*|\/\*[\s\S]*?\*\//y], ["string", /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`/y], ["number", /\b(?:0x[0-9a-f]+|\d[\d_]*\.?\d*(?:e[+-]?\d+)?)\b/iy], ["word", /[A-Za-z_$][\w$]*/y]],
  css: [["comment", /\/\*[\s\S]*?\*\//y], ["string", /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/y], ["atrule", /@[\w-]+/y], ["number", /#[0-9a-f]{3,8}\b|-?\d*\.?\d+(?:px|rem|em|%|vh|vw|s|ms|deg|fr)?\b/iy], ["prop", /--?[a-z][\w-]*(?=\s*:)|[a-z-]+(?=\s*:(?!\w))/y]],
  html: [["comment", /<!--[\s\S]*?-->/y], ["tag", /<\/?[A-Za-z][\w:-]*|\/?>/y], ["string", /"[^"]*"|'[^']*'/y], ["attr", /[A-Za-z_:][\w:.-]*(?==)/y]],
  json: [["string", /"(?:[^"\\\n]|\\.)*"(?=\s*:)/y, "key"], ["string", /"(?:[^"\\\n]|\\.)*"/y], ["number", /-?\d+\.?\d*(?:e[+-]?\d+)?/iy], ["word", /true|false|null/y]],
  md: [["tag", /^#{1,6} [^\n]*/my], ["string", /^```[^\n]*\n[\s\S]*?^```/my], ["string", /`[^`\n]+`/y], ["atrule", /\*\*[^*\n]+\*\*/y]],
  sql: [["comment", /--[^\n]*/y], ["string", /'(?:[^'\n]|'')*'/y], ["number", /\b\d+\b/y], ["word", /[A-Za-z_]+/y]],
  txt: []
};

function tokenize(text, lang) {
  const rules = RULES[lang] || [];
  const out = [];
  let plain = "", i = 0;
  const flush = () => { if (plain) { out.push([null, plain]); plain = ""; } };
  while (i < text.length) {
    let hit = null;
    for (const [kind, re, alt] of rules) {
      re.lastIndex = i;
      const m = re.exec(text);
      if (m && m.index === i && m[0].length) { hit = [kind, m[0], alt]; break; }
    }
    if (!hit) { plain += text[i++]; continue; }
    let [kind, tok, alt] = hit;
    if (kind === "word") {
      if (lang === "js") kind = KEYWORDS.has(tok) ? "keyword" : LITERALS.has(tok) ? "literal" : /^[A-Z]/.test(tok) ? "type" : /^\s*\(/.test(text.slice(i + tok.length, i + tok.length + 3)) ? "func" : null;
      else if (lang === "sql") kind = SQL_WORDS.has(tok.toLowerCase()) ? "keyword" : null;
      else kind = "literal";
    }
    if (alt) kind = alt;
    if (kind === null) { plain += tok; i += tok.length; continue; }
    flush(); out.push([kind, tok]); i += tok.length;
  }
  flush();
  return out;
}

// Build the code column: spans for the tokens; one <pre> for the whole file (fast, even for a long file).
function codeNode(text, lang) {
  const frag = document.createDocumentFragment();
  if (text.length > 250000) { frag.append(text); return frag; }   // very long: plain text
  for (const [kind, tok] of tokenize(text, lang)) frag.append(kind ? el("span", { class: "tk-" + kind }, tok) : tok);
  return frag;
}

// ---- files ----
const cache = new Map();                 // path -> text
async function getText(path) {
  if (cache.has(path)) return cache.get(path);
  const r = await fetch(path, { cache: "no-store" });
  const t = r.ok ? await r.text() : `// Could not load ${path} (${r.status}).`;
  cache.set(path, t);
  return t;
}

const folderTree = (files) => {
  const rootNode = { dirs: new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split("/"); let n = rootNode;
    for (const d of parts.slice(0, -1)) { if (!n.dirs.has(d)) n.dirs.set(d, { dirs: new Map(), files: [] }); n = n.dirs.get(d); }
    n.files.push(f);
  }
  return rootNode;
};
const icon = (path) => ({ js: "JS", mjs: "JS", css: "#", html: "<>", json: "{}", md: "M↓", svg: "<>", sql: "DB" }[(path.split(".").pop() || "").toLowerCase()] || "≡");

function showMessage(text) {
  root?.remove();
  root = el("div", { class: "modal-back fag-back", role: "dialog", "aria-modal": "true", "aria-label": "Code viewer" },
    el("div", { class: "modal fag" }, el("button", { class: "close-x", type: "button", "aria-label": "Close", onclick: () => root.remove() }, "×"),
      el("div", { class: "fag-head" }, el("div", { class: "fag-mark", "aria-hidden": "true" }, "FAG"), el("div", {}, el("h2", {}, "Code viewer"), el("p", { class: "fag-sub" }, "Restricted system"))),
      el("p", { class: "msg info", style: "margin:14px 0" }, text)));
  root.addEventListener("click", (e) => { if (e.target === root) root.remove(); });
  document.body.append(root);
}

export async function openCodeViewer() {
  try { await cloudAdminCall("GET", "/api/code/me"); }
  catch (e) {
    return showMessage(e && e.code === "forbidden" ? "This cloud account may not open the code viewer. The owner can add it (click the logo 10 times)."
      : e && e.code === "login" ? "Log in to Octee Cloud first (login page, Log in tab) with an account that may open the code viewer, then try again."
      : "The cloud could not be reached, so the code viewer could not check your account. Try again later.");
  }
  let files = [];
  try { files = (await (await fetch("data/source-index.json", { cache: "no-store" })).json()).files || []; } catch { /* below */ }
  if (!files.length) return showMessage("The file list (data/source-index.json) could not be loaded.");
  build(files);
}

function build(files) {
  root?.remove();
  const LH = 20;                                        // line height in px (the highlight bar relies on it)
  const open = [];                                      // open tabs: paths
  let active = null, line = 0;
  const expanded = new Set(["", "js", "css", "data", "cloud"]);
  const tabs = el("div", { class: "cv-tabs", role: "tablist" });
  const crumb = el("div", { class: "cv-crumb" });
  const gutter = el("pre", { class: "cv-gutter", "aria-hidden": "true" });
  const code = el("pre", { class: "cv-code", tabindex: "0" });
  const bar = el("div", { class: "cv-hl", hidden: true });
  const scroller = el("div", { class: "cv-scroll" }, el("div", { class: "cv-lines" }, gutter, el("div", { class: "cv-codewrap" }, bar, code)));
  const status = el("div", { class: "cv-status" });
  const explorer = el("div", { class: "cv-tree", role: "tree" });
  const results = el("div", { class: "cv-results" });
  const searchBox = el("input", { type: "search", class: "cv-input", placeholder: "Search in all files (Enter)", "aria-label": "Search in all files" });
  const sidebar = el("div", { class: "cv-side" }, el("div", { class: "cv-side-head" }, "EXPLORER"), explorer);
  const searchPane = el("div", { class: "cv-side", hidden: true }, el("div", { class: "cv-side-head" }, "SEARCH"), el("div", { class: "cv-search" }, searchBox), results);
  const welcome = el("div", { class: "cv-welcome" }, el("h2", {}, "Octee Airlines"), el("p", {}, "Read-only code viewer"), el("p", { class: "cv-dim" }, "Pick a file on the left. Ctrl+P opens a file by name. Ctrl+Shift+F searches every file."));

  const treeNode = (n, prefix, depth) => {
    const nodes = [];
    for (const [name, sub] of [...n.dirs].sort((a, b) => a[0].localeCompare(b[0]))) {
      const key = prefix ? prefix + "/" + name : name, isOpen = expanded.has(key);
      nodes.push(el("div", { class: "cv-row dir", role: "treeitem", "aria-expanded": String(isOpen), style: `padding-left:${8 + depth * 12}px`, onclick: () => { isOpen ? expanded.delete(key) : expanded.add(key); paintTree(); } }, el("span", { class: "cv-arrow" }, isOpen ? "▾" : "▸"), name));
      if (isOpen) nodes.push(...treeNode(sub, key, depth + 1));
    }
    for (const f of n.files.sort((a, b) => a.path.localeCompare(b.path)))
      nodes.push(el("div", { class: "cv-row file" + (f.path === active ? " on" : ""), role: "treeitem", title: f.path, style: `padding-left:${22 + depth * 12}px`, onclick: () => openFile(f.path) }, el("span", { class: "cv-ico" }, icon(f.path)), f.path.split("/").pop()));
    return nodes;
  };
  const tree = folderTree(files);
  const paintTree = () => explorer.replaceChildren(...treeNode(tree, "", 0));

  const paintTabs = () => tabs.replaceChildren(...open.map((p) => el("div", { class: "cv-tab" + (p === active ? " on" : ""), role: "tab", "aria-selected": String(p === active), title: p, onclick: () => openFile(p) },
    p.split("/").pop(), el("button", { class: "cv-x", type: "button", "aria-label": "Close " + p, onclick: (e) => { e.stopPropagation(); closeTab(p); } }, "×"))));
  const closeTab = (p) => { const i = open.indexOf(p); open.splice(i, 1); if (active === p) { active = open[i] || open[i - 1] || null; if (active) show(active, 0); else clearEditor(); } paintTabs(); paintTree(); };
  const clearEditor = () => { gutter.textContent = ""; code.replaceChildren(welcome); crumb.textContent = ""; status.textContent = ""; bar.hidden = true; };

  async function show(path, atLine) {
    const text = await getText(path), lang = langOf(path);
    if (active !== path) return;
    const n = text.split("\n").length;
    gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    code.replaceChildren(codeNode(text, lang));
    crumb.textContent = path.split("/").join("  ›  ");
    status.textContent = `Read only · ${lang.toUpperCase()} · ${n.toLocaleString("en-GB")} lines · ${(text.length / 1024).toFixed(1)} KB`;
    line = atLine || 0;
    bar.hidden = !line;
    if (line) { bar.style.top = (line - 1) * LH + "px"; scroller.scrollTop = Math.max(0, (line - 1) * LH - 120); } else scroller.scrollTop = 0;
  }
  async function openFile(path, atLine = 0) {
    if (!open.includes(path)) open.push(path);
    active = path; paintTabs(); paintTree();
    await show(path, atLine);
  }

  // ---- search across every file ----
  let loaded = false;
  async function loadAll() {
    if (loaded) return;
    let done = 0; const queue = files.map((f) => f.path);
    results.replaceChildren(el("p", { class: "cv-dim" }, "Loading the files…"));
    await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) { await getText(queue.shift()); done++; if (done % 20 === 0) results.firstChild.textContent = `Loading the files… ${done}/${files.length}`; } }));
    loaded = true;
  }
  async function search() {
    const q = searchBox.value.trim();
    if (q.length < 2) return results.replaceChildren(el("p", { class: "cv-dim" }, "Type at least 2 characters."));
    await loadAll();
    const lower = q.toLowerCase(), groups = []; let total = 0;
    for (const f of files) {
      const lines = (cache.get(f.path) || "").split("\n"), hits = [];
      for (let i = 0; i < lines.length && total < 400; i++) { const at = lines[i].toLowerCase().indexOf(lower); if (at >= 0) { hits.push([i + 1, lines[i], at]); total++; } }
      if (hits.length) groups.push([f.path, hits]);
    }
    results.replaceChildren(el("p", { class: "cv-dim" }, total ? `${total}${total >= 400 ? "+" : ""} results in ${groups.length} files` : "No results."),
      ...groups.flatMap(([p, hits]) => [el("div", { class: "cv-rfile" }, p), ...hits.map(([n, text, at]) => {
        const s = Math.max(0, at - 24), t = text.slice(s, s + 120);
        return el("div", { class: "cv-rline", onclick: () => openFile(p, n) }, el("span", { class: "cv-ln" }, String(n)), s ? "…" : "", t.slice(0, at - s), el("mark", {}, t.slice(at - s, at - s + q.length)), t.slice(at - s + q.length));
      })]));
  }
  searchBox.addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });

  // ---- quick open (Ctrl+P) ----
  function quickOpen() {
    const input = el("input", { class: "cv-input big", type: "text", placeholder: "Go to file…", "aria-label": "Go to file" });
    const list = el("div", { class: "cv-qlist" });
    const layer = el("div", { class: "cv-quick", onclick: (e) => { if (e.target === layer) layer.remove(); } }, el("div", { class: "cv-qbox" }, input, list));
    let pick = 0, shown = [];
    const fuzzy = (q, s) => { let i = 0; for (const ch of s) if (ch === q[i]) i++; return i === q.length; };
    const paint = () => {
      const q = input.value.toLowerCase().replace(/\s+/g, "");
      shown = files.map((f) => f.path).filter((p) => fuzzy(q, p.toLowerCase())).sort((a, b) => (a.toLowerCase().includes(q) ? 0 : 1) - (b.toLowerCase().includes(q) ? 0 : 1) || a.length - b.length).slice(0, 14);
      pick = Math.min(pick, Math.max(0, shown.length - 1));
      list.replaceChildren(...shown.map((p, i) => el("div", { class: "cv-qrow" + (i === pick ? " on" : ""), onclick: () => go(p) }, p)));
    };
    const go = (p) => { layer.remove(); openFile(p); };
    input.addEventListener("input", () => { pick = 0; paint(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { pick = Math.min(shown.length - 1, pick + 1); paint(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { pick = Math.max(0, pick - 1); paint(); e.preventDefault(); }
      else if (e.key === "Enter" && shown[pick]) go(shown[pick]);
      else if (e.key === "Escape") { layer.remove(); e.stopPropagation(); }
    });
    root.append(layer); paint(); input.focus();
  }

  const setPane = (which) => { sidebar.hidden = which !== "files"; searchPane.hidden = which !== "search"; bFiles.classList.toggle("on", which === "files"); bSearch.classList.toggle("on", which === "search"); if (which === "search") searchBox.focus(); };
  const bFiles = el("button", { class: "cv-act on", type: "button", title: "Explorer", "aria-label": "Explorer", onclick: () => setPane("files") }, "☰");
  const bSearch = el("button", { class: "cv-act", type: "button", title: "Search (Ctrl+Shift+F)", "aria-label": "Search", onclick: () => setPane("search") }, "⌕");
  const close = () => { document.removeEventListener("keydown", keys, true); root.remove(); root = null; };
  function keys(e) {
    if (!root) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "p") { e.preventDefault(); if (!root.querySelector(".cv-quick")) quickOpen(); }
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && k === "f") { e.preventDefault(); setPane("search"); }
    else if (e.key === "Escape" && !root.querySelector(".cv-quick")) { e.stopPropagation(); close(); }
  }
  document.addEventListener("keydown", keys, true);

  root = el("div", { class: "cv", role: "dialog", "aria-modal": "true", "aria-label": "Code viewer" },
    el("div", { class: "cv-title" }, el("span", {}, "Octee Airlines — code viewer (read only)"), el("button", { class: "cv-close", type: "button", onclick: close }, "Close")),
    el("div", { class: "cv-main" },
      el("div", { class: "cv-actbar" }, bFiles, bSearch),
      el("div", { class: "cv-sidewrap" }, sidebar, searchPane),
      el("div", { class: "cv-editor" }, tabs, crumb, scroller)),
    status);
  document.body.append(root);
  paintTree(); clearEditor();
  const first = files.find((f) => f.path === "README.md") || files[0];
  if (first) openFile(first.path);
}
