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
const map = JSON.stringify({ imports: Object.fromEntries(jsFiles.map((f) => [`./js/${f}`, `./js/${f}?v=${hashes[f]}`])) });
const BLOCK = /<!--stamp-->[\s\S]*?<!--\/stamp-->\n?/;
let changed = 0;
for (const page of readdirSync(root).filter((f) => f.endsWith(".html"))) {
  let h = readFileSync(join(root, page), "utf8");
  const before = h;
  h = h.replace(BLOCK, "");
  h = h.replace(/(src="js\/([a-z0-9-]+\.js))(\?v=[0-9a-f]+)?"/g, (m, a, name) => (hashes[name] ? `${a}?v=${hashes[name]}"` : m));
  h = h.replace(/href="css\/styles\.css(\?v=[0-9a-f]+)?"/g, `href="css/styles.css?v=${cssHash}"`);
  if (/<script type="module"/.test(h)) h = h.replace(/(<script type="module")/, `<!--stamp--><script type="importmap">${map}</script><!--/stamp-->\n$1`);
  if (h !== before) { writeFileSync(join(root, page), h); changed++; }
}
console.log(`stamped ${changed} pages, ${jsFiles.length} scripts, css ${cssHash}`);
