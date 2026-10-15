// Cache-busting for GitHub Pages. Run before every push:  node tools/stamp.mjs
// Browsers keep js and css for ~10 minutes, so a new page can meet an OLD script. This gives every js/css file a short
// fingerprint of its content: the pages load  js/x.js?v=<fingerprint>  and an import map does the same for every module
// that another module imports. A file that did not change keeps its URL (and stays cached); a changed file is fetched fresh.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fp = (f) => createHash("sha1").update(readFileSync(join(root, f))).digest("hex").slice(0, 8);
const jsFiles = readdirSync(join(root, "js")).filter((f) => f.endsWith(".js")).sort();
const hashes = Object.fromEntries(jsFiles.map((f) => [f, fp("js/" + f)]));
const cssHash = fp("css/styles.css");
const joelCssHash = fp("css/joel.css");
const map = JSON.stringify({ imports: Object.fromEntries(jsFiles.map((f) => [`./js/${f}`, `./js/${f}?v=${hashes[f]}`])) });
const BLOCK = /<!--stamp-->[\s\S]*?<!--\/stamp-->\n?/;
let changed = 0;
for (const page of readdirSync(root).filter((f) => f.endsWith(".html"))) {
  let h = readFileSync(join(root, page), "utf8");
  const before = h;
  h = h.replace(BLOCK, "");
  h = h.replace(/(src="js\/([a-z0-9-]+\.js))(\?v=[0-9a-f]+)?"/g, (m, a, name) => (hashes[name] ? `${a}?v=${hashes[name]}"` : m));
  h = h.replace(/href="css\/styles\.css(\?v=[0-9a-f]+)?"/g, `href="css/styles.css?v=${cssHash}"`);
  h = h.replace(/href="css\/joel\.css(\?v=[0-9a-f]+)?"/g, `href="css/joel.css?v=${joelCssHash}"`);
  if (/<script type="module"/.test(h)) h = h.replace(/(<script type="module")/, `<!--stamp--><script type="importmap">${map}</script><!--/stamp-->\n$1`);
  if (h !== before) { writeFileSync(join(root, page), h); changed++; }
}
console.log(`stamped ${changed} pages, ${jsFiles.length} scripts, css ${cssHash}`);

// The list of files the code viewer (Control Tower > Code) shows: data/source-index.json. Text files only.
import { readdirSync as rd, statSync } from "node:fs";
const TEXT = /\.(html|js|mjs|css|json|md|txt|sql|svg|toml|ya?ml)$/i;
const SKIP_DIR = new Set([".git", "node_modules", "assets", ".github"]);
const files = [];
(function walk(dir, rel) {
  for (const e of rd(join(root, dir), { withFileTypes: true })) {
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(join(dir, e.name), r); }
    else if (TEXT.test(e.name) && r !== "data/source-index.json" && !e.name.startsWith("_") && !e.name.startsWith(".")) files.push({ path: r, size: statSync(join(root, r)).size });
  }
})("", "");
files.sort((a, b) => a.path.localeCompare(b.path));
const indexText = JSON.stringify({ files }) + "\n";
let oldIndex = ""; try { oldIndex = readFileSync(join(root, "data/source-index.json"), "utf8"); } catch { /* new */ }
if (oldIndex !== indexText) writeFileSync(join(root, "data/source-index.json"), indexText);
console.log(`source index: ${files.length} files`);
